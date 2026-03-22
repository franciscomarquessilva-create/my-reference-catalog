"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ReferenceNode } from "@/types/reference";
import NodeEditor from "@/components/NodeEditor";

const TYPES = [
  { value: "ontology", label: "Ontology" },
  { value: "taxonomy", label: "Taxonomy" },
  { value: "model", label: "Model" },
  { value: "schema", label: "Schema" },
  { value: "configuration", label: "Configuration" },
  { value: "other", label: "Other" },
];

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function NewReferencePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("other");
  const [version, setVersion] = useState("1.0.0");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [nodes, setNodes] = useState<ReferenceNode[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addTag = useCallback(() => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput("");
  }, [tagInput, tags]);

  const removeTag = useCallback(
    (tag: string) => {
      setTags((prev) => prev.filter((t) => t !== tag));
    },
    []
  );

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

  const handleAiGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiPrompt }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.name) setName(data.name);
        if (data.description) setDescription(data.description);
        if (data.type) setType(data.type);
        if (data.version) setVersion(data.version);
        if (Array.isArray(data.tags)) setTags(data.tags);
        if (Array.isArray(data.nodes)) setNodes(data.nodes);
      } else {
        setError(data.error ?? "AI generation failed");
      }
    } catch {
      setError("Failed to call AI service");
    }
    setAiLoading(false);
  }, [aiPrompt]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !description.trim()) {
        setError("Name and description are required");
        return;
      }
      setSaving(true);
      setError("");
      try {
        const res = await fetch("/api/references", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, type, version, tags, nodes }),
        });
        const data = await res.json();
        if (res.ok) {
          router.push(`/references/${data.id}`);
        } else {
          setError(data.error ?? "Failed to create reference");
        }
      } catch {
        setError("Failed to save reference");
      }
      setSaving(false);
    },
    [name, description, type, version, tags, nodes, router]
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Reference</h1>
        <p className="text-sm text-gray-500 mt-1">
          Define a new reusable semantic asset in the catalog
        </p>
      </div>

      {/* AI Generation Panel */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-indigo-900 mb-1 flex items-center gap-2">
          <span>✨</span> AI-Assisted Generation
        </h2>
        <p className="text-sm text-indigo-700 mb-3">
          Describe the reference you want to create in natural language, and the AI agent
          will pre-populate the fields below for you to review and adjust.
        </p>
        <div className="flex gap-2">
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. A taxonomy for classifying software service types in a cloud-native platform, including microservices, serverless functions, and managed services with their configuration properties."
            className="flex-1 border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            rows={3}
          />
          <button
            type="button"
            onClick={handleAiGenerate}
            disabled={aiLoading || !aiPrompt.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-start whitespace-nowrap"
          >
            {aiLoading ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Fields */}
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
              placeholder="e.g. Service Type Taxonomy"
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
              placeholder="Describe what this reference represents and how it should be used"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0.0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Tags */}
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

        {/* Nodes Editor */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">Structure Nodes</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Define the hierarchical structure of this reference (infinite levels)
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
              <p className="text-sm">No nodes yet. Add a root node or use AI generation.</p>
            </div>
          ) : (
            <div className="space-y-2">
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
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving…" : "Create Reference"}
          </button>
        </div>
      </form>
    </div>
  );
}
