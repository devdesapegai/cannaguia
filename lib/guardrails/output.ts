/**
 * Output guardrails: detect unsafe LLM responses
 * Checks for cure claims, unsupported dosing, prescriptive language
 */

export interface OutputViolation {
  type: "cure_claim" | "specific_dosage" | "prescription" | "dangerous_advice";
  matched: string;
  severity: "warning" | "critical";
}

export interface OutputGuardrailResult {
  safe: boolean;
  violations: OutputViolation[];
  processedText: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const DISCLAIMER =
  "\n\n> Importante: consulte sempre um profissional de saude antes de iniciar qualquer tratamento com cannabis medicinal.";

const SAFE_REPLACEMENT =
  "Desculpe, nao posso fornecer essa orientacao especifica. Cannabis medicinal requer acompanhamento de um profissional de saude qualificado. Posso ajudar com informacoes educacionais sobre o tema.";

/**
 * Check if "cura" appears WITHOUT preceding negation within 15 chars.
 * Avoids false positives on "nao existe cura", "nao ha cura", "sem cura".
 */
function checkCureClaim(text: string): OutputViolation | null {
  const normalized = normalize(text);
  const curaRegex = /\bcura[r]?\b/g;
  let match;

  while ((match = curaRegex.exec(normalized)) !== null) {
    const start = Math.max(0, match.index - 20);
    const preceding = normalized.slice(start, match.index);

    // Skip if negated
    const hasNegation = /\b(nao|nenhum[a]?|sem|nunca|jamais|nem|impossivel)\b/.test(preceding);
    if (hasNegation) continue;

    // Skip if part of compound words like "cura" in "secagem e cura" (curing process)
    const surroundingStart = Math.max(0, match.index - 30);
    const surrounding = normalized.slice(surroundingStart, match.index + match[0].length + 20);
    if (/secagem\s+e\s+cura/.test(surrounding)) continue;
    if (/processo\s+de\s+cura/.test(surrounding)) continue;
    if (/cura\s+(da|de|do)\s+(flor|planta|bud|colheita)/.test(surrounding)) continue;

    return {
      type: "cure_claim",
      matched: text.slice(Math.max(0, match.index - 10), match.index + match[0].length + 10),
      severity: "critical",
    };
  }

  return null;
}

/**
 * Check for specific dosage with imperative verbs but no medical disclaimer nearby.
 */
function checkDosageWithoutDisclaimer(text: string): OutputViolation | null {
  const normalized = normalize(text);

  // Pattern: imperative verb + number + unit
  const dosagePatterns = [
    /\b(tome|use|aplique|ingira|consuma|faca|utilize)\b[^.]{0,30}\b\d+\s*(mg|ml|gotas?|drops?)\b/i,
    /\b\d+\s*(mg|ml|gotas?)\s*(por dia|ao dia|diariamente|por dose|vezes)\b/i,
  ];

  for (const pattern of dosagePatterns) {
    const match = normalized.match(pattern);
    if (!match) continue;

    // Check if there's a disclaimer within 200 chars after the match
    const afterMatch = normalized.slice(
      (match.index ?? 0) + match[0].length,
      (match.index ?? 0) + match[0].length + 200,
    );
    const hasDisclaimer =
      /consulte\s+(seu|um)\s+medico/.test(afterMatch) ||
      /acompanhamento\s+medico/.test(afterMatch) ||
      /sob\s+orientacao/.test(afterMatch) ||
      /profissional\s+de\s+saude/.test(afterMatch) ||
      /supervisao\s+medica/.test(afterMatch);

    if (!hasDisclaimer) {
      return {
        type: "specific_dosage",
        matched: match[0].slice(0, 60),
        severity: "warning",
      };
    }
  }

  return null;
}

/**
 * Check for prescriptive language (acting as a doctor).
 */
function checkPrescription(text: string): OutputViolation | null {
  const normalized = normalize(text);

  const prescriptionPatterns = [
    /\b(prescrevo|receito|receitando)\b/i,
    /\bvoce\s+deve\s+tomar\b/i,
    /\bvoce\s+precisa\s+tomar\b/i,
    /\btome\s+isso\b/i,
    /\bi\s+prescribe\b/i,
  ];

  for (const pattern of prescriptionPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      return {
        type: "prescription",
        matched: match[0],
        severity: "critical",
      };
    }
  }

  return null;
}

/**
 * Check for dangerous combination claims without CYP450 warning.
 */
function checkDangerousCombination(text: string): OutputViolation | null {
  const normalized = normalize(text);

  const dangerousDrugs = [
    "opioide", "opioid", "morfina", "codeina", "tramadol", "fentanil",
    "benzodiazepino", "benzodiazepínico", "clonazepam", "diazepam", "alprazolam",
    "varfarina", "warfarina", "anticoagulante",
  ];

  const safePatterns = [
    /\bseguro\s+(misturar|combinar|usar\s+junto)\b/i,
    /\bpode\s+(misturar|combinar|usar\s+junto)\s+sem\s+problema\b/i,
  ];

  for (const pattern of safePatterns) {
    if (!pattern.test(normalized)) continue;

    const hasDangerousDrug = dangerousDrugs.some((drug) =>
      normalized.includes(normalize(drug)),
    );
    if (!hasDangerousDrug) continue;

    // Check if CYP450 warning is present
    const hasCypWarning =
      /cyp\s*450/i.test(normalized) ||
      /interacao\s+(medicamentosa|enzimatica)/i.test(normalized) ||
      /supervisao\s+medica/i.test(normalized);

    if (!hasCypWarning) {
      return {
        type: "dangerous_advice",
        matched: "combinacao perigosa sem alerta",
        severity: "critical",
      };
    }
  }

  return null;
}

export function checkOutputGuardrails(text: string): OutputGuardrailResult {
  const violations: OutputViolation[] = [];

  const cureCheck = checkCureClaim(text);
  if (cureCheck) violations.push(cureCheck);

  const dosageCheck = checkDosageWithoutDisclaimer(text);
  if (dosageCheck) violations.push(dosageCheck);

  const prescriptionCheck = checkPrescription(text);
  if (prescriptionCheck) violations.push(prescriptionCheck);

  const dangerousCheck = checkDangerousCombination(text);
  if (dangerousCheck) violations.push(dangerousCheck);

  if (violations.length === 0) {
    return { safe: true, violations: [], processedText: text };
  }

  const hasCritical = violations.some((v) => v.severity === "critical");

  if (hasCritical) {
    return {
      safe: false,
      violations,
      processedText: SAFE_REPLACEMENT,
    };
  }

  // Warning only: append disclaimer
  return {
    safe: false,
    violations,
    processedText: text + DISCLAIMER,
  };
}
