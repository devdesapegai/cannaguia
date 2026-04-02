import "server-only";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.POSTGRES_URL ?? "", { max: 3 });
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

  if (typeFilter) {
    const results = await db.execute(sql`
      SELECT "id", "type", "title", "content",
             1 - ("embedding" <=> ${vectorStr}::vector) as similarity
      FROM "KnowledgeEmbedding"
      WHERE "type" = ${typeFilter}
      ORDER BY "embedding" <=> ${vectorStr}::vector
      LIMIT ${topK}
    `);
    return results as any;
  }

  const results = await db.execute(sql`
    SELECT "id", "type", "title", "content",
           1 - ("embedding" <=> ${vectorStr}::vector) as similarity
    FROM "KnowledgeEmbedding"
    ORDER BY "embedding" <=> ${vectorStr}::vector
    LIMIT ${topK}
  `);
  return results as any;
}

/** Check if the KnowledgeEmbedding table has any records */
export async function hasEmbeddings(): Promise<boolean> {
  try {
    const result = await db.execute(
      sql`SELECT EXISTS(SELECT 1 FROM "KnowledgeEmbedding" LIMIT 1) as has_rows`,
    );
    return (result as any)?.[0]?.has_rows === true;
  } catch {
    return false;
  }
}
