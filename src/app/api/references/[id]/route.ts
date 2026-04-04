import { NextRequest, NextResponse } from "next/server";
import { findReferenceById, updateReference, deleteReference } from "@/lib/store";
import { validateUpdateReferenceInput } from "@/lib/reference-validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ref = await findReferenceById(id);
  if (!ref) {
    return NextResponse.json({ error: "Reference not found" }, { status: 404 });
  }
  return NextResponse.json(ref);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateUpdateReferenceInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status ?? 400 });
  }

  const updated = await updateReference(id, validation.data);
  if (!updated) {
    return NextResponse.json({ error: "Reference not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await deleteReference(id);
  if (!deleted) {
    return NextResponse.json({ error: "Reference not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
