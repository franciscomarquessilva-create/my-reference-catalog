import { NextRequest, NextResponse } from "next/server";
import { findReferenceById } from "@/lib/store";
import { referenceToMarkdown, referenceToJson } from "@/lib/export";
import { supportsJsonExport } from "@/lib/reference-types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ref = await findReferenceById(id);
  if (!ref) {
    return NextResponse.json({ error: "Reference not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "json";

  if (format === "json" && !supportsJsonExport(ref.type)) {
    return NextResponse.json(
      { error: "JSON export is not available for markdown references" },
      { status: 404 }
    );
  }

  if (format === "markdown") {
    const md = referenceToMarkdown(ref);
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${ref.id}.md"`,
      },
    });
  }

  const json = referenceToJson(ref);
  return new NextResponse(JSON.stringify(json, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${ref.id}.json"`,
    },
  });
}
