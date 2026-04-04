import { NextRequest, NextResponse } from "next/server";
import { ReferenceNode } from "@/types/reference";
import { usesFreeTextReference } from "@/lib/reference-types";
import { findReferenceById } from "@/lib/store";
import { DEFAULT_MODEL, getEffectiveLlmConfig } from "@/lib/llm-config";

type GeneratedReference = {
  name: string;
  description: string;
  type: "ontology" | "taxonomy" | "model" | "schema" | "configuration" | "markdown" | "other";
  tags: string[];
  nodes: ReferenceNode[];
  content?: string;
  version: string;
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function normalizeType(value: unknown): GeneratedReference["type"] {
  const allowed = new Set([
    "ontology",
    "taxonomy",
    "model",
    "schema",
    "configuration",
    "markdown",
    "other",
  ]);
  if (typeof value !== "string") return "other";
  const t = value.trim().toLowerCase();
  return allowed.has(t) ? (t as GeneratedReference["type"]) : "other";
}

function normalizeNode(node: unknown): ReferenceNode | null {
  if (!node || typeof node !== "object") return null;

  const record = node as Record<string, unknown>;
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

function normalizeGeneratedReference(
  raw: unknown,
  originalDescription: string
): GeneratedReference {
  const fallback = heuristicGenerate(originalDescription);

  if (!raw || typeof raw !== "object") {
    return {
      ...fallback,
      type: normalizeType(fallback.type),
      description: originalDescription,
    };
  }

  const record = raw as Record<string, unknown>;
  const rawNodes = Array.isArray(record.nodes) ? record.nodes : [];
  const nodes = rawNodes
    .map((node) => normalizeNode(node))
    .filter((node): node is ReferenceNode => Boolean(node));

  const tags = Array.isArray(record.tags)
    ? record.tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12)
    : fallback.tags;

  const type = normalizeType(record.type);
  const content =
    typeof record.content === "string" && record.content.trim()
      ? record.content.trim()
      : undefined;

  return {
    name:
      typeof record.name === "string" && record.name.trim()
        ? record.name.trim()
        : fallback.name,
    description:
      typeof record.description === "string" && record.description.trim()
        ? record.description.trim()
        : originalDescription,
    type,
    tags,
    nodes: usesFreeTextReference(type) ? [] : nodes.length > 0 ? nodes : fallback.nodes,
    content: usesFreeTextReference(type) ? content ?? originalDescription : undefined,
    version:
      typeof record.version === "string" && record.version.trim()
        ? record.version.trim()
        : "1.0.0",
  };
}

async function callLlmGenerate(
  apiKey: string,
  model: string,
  description: string,
  baseReference?: unknown,
  rewriteFromBase?: boolean
): Promise<GeneratedReference> {
  const systemPrompt = `You are an expert semantic architect.
Generate a complete reference asset with rich hierarchical structure.

Requirements:
- Return JSON only, no markdown fences.
- For structured types, create a meaningful multi-level hierarchy in nodes (typically 2-4 levels deep).
- For markdown and other, return free text in a content field and set nodes to an empty array.
- Use concise and domain-relevant node names.
- Each node may include: name, description, type, value, children.
- type must be one of: ontology, taxonomy, model, schema, configuration, markdown, other.
- tags must be short, lowercase, and relevant.

Output shape:
{
  "name": "string",
  "description": "string",
  "type": "ontology|taxonomy|model|schema|configuration|markdown|other",
  "tags": ["string"],
  "version": "1.0.0",
  "content": "string for markdown/other, otherwise optional",
  "nodes": [
    {
      "name": "string",
      "description": "string",
      "type": "string",
      "value": "optional string",
      "children": []
    }
  ]
}`;

  const userPayload: Record<string, unknown> = {
    description,
    mode: rewriteFromBase ? "rebuild-from-base" : "new-generation",
  };

  if (baseReference) {
    userPayload.base_reference = baseReference;
  }

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
        {
          role: "user",
          content: JSON.stringify(userPayload),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM returned empty content");
  }

  const parsed = JSON.parse(content);
  return normalizeGeneratedReference(parsed, description);
}

/**
 * Heuristic AI-style generation when no OpenAI key is configured.
 * Parses the description to extract sensible defaults and nodes.
 */
function heuristicGenerate(description: string): {
  name: string;
  type: string;
  tags: string[];
  nodes: ReferenceNode[];
  content?: string;
  version: string;
} {
  const lower = description.toLowerCase();

  // Infer type
  let type = "other";
  if (lower.includes("ontolog")) type = "ontology";
  else if (lower.includes("taxonom")) type = "taxonomy";
  else if (lower.includes("schema") || lower.includes("xsd")) type = "schema";
  else if (lower.includes("model")) type = "model";
  else if (lower.includes("config")) type = "configuration";
  else if (lower.includes("markdown") || lower.includes("md ") || lower.startsWith("md:")) type = "markdown";

  // Extract potential tags from keywords
  const tagKeywords = [
    "api",
    "rest",
    "graphql",
    "event",
    "domain",
    "service",
    "catalog",
    "registry",
    "metadata",
    "semantic",
    "ontology",
    "taxonomy",
    "schema",
    "model",
    "config",
    "platform",
    "cloud",
    "data",
    "entity",
    "reference",
  ];
  const tags = tagKeywords.filter((kw) => lower.includes(kw)).slice(0, 6);

  // Derive a name from the first sentence
  const firstSentence = description.split(/[.!?]/)[0].trim();
  const words = firstSentence.split(/\s+/).slice(0, 5);
  const name = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  // Generate sample nodes based on description keywords
  const nodes: ReferenceNode[] = [];

  const entityMatches = description.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g);
  const uniqueEntities = Array.from(new Set(entityMatches ?? [])).slice(0, 4);

  if (usesFreeTextReference(type)) {
    return {
      name,
      type,
      tags,
      nodes: [],
      content: description,
      version: "1.0.0",
    };
  }

  if (uniqueEntities.length > 0) {
    uniqueEntities.forEach((entity, i) => {
      nodes.push({
        id: generateId(),
        name: entity,
        description: `${entity} entity extracted from description`,
        type: i === 0 ? "root" : "child",
        children: [],
      });
    });
  } else {
    // Fallback generic structure
    nodes.push({
      id: generateId(),
      name: "Root",
      description: "Top-level node",
      type: "root",
      children: [
        {
          id: generateId(),
          name: "Properties",
          description: "Properties of the reference",
          type: "group",
          children: [],
        },
      ],
    });
  }

  return {
    name,
    type,
    tags,
    nodes,
    version: "1.0.0",
  };
}

