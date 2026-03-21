import { NextRequest, NextResponse } from "next/server";
import { ReferenceNode } from "@/types/reference";

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
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
  const body = await request.json();
  const { description } = body;

  if (!description || typeof description !== "string") {
    return NextResponse.json(
      { error: "description is required" },
      { status: 400 }
    );
  }

  const openaiKey = process.env.OPENAI_API_KEY;

  if (openaiKey) {
    // Use OpenAI if key is configured
    const systemPrompt = `You are an expert in semantic data modeling and reference catalog design.
Given a natural language description, generate a structured reference catalog entry.
Return ONLY valid JSON with this shape:
{
  "name": "string - concise title",
  "description": "string - clear description (can improve on input)",
  "type": "ontology|taxonomy|model|schema|configuration|other",
  "tags": ["array", "of", "relevant", "tags"],
  "version": "1.0.0",
  "nodes": [
    {
      "id": "unique_short_id",
      "name": "Node Name",
      "description": "What this node represents",
      "type": "string - node type e.g. root, entity, property, value",
      "value": "optional value",
      "children": []
    }
  ]
}
Create a meaningful hierarchical node tree that represents the reference structure.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: description },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      // Fallback to heuristic on OpenAI error
      const result = heuristicGenerate(description);
      return NextResponse.json({ ...result, description, source: "heuristic" });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      const result = heuristicGenerate(description);
      return NextResponse.json({ ...result, description, source: "heuristic" });
    }

    const parsed = JSON.parse(content);
    return NextResponse.json({ ...parsed, source: "openai" });
  }

  // No API key - use heuristic generation
  const result = heuristicGenerate(description);
  return NextResponse.json({ ...result, description, source: "heuristic" });
}
