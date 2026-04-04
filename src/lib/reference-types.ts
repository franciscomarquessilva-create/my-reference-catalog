import { ReferenceType } from "@/types/reference";

export const TYPE_LABELS: Record<ReferenceType, string> = {
  ontology: "Ontology",
  taxonomy: "Taxonomy",
  model: "Model",
  schema: "Schema",
  configuration: "Configuration",
  markdown: "Markdown",
  other: "Other",
};

export const TYPE_COLORS: Record<ReferenceType, string> = {
  ontology: "bg-purple-100 text-purple-700",
  taxonomy: "bg-green-100 text-green-700",
  model: "bg-blue-100 text-blue-700",
  schema: "bg-yellow-100 text-yellow-700",
  configuration: "bg-orange-100 text-orange-700",
  markdown: "bg-rose-100 text-rose-700",
  other: "bg-gray-100 text-gray-700",
};

export function usesFreeTextReference(type: string): boolean {
  return type === "markdown" || type === "other";
}

export function supportsJsonExport(type: string): boolean {
  return type !== "markdown";
}