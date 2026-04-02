import { NextRequest, NextResponse } from "next/server";
import { searchAll, formatContextForLLM } from "@/lib/rag/search";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/cannaguia-prompt";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

// In-memory rate limit per IP (max 1 request per 10 min)
const ipRequests = new Map<string, { count: number; resetAt: number }>();
const LANDING_RATE_WINDOW = 600_000;
const LANDING_RATE_MAX = 1;

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipRequests) {
    if (now > entry.resetAt) ipRequests.delete(ip);
  }
}, 1_800_000);

function checkLandingRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequests.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + LANDING_RATE_WINDOW });
    return true;
  }
  if (entry.count >= LANDING_RATE_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    if (!checkLandingRateLimit(ip)) {
      return NextResponse.json({ error: "Limite atingido. Crie uma conta para continuar." }, { status: 429 });
    }

    const body = await req.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== "string" || message.length > 2000) {
      return NextResponse.json({ error: "Mensagem invalida" }, { status: 400 });
    }

    const localResults = searchAll(message, 4);
    const localContext = formatContextForLLM(localResults);

    const recentHistory = (Array.isArray(history) ? history : [])
      .slice(-4)
      .map((h: { role: string; content: string }) => ({ role: h.role, content: h.content.slice(0, 300) }));

    const userPrompt = buildUserPrompt(message, localContext, "", recentHistory);

    const result = await generateText({
      model: google("gemini-2.5-flash"),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      maxOutputTokens: 700,
      temperature: 0.7,
      topP: 0.9,
      providerOptions: {
        google: { thinkingConfig: { thinkingBudget: 0 } },
      },
    });

    return NextResponse.json({
      response: result.text,
      sources: localResults.filter(r => r.score >= 5).slice(0, 2).map(r => ({ type: r.document.type, title: r.document.title })),
    });
  } catch (error) {
    console.error("[/api/landing-chat] Erro:", error);
    return NextResponse.json({ error: "Erro ao processar mensagem." }, { status: 500 });
  }
}
