import "server-only";

import { embed, embedMany } from "ai";
import { google } from "@ai-sdk/google";

const EMBEDDING_MODEL = "gemini-embedding-001";

const CACHE_TTL = 5 * 60 * 1000; // 5 min
const CACHE_MAX = 100;
const queryEmbeddingCache = new Map<string, { embedding: number[]; timestamp: number }>();

export async function embedText(text: string): Promise<number[]> {
  const cached = queryEmbeddingCache.get(text);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.embedding;
  }

  const { embedding } = await embed({
    model: google.embedding(EMBEDDING_MODEL),
    value: text,
    providerOptions: {
      google: { outputDimensionality: 768 },
    },
  });

  // Evict oldest if full
  if (queryEmbeddingCache.size >= CACHE_MAX) {
    const oldest = queryEmbeddingCache.keys().next().value;
    if (oldest) queryEmbeddingCache.delete(oldest);
  }
  queryEmbeddingCache.set(text, { embedding, timestamp: Date.now() });
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
