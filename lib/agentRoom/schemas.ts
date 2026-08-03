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
 *
 * Every agent response carries an `escalation` block. That block is the only
 * thing that stops the workflow and asks Isaac a question, so it is validated
 * exactly as strictly as the rest of the reply.
 */

import {
  ESCALATION_TYPES,
  isEscalationType,
  type Escalation,
  type EscalationType,
} from "./roles";

export type EvidenceItem = {
  file: string;
  lineOrSymbol: string;
  explanation: string;
};

export type RiskLevel = "low" | "medium" | "high";

export const RISK_LEVELS: readonly RiskLevel[] = ["low", "medium", "high"];

export type OpenAiVerdict = "AGREE" | "CHALLENGE" | "REJECT";

export const OPENAI_VERDICTS: readonly OpenAiVerdict[] = [
  "AGREE",
  "CHALLENGE",
  "REJECT",
];

export type QaVerdict = "READY" | "NEEDS_WORK" | "BLOCKED";

export const QA_VERDICTS: readonly QaVerdict[] = ["READY", "NEEDS_WORK", "BLOCKED"];

export type ReleaseVerdict = "READY" | "HOLD" | "SEND_BACK_TO_BUILDER";

export const RELEASE_VERDICTS: readonly ReleaseVerdict[] = [
  "READY",
  "HOLD",
  "SEND_BACK_TO_BUILDER",
];

export type ClaudeInvestigation = {
  summary: string;
  confirmedFacts: string[];
  unprovenAssumptions: string[];
  evidence: EvidenceItem[];
  proposedFix: string;
  risk: RiskLevel;
  confidence: RiskLevel;
  escalation: Escalation;
};

export type OpenAiReview = {
  verdict: OpenAiVerdict;
  summary: string;
  supportedClaims: string[];
  unsupportedClaims: string[];
  contradictions: string[];
  requiredEvidence: string[];
  recommendation: string;
  escalation: Escalation;
};

export type ClaudeRebuttal = {
  acceptedChallenges: string[];
  rejectedChallenges: string[];
  newEvidence: EvidenceItem[];
  revisedDiagnosis: string;
  revisedFix: string;
  remainingUncertainty: string;
  escalation: Escalation;
};

export type FileChange = {
  file: string;
  change: string;
  reason: string;
};

export type BuilderPlan = {
  summary: string;
  approach: string;
  /** What existing FTC code this reuses, per the pre-code decision ladder. */
  reuseNotes: string[];
  filesToChange: FileChange[];
  steps: string[];
  testStrategy: string;
  rollbackPlan: string;
  risk: RiskLevel;
  escalation: Escalation;
};

export type QaTestCase = {
  id: string;
  area: string;
  steps: string;
  expected: string;
};

export type QaPlan = {
  verdict: QaVerdict;
  summary: string;
  testCases: QaTestCase[];
  /** FTC_WORKFLOW.md §8 — 390px and 1280px behaviour, not just looks. */
  parityChecks: string[];
  regressionRisks: string[];
  gaps: string[];
  escalation: Escalation;
};

export type ReleaseAssessment = {
  verdict: ReleaseVerdict;
  summary: string;
  preflight: string[];
  blockers: string[];
  deploymentNotes: string;
  rollbackPlan: string;
  escalation: Escalation;
};

export type SessionSummary = {
  executiveSummary: string;
  technicalSummary: string;
  risks: string[];
  outstandingTasks: string[];
  finalRecommendation: string;
  /** Feeds the Decision Log without a second model call. */
  rootCause: string;
  evidenceSummary: string;
  followUpItems: string[];
};

/* -------------------------------------------------------------------------- */
/* Schema fragments                                                           */
/* -------------------------------------------------------------------------- */

const stringArray = (description: string) => ({
  type: "array",
  items: { type: "string" },
  description,
});

const ESCALATION_SCHEMA = {
  type: "object",
  description:
    "Set required=true only for a product decision, a genuine choice between valid implementations, a release decision, or an unrecoverable blocker. Otherwise required=false and type='none'.",
  properties: {
    required: { type: "boolean" },
    type: { type: "string", enum: ESCALATION_TYPES },
    question: {
      type: "string",
      description: "One specific question for Isaac. Empty string when required is false.",
    },
    options: stringArray("Concrete options Isaac can choose between. Empty when required is false."),
  },
  required: ["required", "type", "question", "options"],
  additionalProperties: false,
} as const;

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
    escalation: ESCALATION_SCHEMA,
  },
  required: [
    "summary",
    "confirmedFacts",
    "unprovenAssumptions",
    "evidence",
    "proposedFix",
    "risk",
    "confidence",
    "escalation",
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
    recommendation: { type: "string", description: "What should happen next." },
    escalation: ESCALATION_SCHEMA,
  },
  required: [
    "verdict",
    "summary",
    "supportedClaims",
    "unsupportedClaims",
    "contradictions",
    "requiredEvidence",
    "recommendation",
    "escalation",
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
    escalation: ESCALATION_SCHEMA,
  },
  required: [
    "acceptedChallenges",
    "rejectedChallenges",
    "newEvidence",
    "revisedDiagnosis",
    "revisedFix",
    "remainingUncertainty",
    "escalation",
  ],
  additionalProperties: false,
} as const;

