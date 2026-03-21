import fs from "fs";
import path from "path";
import { Reference, CreateReferenceInput } from "@/types/reference";

const DATA_FILE = path.join(process.cwd(), "data", "references.json");

function ensureDataFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

export function readReferences(): Reference[] {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as Reference[];
}

export function writeReferences(references: Reference[]): void {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(references, null, 2), "utf-8");
}

export function findReferenceById(id: string): Reference | undefined {
  return readReferences().find((r) => r.id === id);
}

export function searchReferences(
  q?: string,
  tags?: string[],
  type?: string
): Reference[] {
  let refs = readReferences();

  if (type) {
    refs = refs.filter((r) => r.type === type);
  }

  if (tags && tags.length > 0) {
    refs = refs.filter((r) =>
      tags.every((tag) => r.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase()))
    );
  }

  if (q) {
    const query = q.toLowerCase();
    refs = refs.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  return refs;
}

export function createReference(input: CreateReferenceInput): Reference {
  const refs = readReferences();
  const now = new Date().toISOString();
  const id = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const ref: Reference = {
    id,
    name: input.name,
    description: input.description,
    type: input.type,
    tags: input.tags,
    nodes: input.nodes,
    createdAt: now,
    updatedAt: now,
    version: input.version ?? "1.0.0",
  };

  refs.push(ref);
  writeReferences(refs);
  return ref;
}

export function updateReference(
  id: string,
  updates: Partial<CreateReferenceInput>
): Reference | null {
  const refs = readReferences();
  const idx = refs.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  const updated: Reference = {
    ...refs[idx],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };
  refs[idx] = updated;
  writeReferences(refs);
  return updated;
}

export function deleteReference(id: string): boolean {
  const refs = readReferences();
  const idx = refs.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  refs.splice(idx, 1);
  writeReferences(refs);
  return true;
}
