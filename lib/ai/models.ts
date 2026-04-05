export const DEFAULT_CHAT_MODEL = "gpt-5.4-mini";

export const titleModel = {
  id: "gemini-2.5-flash",
  name: "CannaGuia",
  provider: "google",
  description: "Fast model for title generation",
};

export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  gatewayOrder?: string[];
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
};

export const chatModels: ChatModel[] = [
  {
    id: "gpt-5.4-mini",
    name: "CannaGuia",
    provider: "openai",
    description: "GPT-5.4 Mini via Responses API",
    reasoningEffort: "none",
  },
];

export const allowedModelIds = new Set(chatModels.map((m) => m.id));

export const isDemo = false;

export async function getAllGatewayModels() {
  return chatModels;
}

export async function getCapabilities(): Promise<Record<string, ModelCapabilities>> {
  return Object.fromEntries(
    chatModels.map((m) => [
      m.id,
      { tools: true, vision: true, reasoning: true },
    ])
  );
}
