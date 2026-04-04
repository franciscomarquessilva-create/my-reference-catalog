import { CreateReferenceInput, ReferenceNode, ReferenceType } from "@/types/reference";

const ALLOWED_TYPES: ReferenceType[] = [
  "ontology",
  "taxonomy",
  "model",
  "schema",
  "configuration",
  "markdown",
  "other",
];

const MAX_TEXT_LENGTH = 8000;
const MAX_TAG_LENGTH = 40;
const MAX_TAGS = 24;
const MAX_NODES = 300;

type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeText(value: unknown, maxLength = MAX_TEXT_LENGTH): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function sanitizeOptionalText(value: unknown, maxLength = MAX_TEXT_LENGTH): string | undefined {
  const v = sanitizeText(value, maxLength);
  return v || undefined;
}

function sanitizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const tags = value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().toLowerCase().slice(0, MAX_TAG_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_TAGS);

  return Array.from(new Set(tags));
}

function makeNodeId(): string {
  return `node_${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeNode(node: unknown): ReferenceNode | null {
  if (!isRecord(node)) return null;

  const name = sanitizeText(node.name, 120);
  if (!name) return null;

  const childrenRaw = Array.isArray(node.children) ? node.children : [];
  const children = childrenRaw
    .map((child) => sanitizeNode(child))
    .filter((child): child is ReferenceNode => Boolean(child));

  return {
    id:
      typeof node.id === "string" && node.id.trim()
        ? node.id.trim().slice(0, 80)
        : makeNodeId(),
    name,
    description: sanitizeOptionalText(node.description, 300),
    value: sanitizeOptionalText(node.value, 1000),
    type: sanitizeOptionalText(node.type, 80),
    children,
  };
}

function countNodes(nodes: ReferenceNode[]): number {
  return nodes.reduce((acc, node) => acc + 1 + countNodes(node.children ?? []), 0);
}

function sanitizeNodes(value: unknown): ReferenceNode[] {
  if (!Array.isArray(value)) return [];

  const nodes = value
    .map((node) => sanitizeNode(node))
    .filter((node): node is ReferenceNode => Boolean(node));

  if (countNodes(nodes) > MAX_NODES) {
    return [];
  }

  return nodes;
}

function sanitizeType(value: unknown): ReferenceType | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim().toLowerCase();
  return ALLOWED_TYPES.includes(candidate as ReferenceType)
    ? (candidate as ReferenceType)
    : null;
}

export function validateCreateReferenceInput(payload: unknown): ValidationResult<CreateReferenceInput> {
  if (!isRecord(payload)) {
    return { ok: false, error: "Invalid request body", status: 400 };
  }

  const name = sanitizeText(payload.name, 120);
  const description = sanitizeText(payload.description, 1200);
  const type = sanitizeType(payload.type);

  if (!name || !description || !type) {
    return { ok: false, error: "name, description, and valid type are required", status: 400 };
  }

  const result: CreateReferenceInput = {
    name,
    description,
    type,
    version: sanitizeText(payload.version, 40) || "1.0.0",
    tags: sanitizeTags(payload.tags),
    nodes: sanitizeNodes(payload.nodes),
    content: sanitizeOptionalText(payload.content, MAX_TEXT_LENGTH),
  };

  return { ok: true, data: result };
}

export function validateUpdateReferenceInput(
  payload: unknown
): ValidationResult<Partial<CreateReferenceInput>> {
  if (!isRecord(payload)) {
    return { ok: false, error: "Invalid request body", status: 400 };
  }

  const updates: Partial<CreateReferenceInput> = {};

  if ("name" in payload) {
    const name = sanitizeText(payload.name, 120);
    if (!name) return { ok: false, error: "name cannot be empty", status: 400 };
    updates.name = name;
  }

  if ("description" in payload) {
    const description = sanitizeText(payload.description, 1200);
    if (!description) {
      return { ok: false, error: "description cannot be empty", status: 400 };
    }
    updates.description = description;
  }

  if ("type" in payload) {
    const type = sanitizeType(payload.type);
    if (!type) return { ok: false, error: "type is invalid", status: 400 };
    updates.type = type;
  }

  if ("tags" in payload) {
    updates.tags = sanitizeTags(payload.tags);
  }

  if ("nodes" in payload) {
    const nodes = sanitizeNodes(payload.nodes);
    if (Array.isArray(payload.nodes) && payload.nodes.length > 0 && nodes.length === 0) {
      return { ok: false, error: "nodes are invalid or exceed limits", status: 400 };
    }
    updates.nodes = nodes;
  }

  if ("content" in payload) {
    updates.content = sanitizeOptionalText(payload.content, MAX_TEXT_LENGTH);
  }

  if ("version" in payload) {
    const version = sanitizeText(payload.version, 40);
    if (!version) return { ok: false, error: "version cannot be empty", status: 400 };
    updates.version = version;
  }

  return { ok: true, data: updates };
}