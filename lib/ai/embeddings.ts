import "server-only";

import { embed, embedMany } from "ai";
import { google } from "@ai-sdk/google";

const EMBEDDING_MODEL = "gemini-embedding-001";

// --- LRU Cache for query embeddings ---
const CACHE_MAX = 200;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  embedding: number[];
  timestamp: number;
}

const embeddingCache = new Map<string, CacheEntry>();

function normalizeKey(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

function getCached(key: string): number[] | null {
  const entry = embeddingCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    embeddingCache.delete(key);
    return null;
  }
  // Move to end (most recently used)
  embeddingCache.delete(key);
  embeddingCache.set(key, entry);
  return entry.embedding;
}

function setCache(key: string, embedding: number[]): void {
  if (embeddingCache.size >= CACHE_MAX) {
    const oldestKey = embeddingCache.keys().next().value;
    if (oldestKey !== undefined) embeddingCache.delete(oldestKey);
  }
  embeddingCache.set(key, { embedding, timestamp: Date.now() });
}

export async function embedText(text: string): Promise<number[]> {
  const cacheKey = normalizeKey(text);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const { embedding } = await embed({
    model: google.embedding(EMBEDDING_MODEL),
    value: text,
    providerOptions: {
      google: { outputDimensionality: 768 },
    },
  });

  setCache(cacheKey, embedding);
  return embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: google.embedding(EMBEDDING_MODEL),
    values: texts,
    providerOptions: {
      google: { outputDimensionality: 768 },
    },
  });
  return embeddings;
}
