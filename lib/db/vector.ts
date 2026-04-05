import "server-only";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.POSTGRES_URL ?? "", { max: 5 });
const db = drizzle(client);

export async function findSimilarDocuments(
  embedding: number[],
  topK: number = 10,
  typeFilter?: string,
): Promise<
  Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    similarity: number;
  }>
> {
  const vectorStr = `[${embedding.join(",")}]`;

  // pgvector default hnsw.ef_search=40 is sufficient for ~3100 docs
  // Removed transaction wrapper to save ~100ms (BEGIN/COMMIT round trips)
  if (typeFilter) {
    return db.execute(sql`
      SELECT "id", "type", "title", "content",
             1 - ("embedding" <=> ${vectorStr}::vector) as similarity
      FROM "KnowledgeEmbedding"
      WHERE "type" = ${typeFilter}
      ORDER BY "embedding" <=> ${vectorStr}::vector
      LIMIT ${topK}
    `) as any;
  }

  return db.execute(sql`
    SELECT "id", "type", "title", "content",
           1 - ("embedding" <=> ${vectorStr}::vector) as similarity
    FROM "KnowledgeEmbedding"
    ORDER BY "embedding" <=> ${vectorStr}::vector
    LIMIT ${topK}
  `) as any;
}

/** Check if the KnowledgeEmbedding table has any records */
export async function hasEmbeddings(): Promise<boolean> {
  try {
    const result = await db.execute(
      sql`SELECT EXISTS(SELECT 1 FROM "KnowledgeEmbedding" LIMIT 1) as has_rows`,
    );
    return (result as any)?.[0]?.has_rows === true;
  } catch (err) {
    console.warn("[hasEmbeddings] Check failed:", err);
    return false;
  }
}
