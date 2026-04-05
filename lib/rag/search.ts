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

// Novos knowledge files do seedfinder
import breeders from "@/lib/knowledge/breeders.json";
import awards from "@/lib/knowledge/awards.json";
import landraces from "@/lib/knowledge/landraces.json";

// Novos knowledge files do merge (curated data)
import flavonoids from "@/lib/knowledge/flavonoids.json";
import clinicalTrials from "@/lib/knowledge/clinical-trials.json";
import brazilianResearch from "@/lib/knowledge/brazilian-research.json";
import brazilianTheses from "@/lib/knowledge/brazilian-theses.json";

// Novos knowledge files do merge-web
import dosing from "@/lib/knowledge/dosing.json";
import harmReduction from "@/lib/knowledge/harm-reduction.json";
import market from "@/lib/knowledge/market.json";
import regulationGlobal from "@/lib/knowledge/regulation-global.json";

import { embedText } from "@/lib/ai/embeddings";
import { findSimilarDocuments, hasEmbeddings as checkHasEmbeddings } from "@/lib/db/vector";
import veterinaryDocs from "@/lib/knowledge/veterinary.json";
import genetics from "@/lib/knowledge/genetics.json";
import openalexResearch from "@/lib/knowledge/openalex-research.json";

export interface Document {
  id: string;
  type: "cannabinoid" | "terpene" | "condition" | "regulation" | "strain" | "research" | "cultivation" | "drug-interaction" | "extraction" | "administration" | "endocannabinoid" | "condition-expanded" | "pest-disease" | "breeder" | "award" | "landrace" | "flavonoid" | "clinical-trial" | "brazilian-research" | "brazilian-thesis" | "dosing" | "harm-reduction" | "market" | "regulation-global" | "veterinary" | "genetics";
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
        (c.mechanisms || []).join(". "),
        (c.therapeutic_uses || [])
          .map((u) => `${u.condition}: ${u.details}`)
          .join(". "),
        (c.side_effects || []).join(", "),
        (c.drug_interactions || []).join(", "),
        c.legal_status_brazil || "",
      ].filter(Boolean).join(" "),
      metadata: c,
    });
  }

  for (const t of terpenes) {
    const tt = t as Record<string, unknown>;
    const name = (tt.name || tt.title || "") as string;
    docs.push({
      id: t.id,
      type: "terpene",
      title: name,
      content: [
        name,
        (tt.aroma || "") as string,
        ((tt.also_found_in || []) as string[]).join(", "),
        ((tt.effects || []) as string[]).join(", "),
        ((tt.mechanisms || []) as string[]).join(". "),
        (tt.therapeutic_potential || "") as string,
        (tt.content || "") as string,
        ((tt.key_points || []) as string[]).join(". "),
      ].filter(Boolean).join(" "),
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
    const ss = s as Record<string, unknown>;
    const parts = [
      s.name,
      s.type,
      s.description,
      `Terpenos: ${s.terpenes_dominant.join(", ")}`,
      `Efeitos: ${s.effects.join(", ")}`,
      `Usos medicinais: ${s.medical_uses.join(", ")}`,
      `Sabor: ${(s.flavor || []).join(", ")}`,
    ];
    // Campos seedfinder (opcionais)
    if (ss.breeder) parts.push(`Breeder: ${ss.breeder}`);
    if (ss.genetics_text) parts.push(`Genetica: ${ss.genetics_text}`);
    if (ss.lineage_text) parts.push(`Linhagem: ${ss.lineage_text}`);
    if (ss.thc) {
      const thc = ss.thc as { min: number; max: number };
      parts.push(`THC: ${thc.min}${thc.max !== thc.min ? `-${thc.max}` : ""}%`);
    }
    if (ss.cbd) {
      const cbd = ss.cbd as { min: number; max: number };
      parts.push(`CBD: ${cbd.min}${cbd.max !== cbd.min ? `-${cbd.max}` : ""}%`);
    }
    if (ss.aromas) parts.push(`Aromas: ${(ss.aromas as string[]).join(", ")}`);
    if (ss.awards) {
      const aw = ss.awards as { cup: string; year: number; category: string }[];
      parts.push(`Premiacoes: ${aw.map((a) => `${a.cup} ${a.year} ${a.category}`).join(", ")}`);
    }
    if (ss.flowering_days) {
      const fd = ss.flowering_days as { min: number; max: number };
      parts.push(`Floracao: ${fd.min}${fd.max !== fd.min ? `-${fd.max}` : ""} dias`);
    }
    if (ss.clone_only) parts.push("Clone-only");
    if (ss.autoflower) parts.push("Autoflower automatica");
    if (ss.landrace) parts.push(`Landrace pura ${ss.origin_country || ""}`);

    docs.push({
      id: s.id,
      type: "strain",
      title: s.name,
      content: parts.join(" "),
      metadata: s,
    });
  }

  // Breeders
  for (const b of breeders) {
    const bb = b as { id: string; name: string; strain_count: number; award_count: number; notable_strains: string[] };
    docs.push({
      id: bb.id,
      type: "breeder",
      title: bb.name,
      content: [
        bb.name,
        `Breeder banco de sementes`,
        `${bb.strain_count} variedades`,
        bb.award_count > 0 ? `${bb.award_count} premiacoes` : "",
        `Strains notaveis: ${bb.notable_strains.join(", ")}`,
      ].filter(Boolean).join(" "),
      metadata: b as Record<string, unknown>,
    });
  }

  // Awards
  for (const a of awards) {
    const aa = a as { id: string; strain_name: string; breeder: string; cup: string; year: number; category: string; place: string };
    docs.push({
      id: aa.id,
      type: "award",
      title: `${aa.strain_name} - ${aa.cup} ${aa.year}`,
      content: [
        aa.strain_name,
        aa.breeder,
        `${aa.place} lugar no ${aa.cup} ${aa.year}`,
        `Categoria: ${aa.category}`,
        `Premiacao cannabis cup award`,
      ].join(" "),
      metadata: a as Record<string, unknown>,
    });
  }

  // Landraces
  for (const l of landraces) {
    const ll = l as { id: string; title: string; origin_country: string; content: string; key_points: string[] };
    docs.push({
      id: ll.id,
      type: "landrace",
      title: ll.title,
      content: [
        ll.title,
        ll.content,
        ll.key_points.join(". "),
        `Landrace pura original nativa selvagem`,
      ].join(" "),
      metadata: l as Record<string, unknown>,
    });
  }

  // Flavonoids
  for (const f of flavonoids) {
    const ff = f as { id: string; name: string; type: string; description: string; mechanisms: string[]; therapeutic_potential: string; key_points: string[] };
    docs.push({
      id: ff.id,
      type: "flavonoid",
      title: ff.name,
      content: [
        ff.name,
        ff.description,
        (ff.mechanisms || []).join(". "),
        ff.therapeutic_potential,
        (ff.key_points || []).join(". "),
      ].filter(Boolean).join(" "),
      metadata: f as Record<string, unknown>,
    });
  }

  // Clinical Trials
  for (const ct of clinicalTrials) {
    const t = ct as { id: string; title: string; content: string; key_points: string[]; nct_id?: string; status?: string; phase?: string; conditions?: string[]; interventions?: string[] };
    docs.push({
      id: t.id,
      type: "clinical-trial",
      title: t.title,
      content: [
        t.title,
        t.content,
        (t.key_points || []).join(". "),
        t.nct_id || "",
        t.status || "",
        t.phase || "",
        (t.conditions || []).join(", "),
        (t.interventions || []).join(", "),
      ].filter(Boolean).join(" "),
      metadata: ct as Record<string, unknown>,
    });
  }

  // Brazilian Research (Scielo)
  for (const br of brazilianResearch) {
    const r = br as { id: string; title: string; content: string; key_points: string[]; journal?: string };
    docs.push({
      id: r.id,
      type: "brazilian-research",
      title: r.title,
      content: [
        r.title,
        r.content,
        (r.key_points || []).join(". "),
        r.journal || "",
      ].filter(Boolean).join(" "),
      metadata: br as Record<string, unknown>,
    });
  }

  // Brazilian Theses (BDTD)
  for (const bt of brazilianTheses) {
    const t = bt as { id: string; title: string; content: string; key_points: string[]; type?: string; institution?: string; subjects?: string[] };
    docs.push({
      id: t.id,
      type: "brazilian-thesis",
      title: t.title,
      content: [
        t.title,
        t.content,
        (t.key_points || []).join(". "),
        t.type || "",
        t.institution || "",
        (t.subjects || []).join(", "),
      ].filter(Boolean).join(" "),
      metadata: bt as Record<string, unknown>,
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

  // Dosing
  for (const d of dosing) {
    const dd = d as { id: string; title: string; content: string; key_points?: string[]; warnings?: string[] };
    docs.push({
      id: dd.id,
      type: "dosing",
      title: dd.title,
      content: [dd.title, dd.content, (dd.key_points || []).join(". "), (dd.warnings || []).join(". ")].filter(Boolean).join(" "),
      metadata: d as Record<string, unknown>,
    });
  }

  // Harm Reduction
  for (const h of harmReduction) {
    const hh = h as { id: string; title: string; content: string; key_points?: string[]; warnings?: string[] };
    docs.push({
      id: hh.id,
      type: "harm-reduction",
      title: hh.title,
      content: [hh.title, hh.content, (hh.key_points || []).join(". "), (hh.warnings || []).join(". ")].filter(Boolean).join(" "),
      metadata: h as Record<string, unknown>,
    });
  }

  // Market
  for (const m of market) {
    const mm = m as { id: string; title: string; content: string; key_points?: string[] };
    docs.push({
      id: mm.id,
      type: "market",
      title: mm.title,
      content: [mm.title, mm.content, (mm.key_points || []).join(". ")].filter(Boolean).join(" "),
      metadata: m as Record<string, unknown>,
    });
  }

  // Regulation Global
  for (const rg of regulationGlobal) {
    const rr = rg as { id: string; title: string; content: string; key_points?: string[] };
    docs.push({
      id: rr.id,
      type: "regulation-global",
      title: rr.title,
      content: [rr.title, rr.content, (rr.key_points || []).join(". ")].filter(Boolean).join(" "),
      metadata: rg as Record<string, unknown>,
    });
  }

  // Veterinary
  for (const v of veterinaryDocs) {
    const vv = v as { id: string; title: string; content: string; key_points?: string[]; warnings?: string[] };
    docs.push({
      id: vv.id,
      type: "veterinary",
      title: vv.title,
      content: [vv.title, vv.content, (vv.key_points || []).join(". "), (vv.warnings || []).join(". ")].filter(Boolean).join(" "),
      metadata: v as Record<string, unknown>,
    });
  }

  // Genetics
  for (const g of genetics) {
    const gg = g as { id: string; title: string; content: string; key_points?: string[] };
    docs.push({
      id: gg.id,
      type: "genetics",
      title: gg.title,
      content: [gg.title, gg.content, (gg.key_points || []).join(". ")].filter(Boolean).join(" "),
      metadata: g as Record<string, unknown>,
    });
  }

  // OpenAlex Research
  for (const oa of openalexResearch) {
    const r = oa as { id: string; title: string; content: string; key_points?: string[] };
    docs.push({
      id: r.id,
      type: "research",
      title: r.title,
      content: [r.title, r.content, (r.key_points || []).join(". ")].filter(Boolean).join(" "),
      metadata: oa as Record<string, unknown>,
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
  vectorError?: string;
  keywordTopScore?: number;
  vectorTopScore?: number;
  lowConfidence?: boolean;
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
    landrace: ["pura", "original", "nativa", "selvagem", "pure breed"],
    autoflower: ["automatica", "autoflowering", "auto", "ruderalis"],
    breeder: ["banco de sementes", "seedbank", "criador"],
    gravidez: ["gestacao", "gravida", "prenatal", "gestante"],
    chs: ["hiperemese", "hyperemesis", "vomito ciclico"],
    vaporizar: ["vape", "vaping", "vaporizador", "dry herb"],
    comestivel: ["edible", "gummy", "brownie", "bala"],
    microdose: ["microdosagem", "dose baixa", "low dose"],
    abstinencia: ["withdrawal", "cessacao", "parar de usar", "t-break"],
    veterinario: ["animal", "pet", "cachorro", "gato", "cao"],
    fibromialgia: ["dor difusa", "fibro"],
    parkinson: ["tremor", "doenca de parkinson"],
    esclerose: ["esclerose multipla", "multiple sclerosis"],
    ratio: ["proporcao", "cbd thc", "thc cbd"],
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

    // Boost breeder docs
    const breederKeywords = ["breeder", "banco de sementes", "seedbank", "seed bank", "criador", "produtor de sementes"];
    const queryBreeder = breederKeywords.some((k) => normalizedQuery.includes(k));
    if (queryBreeder && doc.type === "breeder") {
      score *= 3;
    }

    // Boost award docs
    const awardKeywords = ["premiacao", "premio", "cup", "copa", "vencedor", "campeao", "melhor strain", "award", "highlife", "emerald", "cannabis cup"];
    const queryAward = awardKeywords.some((k) => normalizedQuery.includes(k));
    if (queryAward && doc.type === "award") {
      score *= 3;
    }

    // Boost landrace docs
    const landraceKeywords = ["landrace", "pura", "original", "nativa", "selvagem", "genetica pura", "pure breed", "origem"];
    const queryLandrace = landraceKeywords.some((k) => normalizedQuery.includes(k));
    if (queryLandrace && doc.type === "landrace") {
      score = Math.max(score * 3, 20);
    }

    // Boost flavonoid docs
    const flavonoidKeywords = ["flavonoide", "cannflavin", "apigenina", "luteolina", "quercetina", "kaempferol", "naringenina", "vitexina", "crisina"];
    const queryFlavonoid = flavonoidKeywords.some((k) => normalizedQuery.includes(k));
    if (queryFlavonoid && doc.type === "flavonoid") {
      score = Math.max(score * 3, 20);
    }

    // Boost clinical trial docs
    const trialKeywords = ["ensaio clinico", "clinical trial", "fase 1", "fase 2", "fase 3", "nct", "randomizado", "placebo", "duplo cego", "trial"];
    const queryTrial = trialKeywords.some((k) => normalizedQuery.includes(k));
    if (queryTrial && doc.type === "clinical-trial") {
      score *= 3;
    }

    // Boost brazilian research docs
    const brResearchKeywords = ["pesquisa brasileira", "scielo", "pesquisa brasil", "estudo brasileiro"];
    const queryBrResearch = brResearchKeywords.some((k) => normalizedQuery.includes(k));
    if (queryBrResearch && doc.type === "brazilian-research") {
      score *= 3;
    }

    // Boost brazilian thesis docs
    const brThesisKeywords = ["tese", "dissertacao", "mestrado", "doutorado", "universidade", "defesa"];
    const queryBrThesis = brThesisKeywords.some((k) => normalizedQuery.includes(k));
    if (queryBrThesis && doc.type === "brazilian-thesis") {
      score *= 3;
    }

    // Boost harm-reduction related content (medical-research, clinical-trial docs)
    const harmReductionKeywords = ["reducao de danos", "harm reduction", "hiperemese", "chs", "gravidez", "gestacao", "amamentacao", "withdrawal", "abstinencia", "dependencia", "tolerancia", "t-break", "dirigir", "direcao", "cannabis use disorder", "transtorno"];
    const queryHarmReduction = harmReductionKeywords.some((k) => normalizedQuery.includes(k));
    if (queryHarmReduction && (doc.type === "research" || doc.type === "clinical-trial" || doc.type === "harm-reduction")) {
      score *= doc.type === "harm-reduction" ? 3 : 2;
    }

    // Boost veterinary related content
    const vetKeywords = ["veterinario", "cachorro", "gato", "cao", "felino", "canino", "pet", "animal", "mg/kg", "toxicidade animal"];
    const queryVet = vetKeywords.some((k) => normalizedQuery.includes(k));
    if (queryVet && (doc.type === "research" || doc.type === "clinical-trial" || doc.type === "veterinary")) {
      score *= doc.type === "veterinary" ? 3 : 2;
    }

    // Boost dosing docs
    const dosingKeywords = ["dosagem", "dose", "titulacao", "posologia", "microdose", "comestivel", "edible", "inicio", "onset", "duracao", "quanto tomar", "quanto usar", "miligramas"];
    const queryDosing = dosingKeywords.some((k) => normalizedQuery.includes(k));
    if (queryDosing && doc.type === "dosing") {
      score *= 3;
    }

    // Boost market docs
    const marketKeywords = ["mercado", "preco", "emprego", "industria", "receita", "imposto", "cannabis business", "economia", "investimento", "startup"];
    const queryMarket = marketKeywords.some((k) => normalizedQuery.includes(k));
    if (queryMarket && doc.type === "market") {
      score *= 3;
    }

    // Boost regulation-global docs
    const regGlobalKeywords = ["regulamentacao internacional", "pais", "prescricao", "alemanha", "canada", "australia", "uruguai", "tailandia", "legislacao internacional", "legalizacao"];
    const queryRegGlobal = regGlobalKeywords.some((k) => normalizedQuery.includes(k));
    if (queryRegGlobal && doc.type === "regulation-global") {
      score *= 3;
    }

    // Boost genetics docs
    const geneticsKeywords = ["genetica", "breeding", "feminizada", "quimiotipo", "gwas", "hlvd", "autoflower", "ruderalis", "polinizacao", "cruzamento", "hibrido", "f1", "estabilizar"];
    const queryGenetics = geneticsKeywords.some((k) => normalizedQuery.includes(k));
    if (queryGenetics && doc.type === "genetics") {
      score *= 3;
    }

    // Boost strains with high THC for potency queries
    const potencyKeywords = ["alto thc", "forte", "potente", "high thc", "strong", "pancada"];
    const queryPotency = potencyKeywords.some((k) => normalizedQuery.includes(k));
    if (queryPotency && doc.type === "strain") {
      const thc = (doc.metadata as Record<string, unknown>).thc as { min: number } | undefined;
      if (thc && thc.min >= 20) score *= 2;
    }

    // Boost CBD strains for medical/CBD queries
    const cbdKeywords = ["alto cbd", "high cbd", "cbd rich", "medicinal", "cbd alto"];
    const queryCbd = cbdKeywords.some((k) => normalizedQuery.includes(k));
    if (queryCbd && doc.type === "strain") {
      const cbd = (doc.metadata as Record<string, unknown>).cbd as { min: number } | undefined;
      if (cbd && cbd.min >= 5) score *= 2;
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
  console.time("[rag] embedText");
  const embedding = await embedText(query);
  console.timeEnd("[rag] embedText");

  console.time("[rag] findSimilarDocs");
  const rows = await findSimilarDocuments(embedding, topK, typeFilter);
  console.timeEnd("[rag] findSimilarDocs");

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

function detectQueryDomain(query: string): string[] {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const domains: string[] = [];
  const domainMap: Record<string, string[]> = {
    cultivation: ["cultivar", "cultivo", "plantar", "grow", "indoor", "outdoor", "colheita", "nutriente", "substrato", "floracao", "vegetativa", "germinacao"],
    "drug-interaction": ["interacao", "medicamento", "remedio", "cyp", "anticoagulante", "antidepressivo", "opioide", "benzodiazepino"],
    extraction: ["extracao", "extrair", "rso", "tintura", "manteiga", "rosin", "hash", "concentrado"],
    administration: ["sublingual", "oral", "topico", "inalacao", "vaporizar", "fumar", "supositorio", "comestivel"],
    endocannabinoid: ["endocanabinoide", "cb1", "cb2", "anandamida", "2-ag", "faah", "entourage", "receptor"],
    "condition-expanded": ["autismo", "tea", "crohn", "endometriose", "enxaqueca", "tdah", "ela", "glaucoma", "tourette", "neuropatia"],
    "pest-disease": ["praga", "doenca", "fungo", "mofo", "acaro", "oideo", "deficiencia", "amarelando"],
    dosing: ["dosagem", "dose", "titulacao", "microdose", "quanto tomar", "miligramas"],
    "harm-reduction": ["reducao de danos", "hiperemese", "chs", "gravidez", "abstinencia", "dependencia"],
    veterinary: ["veterinario", "cachorro", "gato", "pet", "animal"],
    genetics: ["genetica", "breeding", "feminizada", "quimiotipo", "autoflower", "cruzamento"],
  };
  for (const [domain, keywords] of Object.entries(domainMap)) {
    if (keywords.some((k) => q.includes(k))) {
      domains.push(domain);
    }
  }
  return domains;
}

function rerankResults(
  results: Array<{ doc: Document; score: number }>,
  query: string,
  topK: number,
): ScoredDocument[] {
  const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const queryWords = normalizedQuery.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
  const domains = detectQueryDomain(query);

  const reranked = results.map((r) => {
    let boost = 0;
    const normalizedTitle = r.doc.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizedContent = r.doc.content.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Title match boost: query words in title
    const titleWords = queryWords.filter((w) => normalizedTitle.includes(w));
    if (titleWords.length > 0) {
      boost += 0.3 * (titleWords.length / queryWords.length);
    }

    // Type relevance: doc type matches detected domain
    if (domains.includes(r.doc.type)) {
      boost += 0.2;
    }

    // Content density: ratio of query words found in content
    if (queryWords.length > 0) {
      const contentWords = queryWords.filter((w) => normalizedContent.includes(w));
      boost += 0.1 * (contentWords.length / queryWords.length);
    }

    return { doc: r.doc, score: r.score + r.score * boost };
  });

  reranked.sort((a, b) => b.score - a.score);

  // Preserve strain randomization after reranking
  const strainResults = reranked.filter((s) => s.doc.type === "strain");
  const otherResults = reranked.filter((s) => s.doc.type !== "strain");

  if (strainResults.length > 3) {
    const topStrains = strainResults.slice(0, 10);
    for (let i = topStrains.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [topStrains[i], topStrains[j]] = [topStrains[j], topStrains[i]];
    }
    const selectedStrains = topStrains.slice(0, Math.min(2, topK));
    const selectedOther = otherResults.slice(0, topK - selectedStrains.length);
    return [
      ...selectedOther.map((r) => ({ document: r.doc, score: r.score })),
      ...selectedStrains.map((r) => ({ document: r.doc, score: r.score })),
    ];
  }

  return reranked.slice(0, topK).map((r) => ({ document: r.doc, score: r.score }));
}

const LOW_CONFIDENCE_THRESHOLD = 0.008;

async function hybridSearch(
  query: string,
  topK: number = 5,
  typeFilter?: Document["type"],
): Promise<SearchResult> {
  const K = 60; // RRF constant
  const keywordWeight = 0.4;
  const vectorWeight = 0.6;

  let vectorError: string | undefined;
  const [keywordResults, vectorResults] = await Promise.all([
    Promise.resolve(search(query, topK * 3, typeFilter)),
    vectorSearch(query, topK * 3, typeFilter).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[hybridSearch] Vector search failed, keyword-only:", msg);
      vectorError = msg;
      return [] as ScoredDocument[];
    }),
  ]);

  const keywordTopScore = keywordResults[0]?.score ?? 0;
  const vectorTopScore = vectorResults[0]?.score ?? 0;

  // If vector search failed, return keyword-only with error info
  if (vectorResults.length === 0) {
    const kwResults = search(query, topK, typeFilter);
    return {
      results: kwResults,
      searchMode: "keyword",
      vectorError,
      keywordTopScore: kwResults[0]?.score ?? 0,
    };
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

  // Rerank top results for better precision
  const reranked = rerankResults(sorted.slice(0, topK * 3), query, topK);
  const topScore = reranked[0]?.score ?? 0;
  const lowConfidence = topScore < LOW_CONFIDENCE_THRESHOLD;

  return {
    results: reranked,
    searchMode: "hybrid",
    keywordTopScore,
    vectorTopScore,
    lowConfidence,
  };
}

// Cache with TTL: retry on failure instead of caching false permanently
let _hasEmbeddings: boolean | null = null;
let _hasEmbeddingsCheckedAt = 0;
const CACHE_TTL_SUCCESS = 5 * 60 * 1000; // 5 min when true
const CACHE_TTL_FAILURE = 30 * 1000;      // 30s when false (fast retry)

export async function searchAll(
  query: string,
  topK: number = 5,
): Promise<SearchResult> {
  const now = Date.now();
  const ttl = _hasEmbeddings ? CACHE_TTL_SUCCESS : CACHE_TTL_FAILURE;
  const cacheExpired = _hasEmbeddings === null || (now - _hasEmbeddingsCheckedAt > ttl);

  if (cacheExpired) {
    try {
      _hasEmbeddings = await checkHasEmbeddings();
    } catch (err) {
      console.warn("[searchAll] hasEmbeddings check failed:", err);
      _hasEmbeddings = false;
    }
    _hasEmbeddingsCheckedAt = now;
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
