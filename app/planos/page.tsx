"use client";

import { Leaf } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const CONSULTORIA_PRICE_ID = "price_1THY6N4kAmUvNyf9JMMw4OJw";

export default function PlanosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  const isGuest = session?.user?.email?.startsWith("guest-");

  useEffect(() => {
    if (isGuest) {
      router.replace("/login");
    }
  }, [isGuest, router]);

  const handleUpgrade = async (priceId?: string) => {
    const key = priceId || "premium";
    setLoading(key);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(priceId ? { priceId } : {}),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      // handle error
    } finally {
      setLoading(null);
    }
  };

  if (status === "loading" || status === "unauthenticated" || isGuest) {
    return <div className="flex h-dvh items-center justify-center bg-background"><div className="text-muted-foreground text-sm">Carregando...</div></div>;
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4">Planos</h1>
        <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">Escolha o plano ideal para suas necessidades</p>

        <div className="grid sm:grid-cols-3 gap-5 mx-auto">
          {/* Gratuito */}
          <div className="p-5 sm:p-6 rounded-xl border border-border bg-card/50 flex flex-col opacity-80">
            <h3 className="text-lg font-bold mb-1">Gratuito</h3>
            <div className="mb-1"><span className="text-3xl font-bold">R$ 0</span><span className="text-sm text-muted-foreground"> / mes</span></div>
            <p className="text-[13px] text-muted-foreground mb-5">Conheca a CannaGuia</p>
            <button
              disabled
              className="w-full py-2.5 rounded-lg bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed mb-5"
            >
              Seu plano atual
            </button>
            <ul className="space-y-2.5 text-[13px] flex-1 text-muted-foreground">
              <li className="flex items-start gap-2"><Leaf className="w-3.5 h-3.5 text-green-500/50 mt-0.5 shrink-0" /><span>Acesso ao modelo CannaGuia 5.0</span></li>
              <li className="flex items-start gap-2"><Leaf className="w-3.5 h-3.5 text-green-500/50 mt-0.5 shrink-0" /><span>Mensagens limitadas por sessao</span></li>
              <li className="flex items-start gap-2"><Leaf className="w-3.5 h-3.5 text-green-500/50 mt-0.5 shrink-0" /><span>Historico de conversas limitado</span></li>
              <li className="flex items-start gap-2"><Leaf className="w-3.5 h-3.5 text-green-500/50 mt-0.5 shrink-0" /><span>Recomendacoes de strains e tratamentos</span></li>
              <li className="flex items-start gap-2"><Leaf className="w-3.5 h-3.5 text-green-500/50 mt-0.5 shrink-0" /><span>Pesquisa com estudos cientificos</span></li>
              <li className="flex items-start gap-2"><Leaf className="w-3.5 h-3.5 text-green-500/50 mt-0.5 shrink-0" /><span>Memoria de contexto limitada</span></li>
            </ul>
          </div>

          {/* Premium */}
          <div className="p-5 sm:p-6 rounded-xl border border-green-500/30 bg-background relative flex flex-col">
            <div className="absolute -top-3 left-4 px-2.5 py-0.5 bg-green-600 text-white text-xs font-medium rounded-full">Recomendado</div>
            <h3 className="text-lg font-bold mb-1">Premium</h3>
            <div className="mb-1"><span className="text-3xl font-bold">R$ 39,90</span><span className="text-sm text-muted-foreground"> / mes</span></div>
            <p className="text-[13px] text-muted-foreground mb-5">Experiencia completa</p>
            <button
              onClick={() => handleUpgrade()}
              disabled={loading === "premium"}
              className="w-full py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors mb-5 disabled:opacity-50"
            >
              {loading === "premium" ? "Carregando..." : "Fazer Upgrade"}
            </button>
            <ul className="space-y-2.5 text-[13px] flex-1">
              <li className="flex items-start gap-2"><Leaf className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /><span>Acesso ao modelo CannaGuia 5.4</span></li>
              <li className="flex items-start gap-2"><Leaf className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /><span>Limite de mensagens maior</span></li>
              <li className="flex items-start gap-2"><Leaf className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /><span>Envio de imagens para deteccao de pragas e doencas</span></li>
              <li className="flex items-start gap-2"><Leaf className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /><span>Recomendacoes personalizadas</span></li>
              <li className="flex items-start gap-2"><Leaf className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /><span>Pesquisa aprofundada com estudos cientificos</span></li>
              <li className="flex items-start gap-2"><Leaf className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /><span>Memoria de contexto entre conversas</span></li>
              <li className="flex items-start gap-2"><Leaf className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /><span>Suporte prioritario</span></li>
            </ul>
          </div>

          {/* IA + Consultoria */}
          <div className="p-5 sm:p-6 rounded-xl border border-border bg-background flex flex-col">
            <h3 className="text-lg font-bold mb-1">IA + Consultoria</h3>
            <div className="mb-1"><span className="text-3xl font-bold">R$ 99,90</span></div>
            <p className="text-[13px] text-muted-foreground mb-5">Premium + atendimento especializado</p>
            <button
              onClick={() => handleUpgrade(CONSULTORIA_PRICE_ID)}
              disabled={loading === CONSULTORIA_PRICE_ID}
              className="w-full py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors mb-5 disabled:opacity-50"
            >
              {loading === CONSULTORIA_PRICE_ID ? "Carregando..." : "Fazer Upgrade"}
            </button>
            <ul className="space-y-2.5 text-[13px] flex-1">
              <li className="flex items-start gap-2"><Leaf className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /><span>Tudo do Premium</span></li>
              <li className="flex items-start gap-2"><Leaf className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /><span>1 hora de consultoria individual com Maria</span></li>
              <li className="flex items-start gap-2"><Leaf className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /><span>Orientacao para Habeas Corpus</span></li>
              <li className="flex items-start gap-2"><Leaf className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /><span>Acompanhamento de cultivo e tratamento</span></li>
            </ul>
          </div>
        </div>

        <div className="text-center mt-8">
          <button onClick={() => router.push("/chat")} className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
            Voltar ao chat
          </button>
        </div>
      </div>
    </div>
  );
}
