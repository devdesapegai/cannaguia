import { auth } from "@/app/(auth)/auth";
import { getUserPlan } from "@/lib/db/plan";
import { entitlementsByPlan } from "@/lib/ai/entitlements";
import { getMessageCountByUserId } from "@/lib/db/queries";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { effectivePlan } = await getUserPlan(session.user.id);
  const { maxMessagesPerDay } = entitlementsByPlan[effectivePlan];
  const messageCount = await getMessageCountByUserId({
    id: session.user.id,
    differenceInHours: 24,
  });

  return Response.json({
    plan: effectivePlan,
    used: messageCount,
    limit: maxMessagesPerDay === Infinity ? null : maxMessagesPerDay,
    remaining:
      maxMessagesPerDay === Infinity
        ? null
        : Math.max(0, maxMessagesPerDay - messageCount),
  });
}
