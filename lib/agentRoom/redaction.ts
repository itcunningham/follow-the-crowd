/**
 * FTC Agent Room — outbound redaction.
 *
 * Every string that leaves this process for a model provider passes through
 * `redactSecrets` first. It is the last line of defence, not the only one:
 * the Agent Room never reads `.env*`, never reads cookies, and never walks the
 * repository on its own (see repoAccess.ts).
 *
 * Redaction is deliberately aggressive. A false positive costs the reviewer a
 * little context; a false negative posts a live credential to a third party.
 */

export const REDACTED = "[REDACTED]";

type RedactionRule = {
  readonly name: string;
  readonly pattern: RegExp;
  /** Replacement keeps any leading label so the model still sees the shape. */
  readonly replace: (match: string, ...groups: string[]) => string;
};

const RULES: readonly RedactionRule[] = [
  // Anthropic keys and OAuth tokens: sk-ant-..., sk-ant-oat01-...
  {
    name: "anthropic-key",
    pattern: /sk-ant-[A-Za-z0-9_-]{8,}/g,
    replace: () => REDACTED,
  },
  // OpenAI keys: sk-..., sk-proj-..., and org/project ids paired with secrets.
  {
    name: "openai-key",
    pattern: /sk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{16,}/g,
    replace: () => REDACTED,
  },
  // GitHub tokens.
  {
    name: "github-token",
    pattern: /gh[pousr]_[A-Za-z0-9]{16,}/g,
    replace: () => REDACTED,
  },
  {
    name: "github-fine-grained-token",
    pattern: /github_pat_[A-Za-z0-9_]{20,}/g,
    replace: () => REDACTED,
  },
  // Slack tokens.
  {
    name: "slack-token",
    pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/g,
    replace: () => REDACTED,
  },
  // AWS access key ids.
  {
    name: "aws-access-key-id",
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
    replace: () => REDACTED,
  },
  // Google API keys.
  {
    name: "google-api-key",
    // Deliberately looser than the canonical 39-character key: over-matching
    // an AIza-prefixed string costs nothing, under-matching leaks one.
    pattern: /\bAIza[0-9A-Za-z_-]{20,}\b/g,
    replace: () => REDACTED,
  },
  // JWTs — this is what a Supabase anon/service-role key looks like.
  {
    name: "jwt",
    pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
    replace: () => REDACTED,
  },
  // Supabase publishable/secret keys (sb_publishable_..., sb_secret_...).
  {
    name: "supabase-key",
    pattern: /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{10,}/g,
    replace: () => REDACTED,
  },
  // Authorization headers of any scheme.
  {
    name: "authorization-header",
    pattern: /\b(authorization\s*[:=]\s*)(?:bearer|basic|token)?\s*\S+/gi,
    replace: (_match, label) => `${label}${REDACTED}`,
  },
  // Cookie headers, whole value.
  {
    name: "cookie-header",
    pattern: /\b((?:set-)?cookie\s*[:=]\s*)\S.*/gi,
    replace: (_match, label) => `${label}${REDACTED}`,
  },
  // Credentials embedded in a connection string.
  {
    name: "connection-string-credentials",
    pattern: /\b([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/gi,
    replace: (_match, scheme) => `${scheme}${REDACTED}:${REDACTED}@`,
  },
  // PEM blocks.
  {
    name: "private-key-block",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    replace: () => REDACTED,
  },
  // Any KEY=VALUE / KEY: VALUE line whose name smells like a secret. This is
  // what catches a pasted .env, including variables we have never heard of.
  {
    name: "secret-assignment",
    pattern:
      /\b([A-Za-z0-9_.-]*(?:SECRET|PASSWORD|PASSWD|TOKEN|API[_-]?KEY|ACCESS[_-]?KEY|PRIVATE[_-]?KEY|SERVICE[_-]?ROLE|CREDENTIAL|SESSION[_-]?ID)[A-Za-z0-9_.-]*)(\s*[:=]\s*)(?:"[^"]*"|'[^']*'|\S+)/gi,
    replace: (_match, key, separator) => `${key}${separator}${REDACTED}`,
  },
];

/**
 * Replaces anything that looks like a credential. Returns the cleaned text
 * plus the names of the rules that fired, so the UI can tell Isaac that
 * redaction happened before he approves the handoff.
 */
export function redactSecrets(input: string): {
  text: string;
  redactedRules: string[];
} {
  let text = input;
  const redactedRules: string[] = [];

  for (const rule of RULES) {
    // Fresh lastIndex on every use — these are module-level /g regexes.
    rule.pattern.lastIndex = 0;

    if (!rule.pattern.test(text)) {
      continue;
    }

    rule.pattern.lastIndex = 0;
    text = text.replace(rule.pattern, rule.replace as (...args: string[]) => string);
    redactedRules.push(rule.name);
  }

  return { text, redactedRules };
}

export function containsRedaction(text: string): boolean {
  return text.includes(REDACTED);
}

/** Rule names, for tests and for the "what will be sent" panel. */
export const REDACTION_RULE_NAMES: readonly string[] = RULES.map(
  (rule) => rule.name,
);
