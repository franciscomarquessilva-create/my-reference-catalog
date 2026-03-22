export interface ReferenceNode {
  id: string;
  name: string;
  description?: string;
  value?: string;
  type?: string;
  children?: ReferenceNode[];
}

export interface Reference {
  id: string;
  name: string;
  description: string;
  type: "ontology" | "taxonomy" | "model" | "schema" | "configuration" | "other";
  tags: string[];
  nodes: ReferenceNode[];
  createdAt: string;
  updatedAt: string;
  version: string;
}

export interface CreateReferenceInput {
  name: string;
  description: string;
  type: Reference["type"];
  tags: string[];
  nodes: ReferenceNode[];
  version?: string;
}

export interface SearchParams {
  q?: string;
  tags?: string[];
  type?: string;
}
