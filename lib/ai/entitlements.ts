import type { UserType } from "@/app/(auth)/auth";
import type { UserPlan } from "@/lib/db/plan";

type Entitlements = {
  maxMessagesPerDay: number;
};

export const entitlementsByPlan: Record<UserPlan, Entitlements> = {
  free: {
    maxMessagesPerDay: 50,
  },
  premium: {
    maxMessagesPerDay: Infinity,
  },
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  guest: {
    maxMessagesPerDay: 10,
  },
  regular: {
    maxMessagesPerDay: 20,
  },
};
