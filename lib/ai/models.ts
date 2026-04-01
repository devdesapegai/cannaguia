export const DEFAULT_CHAT_MODEL = "gemini-2.0-flash";

export const titleModel = {
  id: "gemini-2.0-flash",
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
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
};

export const chatModels: ChatModel[] = [
  {
    id: "gemini-2.0-flash",
    name: "CannaGuia",
    provider: "google",
    description: "Modelo rapido e capaz",
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
      { tools: true, vision: true, reasoning: false },
    ])
  );
}
