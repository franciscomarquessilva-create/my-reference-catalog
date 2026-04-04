import { readLlmSettings } from "@/lib/store";

export const DEFAULT_MODEL = "gpt-5.2";

export type EffectiveLlmConfig = {
  model: string;
  apiKey: string;
  source: "settings" | "environment";
};

export async function getEffectiveLlmConfig(): Promise<EffectiveLlmConfig> {
  const settings = await readLlmSettings();

  if (settings) {
    return {
      model: settings.model || DEFAULT_MODEL,
      apiKey: settings.apiKey,
      source: "settings",
    };
  }

  return {
    model: process.env.AI_MODEL?.trim() || DEFAULT_MODEL,
    apiKey: process.env.OPENAI_API_KEY?.trim() || "",
    source: "environment",
  };
}
