"use client";

import { useEffect, useState } from "react";

type LlmSettingsResponse = {
  model: string;
  hasApiKey: boolean;
  source: "settings" | "environment";
  updatedAt: string | null;
  error?: string;
};

export default function SettingsPage() {
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [source, setSource] = useState<"settings" | "environment">("environment");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/settings/llm")
      .then((res) => res.json())
      .then((data: LlmSettingsResponse) => {
        setModel(data.model ?? "");
        setApiKey("");
        setHasApiKey(Boolean(data.hasApiKey));
        setSource(data.source ?? "environment");
        setUpdatedAt(data.updatedAt ?? null);
      })
      .catch(() => {
        setError("Failed to load LLM settings");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/settings/llm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, apiKey }),
      });
      const data = (await res.json()) as LlmSettingsResponse;
      if (!res.ok) {
        setError(data.error ?? "Failed to save settings");
        return;
      }

      setHasApiKey(Boolean(data.hasApiKey));
      setSource("settings");
      setUpdatedAt(data.updatedAt ?? null);
      setSuccess("LLM settings saved. New prompts will use this model and API key.");
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-gray-500">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage runtime settings used by LLM-backed generation and augmentation.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">LLM Prompting</h2>
        <p className="text-sm text-gray-600 mb-4">
          These values are used by all LLM prompting functionality in this app.
        </p>

        <div className="mb-4 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <div>Active source: {source === "settings" ? "Saved in app settings" : "Environment fallback"}</div>
          <div>
            API key status: {source === "environment" ? "Managed by environment" : hasApiKey ? "Stored in app settings" : "Not configured"}
          </div>
          {updatedAt && <div>Last updated: {new Date(updatedAt).toLocaleString()}</div>}
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-5.2"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Leave blank to keep existing key"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              API keys are write-only and never returned by the API.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
