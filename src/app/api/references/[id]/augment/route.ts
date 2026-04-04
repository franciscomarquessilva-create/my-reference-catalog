import { NextRequest, NextResponse } from "next/server";
import { findReferenceById, updateReference } from "@/lib/store";
import { usesFreeTextReference } from "@/lib/reference-types";
import { CreateReferenceInput, Reference, ReferenceNode } from "@/types/reference";
import { DEFAULT_MODEL, getEffectiveLlmConfig } from "@/lib/llm-config";

type AdditionsPayload = {
  description_append?: string;
  tags_add?: string[];
  nodes_add?: ReferenceNode[];
  content_append?: string;
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function appendText(existing: string | undefined, addition: string | undefined): string {
  const current = existing?.trim() ?? "";
  const extra = addition?.trim() ?? "";
  if (!extra) return existing ?? "";
  if (!current) return extra;
  return `${current}\n\n${extra}`;
}

function uniqueTags(existing: string[], additions: string[]): string[] {
  const normalized = [...existing, ...additions]
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function normalizeNode(input: unknown): ReferenceNode | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;

  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name) return null;

  const childrenRaw = Array.isArray(record.children) ? record.children : [];
  const children = childrenRaw
    .map((child) => normalizeNode(child))
    .filter((child): child is ReferenceNode => Boolean(child));

  return {
    id: generateId(),
    name,
    description:
      typeof record.description === "string" ? record.description.trim() : undefined,
    value: typeof record.value === "string" ? record.value : undefined,
    type: typeof record.type === "string" ? record.type.trim() : undefined,
    children,
  };
}

function normalizeAdditions(payload: unknown): AdditionsPayload {
  if (!payload || typeof payload !== "object") return {};
  const record = payload as Record<string, unknown>;

  const tagsAdd = Array.isArray(record.tags_add)
    ? record.tags_add
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 24)
    : [];

  const nodesAdd = Array.isArray(record.nodes_add)
    ? record.nodes_add
        .map((node) => normalizeNode(node))
        .filter((node): node is ReferenceNode => Boolean(node))
    : [];

  return {
    description_append:
      typeof record.description_append === "string"
        ? record.description_append.trim()
        : undefined,
    tags_add: tagsAdd,
    nodes_add: nodesAdd,
    content_append:
      typeof record.content_append === "string" ? record.content_append.trim() : undefined,
  };
}

function toDraft(reference: Reference): CreateReferenceInput {
  return {
    name: reference.name,
    description: reference.description,
    type: reference.type,
    tags: reference.tags,
    nodes: reference.nodes,
    content: reference.content,
    version: reference.version,
  };
}

function sanitizeDraft(input: unknown, fallback: CreateReferenceInput): CreateReferenceInput {
  if (!input || typeof input !== "object") return fallback;
  const draft = input as Partial<CreateReferenceInput>;

  return {
    name: typeof draft.name === "string" ? draft.name : fallback.name,
    description:
      typeof draft.description === "string" ? draft.description : fallback.description,
    type: draft.type ?? fallback.type,
    tags: Array.isArray(draft.tags)
      ? draft.tags.filter((tag): tag is string => typeof tag === "string")
      : fallback.tags,
    nodes: Array.isArray(draft.nodes) ? draft.nodes : fallback.nodes,
    content: typeof draft.content === "string" ? draft.content : fallback.content,
    version: typeof draft.version === "string" ? draft.version : fallback.version,
  };
}

async function callLlmForAdditions(
  apiKey: string,
  model: string,
  reference: CreateReferenceInput,
  instructions: string
): Promise<AdditionsPayload> {
  const systemPrompt = `You are an assistant that performs additive-only updates to a reference.
Never delete, replace, rename, or rewrite existing content.
Only return new content to append/add.

Return strict JSON only with the following shape:
{
  "description_append": "optional string",
  "tags_add": ["optional", "tags"],
  "nodes_add": [
    {
      "name": "string",
      "description": "optional string",
      "type": "optional string",
      "value": "optional string",
      "children": []
    }
  ],
  "content_append": "optional string"
}

Rules:
- If nothing should be added for a field, omit it or return empty values.
- For markdown and other references, prefer content_append and avoid nodes_add.
- Do not include any field that removes or overwrites existing data.`;

  const userPayload = {
    instructions,
    current_reference: reference,
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM returned empty content");
  }

  const parsed = JSON.parse(content);
  return normalizeAdditions(parsed);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: {
    instructions?: string;
    model?: string;
    draft?: Partial<CreateReferenceInput>;
  };

  try {
    body = (await request.json()) as {
      instructions?: string;
      model?: string;
      draft?: Partial<CreateReferenceInput>;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.instructions || typeof body.instructions !== "string") {
    return NextResponse.json({ error: "instructions are required" }, { status: 400 });
  }

  if (body.instructions.trim().length > 4000) {
    return NextResponse.json(
      { error: "instructions are too long (maximum 4000 characters)" },
      { status: 400 }
    );
  }

  const existing = await findReferenceById(id);
  if (!existing) {
    return NextResponse.json({ error: "Reference not found" }, { status: 404 });
  }

  const baseDraft = sanitizeDraft(body.draft, toDraft(existing));

  const llmConfig = await getEffectiveLlmConfig();
  if (!llmConfig.apiKey) {
    return NextResponse.json(
      { error: "No API key configured. Set it in Settings to use LLM prompts." },
      { status: 500 }
    );
  }

  const model =
    typeof body.model === "string" && body.model.trim()
      ? body.model.trim()
      : llmConfig.model || DEFAULT_MODEL;

  let additions: AdditionsPayload;
  try {
    additions = await callLlmForAdditions(
      llmConfig.apiKey,
      model,
      baseDraft,
      body.instructions
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to generate additive updates with LLM" },
      { status: 502 }
    );
  }

  const updatedDraft: Partial<CreateReferenceInput> = {
    description: appendText(baseDraft.description, additions.description_append),
    tags: uniqueTags(baseDraft.tags, additions.tags_add ?? []),
    nodes: usesFreeTextReference(baseDraft.type)
      ? []
      : [...baseDraft.nodes, ...(additions.nodes_add ?? [])],
    content: usesFreeTextReference(baseDraft.type)
      ? appendText(baseDraft.content, additions.content_append)
      : baseDraft.content,
  };

  const updated = await updateReference(id, updatedDraft);
  if (!updated) {
    return NextResponse.json({ error: "Reference not found" }, { status: 404 });
  }

  return NextResponse.json({
    updated,
    additions,
    source: "llm",
    model,
  });
}
