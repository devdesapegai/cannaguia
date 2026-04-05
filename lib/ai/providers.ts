import { customProvider } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { isTestEnvironment } from "../constants";
import { chatModels } from "./models";

const PROVIDERS = {
  google: (id: string) => google(id as Parameters<typeof google>[0]),
  openai: (id: string) => openai(id as Parameters<typeof openai>[0]),
} as const;

export const myProvider = isTestEnvironment
  ? (() => {
      const { chatModel, titleModel } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": titleModel,
        },
      });
    })()
  : null;

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }
  const model = chatModels.find((m) => m.id === modelId);
  const provider = (model?.provider ?? "google") as keyof typeof PROVIDERS;
  return (PROVIDERS[provider] ?? PROVIDERS.google)(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return google("gemini-2.5-flash");
}
