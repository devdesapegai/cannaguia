/**
 * Local search engine using keyword matching with relevance scoring
 * Simple, fast, reliable — no external dependencies
 */

import cannabinoids from "@/lib/knowledge/cannabinoids.json";
import terpenes from "@/lib/knowledge/terpenes.json";
import conditions from "@/lib/knowledge/conditions.json";
import regulations from "@/lib/knowledge/regulations-br.json";
import strains from "@/lib/knowledge/strains.json";
import medicalResearch from "@/lib/knowledge/medical-research.json";
import cultivation from "@/lib/knowledge/cultivation.json";
import drugInteractions from "@/lib/knowledge/drug-interactions.json";
import extractionMethods from "@/lib/knowledge/extraction-methods.json";
import administrationRoutes from "@/lib/knowledge/administration-routes.json";
import endocannabinoidSystem from "@/lib/knowledge/endocannabinoid-system.json";
import conditionsExpanded from "@/lib/knowledge/conditions-expanded.json";
import pestsDiseases from "@/lib/knowledge/pests-diseases.json";

export interface Document {
  id: string;
  type: "cannabinoid" | "terpene" | "condition" | "regulation" | "strain" | "research" | "cultivation" | "drug-interaction" | "extraction" | "administration" | "endocannabinoid" | "condition-expanded" | "pest-disease";
  title: string;
  content: string;
  metadata: Record<string, unknown>;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function buildDocuments(): Document[] {
  const docs: Document[] = [];

  for (const c of cannabinoids) {
    docs.push({
      id: c.id,
      type: "cannabinoid",
      title: c.name,
      content: [
        c.name,
        c.description,
        c.mechanisms.join(". "),
        c.therapeutic_uses
          .map((u) => `${u.condition}: ${u.details}`)
          .join(". "),
        c.side_effects.join(", "),
        c.drug_interactions.join(", "),
        c.legal_status_brazil,
      ].join(" "),
      metadata: c,
    });
  }

  for (const t of terpenes) {
    docs.push({
      id: t.id,
      type: "terpene",
      title: t.name,
      content: [
        t.name,
        t.aroma,
        t.also_found_in.join(", "),
        t.effects.join(", "),
        t.mechanisms.join(". "),
        t.therapeutic_potential,
      ].join(" "),
      metadata: t,
    });
  }

  for (const cond of conditions) {
    docs.push({
      id: cond.id,
      type: "condition",
      title: cond.name,
      content: [
        cond.name,
        cond.description,
        cond.key_evidence.join(". "),
        cond.dosing_considerations,
        cond.contraindications.join(", "),
      ].join(" "),
      metadata: cond,
    });
  }

  for (const reg of regulations) {
    docs.push({
      id: reg.id,
      type: "regulation",
      title: reg.title,
      content: [reg.title, reg.summary, reg.key_points.join(". ")].join(" "),
      metadata: reg,
    });
  }

  for (const s of strains) {
    docs.push({
      id: s.id,
      type: "strain",
      title: s.name,
      content: [
        s.name,
        s.type,
        s.description,
        `Terpenos: ${s.terpenes_dominant.join(", ")}`,
        `Efeitos: ${s.effects.join(", ")}`,
        `Usos medicinais: ${s.medical_uses.join(", ")}`,
        `Sabor: ${(s.flavor || []).join(", ")}`,
      ].join(" "),
      metadata: s,
    });
  }

  for (const c of cultivation) {
    docs.push({
      id: (c as { id: string }).id,
      type: "cultivation",
      title: (c as { title: string }).title,
      content: [
        (c as { title: string }).title,
        (c as { content: string }).content,
        ((c as { key_points: string[] }).key_points || []).join(". "),
      ].join(" "),
      metadata: c as Record<string, unknown>,
    });
  }

  for (const r of medicalResearch) {
    const keyPoints = (r as { key_points?: string[] }).key_points || [];
    docs.push({
      id: (r as { id: string }).id,
      type: "research",
      title: (r as { title: string }).title,
      content: [
        (r as { title: string }).title,
        (r as { content: string }).content,
        keyPoints.join(". "),
      ].join(" "),
      metadata: r as Record<string, unknown>,
    });
  }

  for (const ext of extractionMethods) {
    const e = ext as { id: string; title: string; content: string; key_points: string[] };
    docs.push({
      id: e.id,
      type: "extraction",
      title: e.title,
      content: [e.title, e.content, e.key_points.join(". ")].join(" "),
      metadata: ext as Record<string, unknown>,
    });
  }

  for (const adm of administrationRoutes) {
    const a = adm as { id: string; title: string; content: string; key_points: string[] };
    docs.push({
      id: a.id,
      type: "administration",
      title: a.title,
      content: [a.title, a.content, a.key_points.join(". ")].join(" "),
      metadata: adm as Record<string, unknown>,
    });
  }

  for (const ecs of endocannabinoidSystem) {
    const e = ecs as { id: string; title: string; content: string; key_points: string[] };
    docs.push({
      id: e.id,
      type: "endocannabinoid",
      title: e.title,
      content: [e.title, e.content, e.key_points.join(". ")].join(" "),
      metadata: ecs as Record<string, unknown>,
    });
  }

  for (const ce of conditionsExpanded) {
    const c = ce as { id: string; title: string; content: string; key_points: string[] };
    docs.push({
      id: c.id,
      type: "condition-expanded",
      title: c.title,
      content: [c.title, c.content, c.key_points.join(". ")].join(" "),
      metadata: ce as Record<string, unknown>,
    });
  }

  for (const di of drugInteractions) {
    const d = di as {
      id: string; title: string; content: string; key_points: string[];
      drugs?: string[]; risk_level?: string; mechanism?: string;
      monitoring?: string[]; recommendations?: string[];
    };
    docs.push({
      id: d.id,
      type: "drug-interaction",
      title: d.title,
      content: [
        d.title,
        d.content,
        (d.key_points || []).join(". "),
        d.drugs ? `Medicamentos: ${d.drugs.join(", ")}` : "",
        d.risk_level ? `Risco: ${d.risk_level}` : "",
        d.mechanism ? `Mecanismo: ${d.mechanism}` : "",
        (d.monitoring || []).join(", "),
        (d.recommendations || []).join(". "),
      ].filter(Boolean).join(" "),
      metadata: di as Record<string, unknown>,
    });
  }

  for (const pd of pestsDiseases) {
    const p = pd as {
      id: string; name: string; category: string;
      identification?: { appearance?: string; first_signs?: string; colors?: string[] };
      symptoms?: string[]; damage?: string; causes?: string[];
      treatments?: { method?: string; details?: string; products?: string[] }[];
    };
    const parts = [p.name, p.category];
    if (p.identification?.appearance) parts.push(p.identification.appearance);
    if (p.identification?.first_signs) parts.push(p.identification.first_signs);
    if (p.symptoms) parts.push(p.symptoms.join(". "));
    if (p.damage) parts.push(p.damage);
    if (p.causes) parts.push(p.causes.join(". "));
    if (p.treatments) {
      for (const t of p.treatments) {
        if (t.method) parts.push(t.method);
        if (t.details) parts.push(t.details);
        if (t.products) parts.push(t.products.join(", "));
      }
    }
    docs.push({
      id: p.id,
      type: "pest-disease",
      title: p.name,
      content: parts.filter(Boolean).join(" "),
      metadata: pd as Record<string, unknown>,
    });
  }

  return docs;
}

// Cache
let _docs: Document[] | null = null;
function getDocs(): Document[] {
  if (!_docs) _docs = buildDocuments();
  return _docs;
}

export interface ScoredDocument {
  document: Document;
  score: number;
}

export interface SearchResult {
  results: ScoredDocument[];
  searchMode: "hybrid" | "keyword";
}

export function search(
  query: string,
  topK: number = 5,
  typeFilter?: Document["type"]
): ScoredDocument[] {
  const docs = getDocs();
  const normalizedQuery = normalize(query);
  const STOPWORDS = new Set([
    "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
    "um", "uma", "uns", "umas", "com", "por", "para", "pra", "pro",
    "se", "ou", "que", "ao", "aos", "mais", "mas", "nem", "ja",
    "ta", "to", "te", "me", "ele", "ela", "seu", "sua", "meu", "minha",
    "isso", "isto", "esse", "essa", "este", "esta", "nao", "sim",
    "como", "quando", "onde", "qual", "quais", "muito", "bem",
    "ser", "ter", "vai", "vou", "tem", "sao", "foi", "era",
    "the", "and", "for", "are", "but", "not", "you", "all",
    "can", "had", "her", "was", "one", "our", "out", "has", "his",
    "how", "its", "may", "new", "now", "old", "see", "way", "who",
    "did", "get", "let", "say", "she", "too", "use", "with", "from",
    "have", "been", "some", "than", "them", "then", "this", "that",
    "what", "when", "will", "more", "also", "into", "only",
  ]);
  // Keep short important terms like "pH", "CBD", "THC", "CBN"
  // Synonyms: expand query terms to match content variations
  const SYNONYMS: Record<string, string[]> = {
    autismo: ["autista", "tea", "espectro autista"],
    tdah: ["deficit de atencao", "hiperatividade"],
    enxaqueca: ["cefaleia", "dor de cabeca"],
    insonia: ["sono", "dormir", "sonolento"],
    ansiedade: ["ansioso", "ansiolitico"],
  };

  let expandedQuery = normalizedQuery;
  for (const [term, synonyms] of Object.entries(SYNONYMS)) {
    if (normalizedQuery.includes(term)) {
      expandedQuery += " " + synonyms.join(" ");
    }
  }

  const words = expandedQuery
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));

  if (words.length === 0) return [];

  const scored: ScoredDocument[] = [];

  for (const doc of docs) {
    if (typeFilter && doc.type !== typeFilter) continue;

    const normalizedContent = normalize(doc.content);
    const normalizedTitle = normalize(doc.title);
    let score = 0;

    for (const word of words) {
      // Count occurrences in content with word boundaries
      const regex = new RegExp(`\\b${word}\\b`, "g");
      const contentMatches = (normalizedContent.match(regex) || []).length;
      score += contentMatches;

      // Title match = 15x boost (strong signal for relevance)
      if (new RegExp(`\\b${word}\\b`).test(normalizedTitle)) {
        score += 15;
      }
    }

    // Full query match = additive boost proportional to query length
    if (words.length > 1 && normalizedContent.includes(normalizedQuery)) {
      score += words.length * 5;
    }

    // Boost cultivation docs when query is about growing
    const growKeywords = ["cultivar", "cultivo", "plantar", "plantio", "grow", "indoor", "outdoor", "colheita", "secagem", "cura", "nutriente", "substrato", "vaso", "poda", "rega", "regar", "iluminacao", "luz", "led", "hps", "floracao", "vegetativa", "germinacao", "semente"];
    const queryCultivation = growKeywords.some((k) => normalizedQuery.includes(k));
    if (queryCultivation && doc.type === "cultivation") {
      score *= 3;
    }

    // Boost drug-interaction docs when query is about drug interactions
    const interactionKeywords = ["interacao", "medicamento", "remedio", "droga", "cyp", "enzima", "anticoagulante", "varfarina", "antidepressivo", "benzodiazepínico", "benzodiazepino", "opioide", "anticonvulsivante", "estatina", "imunossupressor", "quimioterapico", "isrs", "ssri", "fluoxetina", "sertralina", "clonazepam", "diazepam", "tramadol", "codeina", "morfina", "carbamazepina", "valproato", "fenitoina", "clobazam", "losartana", "amlodipino", "enalapril", "tacrolimus", "ciclosporina", "atorvastatina", "sinvastatina", "combinar", "tomar junto", "misturar"];
    const queryInteraction = interactionKeywords.some((k) => normalizedQuery.includes(k));
    if (queryInteraction && doc.type === "drug-interaction") {
      score *= 3;
    }

    // Boost extraction docs
    const extractionKeywords = ["extracao", "extrair", "oleo", "rso", "tintura", "manteiga", "cannabutter", "rosin", "hash", "bubble", "ice hash", "concentrado", "prensa", "solvente", "alcool", "descarboxilar", "descarboxilacao", "fazer em casa", "caseiro", "caseira", "receita", "preparar", "preparo"];
    const queryExtraction = extractionKeywords.some((k) => normalizedQuery.includes(k));
    if (queryExtraction && doc.type === "extraction") {
      score *= 3;
    }

    // Boost administration docs
    const adminKeywords = ["sublingual", "oral", "topico", "inalacao", "vaporizar", "vaporizacao", "fumar", "supositorio", "capsulas", "comestivel", "edible", "creme", "balsamo", "patch", "transdermico", "biodisponibilidade", "onset", "via de administracao", "como usar", "como tomar"];
    const queryAdmin = adminKeywords.some((k) => normalizedQuery.includes(k));
    if (queryAdmin && doc.type === "administration") {
      score *= 3;
    }

    // Boost endocannabinoid system docs
    const ecsKeywords = ["endocanabinoide", "cb1", "cb2", "gpr55", "trpv1", "ppar", "anandamida", "2-ag", "faah", "magl", "entourage", "receptor", "homeostase", "sinergia", "sistema endocanabinoide"];
    const queryEcs = ecsKeywords.some((k) => normalizedQuery.includes(k));
    if (queryEcs && doc.type === "endocannabinoid") {
      score = Math.max(score * 3, 20);
    }

    // Boost expanded conditions docs
    const condExpandedKeywords = ["autismo", "tea", "crohn", "colite", "endometriose", "enxaqueca", "cefaleia", "tdah", "deficit de atencao", "ela", "esclerose lateral", "glaucoma", "tourette", "neuropatica", "neuropatia", "glioblastoma", "leucemia", "antitumoral"];
    const queryCondExpanded = condExpandedKeywords.some((k) => normalizedQuery.includes(k));
    if (queryCondExpanded && (doc.type === "condition-expanded" || doc.type === "condition")) {
      score = Math.max(score * 3, 20);
    }

    // Boost pest/disease docs
    const pestKeywords = ["praga", "pragas", "doenca", "doencas", "fungo", "fungos", "mofo", "bolor", "acaro", "acaros", "mosca", "pulgao", "tripes", "lagarta", "cochonilha", "oideo", "mildio", "septoria", "fusarium", "pythium", "deficiencia", "amarelando", "manchas", "folhas amarelas", "pontos", "necrose", "spider mite", "bud rot", "root rot", "powdery mildew"];
    const queryPest = pestKeywords.some((k) => normalizedQuery.includes(k));
    if (queryPest && doc.type === "pest-disease") {
      score = Math.max(score * 3, 50);
    }

    if (score > 0) {
      scored.push({ document: doc, score });
    }
  }

  // If query is about pests/diseases, ensure ALL pest-disease docs are included
  // (content is in English but queries are in Portuguese, so keyword scoring alone misses them)
  const pestQueryFinal = ["praga", "pragas", "doenca", "doencas", "fungo", "mofo", "acaro", "oideo", "deficiencia", "amarelando", "folhas amarelas", "pontos", "manchas", "necrose", "mildio"].some((k) => normalizedQuery.includes(k));
  if (pestQueryFinal) {
    const allPestDocs = docs.filter((d) => d.type === "pest-disease");
    for (const doc of allPestDocs) {
      if (!scored.find((s) => s.document.id === doc.id)) {
        scored.push({ document: doc, score: 50 });
      }
    }
  }

  // If query is about extraction, ensure ALL extraction docs are included
  const extractionQueryFinal = ["extracao", "extrair", "oleo", "rso", "tintura", "manteiga", "cannabutter", "rosin", "hash", "concentrado", "caseiro", "caseira"].some((k) => normalizedQuery.includes(k));
  if (extractionQueryFinal) {
    const allExtractionDocs = docs.filter((d) => d.type === "extraction");
    for (const doc of allExtractionDocs) {
      if (!scored.find((s) => s.document.id === doc.id)) {
        scored.push({ document: doc, score: 1 });
      }
    }
  }

  const sorted = scored.sort((a, b) => b.score - a.score);

  // For strains: pick from top results with some randomization
  // so we don't always recommend the same strain
  const strainResults = sorted.filter((s) => s.document.type === "strain");
  const otherResults = sorted.filter((s) => s.document.type !== "strain");

  if (strainResults.length > 3) {
    // Shuffle top 10 strains and pick randomly
    const topStrains = strainResults.slice(0, 10);
    for (let i = topStrains.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [topStrains[i], topStrains[j]] = [topStrains[j], topStrains[i]];
    }
    const selectedStrains = topStrains.slice(0, Math.min(2, topK));
    const selectedOther = otherResults.slice(0, topK - selectedStrains.length);
    return [...selectedOther, ...selectedStrains];
  }

  return sorted.slice(0, topK);
}

