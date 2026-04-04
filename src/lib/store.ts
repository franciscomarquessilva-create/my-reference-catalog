import Datastore from "nedb-promises";
import fs from "fs";
import path from "path";
import { Reference, CreateReferenceInput } from "@/types/reference";
import { LlmSettings, UpdateLlmSettingsInput } from "@/types/settings";
import { DatastoreInstance } from "nedb-promises";

const DATA_DIR = path.join(process.cwd(), "data");
const LEGACY_DATA_FILE = path.join(DATA_DIR, "references.json");
const DATABASE_FILE = path.join(DATA_DIR, "references.db");
const SETTINGS_DATABASE_FILE = path.join(DATA_DIR, "settings.db");
const LLM_SETTINGS_ID = "llm-settings";

type ReferenceDocument = Reference & { _id?: string };
type LlmSettingsDocument = LlmSettings & { _id?: string };

let databasePromise: Promise<DatastoreInstance<ReferenceDocument>> | null = null;
let settingsDatabasePromise: Promise<DatastoreInstance<LlmSettingsDocument>> | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function normalizeReference(reference: Reference): Reference {
  const withInternalId = reference as ReferenceDocument;
  const rest = { ...withInternalId };
  delete rest._id;

  return {
    ...rest,
    tags: Array.isArray(rest.tags) ? rest.tags : [],
    nodes: Array.isArray(rest.nodes) ? rest.nodes : [],
    content: typeof rest.content === "string" ? rest.content : undefined,
  };
}

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      ensureDataDir();
      const db = Datastore.create<ReferenceDocument>({
        filename: DATABASE_FILE,
        autoload: true,
      });
      await db.ensureIndex({ fieldName: "id", unique: true });

      const count = await db.count({});
      if (count === 0 && fs.existsSync(LEGACY_DATA_FILE)) {
        const raw = fs.readFileSync(LEGACY_DATA_FILE, "utf-8");
        const legacyReferences = JSON.parse(raw) as Reference[];
        for (const reference of legacyReferences.map(normalizeReference)) {
          await db.insert(reference);
        }
      }

      return db;
    })();
  }

  return databasePromise;
}

async function getSettingsDatabase() {
  if (!settingsDatabasePromise) {
    settingsDatabasePromise = (async () => {
      ensureDataDir();
      const db = Datastore.create<LlmSettingsDocument>({
        filename: SETTINGS_DATABASE_FILE,
        autoload: true,
      });
      await db.ensureIndex({ fieldName: "_id", unique: true });
      return db;
    })();
  }

  return settingsDatabasePromise;
}

function normalizeLlmSettings(settings: LlmSettings): LlmSettings {
  const withInternalId = settings as LlmSettingsDocument;
  const rest = { ...withInternalId };
  delete rest._id;
  return {
    model: typeof rest.model === "string" ? rest.model : "",
    apiKey: typeof rest.apiKey === "string" ? rest.apiKey : "",
    updatedAt: typeof rest.updatedAt === "string" ? rest.updatedAt : new Date().toISOString(),
  };
}

export async function readReferences(): Promise<Reference[]> {
  const db = await getDatabase();
  const references = (await db.find({})) as Reference[];
  return references
    .map(normalizeReference)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function findReferenceById(id: string): Promise<Reference | null> {
  const db = await getDatabase();
  const reference = (await db.findOne({ id })) as Reference | null;
  return reference ? normalizeReference(reference) : null;
}

export async function searchReferences(
  q?: string,
  tags?: string[],
  type?: string
): Promise<Reference[]> {
  let refs = await readReferences();

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
        (r.content?.toLowerCase().includes(query) ?? false) ||
        r.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  return refs;
}

export async function createReference(input: CreateReferenceInput): Promise<Reference> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const reference: Reference = {
    id,
    name: input.name,
    description: input.description,
    type: input.type,
    tags: input.tags,
    nodes: input.nodes,
    content: input.content,
    createdAt: now,
    updatedAt: now,
    version: input.version ?? "1.0.0",
  };

  await db.insert(reference);
  return reference;
}

export async function updateReference(
  id: string,
  updates: Partial<CreateReferenceInput>
): Promise<Reference | null> {
  const db = await getDatabase();
  const existing = (await db.findOne({ id })) as Reference | null;
  if (!existing) return null;

  const updated: Reference = {
    ...normalizeReference(existing),
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };

  await db.update({ id }, updated, {});
  return updated;
}

export async function deleteReference(id: string): Promise<boolean> {
  const db = await getDatabase();
  const removed = await db.remove({ id }, {});
  return removed > 0;
}

export async function readLlmSettings(): Promise<LlmSettings | null> {
  const db = await getSettingsDatabase();
  const settings = (await db.findOne({ _id: LLM_SETTINGS_ID })) as LlmSettings | null;
  return settings ? normalizeLlmSettings(settings) : null;
}

export async function upsertLlmSettings(input: UpdateLlmSettingsInput): Promise<LlmSettings> {
  const db = await getSettingsDatabase();
  const normalizedInput: LlmSettings = {
    model: input.model.trim(),
    apiKey: input.apiKey.trim(),
    updatedAt: new Date().toISOString(),
  };

  await db.update(
    { _id: LLM_SETTINGS_ID },
    { _id: LLM_SETTINGS_ID, ...normalizedInput },
    { upsert: true }
  );

  return normalizedInput;
}
