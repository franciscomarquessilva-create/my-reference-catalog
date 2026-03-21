"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Reference } from "@/types/reference";

const TYPE_LABELS: Record<string, string> = {
  ontology: "Ontology",
  taxonomy: "Taxonomy",
  model: "Model",
  schema: "Schema",
  configuration: "Configuration",
  other: "Other",
};

const TYPE_COLORS: Record<string, string> = {
  ontology: "bg-purple-100 text-purple-700",
  taxonomy: "bg-green-100 text-green-700",
  model: "bg-blue-100 text-blue-700",
  schema: "bg-yellow-100 text-yellow-700",
  configuration: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-700",
};

export default function HomePage() {
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  const fetchReferences = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (selectedType) params.set("type", selectedType);
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));

    const res = await fetch(`/api/references?${params.toString()}`);
    const data: Reference[] = await res.json();
    setReferences(data);
    setLoading(false);
  }, [query, selectedType, selectedTags]);

  // Fetch all references to collect tags
  useEffect(() => {
    fetch("/api/references")
      .then((r) => r.json())
      .then((data: Reference[]) => {
        const tags = Array.from(new Set(data.flatMap((r) => r.tags))).sort();
        setAllTags(tags);
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReferences();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchReferences]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reference Catalog</h1>
        <p className="text-gray-500 max-w-2xl">
          A centralized registry of reusable semantic assets — ontologies, taxonomies,
          models, schemas, and configuration artifacts. Browse, search, and create
          machine-readable references for your platform.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-3 mb-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search references by name, description, or tag…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 self-center">Filter by tag:</span>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <span className="animate-pulse">Loading…</span>
        </div>
      ) : references.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">📭</p>
          <p className="text-gray-500 mb-4">No references found.</p>
          <Link
            href="/references/new"
            className="inline-block bg-blue-600 text-white px-5 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            Create the first reference
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-3">
            {references.length} reference{references.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {references.map((ref) => (
              <Link
                key={ref.id}
                href={`/references/${ref.id}`}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      TYPE_COLORS[ref.type] ?? TYPE_COLORS.other
                    }`}
                  >
                    {TYPE_LABELS[ref.type] ?? ref.type}
                  </span>
                  <span className="text-xs text-gray-400">{ref.version}</span>
                </div>
                <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1 truncate">
                  {ref.name}
                </h2>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                  {ref.description}
                </p>
                {ref.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {ref.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {ref.tags.length > 4 && (
                      <span className="text-xs text-gray-400">
                        +{ref.tags.length - 4}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-3">
                  {ref.nodes.length} node{ref.nodes.length !== 1 ? "s" : ""} ·{" "}
                  {new Date(ref.updatedAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
