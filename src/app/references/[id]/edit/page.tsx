"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import NodeEditor from "@/components/NodeEditor";
import { Reference, ReferenceNode } from "@/types/reference";
import { usesFreeTextReference } from "@/lib/reference-types";

const TYPES = [
  { value: "ontology", label: "Ontology" },
  { value: "taxonomy", label: "Taxonomy" },
  { value: "model", label: "Model" },
  { value: "schema", label: "Schema" },
  { value: "configuration", label: "Configuration" },
  { value: "markdown", label: "Markdown" },
  { value: "other", label: "Other" },
];

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function EditReferencePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("other");
  const [version, setVersion] = useState("1.0.0");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [nodes, setNodes] = useState<ReferenceNode[]>([]);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [augmenting, setAugmenting] = useState(false);
  const [augmentRequest, setAugmentRequest] = useState("");
  const [augmentInfo, setAugmentInfo] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    fetch(`/api/references/${id}`)
      .then(async (r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return (await r.json()) as Reference;
      })
      .then((ref) => {
        if (!ref) return;
        setName(ref.name);
        setDescription(ref.description);
        setType(ref.type);
        setVersion(ref.version);
        setTags(ref.tags);
        setNodes(ref.nodes);
        setContent(ref.content ?? "");
      })
      .catch(() => {
        setError("Failed to load reference");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const addTag = useCallback(() => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput("");
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const addRootNode = useCallback(() => {
    const newNode: ReferenceNode = {
      id: generateId(),
      name: "New Node",
      description: "",
      type: "entity",
      children: [],
    };
    setNodes((prev) => [...prev, newNode]);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !description.trim()) {
        setError("Name and description are required");
        return;
      }
      if (usesFreeTextReference(type) && !content.trim()) {
        setError("Content is required for markdown and other references");
        return;
      }

      setSaving(true);
      setError("");

      try {
        const res = await fetch(`/api/references/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            type,
            version,
            tags,
            nodes: usesFreeTextReference(type) ? [] : nodes,
            content: usesFreeTextReference(type) ? content : undefined,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          router.push(`/references/${data.id}`);
        } else {
          setError(data.error ?? "Failed to update reference");
        }
      } catch {
        setError("Failed to update reference");
      }

      setSaving(false);
    },
    [content, description, id, name, nodes, router, tags, type, version]
  );

  const handleLlmAugment = useCallback(async () => {
    if (!augmentRequest.trim()) {
      setError("Describe the changes you want before applying LLM updates");
      return;
    }

    setAugmenting(true);
    setError("");
    setAugmentInfo("");

    try {
      const res = await fetch(`/api/references/${id}/augment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructions: augmentRequest,
          draft: {
            name,
            description,
            type,
            version,
            tags,
            nodes,
            content,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to apply LLM updates");
        return;
      }

      const updated = data.updated as Reference;
      setName(updated.name);
      setDescription(updated.description);
      setType(updated.type);
      setVersion(updated.version);
      setTags(updated.tags);
      setNodes(updated.nodes);
      setContent(updated.content ?? "");
      setAugmentInfo("LLM additions applied. Existing content was preserved.");
      setAugmentRequest("");
    } catch {
      setError("Failed to apply LLM updates");
    }

    setAugmenting(false);
  }, [augmentRequest, content, description, id, name, nodes, tags, type, version]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <span className="animate-pulse">Loading…</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Reference not found</h1>
        <button
          onClick={() => router.push("/")}
          className="text-blue-600 hover:underline text-sm"
        >
          Back to catalog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Reference</h1>
        <p className="text-sm text-gray-500 mt-1">Update the reference asset and save changes</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-indigo-900 mb-1">LLM Additive Edit Assistant</h2>
        <p className="text-sm text-indigo-700 mb-3">
          Describe what should be added. The assistant only appends content and never deletes or replaces existing content.
        </p>
        <div className="flex gap-2">
          <textarea
            value={augmentRequest}
            onChange={(e) => setAugmentRequest(e.target.value)}
            rows={3}
            placeholder="e.g. Add a new section for governance controls and include three related tags."
            className="flex-1 border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <button
            type="button"
            onClick={handleLlmAugment}
            disabled={augmenting || !augmentRequest.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-start whitespace-nowrap"
          >
            {augmenting ? "Applying…" : "Apply with LLM"}
          </button>
        </div>
        {augmentInfo && (
          <p className="text-xs text-indigo-700 mt-2">{augmentInfo}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add a tag and press Enter"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {usesFreeTextReference(type) ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-800">Reference Content</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Paste or write the free text content for this reference.
            </p>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            placeholder={type === "markdown" ? "Paste markdown content here" : "Paste free text content here"}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">Structure Nodes</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Define the hierarchical structure of this reference
              </p>
            </div>
            <button
              type="button"
              onClick={addRootNode}
              className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
            >
              + Add Root Node
            </button>
          </div>

          {nodes.length === 0 ? (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-sm">No nodes yet. Add a root node to begin.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="space-y-2 min-w-max">
                {nodes.map((node, idx) => (
                  <NodeEditor
                    key={node.id}
                    node={node}
                    depth={0}
                    onUpdate={(updated) => {
                      setNodes((prev) => {
                        const copy = [...prev];
                        copy[idx] = updated;
                        return copy;
                      });
                    }}
                    onDelete={() => {
                      setNodes((prev) => prev.filter((_, i) => i !== idx));
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(`/references/${id}`)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
