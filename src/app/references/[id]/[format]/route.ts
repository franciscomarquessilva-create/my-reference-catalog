import { NextRequest, NextResponse } from "next/server";
import { findReferenceById } from "@/lib/store";
import { referenceToMarkdown, referenceToJson } from "@/lib/export";
import { supportsJsonExport } from "@/lib/reference-types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; format: string }> }
) {
  const { id, format } = await params;

  const ref = await findReferenceById(id);
  if (!ref) {
    return NextResponse.json({ error: "Reference not found" }, { status: 404 });
  }

  if (format === "json") {
    if (!supportsJsonExport(ref.type)) {
      return NextResponse.json(
        { error: "JSON export is not available for markdown references" },
        { status: 404 }
      );
    }

    return new NextResponse(JSON.stringify(referenceToJson(ref), null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  }

  if (format === "markdown") {
    return new NextResponse(referenceToMarkdown(ref), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  }

  return NextResponse.json(
    { error: "Unsupported format. Use json or markdown." },
    { status: 404 }
  );
}