export const BUILDER_PLAN_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "What you propose to change, in a few sentences." },
    approach: { type: "string", description: "How the fix works and why this is the smallest one." },
    reuseNotes: stringArray(
      "Existing FTC components, hooks, helpers or tokens this reuses instead of adding something new.",
    ),
    filesToChange: {
      type: "array",
      description: "Every file the change touches. A plan, not a patch — do not write the code.",
      items: {
        type: "object",
        properties: {
          file: { type: "string" },
          change: { type: "string", description: "What changes in this file." },
          reason: { type: "string", description: "Why this file has to change." },
        },
        required: ["file", "change", "reason"],
        additionalProperties: false,
      },
    },
    steps: stringArray("Ordered steps a human Builder would follow in their own worktree."),
    testStrategy: { type: "string", description: "How the change will be proved to work." },
    rollbackPlan: { type: "string", description: "How to undo this if it goes wrong." },
    risk: { type: "string", enum: RISK_LEVELS },
    escalation: ESCALATION_SCHEMA,
  },
  required: [
    "summary",
    "approach",
    "reuseNotes",
    "filesToChange",
    "steps",
    "testStrategy",
    "rollbackPlan",
    "risk",
    "escalation",
  ],
  additionalProperties: false,
} as const;

export const QA_PLAN_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: QA_VERDICTS },
    summary: { type: "string", description: "Whether this plan can be verified, and how confidently." },
    testCases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Short stable id, e.g. QA-1." },
          area: { type: "string", description: "Feature area, e.g. Crew Chat." },
          steps: { type: "string" },
          expected: { type: "string" },
        },
        required: ["id", "area", "steps", "expected"],
        additionalProperties: false,
      },
    },
    parityChecks: stringArray(
      "Checks at 390px and 1280px covering behaviour, not just appearance.",
    ),
    regressionRisks: stringArray("What this change could break elsewhere."),
    gaps: stringArray("What the plan does not cover and should."),
    escalation: ESCALATION_SCHEMA,
  },
  required: [
    "verdict",
    "summary",
    "testCases",
    "parityChecks",
    "regressionRisks",
    "gaps",
    "escalation",
  ],
  additionalProperties: false,
} as const;

export const RELEASE_ASSESSMENT_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: RELEASE_VERDICTS },
    summary: { type: "string", description: "Release readiness in a few sentences." },
    preflight: stringArray("Checks that must pass before this reaches users."),
    blockers: stringArray("Anything that must be resolved first. Empty when there are none."),
    deploymentNotes: { type: "string", description: "Anything unusual about shipping this." },
    rollbackPlan: { type: "string", description: "How to back this out of Production." },
    escalation: ESCALATION_SCHEMA,
  },
  required: [
    "verdict",
    "summary",
    "preflight",
    "blockers",
    "deploymentNotes",
    "rollbackPlan",
    "escalation",
  ],
  additionalProperties: false,
} as const;

