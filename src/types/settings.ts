export interface LlmSettings {
  model: string;
  apiKey: string;
  updatedAt: string;
}

export interface UpdateLlmSettingsInput {
  model: string;
  apiKey: string;
}
