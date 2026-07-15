export function isAiEventGenerationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FTC_AI_EVENT_GENERATION_ENABLED === "true";
}

export function isAiEventGenerationEnabledServer(): boolean {
  return process.env.FTC_AI_EVENT_GENERATION_ENABLED === "true";
}
