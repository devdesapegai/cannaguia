export const DEFAULT_CHAT_MODEL = "gemini-2.5-flash";

export const titleModel = {
  id: "gemini-2.5-flash",
  name: "Gemini 2.5 Flash",
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
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    description: "Modelo rapido e capaz",
  },
];

export const allowedModelIds = chatModels.map((m) => m.id);

export function getCapabilities(modelId: string): ModelCapabilities {
  return {
    tools: true,
    vision: true,
    reasoning: false,
  };
}
