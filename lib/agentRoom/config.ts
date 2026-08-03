/**
 * FTC Agent Room — the single source of provider and limit configuration.
 *
 * This is an INTERNAL DEVELOPER TOOL. Nothing here may be imported by normal
 * FTC product code, and no value here is ever exposed to the browser: the
 * client reads model names and limits from the API response, never from
 * `process.env`.
 *
 * Model names live here and nowhere else. Change a model by setting the
 * environment variable, not by editing a call site.
 */

/** Hard cap on model-to-model review rounds. One round = OpenAI review (+ optional Claude reply). */
export const AGENT_ROOM_MAX_REVIEW_ROUNDS = 2;

const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5";

/**
 * Deliberately conservative default. `gpt-4o` is a model we can name with
 * confidence and it supports the Responses API with strict structured outputs.
 * Set FTC_AGENT_ROOM_OPENAI_MODEL to whichever reviewer model you actually
 * want — the reviewer role rewards a stronger reasoning model.
 */
const DEFAULT_OPENAI_MODEL = "gpt-4o";

function trimmedEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

/**
 * The Agent Room is off unless explicitly switched on, and is refused outright
 * on Vercel so a stray platform environment variable can never expose an
 * internal tool to FTC users. There is no override for the hosting check.
 */
export function isAgentRoomEnabled(): boolean {
  if (process.env.VERCEL) {
    return false;
  }

  return process.env.FTC_AGENT_ROOM_ENABLED === "true";
}

export function getAnthropicModel(): string {
  return trimmedEnv("FTC_AGENT_ROOM_ANTHROPIC_MODEL") ?? DEFAULT_ANTHROPIC_MODEL;
}

export function getOpenAiModel(): string {
  return trimmedEnv("FTC_AGENT_ROOM_OPENAI_MODEL") ?? DEFAULT_OPENAI_MODEL;
}

export function getAnthropicApiKey(): string | null {
  return trimmedEnv("ANTHROPIC_API_KEY");
}

export function getOpenAiApiKey(): string | null {
  return trimmedEnv("OPENAI_API_KEY");
}

/* -------------------------------------------------------------------------- */
/* Request-size limits                                                        */
/* -------------------------------------------------------------------------- */

export const AGENT_ROOM_LIMITS = {
  /** Maximum bytes accepted on any Agent Room API request body. */
  maxRequestBytes: 256 * 1024,
  maxTitleChars: 200,
  maxDescriptionChars: 8_000,
  maxNoteChars: 4_000,
  maxBranchChars: 200,
  maxEvidenceItems: 25,
  maxEvidenceChars: 20_000,
  /** Ceiling on everything we assemble into a single provider prompt. */
  maxPromptChars: 120_000,
  /** Provider response ceiling. Thinking counts against this on Claude, so leave headroom. */
  maxOutputTokens: 16_000,
  /** Provider request timeout. */
  requestTimeoutMs: 180_000,
  /** Per-session execution lock cool-down between provider calls. */
  minCallIntervalMs: 2_000,
  /** Repository read limits (see repoAccess.ts). */
  maxFileExcerptBytes: 60_000,
  maxSearchMatches: 60,
  maxSessions: 200,
} as const;

/* -------------------------------------------------------------------------- */
/* Cost estimation                                                            */
/* -------------------------------------------------------------------------- */

export type ModelRate = { inputUsdPerMTok: number; outputUsdPerMTok: number };

/**
 * Only rates we can state with confidence are hard-coded. Anything absent
 * reports token counts with no dollar figure rather than a fabricated one —
 * set the OpenAI rates below via environment variables to price that half.
 */
const KNOWN_RATES: Record<string, ModelRate> = {
  "claude-opus-5": { inputUsdPerMTok: 5, outputUsdPerMTok: 25 },
  "claude-opus-4-8": { inputUsdPerMTok: 5, outputUsdPerMTok: 25 },
  "claude-sonnet-5": { inputUsdPerMTok: 3, outputUsdPerMTok: 15 },
  "claude-haiku-4-5": { inputUsdPerMTok: 1, outputUsdPerMTok: 5 },
};

function envRate(name: string): number | null {
  const raw = trimmedEnv(name);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function getModelRate(model: string): ModelRate | null {
  if (model === getOpenAiModel()) {
    const input = envRate("FTC_AGENT_ROOM_OPENAI_INPUT_USD_PER_MTOK");
    const output = envRate("FTC_AGENT_ROOM_OPENAI_OUTPUT_USD_PER_MTOK");

    if (input !== null && output !== null) {
      return { inputUsdPerMTok: input, outputUsdPerMTok: output };
    }
  }

  return KNOWN_RATES[model] ?? null;
}

export function estimateUsdCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const rate = getModelRate(model);

  if (!rate) {
    return null;
  }

  return (
    (inputTokens / 1_000_000) * rate.inputUsdPerMTok +
    (outputTokens / 1_000_000) * rate.outputUsdPerMTok
  );
}
