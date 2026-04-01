"use client";

import { Crown } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function PlanUpgradeCTA() {
  const { data: session } = useSession();
  const router = useRouter();

  if ((session?.user as any)?.plan === "premium") return null;

  return (
    <div className="px-3 py-3 group-data-[collapsible=icon]:hidden">
      <button
        onClick={() => router.push("/planos")}
        className="w-full h-9 rounded-lg bg-gradient-to-r from-green-600 to-green-500 text-white text-[13px] font-medium hover:from-green-500 hover:to-green-400 transition-all flex items-center justify-center gap-2"
      >
        <Crown className="size-4" />
        Upgrade Premium
      </button>
      <p className="text-[11px] text-sidebar-foreground/40 text-center mt-1.5">
        A partir de R$39,90/mes
      </p>
    </div>
  );
}
