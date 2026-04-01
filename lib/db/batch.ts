import "server-only";

import { and, asc, eq, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { chat, message } from "./schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

const BATCH_SIZE = 20;
const COOLDOWNS_MS = [
  0,            // batch 1: immediate
  4 * 3600000,  // batch 2: 4h after batch 1 exhausted
  8 * 3600000,  // batch 3: 8h after batch 2 exhausted
];
const MAX_BATCHES = COOLDOWNS_MS.length;
const WEEKLY_LIMIT = BATCH_SIZE * MAX_BATCHES; // 60

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = start
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export interface BatchStatus {
  allowed: boolean;
  currentBatch: number; // 1-indexed
  messagesInBatch: number;
  batchLimit: number;
  remaining: number;
  weeklyUsed: number;
  weeklyLimit: number;
  nextBatchAt: Date | null; // when next batch unlocks
  weeklyReset: Date; // next Monday
  cooldownMs: number; // ms until next batch (0 = available now)
}

export async function getUserBatchStatus(userId: string): Promise<BatchStatus> {
  const weekStart = getWeekStart();
  const nextMonday = new Date(weekStart);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);

  try {
    // Get all user message timestamps this week, ordered
    const rows = await db
      .select({ createdAt: message.createdAt })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, userId),
          gte(message.createdAt, weekStart),
          eq(message.role, "user"),
        ),
      )
      .orderBy(asc(message.createdAt));

    const weeklyUsed = rows.length;
    const now = Date.now();

    if (weeklyUsed >= WEEKLY_LIMIT) {
      return {
        allowed: false,
        currentBatch: MAX_BATCHES,
        messagesInBatch: BATCH_SIZE,
        batchLimit: BATCH_SIZE,
        remaining: 0,
        weeklyUsed,
        weeklyLimit: WEEKLY_LIMIT,
        nextBatchAt: nextMonday,
        weeklyReset: nextMonday,
        cooldownMs: nextMonday.getTime() - now,
      };
    }

    // Figure out which batch we're in and if it's unlocked
    const batchIndex = Math.floor(weeklyUsed / BATCH_SIZE); // 0, 1, 2
    const messagesInCurrentBatch = weeklyUsed % BATCH_SIZE;

    // Check if current batch is unlocked
    // Batch N unlocks COOLDOWNS_MS[N] after batch N-1 was exhausted
    if (batchIndex > 0) {
      const prevBatchLastMsg = rows[(batchIndex * BATCH_SIZE) - 1];
      if (prevBatchLastMsg) {
        const unlockTime =
          prevBatchLastMsg.createdAt.getTime() + COOLDOWNS_MS[batchIndex];
        if (now < unlockTime) {
          // Still in cooldown
          return {
            allowed: false,
            currentBatch: batchIndex + 1,
            messagesInBatch: 0,
            batchLimit: BATCH_SIZE,
            remaining: 0,
            weeklyUsed,
            weeklyLimit: WEEKLY_LIMIT,
            nextBatchAt: new Date(unlockTime),
            weeklyReset: nextMonday,
            cooldownMs: unlockTime - now,
          };
        }
      }
    }

    const remaining = BATCH_SIZE - messagesInCurrentBatch;

    return {
      allowed: true,
      currentBatch: batchIndex + 1,
      messagesInBatch: messagesInCurrentBatch,
      batchLimit: BATCH_SIZE,
      remaining,
      weeklyUsed,
      weeklyLimit: WEEKLY_LIMIT,
      nextBatchAt: null,
      weeklyReset: nextMonday,
      cooldownMs: 0,
    };
  } catch (error) {
    console.error("getUserBatchStatus error:", error);
    // Fallback: allow
    return {
      allowed: true,
      currentBatch: 1,
      messagesInBatch: 0,
      batchLimit: BATCH_SIZE,
      remaining: BATCH_SIZE,
      weeklyUsed: 0,
      weeklyLimit: WEEKLY_LIMIT,
      nextBatchAt: null,
      weeklyReset: new Date(),
      cooldownMs: 0,
    };
  }
}
