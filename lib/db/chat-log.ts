import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { chatLog } from "./schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

export interface ChatLogEntry {
  chatId: string;
  messageId?: string;
  userId: string;
  userText: string;
  ragDocsUsed?: { title: string; type: string; score: number }[];
  ragTopScore?: number;
  searchMode: "hybrid" | "keyword";
  latencyMs: number;
  tokenCount?: number;
  inputFlagged?: boolean;
  inputFlagReason?: string;
  outputFlagged?: boolean;
  outputViolations?: { type: string; matched: string; severity: string }[];
  actionTaken?: string;
  ragLatencyMs?: number;
  vectorTopScore?: number;
  keywordTopScore?: number;
  vectorError?: string;
}

/** Fire-and-forget insert. Never throws. */
export async function insertChatLog(entry: ChatLogEntry): Promise<void> {
  try {
    await db.insert(chatLog).values({
      chatId: entry.chatId,
      messageId: entry.messageId ?? null,
      userId: entry.userId,
      userText: entry.userText.slice(0, 2000),
      ragDocsUsed: entry.ragDocsUsed ?? null,
      ragTopScore: entry.ragTopScore ?? null,
      searchMode: entry.searchMode,
      latencyMs: entry.latencyMs,
      tokenCount: entry.tokenCount ?? null,
      inputFlagged: entry.inputFlagged ?? false,
      inputFlagReason: entry.inputFlagReason ?? null,
      outputFlagged: entry.outputFlagged ?? false,
      outputViolations: entry.outputViolations ?? null,
      actionTaken: entry.actionTaken ?? null,
      ragLatencyMs: entry.ragLatencyMs ?? null,
      vectorTopScore: entry.vectorTopScore ?? null,
      keywordTopScore: entry.keywordTopScore ?? null,
      vectorError: entry.vectorError?.slice(0, 200) ?? null,
    });
  } catch (error) {
    console.error("[ChatLog] Failed to insert:", error);
  }
}
