"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Reference, ReferenceNode } from "@/types/reference";
import { TYPE_COLORS, supportsJsonExport, usesFreeTextReference } from "@/lib/reference-types";

function NodeTree({ node, depth = 0 }: { node: ReferenceNode; depth?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (node.children ?? []).length > 0;

  return (
    <div className={depth > 0 ? "ml-5 border-l border-gray-200 pl-3" : ""}>
      <div
        className={`flex items-start gap-2 py-1.5 ${hasChildren ? "cursor-pointer" : ""}`}
        onClick={() => hasChildren && setExpanded((e) => !e)}
      >
        <span className="text-gray-400 text-xs mt-0.5 w-3">
          {hasChildren ? (expanded ? "▼" : "▶") : "•"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-800">{node.name}</span>
            {node.type && (
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                {node.type}
              </span>
            )}
          </div>
          {node.description && (
            <p className="text-xs text-gray-500 mt-0.5">{node.description}</p>
          )}
          {node.value !== undefined && node.value !== "" && (
            <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-1.5 mt-1 overflow-x-auto font-mono">
              {node.value}
            </pre>
          )}
        </div>
      </div>
      {expanded &&
        hasChildren &&
        (node.children ?? []).map((child) => (
          <NodeTree key={child.id} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}

type ReferenceDetailTab = "tree" | "content" | "json" | "markdown";

export default function ReferenceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [ref, setRef] = useState<Reference | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<ReferenceDetailTab>("tree");
  const [exportContent, setExportContent] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/references/${id}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          const reference = data as Reference;
          setRef(reference);
          setActiveTab(usesFreeTextReference(reference.type) ? "content" : "tree");
        }
        setLoading(false);
      });
  }, [id]);

  const loadExport = useCallback(
    async (format: "json" | "markdown") => {
      setExportLoading(true);
      const res = await fetch(
        `/api/references/${id}/export?format=${format}`
      );
      const text = await res.text();
      setExportContent(text);
      setExportLoading(false);
    },
    [id]
  );

  const handleTabSelect = useCallback(
    (tab: ReferenceDetailTab) => {
      setActiveTab(tab);
      if (tab === "json" || tab === "markdown") {
        void loadExport(tab);
      }
    },
    [loadExport]
  );

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this reference? This cannot be undone.")) return;
    setDeleting(true);
    await fetch(`/api/references/${id}`, { method: "DELETE" });
    router.push("/");
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <span className="animate-pulse">Loading…</span>
      </div>
    );
  }

  if (notFound || !ref) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Reference not found</h1>
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          ← Back to catalog
        </Link>
      </div>
    );
  }

  const downloadExport = async (format: "json" | "markdown") => {
    if (format === "json" && !supportsJsonExport(ref.type)) {
      return;
    }

    const res = await fetch(`/api/references/${id}/export?format=${format}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${id}.${format === "markdown" ? "md" : "json"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const freeTextReference = usesFreeTextReference(ref.type);
  const jsonAvailable = supportsJsonExport(ref.type);
  const tabs: ReferenceDetailTab[] = freeTextReference
    ? ["content", ...(jsonAvailable ? (["json"] as ReferenceDetailTab[]) : []), "markdown"]
    : ["tree", ...(jsonAvailable ? (["json"] as ReferenceDetailTab[]) : []), "markdown"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-gray-900 transition-colors">
          Catalog
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate">{ref.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  TYPE_COLORS[ref.type] ?? TYPE_COLORS.other
                }`}
              >
                {ref.type}
              </span>
              <span className="text-xs text-gray-400 font-mono">{ref.version}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{ref.name}</h1>
            <p className="text-gray-600">{ref.description}</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Link
              href={`/references/${id}/edit`}
              className="text-sm px-3 py-1.5 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-center"
            >
              Edit
            </Link>
            <Link
              href={`/references/new?copyFromId=${encodeURIComponent(id)}`}
              className="text-sm px-3 py-1.5 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors text-center"
            >
              Create from this reference
            </Link>
            {jsonAvailable && (
            <button
              onClick={() => downloadExport("json")}
              className="text-sm px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ↓ JSON
            </button>
            )}
            <button
              onClick={() => downloadExport("markdown")}
              className="text-sm px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ↓ Markdown
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>

        {/* Tags */}
        {ref.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {ref.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="flex gap-6 mt-4 text-xs text-gray-400">
          <span>ID: <code className="font-mono">{ref.id}</code></span>
          <span>Created: {new Date(ref.createdAt).toLocaleString()}</span>
          <span>Updated: {new Date(ref.updatedAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 pt-4 text-sm text-gray-600 flex items-center gap-3 flex-wrap">
          <span className="text-gray-500">Direct format URLs:</span>
          {jsonAvailable && (
          <>
          <Link
            href={`/references/${id}/json/`}
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            JSON
          </Link>
          <span>·</span>
          </>
          )}
          <Link
            href={`/references/${id}/markdown/`}
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Markdown
          </Link>
        </div>
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabSelect(tab)}
              className={`px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab === "tree"
                ? "🌳 Tree View"
                : tab === "content"
                  ? "📝 Content"
                  : tab === "json"
                    ? "{ } JSON"
                    : "# Markdown"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "tree" && (
            <>
              {ref.nodes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No nodes defined for this reference.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="space-y-1 min-w-max">
                    {ref.nodes.map((node) => (
                      <NodeTree key={node.id} node={node} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "content" && (
            <pre className="text-sm font-mono bg-gray-50 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap border border-gray-200">
              {ref.content?.trim() || "No free text content defined for this reference."}
            </pre>
          )}

          {(activeTab === "json" || activeTab === "markdown") && (
            <>
              {exportLoading ? (
                <div className="text-center py-8 text-gray-400 animate-pulse">
                  Loading…
                </div>
              ) : (
                <pre className="text-xs font-mono bg-gray-50 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap border border-gray-200">
                  {exportContent}
                </pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