export const SESSION_SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    executiveSummary: {
      type: "string",
      description: "For someone who read none of the thread. What happened and what it means.",
    },
    technicalSummary: {
      type: "string",
      description: "For an engineer picking this up. Cause, fix, and how it was established.",
    },
    risks: stringArray("What could still go wrong."),
    outstandingTasks: stringArray("What is still to do, in order."),
    finalRecommendation: { type: "string", description: "One clear recommendation." },
    rootCause: { type: "string", description: "The proven cause in one or two sentences." },
    evidenceSummary: { type: "string", description: "The evidence that established it." },
    followUpItems: stringArray("Anything worth doing later that is out of scope now."),
  },
  required: [
    "executiveSummary",
    "technicalSummary",
    "risks",
    "outstandingTasks",
    "finalRecommendation",
    "rootCause",
    "evidenceSummary",
    "followUpItems",
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

function readString(record: Record<string, unknown>, key: string): string | null {
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

/** Reads an array of objects with a fixed set of string fields. */
function readObjectArray<T>(
  record: Record<string, unknown>,
  key: string,
  fields: readonly (keyof T & string)[],
): T[] | null {
  const value = record[key];

  if (!Array.isArray(value)) {
    return null;
  }

  const items: T[] = [];

  for (const entry of value) {
    const item = asRecord(entry);

    if (!item) {
      return null;
    }

    const built: Record<string, string> = {};

    for (const field of fields) {
      const fieldValue = readString(item, field);

      if (fieldValue === null) {
        return null;
      }

      built[field] = fieldValue;
    }

    items.push(built as T);
  }

  return items;
}

function readEvidence(
  record: Record<string, unknown>,
  key: string,
): EvidenceItem[] | null {
  return readObjectArray<EvidenceItem>(record, key, [
    "file",
    "lineOrSymbol",
    "explanation",
  ]);
}

/**
 * Escalation is validated strictly and then *normalised*: an agent that sets
 * `required: true` with no question, or picks `type: "none"` while demanding
 * attention, would otherwise stop the workflow with nothing for Isaac to act
 * on. An incoherent escalation is downgraded to "no escalation" rather than
 * being trusted, because the failure mode we care about is a workflow that
 * halts for no stated reason.
 */
function readEscalation(record: Record<string, unknown>): Escalation | null {
  const raw = asRecord(record.escalation);

  if (!raw) {
    return null;
  }

  const required = raw.required;
  const type = raw.type;
  const question = readString(raw, "question");
  const options = readStringArray(raw, "options");

  if (typeof required !== "boolean" || !isEscalationType(type) || question === null || options === null) {
    return null;
  }

  const coherent = required && type !== "none" && question.trim().length > 0;

  return coherent
    ? { required: true, type: type as EscalationType, question: question.trim(), options }
    : { required: false, type: "none", question: "", options: [] };
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
    return { ok: false, error: "The provider did not return valid JSON." };
  }
}

function missingFields(label: string): { ok: false; error: string } {
  return {
    ok: false,
    error: `${label} was missing required fields or used the wrong types.`,
  };
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
  const escalation = readEscalation(record);

  if (
    summary === null ||
    confirmedFacts === null ||
    unprovenAssumptions === null ||
    evidence === null ||
    proposedFix === null ||
    escalation === null
  ) {
    return missingFields("Claude's investigation");
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
      escalation,
    },
  };
}

export function validateOpenAiReview(value: unknown): ValidationResult<OpenAiReview> {
  const record = asRecord(value);

  if (!record) {
    return { ok: false, error: "The OpenAI review was not a JSON object." };
  }

  const verdict = readString(record, "verdict");

  if (!isOpenAiVerdict(verdict)) {
    return {
      ok: false,
      error: "The OpenAI review did not return exactly one of AGREE, CHALLENGE or REJECT.",
    };
  }

  const summary = readString(record, "summary");
  const supportedClaims = readStringArray(record, "supportedClaims");
  const unsupportedClaims = readStringArray(record, "unsupportedClaims");
  const contradictions = readStringArray(record, "contradictions");
  const requiredEvidence = readStringArray(record, "requiredEvidence");
  const recommendation = readString(record, "recommendation");
  const escalation = readEscalation(record);

  if (
    summary === null ||
    supportedClaims === null ||
    unsupportedClaims === null ||
    contradictions === null ||
    requiredEvidence === null ||
    recommendation === null ||
    escalation === null
  ) {
    return missingFields("The OpenAI review");
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
      escalation,
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
  const escalation = readEscalation(record);

  if (
    acceptedChallenges === null ||
    rejectedChallenges === null ||
    newEvidence === null ||
    revisedDiagnosis === null ||
    revisedFix === null ||
    remainingUncertainty === null ||
    escalation === null
  ) {
    return missingFields("Claude's response to the review");
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
      escalation,
    },
  };
}

export function validateBuilderPlan(value: unknown): ValidationResult<BuilderPlan> {
  const record = asRecord(value);

  if (!record) {
    return { ok: false, error: "The Builder plan was not a JSON object." };
  }

  const summary = readString(record, "summary");
  const approach = readString(record, "approach");
  const reuseNotes = readStringArray(record, "reuseNotes");
  const filesToChange = readObjectArray<FileChange>(record, "filesToChange", [
    "file",
    "change",
    "reason",
  ]);
  const steps = readStringArray(record, "steps");
  const testStrategy = readString(record, "testStrategy");
  const rollbackPlan = readString(record, "rollbackPlan");
  const risk = readString(record, "risk");
  const escalation = readEscalation(record);

  if (
    summary === null ||
    approach === null ||
    reuseNotes === null ||
    filesToChange === null ||
    steps === null ||
    testStrategy === null ||
    rollbackPlan === null ||
    escalation === null
  ) {
    return missingFields("The Builder plan");
  }

  if (!isRiskLevel(risk)) {
    return { ok: false, error: "The Builder plan returned a risk outside low / medium / high." };
  }

  return {
    ok: true,
    value: {
      summary,
      approach,
      reuseNotes,
      filesToChange,
      steps,
      testStrategy,
      rollbackPlan,
      risk,
      escalation,
    },
  };
}

