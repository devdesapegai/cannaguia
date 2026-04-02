/**
 * Generate embeddings for all knowledge base documents.
 * Incremental: skips documents whose content hash hasn't changed.
 *
 * Usage:
 *   corepack pnpm tsx scripts/generate-embeddings.ts
 *   corepack pnpm tsx scripts/generate-embeddings.ts --dry-run
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { embedMany } from "ai";
import { google } from "@ai-sdk/google";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createHash } from "crypto";
import { knowledgeEmbedding } from "../lib/db/schema";
import { buildDocuments } from "../lib/rag/search";

const BATCH_SIZE = 100;
const EMBEDDING_MODEL = "text-embedding-004";
const DRY_RUN = process.argv.includes("--dry-run");

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error("POSTGRES_URL not set");
    process.exit(1);
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error("GOOGLE_GENERATIVE_AI_API_KEY not set");
    process.exit(1);
  }

  const client = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(client);
  const docs = buildDocuments();

  console.log("Total documents in knowledge base: " + docs.length);

  const existing = await db
    .select({
      id: knowledgeEmbedding.id,
      contentHash: knowledgeEmbedding.contentHash,
    })
    .from(knowledgeEmbedding);
  const existingMap = new Map(existing.map((e) => [e.id, e.contentHash]));
  console.log("Existing embeddings in DB: " + existing.length);

  const toEmbed = docs.filter((doc) => {
    const hash = hashContent(doc.content);
    return existingMap.get(doc.id) !== hash;
  });

  console.log("Documents needing (re-)embedding: " + toEmbed.length);

  if (toEmbed.length === 0) {
    console.log("All documents are up to date. Nothing to do.");
    await client.end();
    return;
  }

  if (DRY_RUN) {
    console.log("\n--dry-run: would embed these documents:");
    for (const doc of toEmbed.slice(0, 20)) {
      console.log("  [" + doc.type + "] " + doc.id + " -- " + doc.title);
    }
    if (toEmbed.length > 20) {
      console.log("  ... and " + (toEmbed.length - 20) + " more");
    }
    await client.end();
    return;
  }

  let processed = 0;
  for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
    const batch = toEmbed.slice(i, i + BATCH_SIZE);
    const texts = batch.map((d) => d.content);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toEmbed.length / BATCH_SIZE);

    console.log("Embedding batch " + batchNum + "/" + totalBatches + " (" + batch.length + " docs)...");

    const { embeddings } = await embedMany({
      model: google.embedding(EMBEDDING_MODEL),
      values: texts,
    });

    for (let j = 0; j < batch.length; j++) {
      const doc = batch[j];
      const hash = hashContent(doc.content);
      const values = {
        id: doc.id,
        type: doc.type,
        title: doc.title,
        content: doc.content,
        embedding: embeddings[j],
        contentHash: hash,
        updatedAt: new Date(),
      };

      await db
        .insert(knowledgeEmbedding)
        .values({ ...values, createdAt: new Date() })
        .onConflictDoUpdate({
          target: knowledgeEmbedding.id,
          set: values,
        });

      processed++;
    }

    if (i + BATCH_SIZE < toEmbed.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log("Done! Processed " + processed + " documents.");
  await client.end();
}

main().catch((err) => {
  console.error("Embedding generation failed:", err);
  process.exit(1);
});
