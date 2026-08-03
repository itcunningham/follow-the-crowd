/**
 * FTC Agent Room — read-only repository access.
 *
 * Version one may read a named source file, inspect `git diff`, and run a
 * fixed-string search. It may not write, stage, commit, push, merge, deploy,
 * run SQL, or execute an arbitrary shell command — there is no code path here
 * that can, and every git invocation uses a fixed argument vector through
 * `execFile` (no shell, so no interpolation and no operators).
 *
 * Every read is explicit: Isaac names the file or the search term. Nothing
 * here walks the repository on its own, and nothing here is reachable by a
 * model — these functions are called by the API on Isaac's behalf only.
 */

import { execFile } from "node:child_process";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { AGENT_ROOM_LIMITS } from "./config";
import { redactSecrets } from "./redaction";

const execFileAsync = promisify(execFile);

const GIT_TIMEOUT_MS = 15_000;

/** Directories that are never readable, whatever the path looks like. */
const DENIED_SEGMENTS = new Set([
  ".git",
  ".next",
  ".agent-room",
  ".claude",
  ".vercel",
  "node_modules",
  "out",
  "build",
  "coverage",
]);

/** Extensions that may hold key material. Refused before anything is opened. */
const DENIED_EXTENSIONS = new Set([
  ".pem",
  ".key",
  ".p12",
  ".pfx",
  ".crt",
  ".cert",
  ".cer",
  ".der",
  ".keystore",
  ".jks",
  ".ppk",
]);

/** Only text formats we actually review are readable. */
const ALLOWED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".json",
  ".css",
  ".scss",
  ".md",
  ".mdx",
  ".sql",
  ".yml",
  ".yaml",
  ".txt",
  ".html",
  ".sh",
]);

export type RepoReadResult =
  | { ok: true; label: string; content: string; redactedRules: string[] }
  | { ok: false; error: string };

function repoRoot(): string {
  return process.cwd();
}

/**
 * `turbopackIgnore` keeps the bundler's file tracer out of this join. The path
 * is resolved at request time from Isaac's input, so tracing it would drag the
 * entire project into the route's dependency graph; the safety of the path is
 * established by `validateRepoRelativePath` plus the realpath check below, not
 * by anything the tracer could see.
 */
function resolveInRepo(relativePath: string): string {
  return path.join(/* turbopackIgnore: true */ repoRoot(), relativePath);
}

/**
 * Rejects anything that is not a plain, repository-relative path to an
 * allowed text file. Absolute paths, traversal, dotfiles and env files are all
 * refused by name before the filesystem is touched.
 */
export function validateRepoRelativePath(
  input: string,
): { ok: true; relativePath: string } | { ok: false; error: string } {
  const raw = input.trim();

  if (!raw) {
    return { ok: false, error: "No file path given." };
  }

  if (raw.length > 400) {
    return { ok: false, error: "That file path is too long." };
  }

  if (path.isAbsolute(raw) || raw.includes("\0")) {
    return { ok: false, error: "Use a path relative to the repository root." };
  }

  const normalised = path.normalize(raw).replace(/^\.\//, "");

  if (normalised.startsWith("..")) {
    return { ok: false, error: "That path leaves the repository." };
  }

  const segments = normalised.split(path.sep);

  for (const segment of segments) {
    if (DENIED_SEGMENTS.has(segment)) {
      return { ok: false, error: `\`${segment}\` is not readable from the Agent Room.` };
    }

    // Dotfiles are refused wholesale: this is what keeps `.env`, `.env.local`
    // and every future variant of them out, without maintaining a list.
    if (segment.startsWith(".")) {
      return { ok: false, error: "Dot-files and dot-directories are never readable." };
    }
  }

  const basename = segments[segments.length - 1] ?? "";
  const extension = path.extname(basename).toLowerCase();

  if (DENIED_EXTENSIONS.has(extension)) {
    return { ok: false, error: "Key and certificate files are never readable." };
  }

  if (/(^|[._-])env([._-]|$)/i.test(basename)) {
    return { ok: false, error: "Environment files are never readable." };
  }

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      error: `Only text source files are readable (${[...ALLOWED_EXTENSIONS].sort().join(", ")}).`,
    };
  }

  return { ok: true, relativePath: normalised };
}

