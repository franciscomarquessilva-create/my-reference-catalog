import {
  validateCreateReferenceInput,
  validateUpdateReferenceInput,
} from "@/lib/reference-validation";

// ---------------------------------------------------------------------------
// validateCreateReferenceInput
// ---------------------------------------------------------------------------

describe("validateCreateReferenceInput", () => {
  const validPayload = {
    name: "My Ontology",
    description: "A test ontology",
    type: "ontology",
    tags: ["test", "demo"],
    nodes: [],
    version: "1.0.0",
  };

  it("accepts a valid payload", () => {
    const result = validateCreateReferenceInput(validPayload);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.name).toBe("My Ontology");
    expect(result.data.type).toBe("ontology");
    expect(result.data.version).toBe("1.0.0");
  });

  it("rejects non-object payloads", () => {
    const result = validateCreateReferenceInput("not an object");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
  });

  it("rejects missing name", () => {
    const result = validateCreateReferenceInput({ ...validPayload, name: "" });
    expect(result.ok).toBe(false);
  });

  it("rejects missing description", () => {
    const result = validateCreateReferenceInput({ ...validPayload, description: "" });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = validateCreateReferenceInput({ ...validPayload, type: "invalid-type" });
    expect(result.ok).toBe(false);
  });

  it("accepts all valid types", () => {
    const types = ["ontology", "taxonomy", "model", "schema", "configuration", "markdown", "other"];
    for (const type of types) {
      const result = validateCreateReferenceInput({ ...validPayload, type });
      expect(result.ok).toBe(true);
    }
  });

  it("sanitizes and deduplicates tags", () => {
    const result = validateCreateReferenceInput({
      ...validPayload,
      tags: ["  FOO  ", "bar", "FOO", "baz"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.tags).toEqual(["foo", "bar", "baz"]);
  });

  it("drops non-string tags silently", () => {
    const result = validateCreateReferenceInput({
      ...validPayload,
      tags: ["good", 42, null, "also-good"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.tags).toEqual(["good", "also-good"]);
  });

  it("trims name and description to max lengths", () => {
    const longName = "a".repeat(200);
    const result = validateCreateReferenceInput({ ...validPayload, name: longName });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.name.length).toBe(120);
  });

  it("defaults version to 1.0.0 when omitted", () => {
    const { version: _omit, ...rest } = validPayload;
    const result = validateCreateReferenceInput(rest);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.version).toBe("1.0.0");
  });

  it("accepts valid nested nodes", () => {
    const payload = {
      ...validPayload,
      nodes: [
        {
          id: "node_1",
          name: "Root",
          description: "root node",
          children: [{ id: "node_2", name: "Child", children: [] }],
        },
      ],
    };
    const result = validateCreateReferenceInput(payload);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.nodes).toHaveLength(1);
    expect(result.data.nodes[0].children).toHaveLength(1);
  });

  it("drops nodes with empty name", () => {
    const payload = {
      ...validPayload,
      nodes: [{ id: "node_1", name: "", children: [] }],
    };
    const result = validateCreateReferenceInput(payload);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.nodes).toHaveLength(0);
  });

  it("rejects node trees that exceed the 300-node limit", () => {
    const nodes = Array.from({ length: 301 }, (_, i) => ({
      id: `node_${i}`,
      name: `Node ${i}`,
      children: [],
    }));
    const result = validateCreateReferenceInput({ ...validPayload, nodes });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Sanitization returns empty array when tree exceeds limit
    expect(result.data.nodes).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// validateUpdateReferenceInput
// ---------------------------------------------------------------------------

describe("validateUpdateReferenceInput", () => {
  it("accepts an empty update (no-op)", () => {
    const result = validateUpdateReferenceInput({});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.data)).toHaveLength(0);
  });

  it("accepts partial updates", () => {
    const result = validateUpdateReferenceInput({ name: "Updated Name" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.name).toBe("Updated Name");
  });

  it("rejects an empty name in updates", () => {
    const result = validateUpdateReferenceInput({ name: "  " });
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid type in updates", () => {
    const result = validateUpdateReferenceInput({ type: "bogus" });
    expect(result.ok).toBe(false);
  });

  it("rejects an empty version in updates", () => {
    const result = validateUpdateReferenceInput({ version: "" });
    expect(result.ok).toBe(false);
  });

  it("rejects non-object payloads", () => {
    const result = validateUpdateReferenceInput(null);
    expect(result.ok).toBe(false);
  });

  it("reports invalid nodes payload correctly", () => {
    // Provide a non-empty nodes array where every node is invalid
    const result = validateUpdateReferenceInput({
      nodes: [{ id: "x", name: "" }], // empty name → stripped
    });
    expect(result.ok).toBe(false);
  });
});
