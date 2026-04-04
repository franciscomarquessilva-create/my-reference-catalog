"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Reference, ReferenceNode, ReferenceType } from "@/types/reference";
import NodeEditor from "@/components/NodeEditor";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReferenceType(value: unknown): value is ReferenceType {
  return (
    typeof value === "string" &&
    ["ontology", "taxonomy", "model", "schema", "configuration", "markdown", "other"].includes(
      value
    )
  );
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function mapValueToNode(value: unknown, fallbackName: string): ReferenceNode {
  if (Array.isArray(value)) {
    return {
      id: generateId(),
      name: fallbackName,
      type: "collection",
      description: `Array (${value.length} item${value.length !== 1 ? "s" : ""})`,
      children: value.map((item, index) => mapValueToNode(item, `Item ${index + 1}`)),
    };
  }

  if (isRecord(value)) {
    const knownNodeShape =
      typeof value.name === "string" ||
      typeof value.description === "string" ||
      typeof value.type === "string" ||
      "children" in value;

    if (knownNodeShape) {
      const nodeName = toOptionalString(value.name) ?? fallbackName;
      const nodeDescription = toOptionalString(value.description);
      const nodeType = toOptionalString(value.type);
      const nodeValue = toOptionalString(value.value);
      const children = Array.isArray(value.children)
        ? value.children.map((child, index) =>
            mapValueToNode(child, `${nodeName} child ${index + 1}`)
          )
        : [];

      return {
        id: generateId(),
        name: nodeName,
        type: nodeType,
        description: nodeDescription,
        value: nodeValue,
        children,
      };
    }

    const children = Object.entries(value).map(([key, childValue]) =>
      mapValueToNode(childValue, key)
    );
    return {
      id: generateId(),
      name: fallbackName,
      type: "object",
      children,
    };
  }

  return {
    id: generateId(),
    name: fallbackName,
    type: "value",
    value: toOptionalString(value) ?? "",
    children: [],
  };
}

function mapJsonToNodes(value: unknown): ReferenceNode[] {
  if (Array.isArray(value)) {
    return value.map((item, index) => mapValueToNode(item, `Root ${index + 1}`));
  }
  if (isRecord(value)) {
    return Object.entries(value).map(([key, entryValue]) => mapValueToNode(entryValue, key));
  }
  return [mapValueToNode(value, "Root")];
}

function countNodes(nodes: ReferenceNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children ?? []), 0);
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
  const [content, setContent] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [copyFromId, setCopyFromId] = useState("");
  const [availableReferences, setAvailableReferences] = useState<Reference[]>([]);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const selectedReferenceId = new URLSearchParams(window.location.search).get(
      "copyFromId"
    );
    if (selectedReferenceId) {
      setCopyFromId(selectedReferenceId);
    }
  }, []);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/references")
      .then((r) => r.json())
      .then((refs: Reference[]) => setAvailableReferences(refs))
      .catch(() => setAvailableReferences([]));
  }, []);

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
    if (!aiPrompt.trim() && !copyFromId) return;
    setAiLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: aiPrompt || "Rebuild this reference from the selected source",
          baseReferenceId: copyFromId || undefined,
          rewriteFromBase: Boolean(copyFromId),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.name) setName(data.name);
        if (data.description) setDescription(data.description);
        if (data.type) setType(data.type);
        if (data.version) setVersion(data.version);
        if (Array.isArray(data.tags)) setTags(data.tags);
        if (typeof data.content === "string") setContent(data.content);
        if (Array.isArray(data.nodes)) setNodes(data.nodes);
      } else {
        setError(data.error ?? "AI generation failed");
      }
    } catch {
      setError("Failed to call AI service");
    }
    setAiLoading(false);
  }, [aiPrompt, copyFromId]);

  const handleJsonImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError("");
    setImportMessage("");
    setError("");

    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const rootObject = isRecord(parsed) ? parsed : undefined;

      const importedName = toOptionalString(rootObject?.name);
      const importedDescription = toOptionalString(rootObject?.description);
      const importedType = rootObject && isReferenceType(rootObject.type) ? rootObject.type : undefined;
      const importedVersion = toOptionalString(rootObject?.version);
      const importedTags = normalizeTags(rootObject?.tags);
      const importedContent =
        toOptionalString(rootObject?.content) ??
        toOptionalString(rootObject?.markdown) ??
        toOptionalString(rootObject?.text) ??
        toOptionalString(rootObject?.body);

      if (importedName) setName(importedName);
      if (importedDescription) setDescription(importedDescription);
      if (importedType) setType(importedType);
      if (importedVersion) setVersion(importedVersion);
      if (importedTags.length > 0) setTags(importedTags);

      const effectiveType = importedType ?? type;

      if (usesFreeTextReference(effectiveType)) {
        setContent(importedContent ?? JSON.stringify(parsed, null, 2));
        setNodes([]);
        setImportMessage(`Imported ${file.name}. Content mapped to free text editor.`);
      } else {
        // Collect all structural sources including nodes, metadata, etc.
        const structuredSources: unknown[] = [];
        
        // Primary source: explicit nodes
        if (rootObject && "nodes" in rootObject && Array.isArray(rootObject.nodes)) {
          structuredSources.push(...rootObject.nodes);
        }
        
        // Secondary source: structure field
        if (rootObject && "structure" in rootObject) {
          structuredSources.push(rootObject.structure);
        }
        
        // Tertiary source: metadata (captured but separate from nodes)
        if (rootObject && "metadata" in rootObject && isRecord(rootObject.metadata)) {
          const metadataNode: ReferenceNode = {
            id: generateId(),
            name: "Metadata",
            type: "metadata",
            description: "Schema and API parameter documentation",
            children: Object.entries(rootObject.metadata).map(([key, value]) =>
              mapValueToNode(value, key)
            ),
          };
          structuredSources.push(metadataNode);
        }
        
        // If no structured sources found, try full parse
        if (structuredSources.length === 0) {
          structuredSources.push(parsed);
        }
        
        const mappedNodes = mapJsonToNodes(structuredSources);
        setNodes(mappedNodes);
        setContent("");
        setImportMessage(
          `Imported ${file.name}. Mapped ${countNodes(mappedNodes)} node${countNodes(mappedNodes) !== 1 ? "s" : ""} (including metadata).`
        );
      }
    } catch {
      setImportError("Could not parse JSON file. Please upload a valid .json file.");
    } finally {
      event.target.value = "";
    }
  }, [type]);

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
          setError(data.error ?? "Failed to create reference");
        }
      } catch {
        setError("Failed to save reference");
      }
      setSaving(false);
    },
    [name, description, type, version, tags, nodes, content, router]
  );

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          will pre-populate the fields below for you to review and adjust. You can also pick
          an existing reference as a starting point for a full rebuild.
        </p>
        <div className="mb-3">
          <label className="block text-xs font-medium text-indigo-800 mb-1">
            Start From Existing Reference (optional)
          </label>
          <select
            value={copyFromId}
            onChange={(e) => setCopyFromId(e.target.value)}
            className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">None</option>
            {availableReferences.map((ref) => (
              <option key={ref.id} value={ref.id}>
                {ref.name} ({ref.type})
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. Expand this taxonomy with governance controls and observability patterns."
            className="flex-1 border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            rows={3}
          />
          <button
            type="button"
            onClick={handleAiGenerate}
            disabled={aiLoading || (!aiPrompt.trim() && !copyFromId)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-start whitespace-nowrap"
          >
            {aiLoading ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-1">Import From JSON</h2>
        <p className="text-sm text-gray-500 mb-3">
          Upload a JSON file and the form will auto-map supported fields (name,
          description, type, version, tags, content, and structure nodes).
        </p>
        <input
          type="file"
          accept="application/json,.json"
          onChange={handleJsonImport}
          className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {importMessage && (
          <p className="text-xs text-green-700 mt-2">{importMessage}</p>
        )}
        {importError && (
          <p className="text-xs text-red-700 mt-2">{importError}</p>
        )}
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