function sliceLines(
  content: string,
  startLine: number | null,
  endLine: number | null,
): { text: string; label: string } {
  if (startLine === null) {
    return { text: content, label: "whole file" };
  }

  const lines = content.split("\n");
  const from = Math.max(1, startLine);
  const to = endLine === null ? lines.length : Math.min(lines.length, endLine);

  const selected = lines
    .slice(from - 1, to)
    .map((line, index) => `${from + index}\t${line}`)
    .join("\n");

  return { text: selected, label: `${from}-${to}` };
}

/** Reads one repository file (optionally a line range), redacted. */
export async function readRepoFileExcerpt(
  filePath: string,
  startLine: number | null = null,
  endLine: number | null = null,
): Promise<RepoReadResult> {
  const validated = validateRepoRelativePath(filePath);

  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const root = repoRoot();
  const absolute = resolveInRepo(validated.relativePath);

  let resolved: string;

  try {
    // realpath resolves symlinks, so a link pointing outside the repo is caught
    // here rather than by the string check above.
    resolved = await realpath(absolute);
  } catch {
    return { ok: false, error: `\`${validated.relativePath}\` does not exist.` };
  }

  const resolvedRoot = await realpath(root);

  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    return { ok: false, error: "That path resolves outside the repository." };
  }

  const stats = await stat(resolved);

  if (!stats.isFile()) {
    return { ok: false, error: "That path is not a file." };
  }

  if (stats.size > AGENT_ROOM_LIMITS.maxFileExcerptBytes) {
    return {
      ok: false,
      error: `That file is ${Math.round(stats.size / 1024)} KB, over the ${Math.round(
        AGENT_ROOM_LIMITS.maxFileExcerptBytes / 1024,
      )} KB read limit. Give a line range.`,
    };
  }

  const content = await readFile(resolved, "utf8");
  const sliced = sliceLines(content, startLine, endLine);
  const redacted = redactSecrets(sliced.text);

  return {
    ok: true,
    label: `${validated.relativePath} (${sliced.label})`,
    content: redacted.text,
    redactedRules: redacted.redactedRules,
  };
}

async function runGit(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd: repoRoot(),
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: AGENT_ROOM_LIMITS.maxFileExcerptBytes,
    // No `shell` option: execFile never spawns a shell, so nothing in `args`
    // can be interpreted as an operator, a redirect, or a second command.
  });

  return stdout;
}

/** `git diff` for the working tree, optionally scoped to one validated path. */
export async function readGitDiff(
  filePath: string | null = null,
): Promise<RepoReadResult> {
  const args = ["diff", "--no-color", "--unified=3"];
  let label = "git diff (working tree)";

  if (filePath && filePath.trim()) {
    const validated = validateRepoRelativePath(filePath);

    if (!validated.ok) {
      return { ok: false, error: validated.error };
    }

    args.push("--", validated.relativePath);
    label = `git diff — ${validated.relativePath}`;
  }

  try {
    const stdout = await runGit(args);

    if (!stdout.trim()) {
      return { ok: false, error: "There are no uncommitted changes to show." };
    }

    const redacted = redactSecrets(stdout);
    return {
      ok: true,
      label,
      content: redacted.text,
      redactedRules: redacted.redactedRules,
    };
  } catch {
    return { ok: false, error: "`git diff` failed. Is this a git worktree?" };
  }
}

/** Fixed-string `git grep`. Not a regex, so no pattern can be pathological. */
export async function searchRepo(query: string): Promise<RepoReadResult> {
  const term = query.trim();

  if (!term) {
    return { ok: false, error: "No search term given." };
  }

  if (term.length > 200) {
    return { ok: false, error: "That search term is too long." };
  }

  try {
    const stdout = await runGit([
      "grep",
      "--no-color",
      "-n",
      "-I",
      "-F",
      `--max-count=${AGENT_ROOM_LIMITS.maxSearchMatches}`,
      "-e",
      term,
    ]);

    if (!stdout.trim()) {
      return { ok: false, error: `No matches for \`${term}\`.` };
    }

    const lines = stdout.split("\n").slice(0, AGENT_ROOM_LIMITS.maxSearchMatches);
    const redacted = redactSecrets(lines.join("\n"));

    return {
      ok: true,
      label: `search — ${term}`,
      content: redacted.text,
      redactedRules: redacted.redactedRules,
    };
  } catch {
    // git grep exits non-zero when there are no matches, which lands here too.
    return { ok: false, error: `No matches for \`${term}\`, or the search failed.` };
  }
}

/** Exposed for tests: version one exposes no mutating repository capability. */
export const AGENT_ROOM_REPO_CAPABILITIES = [
  "read_file_excerpt",
  "read_git_diff",
  "search_repo",
] as const;
