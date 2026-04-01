"use client";

import { Crown } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";

export function PlanUpgradeCTA() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  if ((session?.user as any)?.plan === "premium") return null;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      // handle error silently
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-3 py-3 group-data-[collapsible=icon]:hidden">
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="w-full h-9 rounded-lg bg-gradient-to-r from-green-600 to-green-500 text-white text-[13px] font-medium hover:from-green-500 hover:to-green-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Crown className="size-4" />
        {loading ? "Carregando..." : "Upgrade Premium"}
      </button>
      <p className="text-[11px] text-sidebar-foreground/40 text-center mt-1.5">
        R$29/mes - Mensagens ilimitadas
      </p>
    </div>
  );
}
