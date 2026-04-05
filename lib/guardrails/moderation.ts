/**
 * OpenAI Moderation API integration.
 *
 * Uses omni-moderation-latest for detecting hate, violence, self-harm,
 * sexual content, harassment, and illicit activity.
 *
 * Cannabis-domain thresholds are elevated for "illicit" and "harassment"
 * categories to avoid false positives on legitimate cannabis discussion.
 *
 * Fail-open: if the API is unreachable, the request proceeds normally
 * (domain-specific guardrails still apply).
 */

const MODERATION_URL = "https://api.openai.com/v1/moderations";
const MODERATION_MODEL = "omni-moderation-latest";
const TIMEOUT_MS = 3000;

export interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  categoryScores: Record<string, number>;
  error?: string;
}

// Cannabis discussions legitimately reference "drugs", "substances", etc.
// Raise thresholds for categories prone to false positives in this domain.
const CUSTOM_THRESHOLDS: Record<string, number> = {
  "illicit": 0.85,
  "illicit/violent": 0.7,
  "harassment": 0.75,
  "harassment/threatening": 0.6,
};

const DEFAULT_THRESHOLD = 0.5;

function getThreshold(category: string): number {
  return CUSTOM_THRESHOLDS[category] ?? DEFAULT_THRESHOLD;
}

/**
 * Check text against OpenAI Moderation API.
 * Returns { flagged: false } on API errors (fail-open).
 */
export async function checkModeration(text: string): Promise<ModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { flagged: false, categories: {}, categoryScores: {} };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(MODERATION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODERATION_MODEL,
        input: text.slice(0, 10000),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { flagged: false, categories: {}, categoryScores: {}, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const result = data.results?.[0];
    if (!result) {
      return { flagged: false, categories: {}, categoryScores: {}, error: "empty response" };
    }

    // Apply custom thresholds instead of relying solely on OpenAI's binary flags
    const scores: Record<string, number> = result.category_scores ?? {};
    const customFlagged: Record<string, boolean> = {};
    let isFlagged = false;

    for (const [category, score] of Object.entries(scores)) {
      const threshold = getThreshold(category);
      const flagged = (score as number) >= threshold;
      customFlagged[category] = flagged;
      if (flagged) isFlagged = true;
    }

    return {
      flagged: isFlagged,
      categories: customFlagged,
      categoryScores: scores,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown";
    return { flagged: false, categories: {}, categoryScores: {}, error: msg };
  }
}

/**
 * Get a safe response message in PT-BR based on flagged categories.
 */
export function getModerationBlockMessage(categories: Record<string, boolean>): string {
  if (categories["self-harm"] || categories["self-harm/intent"] || categories["self-harm/instructions"]) {
    return "Se voce esta passando por um momento dificil, por favor procure ajuda. CVV: 188 (ligacao) ou acesse cvv.org.br. Estou aqui para informacoes sobre cannabis medicinal.";
  }
  if (categories["violence"] || categories["violence/graphic"]) {
    return "Nao posso ajudar com esse tipo de conteudo. Posso te ajudar com informacoes sobre cannabis medicinal, strains, cultivo ou regulamentacao.";
  }
  return "Sua mensagem foi identificada como conteudo inapropriado. Posso te ajudar com informacoes sobre cannabis medicinal, strains, cultivo ou regulamentacao brasileira.";
}
