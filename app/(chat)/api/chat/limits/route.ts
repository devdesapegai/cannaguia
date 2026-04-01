import { auth } from "@/app/(auth)/auth";
import { getUserPlan } from "@/lib/db/plan";
import { getUserBatchStatus } from "@/lib/db/batch";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { effectivePlan } = await getUserPlan(session.user.id);

  if (effectivePlan === "premium") {
    return Response.json({
      plan: "premium",
      allowed: true,
      remaining: null,
      weeklyUsed: null,
      weeklyLimit: null,
    });
  }

  const batch = await getUserBatchStatus(session.user.id);

  return Response.json({
    plan: effectivePlan,
    ...batch,
    // ISO strings for frontend
    nextBatchAt: batch.nextBatchAt?.toISOString() ?? null,
    weeklyReset: batch.weeklyReset.toISOString(),
  });
}
