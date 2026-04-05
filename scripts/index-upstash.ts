/**
 * Index knowledge base documents into Upstash Vector.
 * Incremental: skips documents whose content hash hasn't changed.
 * Upstash handles embedding server-side (BAAI/bge-m3).
 *
 * Usage:
 *   corepack pnpm tsx scripts/index-upstash.ts
 *   corepack pnpm tsx scripts/index-upstash.ts --dry-run
 *   corepack pnpm tsx scripts/index-upstash.ts --type=strain
 *   corepack pnpm tsx scripts/index-upstash.ts --limit 1000
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { Index } from "@upstash/vector";
import { createHash } from "crypto";
import { buildDocuments } from "../lib/rag/search";

const BATCH_SIZE = 50;
const DELAY_MS = 1000;

const DRY_RUN = process.argv.includes("--dry-run");
const TYPE_FILTER = process.argv.find((a) => a.startsWith("--type="))?.split("=")[1];
const LIMIT = (() => {
  const idx = process.argv.indexOf("--limit");
  return idx !== -1 ? Number(process.argv[idx + 1]) : undefined;
})();

type VectorMetadata = {
  type: string;
  title: string;
  contentHash: string;
};

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

async function main() {
  if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
    console.error("UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN must be set");
    process.exit(1);
  }

  const index = new Index<VectorMetadata>();

  let docs = buildDocuments();
  console.log(`Total documents in knowledge base: ${docs.length}`);

  if (TYPE_FILTER) {
    docs = docs.filter((d) => d.type === TYPE_FILTER);
    console.log(`Filtered to type="${TYPE_FILTER}": ${docs.length} docs`);
  }

  // Compute hashes for all docs
  const docsWithHash = docs.map((doc) => ({
    ...doc,
    contentHash: hashContent(doc.content),
    data: `${doc.title} — ${doc.content}`,
  }));

  // Fetch existing vectors to check contentHash (batch fetch by ID)
  console.log("Checking existing vectors...");
  const existingHashes = new Map<string, string>();

  for (let i = 0; i < docsWithHash.length; i += 100) {
    const batchIds = docsWithHash.slice(i, i + 100).map((d) => d.id);
    try {
      const fetched = await index.fetch(batchIds, {
        includeMetadata: true,
        includeData: false,
      });
      for (const item of fetched) {
        if (item && item.metadata?.contentHash) {
          existingHashes.set(item.id as string, item.metadata.contentHash);
        }
      }
    } catch {
      // If fetch fails (e.g. empty index), continue — all docs will be indexed
    }
  }
  console.log(`Existing vectors found: ${existingHashes.size}`);

  // Filter to only new/changed docs
  let toIndex = docsWithHash.filter((doc) => {
    return existingHashes.get(doc.id) !== doc.contentHash;
  });

  console.log(`Documents needing indexing: ${toIndex.length}`);

  if (toIndex.length === 0) {
    console.log("All documents are up to date. Nothing to do.");
    return;
  }

  if (LIMIT) {
    toIndex = toIndex.slice(0, LIMIT);
    console.log(`Limited to ${LIMIT} documents`);
  }

  if (DRY_RUN) {
    console.log("\n--dry-run: would index these documents:");
    for (const doc of toIndex.slice(0, 30)) {
      console.log(`  [${doc.type}] ${doc.id} — ${doc.title}`);
    }
    if (toIndex.length > 30) {
      console.log(`  ... and ${toIndex.length - 30} more`);
    }
    return;
  }

  // Process in batches
  let processed = 0;
  for (let i = 0; i < toIndex.length; i += BATCH_SIZE) {
    const batch = toIndex.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toIndex.length / BATCH_SIZE);

    console.log(
      `Indexing batch ${batchNum}/${totalBatches} (${batch.length} docs)...`,
    );

    await index.upsert(
      batch.map((doc) => ({
        id: doc.id,
        data: doc.data,
        metadata: {
          type: doc.type,
          title: doc.title,
          contentHash: doc.contentHash,
        },
      })),
    );

    processed += batch.length;

    // Rate limit between batches
    if (i + BATCH_SIZE < toIndex.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`Done! Indexed ${processed} documents.`);
}

main().catch((err) => {
  console.error("Indexing failed:", err);
  process.exit(1);
});
