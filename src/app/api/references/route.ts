import { NextRequest, NextResponse } from "next/server";
import { searchReferences, createReference } from "@/lib/store";
import { validateCreateReferenceInput } from "@/lib/reference-validation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const tagsParam = searchParams.get("tags");
  const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : undefined;

  const refs = await searchReferences(q, tags, type);
  return NextResponse.json(refs);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const validation = validateCreateReferenceInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status ?? 400 });
  }

  const ref = await createReference(validation.data);

  return NextResponse.json(ref, { status: 201 });
}
