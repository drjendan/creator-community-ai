import "server-only";

import type { AIProviderId } from "@/lib/ai/provider-catalog";

export type ProviderErrorCode =
  | "invalid_credential"
  | "model_unavailable"
  | "rate_limited"
  | "insufficient_credits"
  | "provider_timeout"
  | "provider_unavailable"
  | "unknown_error";

export type ProviderUsage = { inputTokens: number; outputTokens: number };
export type GeneratedText = { text: string; usage: ProviderUsage };
export type ConnectionTestResult =
  | { ok: true }
  | { ok: false; code: ProviderErrorCode };

export interface AIProviderAdapter {
  testConnection(apiKey: string, model: string): Promise<ConnectionTestResult>;
  generateText(apiKey: string, model: string, prompt: string): Promise<GeneratedText>;
}

function codeForStatus(status: number, body?: string): ProviderErrorCode {
  if (status === 401 || status === 403) return "invalid_credential";
  if (status === 404) return "model_unavailable";
  if (status === 429) return /credit|quota|billing/i.test(body ?? "") ? "insufficient_credits" : "rate_limited";
  if (status >= 500) return "provider_unavailable";
  return "unknown_error";
}

async function safeFetch(url: string, init: RequestInit) {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
  } catch (error) {
    if (error instanceof Error && /timeout|abort/i.test(error.message)) {
      throw new ProviderAdapterError("provider_timeout");
    }
    throw new ProviderAdapterError("provider_unavailable");
  }
}

export class ProviderAdapterError extends Error {
  constructor(public readonly code: ProviderErrorCode) {
    super(code);
  }
}

async function resultOrError(response: Response) {
  const text = await response.text();
  if (!response.ok) throw new ProviderAdapterError(codeForStatus(response.status, text));
  return text ? JSON.parse(text) : {};
}

const openAI: AIProviderAdapter = {
  async testConnection(apiKey, model) {
    try {
      const response = await safeFetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      await resultOrError(response);
      return { ok: true };
    } catch (error) {
      return { ok: false, code: error instanceof ProviderAdapterError ? error.code : "unknown_error" };
    }
  },
  async generateText(apiKey, model, prompt) {
    const response = await safeFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: "system", content: "Use only the supplied source. Do not invent facts." }, { role: "user", content: prompt }] })
    });
    const result = await resultOrError(response);
    return { text: String(result.choices?.[0]?.message?.content ?? ""), usage: { inputTokens: result.usage?.prompt_tokens ?? 0, outputTokens: result.usage?.completion_tokens ?? 0 } };
  }
};

const anthropic: AIProviderAdapter = {
  async testConnection(apiKey, model) {
    try {
      const response = await safeFetch(`https://api.anthropic.com/v1/models/${encodeURIComponent(model)}`, {
        method: "GET",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
      });
      await resultOrError(response);
      return { ok: true };
    } catch (error) {
      return { ok: false, code: error instanceof ProviderAdapterError ? error.code : "unknown_error" };
    }
  },
  async generateText(apiKey, model, prompt) {
    const response = await safeFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 3000, messages: [{ role: "user", content: prompt }] })
    });
    const result = await resultOrError(response);
    return { text: String(result.content?.[0]?.text ?? ""), usage: { inputTokens: result.usage?.input_tokens ?? 0, outputTokens: result.usage?.output_tokens ?? 0 } };
  }
};

const google: AIProviderAdapter = {
  async testConnection(apiKey, model) {
    try {
      const response = await safeFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`, {
        method: "GET",
        headers: { "x-goog-api-key": apiKey }
      });
      await resultOrError(response);
      return { ok: true };
    } catch (error) {
      return { ok: false, code: error instanceof ProviderAdapterError ? error.code : "unknown_error" };
    }
  },
  async generateText(apiKey, model, prompt) {
    const response = await safeFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const result = await resultOrError(response);
    const usage = result.usageMetadata ?? {};
    return { text: String(result.candidates?.[0]?.content?.parts?.[0]?.text ?? ""), usage: { inputTokens: usage.promptTokenCount ?? 0, outputTokens: usage.candidatesTokenCount ?? 0 } };
  }
};

export function getProviderAdapter(provider: AIProviderId): AIProviderAdapter {
  return { openai: openAI, anthropic, google }[provider];
}

export function providerErrorMessage(code: ProviderErrorCode) {
  const messages: Record<ProviderErrorCode, string> = {
    invalid_credential: "The provider rejected the credential. Verify the API key and account permissions.",
    model_unavailable: "The credential is valid, but the selected model is not available to this account.",
    rate_limited: "The provider accepted the credential, but the account is currently rate limited.",
    insufficient_credits: "The provider account does not have sufficient credits or quota.",
    provider_timeout: "The provider did not respond in time. Try again.",
    provider_unavailable: "The provider is temporarily unavailable. Try again later.",
    unknown_error: "The connection could not be verified."
  };
  return messages[code];
}