export async function POST(request: NextRequest) {
  let body: {
    description?: string;
    model?: string;
    baseReferenceId?: string;
    rewriteFromBase?: boolean;
  };

  try {
    body = (await request.json()) as {
      description?: string;
      model?: string;
      baseReferenceId?: string;
      rewriteFromBase?: boolean;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { description, model, baseReferenceId, rewriteFromBase } = body as {
    description?: string;
    model?: string;
    baseReferenceId?: string;
    rewriteFromBase?: boolean;
  };

  if (!description || typeof description !== "string") {
    return NextResponse.json(
      { error: "description is required" },
      { status: 400 }
    );
  }

  if (description.trim().length > 4000) {
    return NextResponse.json(
      { error: "description is too long (maximum 4000 characters)" },
      { status: 400 }
    );
  }

  const llmConfig = await getEffectiveLlmConfig();
  const baseReference =
    typeof baseReferenceId === "string" && baseReferenceId.trim()
      ? await findReferenceById(baseReferenceId.trim())
      : null;

  if (baseReferenceId && !baseReference) {
    return NextResponse.json(
      { error: "baseReferenceId was provided but no matching reference was found" },
      { status: 404 }
    );
  }

  const selectedModel =
    typeof model === "string" && model.trim()
      ? model.trim()
      : llmConfig.model || DEFAULT_MODEL;

  if (!llmConfig.apiKey) {
    const result = heuristicGenerate(description);
    return NextResponse.json(
      {
        ...result,
        description,
        source: "heuristic",
        warning:
          "OPENAI_API_KEY not configured. Set it to enable LLM generation (default model: gpt-5.2).",
      },
      { status: 200 }
    );
  }

  try {
    const generated = await callLlmGenerate(
      llmConfig.apiKey,
      selectedModel,
      description,
      baseReference,
      Boolean(rewriteFromBase)
    );
    return NextResponse.json({ ...generated, source: "llm", model: selectedModel });
  } catch {
    const result = heuristicGenerate(description);
    return NextResponse.json(
      {
        ...result,
        description,
        source: "heuristic",
        warning:
          "LLM call failed. Falling back to heuristic generation. Check API key/model configuration.",
      },
      { status: 200 }
    );
  }
}
