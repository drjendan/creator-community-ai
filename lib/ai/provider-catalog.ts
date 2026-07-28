export const providerIds = ["openai", "anthropic", "google"] as const;
export type AIProviderId = (typeof providerIds)[number];

export function isAIProviderId(value: string): value is AIProviderId {
  return providerIds.includes(value as AIProviderId);
}

export const providerCatalog: Record<AIProviderId, {
  label: string;
  keyLabel: string;
  models: Array<{ id: string; label: string }>;
}> = {
  openai: {
    label: "OpenAI",
    keyLabel: "OpenAI API key",
    models: [
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" }
    ]
  },
  anthropic: {
    label: "Anthropic Claude",
    keyLabel: "Anthropic API key",
    models: [
      { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" }
    ]
  },
  google: {
    label: "Google Gemini",
    keyLabel: "Google AI API key",
    models: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" }
    ]
  }
};

export function isAllowedModel(provider: AIProviderId, model: string) {
  return providerCatalog[provider].models.some((item) => item.id === model);
}
