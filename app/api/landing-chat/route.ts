import { NextRequest, NextResponse } from "next/server";
import { searchAll, formatContextForLLM } from "@/lib/rag/search";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/cannaguia-prompt";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function POST(req: NextRequest) {
  try {
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
