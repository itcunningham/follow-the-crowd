/**
 * FTC Agent Room — provider calls.
 *
 * Both providers are called server-side only. Neither API key is ever placed
 * in a response body, a log line, or anything the browser can reach; provider
 * request headers are never logged, and error text is redacted before it is
 * shown or stored.
 *
 * Chain-of-thought is never requested and never kept. The Anthropic default
 * (`thinking.display: "omitted"`) leaves thinking text empty, and we
 * additionally keep only `text` blocks from the response — so a future default
 * change cannot start persisting reasoning behind our backs.
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import {
  AGENT_ROOM_LIMITS,
  estimateUsdCost,
  getAnthropicApiKey,
  getAnthropicModel,
  getOpenAiApiKey,
  getOpenAiModel,
} from "./config";
import { redactSecrets } from "./redaction";
import type { AgentRoomHandoff } from "./prompts";
import type { AgentRoomUsage } from "./types";

export type ProviderResult =
  | { ok: true; text: string; usage: AgentRoomUsage }
  | { ok: false; error: string };

/** Provider errors reach the UI as prose, with any credential-shaped text removed. */
function describeError(error: unknown): string {
  if (error instanceof Anthropic.APIError || error instanceof OpenAI.APIError) {
    const status = error.status ?? "unknown";

    if (status === 401) {
      return "The provider rejected the API key. Check the key in .env.local.";
    }
    if (status === 404) {
      return "The provider does not recognise that model name. Check the model environment variable.";
    }
    if (status === 429) {
      return "The provider rate-limited this request. Wait a moment and try again.";
    }
    if (typeof status === "number" && status >= 500) {
      return "The provider is having trouble right now. Try again shortly.";
    }

    return `The provider rejected the request (${status}): ${redactSecrets(error.message).text}`;
  }

  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return "The request to Anthropic timed out.";
  }

  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return "The request to OpenAI timed out.";
  }

  if (error instanceof Anthropic.APIConnectionError || error instanceof OpenAI.APIConnectionError) {
    return "Could not reach the provider. Check your network connection.";
  }

  if (error instanceof Error) {
    return redactSecrets(error.message).text;
  }

  return "The provider call failed for an unknown reason.";
}

async function callAnthropic(handoff: AgentRoomHandoff): Promise<ProviderResult> {
  const apiKey = getAnthropicApiKey();

  if (!apiKey) {
    return { ok: false, error: "ANTHROPIC_API_KEY is not set in .env.local." };
  }

  const model = getAnthropicModel();
  const startedAt = Date.now();

  const client = new Anthropic({
    apiKey,
    timeout: AGENT_ROOM_LIMITS.requestTimeoutMs,
    maxRetries: 1,
  });

  try {
    const message = await client.messages.create({
      model,
      max_tokens: AGENT_ROOM_LIMITS.maxOutputTokens,
      system: handoff.system,
      messages: [{ role: "user", content: handoff.user }],
      output_config: {
        format: { type: "json_schema", schema: handoff.schema },
      },
    });

    if (message.stop_reason === "refusal") {
      return {
        ok: false,
        error: "Claude declined this request. Rewording the task description usually clears it.",
      };
    }

    // Only `text` blocks — thinking blocks are dropped, never stored.
    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (message.stop_reason === "max_tokens") {
      return {
        ok: false,
        error: "Claude hit the output limit before finishing. Trim the evidence and try again.",
      };
    }

    const inputTokens = message.usage.input_tokens;
    const outputTokens = message.usage.output_tokens;

    return {
      ok: true,
      text,
      usage: {
        provider: "anthropic",
        model,
        inputTokens,
        outputTokens,
        estimatedUsd: estimateUsdCost(model, inputTokens, outputTokens),
        durationMs: Date.now() - startedAt,
      },
    };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

async function callOpenAi(handoff: AgentRoomHandoff): Promise<ProviderResult> {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    return { ok: false, error: "OPENAI_API_KEY is not set in .env.local." };
  }

  const model = getOpenAiModel();
  const startedAt = Date.now();

  const client = new OpenAI({
    apiKey,
    timeout: AGENT_ROOM_LIMITS.requestTimeoutMs,
    maxRetries: 1,
  });

  try {
    const response = await client.responses.create({
      model,
      instructions: handoff.system,
      input: handoff.user,
      max_output_tokens: AGENT_ROOM_LIMITS.maxOutputTokens,
      text: {
        format: {
          type: "json_schema",
          name: handoff.schemaName,
          schema: handoff.schema,
          strict: true,
        },
      },
    });

    if (response.status === "incomplete") {
      return {
        ok: false,
        error: "OpenAI stopped before finishing the review. Trim the evidence and try again.",
      };
    }

    const text = response.output_text ?? "";
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;

    return {
      ok: true,
      text,
      usage: {
        provider: "openai",
        model,
        inputTokens,
        outputTokens,
        estimatedUsd: estimateUsdCost(model, inputTokens, outputTokens),
        durationMs: Date.now() - startedAt,
      },
    };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

export async function runHandoff(
  handoff: AgentRoomHandoff,
): Promise<ProviderResult> {
  return handoff.provider === "anthropic"
    ? callAnthropic(handoff)
    : callOpenAi(handoff);
}
