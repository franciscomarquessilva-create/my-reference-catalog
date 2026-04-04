import { NextRequest, NextResponse } from "next/server";
import { readLlmSettings, upsertLlmSettings } from "@/lib/store";
import { DEFAULT_MODEL } from "@/lib/llm-config";

export async function GET() {
  const settings = await readLlmSettings();

  if (!settings) {
    return NextResponse.json({
      model: process.env.AI_MODEL?.trim() || DEFAULT_MODEL,
      hasApiKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
      source: "environment",
      updatedAt: null,
    });
  }

  return NextResponse.json({
    model: settings.model,
    hasApiKey: Boolean(settings.apiKey),
    updatedAt: settings.updatedAt,
    source: "settings",
  });
}

export async function PUT(request: NextRequest) {
  let body: {
    model?: unknown;
    apiKey?: unknown;
  };

  try {
    body = (await request.json()) as { model?: unknown; apiKey?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const model = typeof body.model === "string" ? body.model.trim() : "";
  const incomingApiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

  if (!model) {
    return NextResponse.json({ error: "model is required" }, { status: 400 });
  }

  const existing = await readLlmSettings();
  const apiKey = incomingApiKey || existing?.apiKey || "";

  const settings = await upsertLlmSettings({ model, apiKey });
  return NextResponse.json({
    model: settings.model,
    hasApiKey: Boolean(settings.apiKey),
    updatedAt: settings.updatedAt,
    source: "settings",
  });
}
