export type ReferenceType =
  | "ontology"
  | "taxonomy"
  | "model"
  | "schema"
  | "configuration"
  | "markdown"
  | "other";

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
  type: ReferenceType;
  tags: string[];
  nodes: ReferenceNode[];
  content?: string;
  createdAt: string;
  updatedAt: string;
  version: string;
}

export interface CreateReferenceInput {
  name: string;
  description: string;
  type: ReferenceType;
  tags: string[];
  nodes: ReferenceNode[];
  content?: string;
  version?: string;
}

export interface SearchParams {
  q?: string;
  tags?: string[];
  type?: string;
}
