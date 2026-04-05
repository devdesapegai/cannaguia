import "server-only";

import { Index } from "@upstash/vector";

type VectorMetadata = {
  type: string;
  title: string;
  contentHash: string;
};

const index = new Index<VectorMetadata>();

export async function vectorQuery(
  query: string,
  topK: number = 10,
  typeFilter?: string,
): Promise<
  Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    score: number;
  }>
> {
  const results = await index.query({
    data: query,
    topK,
    includeMetadata: true,
    includeData: true,
    ...(typeFilter ? { filter: `type = '${typeFilter}'` } : {}),
  });

  return results.map((r) => ({
    id: r.id as string,
    type: r.metadata?.type ?? "",
    title: r.metadata?.title ?? "",
    content: (r.data as string) ?? "",
    score: r.score,
  }));
}

export async function hasVectors(): Promise<boolean> {
  try {
    const info = await index.info();
    return info.vectorCount > 0;
  } catch {
    return false;
  }
}

export { index };
