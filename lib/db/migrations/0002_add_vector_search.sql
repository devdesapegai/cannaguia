-- Enable pgvector extension (Supabase/Vercel Postgres supports this)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "KnowledgeEmbedding" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "type" varchar(50) NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "embedding" vector(768) NOT NULL,
  "contentHash" varchar(64) NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- HNSW index for fast cosine similarity search (~3100 docs)
CREATE INDEX IF NOT EXISTS "idx_ke_hnsw"
  ON "KnowledgeEmbedding"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS "idx_ke_type"
  ON "KnowledgeEmbedding" ("type");
