import "server-only";

import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export async function summarizeChat(
  messages: { role: string; parts: any }[],
): Promise<string> {
  const transcript = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      const text = Array.isArray(m.parts)
        ? m.parts
            .filter((p: any) => p.type === "text")
            .map((p: any) => p.text)
            .join(" ")
        : "";
      return `${m.role === "user" ? "Usuario" : "CannaGuia"}: ${text.slice(0, 300)}`;
    })
    .join("\n");

  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    maxOutputTokens: 200,
    temperature: 0.3,
    providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
    prompt: `Resuma esta conversa sobre cannabis medicinal em 2-3 frases objetivas. Foque nas condicoes do usuario, strains recomendadas, preferencias e decisoes. Responda APENAS o resumo, sem introducao.\n\nConversa:\n${transcript}`,
  });

  return text.trim();
}
