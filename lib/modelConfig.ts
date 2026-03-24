// ──────────────────────────────────────────────────────────────────────────────
// AI Model Configuration — Central registry for all supported AI models
// and their token pricing. Update this file when prices or models change.
// ──────────────────────────────────────────────────────────────────────────────

export interface AIModelConfig {
  id: string;
  name: string;
  provider: "openai" | "google" | "anthropic";
  description: string;
  inputPricePerMToken: number;   // $ per 1M input tokens
  outputPricePerMToken: number;  // $ per 1M output tokens
  maxContextTokens: number;
  isDefault: boolean;
  badgeColor: string;            // Tailwind color class for UI badge
}

export const AI_MODELS: AIModelConfig[] = [
  // ── OpenAI Frontier / Thinking Models ──
  {
    id: "o3-pro",
    name: "o3-pro",
    provider: "openai",
    description: "Most powerful reasoning model. Extended thinking for complex circuit optimization.",
    inputPricePerMToken: 20.00,
    outputPricePerMToken: 80.00,
    maxContextTokens: 200_000,
    isDefault: false,
    badgeColor: "rose",
  },
  {
    id: "o3",
    name: "o3",
    provider: "openai",
    description: "Advanced reasoning model with deep thinking. Ideal for complex circuit design.",
    inputPricePerMToken: 10.00,
    outputPricePerMToken: 40.00,
    maxContextTokens: 200_000,
    isDefault: false,
    badgeColor: "orange",
  },
  {
    id: "o4-mini",
    name: "o4-mini",
    provider: "openai",
    description: "Fast reasoning model. Great balance of speed and thinking depth.",
    inputPricePerMToken: 1.10,
    outputPricePerMToken: 4.40,
    maxContextTokens: 200_000,
    isDefault: false,
    badgeColor: "amber",
  },
  // ── OpenAI GPT Models ──
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    description: "OpenAI's most capable GPT model. Best for complex circuit design reasoning.",
    inputPricePerMToken: 2.50,
    outputPricePerMToken: 10.00,
    maxContextTokens: 128_000,
    isDefault: true,
    badgeColor: "emerald",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    description: "Cost-effective model for simpler circuit tasks and quick iterations.",
    inputPricePerMToken: 0.15,
    outputPricePerMToken: 0.60,
    maxContextTokens: 128_000,
    isDefault: false,
    badgeColor: "cyan",
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "openai",
    description: "Latest GPT model with enhanced coding and instruction following.",
    inputPricePerMToken: 2.00,
    outputPricePerMToken: 8.00,
    maxContextTokens: 1_000_000,
    isDefault: false,
    badgeColor: "violet",
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "openai",
    description: "Fast and affordable GPT-4.1 variant for routine circuit tasks.",
    inputPricePerMToken: 0.40,
    outputPricePerMToken: 1.60,
    maxContextTokens: 1_000_000,
    isDefault: false,
    badgeColor: "teal",
  },
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    provider: "openai",
    description: "Ultra-fast, ultra-cheap model for simple queries and classifications.",
    inputPricePerMToken: 0.10,
    outputPricePerMToken: 0.40,
    maxContextTokens: 1_000_000,
    isDefault: false,
    badgeColor: "slate",
  },
  // ── Google ──
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    description: "Google's advanced model with strong analytical capabilities.",
    inputPricePerMToken: 1.25,
    outputPricePerMToken: 10.00,
    maxContextTokens: 1_000_000,
    isDefault: false,
    badgeColor: "blue",
  },
  // ── Anthropic ──
  {
    id: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    description: "Anthropic's latest model for accurate and reliable circuit analysis.",
    inputPricePerMToken: 3.00,
    outputPricePerMToken: 15.00,
    maxContextTokens: 200_000,
    isDefault: false,
    badgeColor: "yellow",
  },
];

export function getDefaultModel(): AIModelConfig {
  return AI_MODELS.find((m) => m.isDefault) || AI_MODELS[0];
}

export function getModelById(id: string): AIModelConfig | undefined {
  return AI_MODELS.find((m) => m.id === id);
}

/**
 * Rough token estimate: ~4 chars per token (English text average)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost for a given prompt and model.
 * Returns { inputCost, outputCost, totalCost } in dollars.
 * Output estimate is roughly 2x the input for circuit design tasks.
 */
export function estimateCost(
  promptText: string,
  modelId: string,
  outputMultiplier = 2
): { inputTokens: number; outputTokens: number; inputCost: number; outputCost: number; totalCost: number } {
  const model = getModelById(modelId) || getDefaultModel();
  const inputTokens = estimateTokens(promptText);
  const outputTokens = Math.ceil(inputTokens * outputMultiplier);
  const inputCost = (inputTokens / 1_000_000) * model.inputPricePerMToken;
  const outputCost = (outputTokens / 1_000_000) * model.outputPricePerMToken;
  return {
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

export function formatPrice(price: number): string {
  if (price < 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}
