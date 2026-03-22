import { NextRequest, NextResponse } from "next/server";
import { searchReferences, createReference } from "@/lib/store";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const tagsParam = searchParams.get("tags");
  const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : undefined;

  const refs = searchReferences(q, tags, type);
  return NextResponse.json(refs);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.name || !body.description || !body.type) {
    return NextResponse.json(
      { error: "name, description, and type are required" },
      { status: 400 }
    );
  }

  const ref = createReference({
    name: body.name,
    description: body.description,
    type: body.type,
    tags: Array.isArray(body.tags) ? body.tags : [],
    nodes: Array.isArray(body.nodes) ? body.nodes : [],
    version: body.version,
  });

  return NextResponse.json(ref, { status: 201 });
}
