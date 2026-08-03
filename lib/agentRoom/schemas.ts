/**
 * FTC Agent Room — structured response schemas and validators.
 *
 * The same JSON Schema object is handed to both providers (Anthropic
 * `output_config.format`, OpenAI `text.format` with `strict: true`) and is
 * then re-validated here on the way back. Provider-side enforcement is a
 * convenience; the validators below are the contract. A malformed response is
 * an error we surface in plain English, never a partially-trusted object.
 *
 * Every property is listed in `required` and `additionalProperties` is false
 * on every object, because OpenAI strict mode demands both.
 */

export type EvidenceItem = {
  file: string;
  lineOrSymbol: string;
  explanation: string;
};

export type ClaudeInvestigation = {
  summary: string;
  confirmedFacts: string[];
  unprovenAssumptions: string[];
  evidence: EvidenceItem[];
  proposedFix: string;
  risk: RiskLevel;
  confidence: RiskLevel;
};

export type OpenAiVerdict = "AGREE" | "CHALLENGE" | "REJECT";

export type OpenAiReview = {
  verdict: OpenAiVerdict;
  summary: string;
  supportedClaims: string[];
  unsupportedClaims: string[];
  contradictions: string[];
  requiredEvidence: string[];
  recommendation: string;
};

export type ClaudeRebuttal = {
  acceptedChallenges: string[];
  rejectedChallenges: string[];
  newEvidence: EvidenceItem[];
  revisedDiagnosis: string;
  revisedFix: string;
  remainingUncertainty: string;
};

export type RiskLevel = "low" | "medium" | "high";

export const RISK_LEVELS: readonly RiskLevel[] = ["low", "medium", "high"];
export const OPENAI_VERDICTS: readonly OpenAiVerdict[] = [
  "AGREE",
  "CHALLENGE",
  "REJECT",
];

const stringArray = (description: string) => ({
  type: "array",
  items: { type: "string" },
  description,
});

const evidenceArray = (description: string) => ({
  type: "array",
  description,
  items: {
    type: "object",
    properties: {
      file: { type: "string", description: "Repository-relative path." },
      lineOrSymbol: {
        type: "string",
        description: "Line number, range, or the function/symbol name inspected.",
      },
      explanation: {
        type: "string",
        description: "What this location proves. Not what it might imply.",
      },
    },
    required: ["file", "lineOrSymbol", "explanation"],
    additionalProperties: false,
  },
});

export const CLAUDE_INVESTIGATION_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "The diagnosis in a few sentences." },
    confirmedFacts: stringArray("Facts proved by the evidence supplied."),
    unprovenAssumptions: stringArray(
      "Assumptions still unproved. Be honest; an empty list must mean nothing is assumed.",
    ),
    evidence: evidenceArray("Exact files, functions and lines inspected."),
    proposedFix: {
      type: "string",
      description: "The smallest fix that addresses the proven cause.",
    },
    risk: { type: "string", enum: RISK_LEVELS },
    confidence: { type: "string", enum: RISK_LEVELS },
  },
  required: [
    "summary",
    "confirmedFacts",
    "unprovenAssumptions",
    "evidence",
    "proposedFix",
    "risk",
    "confidence",
  ],
  additionalProperties: false,
} as const;

export const OPENAI_REVIEW_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: OPENAI_VERDICTS },
    summary: { type: "string", description: "Why you reached that verdict." },
    supportedClaims: stringArray("Claims the evidence actually supports."),
    unsupportedClaims: stringArray(
      "Claims presented as fact but not established by the evidence.",
    ),
    contradictions: stringArray(
      "Places where the report contradicts itself or the original bug report.",
    ),
    requiredEvidence: stringArray(
      "Specific evidence that would settle the open questions.",
    ),
    recommendation: { type: "string", description: "What the supervisor should do next." },
  },
  required: [
    "verdict",
    "summary",
    "supportedClaims",
    "unsupportedClaims",
    "contradictions",
    "requiredEvidence",
    "recommendation",
  ],
  additionalProperties: false,
} as const;

export const CLAUDE_REBUTTAL_SCHEMA = {
  type: "object",
  properties: {
    acceptedChallenges: stringArray("Challenges you accept, restated plainly."),
    rejectedChallenges: stringArray("Challenges you reject, each with the reason."),
    newEvidence: evidenceArray("Any further evidence, same shape as before."),
    revisedDiagnosis: {
      type: "string",
      description: "The diagnosis after the review. Say so if it is unchanged.",
    },
    revisedFix: { type: "string", description: "The smallest fix after the review." },
    remainingUncertainty: {
      type: "string",
      description: "What is still not proved.",
    },
  },
  required: [
    "acceptedChallenges",
    "rejectedChallenges",
    "newEvidence",
    "revisedDiagnosis",
    "revisedFix",
    "remainingUncertainty",
  ],
  additionalProperties: false,
} as const;

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function readStringArray(
  record: Record<string, unknown>,
  key: string,
): string[] | null {
  const value = record[key];

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    return null;
  }

  return value as string[];
}

