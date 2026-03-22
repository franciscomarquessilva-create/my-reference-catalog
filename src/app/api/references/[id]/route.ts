import { NextRequest, NextResponse } from "next/server";
import { findReferenceById, updateReference, deleteReference } from "@/lib/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ref = findReferenceById(id);
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
  const body = await request.json();
  const updated = updateReference(id, body);
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
  const deleted = deleteReference(id);
  if (!deleted) {
    return NextResponse.json({ error: "Reference not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