export function validateQaPlan(value: unknown): ValidationResult<QaPlan> {
  const record = asRecord(value);

  if (!record) {
    return { ok: false, error: "The QA plan was not a JSON object." };
  }

  const verdict = readString(record, "verdict");

  if (!isQaVerdict(verdict)) {
    return {
      ok: false,
      error: "The QA plan did not return exactly one of READY, NEEDS_WORK or BLOCKED.",
    };
  }

  const summary = readString(record, "summary");
  const testCases = readObjectArray<QaTestCase>(record, "testCases", [
    "id",
    "area",
    "steps",
    "expected",
  ]);
  const parityChecks = readStringArray(record, "parityChecks");
  const regressionRisks = readStringArray(record, "regressionRisks");
  const gaps = readStringArray(record, "gaps");
  const escalation = readEscalation(record);

  if (
    summary === null ||
    testCases === null ||
    parityChecks === null ||
    regressionRisks === null ||
    gaps === null ||
    escalation === null
  ) {
    return missingFields("The QA plan");
  }

  return {
    ok: true,
    value: {
      verdict,
      summary,
      testCases,
      parityChecks,
      regressionRisks,
      gaps,
      escalation,
    },
  };
}

export function validateReleaseAssessment(
  value: unknown,
): ValidationResult<ReleaseAssessment> {
  const record = asRecord(value);

  if (!record) {
    return { ok: false, error: "The release assessment was not a JSON object." };
  }

  const verdict = readString(record, "verdict");

  if (!isReleaseVerdict(verdict)) {
    return {
      ok: false,
      error:
        "The release assessment did not return exactly one of READY, HOLD or SEND_BACK_TO_BUILDER.",
    };
  }

  const summary = readString(record, "summary");
  const preflight = readStringArray(record, "preflight");
  const blockers = readStringArray(record, "blockers");
  const deploymentNotes = readString(record, "deploymentNotes");
  const rollbackPlan = readString(record, "rollbackPlan");
  const escalation = readEscalation(record);

  if (
    summary === null ||
    preflight === null ||
    blockers === null ||
    deploymentNotes === null ||
    rollbackPlan === null ||
    escalation === null
  ) {
    return missingFields("The release assessment");
  }

  return {
    ok: true,
    value: {
      verdict,
      summary,
      preflight,
      blockers,
      deploymentNotes,
      rollbackPlan,
      escalation,
    },
  };
}

export function validateSessionSummary(
  value: unknown,
): ValidationResult<SessionSummary> {
  const record = asRecord(value);

  if (!record) {
    return { ok: false, error: "The session summary was not a JSON object." };
  }

  const executiveSummary = readString(record, "executiveSummary");
  const technicalSummary = readString(record, "technicalSummary");
  const risks = readStringArray(record, "risks");
  const outstandingTasks = readStringArray(record, "outstandingTasks");
  const finalRecommendation = readString(record, "finalRecommendation");
  const rootCause = readString(record, "rootCause");
  const evidenceSummary = readString(record, "evidenceSummary");
  const followUpItems = readStringArray(record, "followUpItems");

  if (
    executiveSummary === null ||
    technicalSummary === null ||
    risks === null ||
    outstandingTasks === null ||
    finalRecommendation === null ||
    rootCause === null ||
    evidenceSummary === null ||
    followUpItems === null
  ) {
    return missingFields("The session summary");
  }

  return {
    ok: true,
    value: {
      executiveSummary,
      technicalSummary,
      risks,
      outstandingTasks,
      finalRecommendation,
      rootCause,
      evidenceSummary,
      followUpItems,
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

export function isQaVerdict(value: unknown): value is QaVerdict {
  return typeof value === "string" && (QA_VERDICTS as readonly string[]).includes(value);
}

export function isReleaseVerdict(value: unknown): value is ReleaseVerdict {
  return (
    typeof value === "string" && (RELEASE_VERDICTS as readonly string[]).includes(value)
  );
}