function readEvidence(
  record: Record<string, unknown>,
  key: string,
): EvidenceItem[] | null {
  const value = record[key];

  if (!Array.isArray(value)) {
    return null;
  }

  const items: EvidenceItem[] = [];

  for (const entry of value) {
    const item = asRecord(entry);

    if (!item) {
      return null;
    }

    const file = readString(item, "file");
    const lineOrSymbol = readString(item, "lineOrSymbol");
    const explanation = readString(item, "explanation");

    if (file === null || lineOrSymbol === null || explanation === null) {
      return null;
    }

    items.push({ file, lineOrSymbol, explanation });
  }

  return items;
}

/** Parses provider text as JSON without throwing. */
export function parseJsonSafely(raw: string): ValidationResult<unknown> {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { ok: false, error: "The provider returned an empty response." };
  }

  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch {
    return {
      ok: false,
      error: "The provider did not return valid JSON.",
    };
  }
}

export function validateClaudeInvestigation(
  value: unknown,
): ValidationResult<ClaudeInvestigation> {
  const record = asRecord(value);

  if (!record) {
    return { ok: false, error: "Claude's investigation was not a JSON object." };
  }

  const summary = readString(record, "summary");
  const confirmedFacts = readStringArray(record, "confirmedFacts");
  const unprovenAssumptions = readStringArray(record, "unprovenAssumptions");
  const evidence = readEvidence(record, "evidence");
  const proposedFix = readString(record, "proposedFix");
  const risk = readString(record, "risk");
  const confidence = readString(record, "confidence");

  if (
    summary === null ||
    confirmedFacts === null ||
    unprovenAssumptions === null ||
    evidence === null ||
    proposedFix === null
  ) {
    return {
      ok: false,
      error: "Claude's investigation was missing required fields or used the wrong types.",
    };
  }

  if (!isRiskLevel(risk) || !isRiskLevel(confidence)) {
    return {
      ok: false,
      error: "Claude returned a risk or confidence value outside low / medium / high.",
    };
  }

  return {
    ok: true,
    value: {
      summary,
      confirmedFacts,
      unprovenAssumptions,
      evidence,
      proposedFix,
      risk,
      confidence,
    },
  };
}

export function validateOpenAiReview(
  value: unknown,
): ValidationResult<OpenAiReview> {
  const record = asRecord(value);

  if (!record) {
    return { ok: false, error: "The OpenAI review was not a JSON object." };
  }

  const verdict = readString(record, "verdict");
  const summary = readString(record, "summary");
  const supportedClaims = readStringArray(record, "supportedClaims");
  const unsupportedClaims = readStringArray(record, "unsupportedClaims");
  const contradictions = readStringArray(record, "contradictions");
  const requiredEvidence = readStringArray(record, "requiredEvidence");
  const recommendation = readString(record, "recommendation");

  if (!isOpenAiVerdict(verdict)) {
    return {
      ok: false,
      error: "The OpenAI review did not return exactly one of AGREE, CHALLENGE or REJECT.",
    };
  }

  if (
    summary === null ||
    supportedClaims === null ||
    unsupportedClaims === null ||
    contradictions === null ||
    requiredEvidence === null ||
    recommendation === null
  ) {
    return {
      ok: false,
      error: "The OpenAI review was missing required fields or used the wrong types.",
    };
  }

  return {
    ok: true,
    value: {
      verdict,
      summary,
      supportedClaims,
      unsupportedClaims,
      contradictions,
      requiredEvidence,
      recommendation,
    },
  };
}

export function validateClaudeRebuttal(
  value: unknown,
): ValidationResult<ClaudeRebuttal> {
  const record = asRecord(value);

  if (!record) {
    return { ok: false, error: "Claude's response to the review was not a JSON object." };
  }

  const acceptedChallenges = readStringArray(record, "acceptedChallenges");
  const rejectedChallenges = readStringArray(record, "rejectedChallenges");
  const newEvidence = readEvidence(record, "newEvidence");
  const revisedDiagnosis = readString(record, "revisedDiagnosis");
  const revisedFix = readString(record, "revisedFix");
  const remainingUncertainty = readString(record, "remainingUncertainty");

  if (
    acceptedChallenges === null ||
    rejectedChallenges === null ||
    newEvidence === null ||
    revisedDiagnosis === null ||
    revisedFix === null ||
    remainingUncertainty === null
  ) {
    return {
      ok: false,
      error:
        "Claude's response to the review was missing required fields or used the wrong types.",
    };
  }

  return {
    ok: true,
    value: {
      acceptedChallenges,
      rejectedChallenges,
      newEvidence,
      revisedDiagnosis,
      revisedFix,
      remainingUncertainty,
    },
  };
}

export function isRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === "string" && (RISK_LEVELS as readonly string[]).includes(value);
}

export function isOpenAiVerdict(value: unknown): value is OpenAiVerdict {
  return (
    typeof value === "string" && (OPENAI_VERDICTS as readonly string[]).includes(value)
  );
}