// --- Vector / Hybrid Search ---

async function vectorSearch(
  query: string,
  topK: number = 10,
  typeFilter?: Document["type"],
): Promise<ScoredDocument[]> {
  const { embedText } = await import("@/lib/ai/embeddings");
  const { findSimilarDocuments } = await import("@/lib/db/vector");

  const embedding = await embedText(query);
  const rows = await findSimilarDocuments(embedding, topK, typeFilter);

  const docsMap = new Map(getDocs().map((d) => [d.id, d]));
  return rows.map((row) => ({
    document: docsMap.get(row.id) || {
      id: row.id,
      type: row.type as Document["type"],
      title: row.title,
      content: row.content,
      metadata: {},
    },
    score: Number(row.similarity),
  }));
}

async function hybridSearch(
  query: string,
  topK: number = 5,
  typeFilter?: Document["type"],
): Promise<SearchResult> {
  const K = 60; // RRF constant
  const keywordWeight = 0.4;
  const vectorWeight = 0.6;

  const [keywordResults, vectorResults] = await Promise.all([
    Promise.resolve(search(query, topK * 3, typeFilter)),
    vectorSearch(query, topK * 3, typeFilter).catch((err) => {
      console.error("[hybridSearch] Vector search failed, keyword-only:", err);
      return [] as ScoredDocument[];
    }),
  ]);

  // If vector search failed, return keyword-only
  if (vectorResults.length === 0) {
    return { results: search(query, topK, typeFilter), searchMode: "keyword" };
  }

  // Reciprocal Rank Fusion
  const rrfScores = new Map<string, { doc: Document; score: number }>();

  keywordResults.forEach((result, rank) => {
    const rrfScore = keywordWeight * (1 / (K + rank + 1));
    const existing = rrfScores.get(result.document.id);
    if (existing) {
      existing.score += rrfScore;
    } else {
      rrfScores.set(result.document.id, { doc: result.document, score: rrfScore });
    }
  });

  vectorResults.forEach((result, rank) => {
    const rrfScore = vectorWeight * (1 / (K + rank + 1));
    const existing = rrfScores.get(result.document.id);
    if (existing) {
      existing.score += rrfScore;
    } else {
      rrfScores.set(result.document.id, { doc: result.document, score: rrfScore });
    }
  });

  const sorted = Array.from(rrfScores.values()).sort((a, b) => b.score - a.score);

  // Preserve strain randomization
  const strainResults = sorted.filter((s) => s.doc.type === "strain");
  const otherResults = sorted.filter((s) => s.doc.type !== "strain");

  if (strainResults.length > 3) {
    const topStrains = strainResults.slice(0, 10);
    for (let i = topStrains.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [topStrains[i], topStrains[j]] = [topStrains[j], topStrains[i]];
    }
    const selectedStrains = topStrains.slice(0, Math.min(2, topK));
    const selectedOther = otherResults.slice(0, topK - selectedStrains.length);
    return {
      results: [
        ...selectedOther.map((r) => ({ document: r.doc, score: r.score })),
        ...selectedStrains.map((r) => ({ document: r.doc, score: r.score })),
      ],
      searchMode: "hybrid",
    };
  }

  return {
    results: sorted.slice(0, topK).map((r) => ({ document: r.doc, score: r.score })),
    searchMode: "hybrid",
  };
}

// Cache: check if KnowledgeEmbedding table has records (once, then cached)
let _hasEmbeddings: boolean | null = null;

export async function searchAll(
  query: string,
  topK: number = 5,
): Promise<SearchResult> {
  if (_hasEmbeddings === null) {
    try {
      const { hasEmbeddings } = await import("@/lib/db/vector");
      _hasEmbeddings = await hasEmbeddings();
    } catch {
      _hasEmbeddings = false;
    }
  }

  if (_hasEmbeddings) {
    return hybridSearch(query, topK);
  }

  return { results: search(query, topK), searchMode: "keyword" };
}

export function formatContextForLLM(results: ScoredDocument[]): string {
  if (results.length === 0) {
    return "Nenhuma informação relevante encontrada na base de conhecimento.";
  }

  return results
    .map((r, i) => {
      const doc = r.document;
      return `---\n${doc.title}\n${doc.content}\n`;
    })
    .join("\n");
}
