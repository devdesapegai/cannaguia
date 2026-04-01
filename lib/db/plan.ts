import "server-only";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { user } from "./schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

export type UserPlan = "free" | "premium";

export async function getUserPlan(userId: string): Promise<{
  plan: UserPlan;
  isExpired: boolean;
  effectivePlan: UserPlan;
}> {
  try {
    const [row] = await db
      .select({ plan: user.plan, planExpiresAt: user.planExpiresAt })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!row) return { plan: "free", isExpired: false, effectivePlan: "free" };

    const isExpired =
      row.plan === "premium" &&
      row.planExpiresAt !== null &&
      row.planExpiresAt < new Date();

    const effectivePlan: UserPlan = isExpired ? "free" : (row.plan as UserPlan);

    return { plan: row.plan as UserPlan, isExpired, effectivePlan };
  } catch (error) {
    console.error("getUserPlan error (column may not exist yet):", error);
    return { plan: "free", isExpired: false, effectivePlan: "free" };
  }
}

export async function updateUserPlan(
  userId: string,
  plan: UserPlan,
  expiresAt: Date | null,
) {
  return db
    .update(user)
    .set({ plan, planExpiresAt: expiresAt })
    .where(eq(user.id, userId));
}

export async function updateStripeCustomerId(
  userId: string,
  stripeCustomerId: string,
) {
  return db
    .update(user)
    .set({ stripeCustomerId })
    .where(eq(user.id, userId));
}

export async function getUserByStripeCustomerId(
  stripeCustomerId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.stripeCustomerId, stripeCustomerId))
    .limit(1);

  return row?.id ?? null;
}
