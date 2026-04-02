/**
 * Input guardrails: prompt injection detection + off-topic filtering
 * All patterns work in PT-BR and EN
 */

export interface InputGuardrailResult {
  allowed: boolean;
  reason: "prompt_injection" | "off_topic" | null;
  confidence: "high" | "medium" | "low";
  matchedPattern?: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// High confidence: multi-word patterns clearly indicating injection
const INJECTION_HIGH: RegExp[] = [
  // Role override (PT-BR)
  /ignor[ea]\s+(suas?|as|todas?\s+as?)\s+(instruc|regra)/i,
  /a\s+partir\s+de\s+agora\s+voce\s+e/i,
  /voce\s+agora\s+e/i,
  /finja\s+(ser|que\s+voce)/i,
  /esqueca\s+(suas?|as|todas?\s+as?)\s+(instruc|regra)/i,
  /novo\s+papel/i,
  // Role override (EN)
  /ignore\s+(your|all|previous|the)\s+(instructions|rules|prompt|system)/i,
  /you\s+are\s+now/i,
  /pretend\s+(to\s+be|you'?re)/i,
  /forget\s+(your|all|everything|previous)/i,
  // System prompt extraction (PT-BR)
  /repit[ae]\s+(seu|o)\s+prompt/i,
  /mostr[ea]\s+(suas?|as)\s+instruc/i,
  /qual\s+(e|sao)\s+(seu|suas?)\s+(prompt|instruc)/i,
  // System prompt extraction (EN)
  /repeat\s+(your|the)\s+(system|initial)\s+prompt/i,
  /show\s+me\s+your\s+instructions/i,
  /what\s+(is|are)\s+your\s+(system|initial)\s+(prompt|instructions)/i,
  // Delimiter injection
  /<\|im_start\|>/i,
  /<system>/i,
  /\[SYSTEM\]/,
  /---\s*SYSTEM/i,
  // Jailbreak
  /\bdan\s+mode\b/i,
  /\bmodo\s+dan\b/i,
  /\bjailbreak\b/i,
  /sem\s+restrico?es/i,
  /without\s+restrictions/i,
  /\bdo\s+anything\s+now\b/i,
];

// Medium confidence: shorter patterns that could be false positives
const INJECTION_MEDIUM: RegExp[] = [
  /\bact\s+as\b/i,
  /\baja\s+como\b/i,
  /###\s*(system|instruc)/i,
];

// Cannabis domain keywords -- if user message contains ANY of these, it's on-topic
const DOMAIN_KEYWORDS = [
  "cannabis", "maconha", "thc", "cbd", "cbn", "cbg", "cbc", "thcv",
  "canabidiol", "canabinoide", "cannabinoide", "terpeno", "strain",
  "sativa", "indica", "hibrido", "hybrid", "flor", "bud",
  "medicinal", "oleo", "tintura", "rso", "hash", "edible", "comestivel",
  "vaporizar", "vaporizacao", "fumar", "baseado",
  "cultivo", "cultivar", "plantar", "indoor", "outdoor", "grow",
  "colheita", "secagem", "floracao", "vegetativa",
  "anvisa", "habeas corpus", "receita medica", "prescricao",
  "dosagem", "dose", "mg", "gotas",
  "ansiedade", "insonia", "dor", "epilepsia", "fibromialgia",
  "tept", "ptsd", "crohn", "autismo", "tdah", "enxaqueca",
  "endocanabinoide", "cb1", "cb2", "faah", "entourage",
  "praga", "fungo", "mofo", "acaro", "mildio",
  "extracao", "extrair", "rosin", "cannabutter", "manteiga",
  "sublingual", "topico", "inalacao", "supositorio",
  "interacao", "medicamento", "remedio", "cyp",
  "canabis", "erva", "planta", "hemp", "canhamo",
  "maria", "beck", "ganja", "weed",
];

export function checkInputGuardrails(text: string): InputGuardrailResult {
  const normalized = normalize(text);

  // Check high confidence injection patterns
  for (const pattern of INJECTION_HIGH) {
    if (pattern.test(normalized)) {
      return {
        allowed: false,
        reason: "prompt_injection",
        confidence: "high",
        matchedPattern: pattern.source.slice(0, 50),
      };
    }
  }

  // Check medium confidence injection patterns
  for (const pattern of INJECTION_MEDIUM) {
    if (pattern.test(normalized)) {
      return {
        allowed: true, // allow but flag
        reason: "prompt_injection",
        confidence: "medium",
        matchedPattern: pattern.source.slice(0, 50),
      };
    }
  }

  // Off-topic detection: only for messages > 20 chars with zero domain keywords
  if (normalized.length > 20) {
    const hasDomainKeyword = DOMAIN_KEYWORDS.some((kw) =>
      normalized.includes(normalize(kw)),
    );

    if (!hasDomainKeyword) {
      return {
        allowed: true, // allow but flag
        reason: "off_topic",
        confidence: "low",
      };
    }
  }

  return { allowed: true, reason: null, confidence: "low" };
}
