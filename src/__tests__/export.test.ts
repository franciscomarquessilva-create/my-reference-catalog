import { referenceToMarkdown, referenceToJson } from "@/lib/export";
import { Reference } from "@/types/reference";

const structuredRef: Reference = {
  id: "ref_test_001",
  name: "Cloud Service Taxonomy",
  description: "A taxonomy of cloud services",
  type: "taxonomy",
  version: "1.0.0",
  tags: ["cloud", "taxonomy"],
  nodes: [
    {
      id: "node_1",
      name: "Compute",
      description: "Compute services",
      type: "category",
      children: [
        {
          id: "node_2",
          name: "Virtual Machines",
          description: "IaaS VM offerings",
          type: "leaf",
          value: "iaas",
          children: [],
        },
      ],
    },
  ],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-06-01T00:00:00.000Z",
};

const markdownRef: Reference = {
  id: "ref_md_001",
  name: "Architecture Notes",
  description: "Free text design notes",
  type: "markdown",
  version: "1.0.0",
  tags: ["notes"],
  nodes: [],
  content: "# My Notes\n\nSome content here.",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-06-01T00:00:00.000Z",
};

// ---------------------------------------------------------------------------
// referenceToMarkdown
// ---------------------------------------------------------------------------

describe("referenceToMarkdown", () => {
  it("returns raw content for markdown type", () => {
    const md = referenceToMarkdown(markdownRef);
    expect(md).toBe("# My Notes\n\nSome content here.");
  });

  it("includes reference name as heading for structured types", () => {
    const md = referenceToMarkdown(structuredRef);
    expect(md).toContain("# Cloud Service Taxonomy");
  });

  it("includes description for structured types", () => {
    const md = referenceToMarkdown(structuredRef);
    expect(md).toContain("A taxonomy of cloud services");
  });

  it("renders node names in the output", () => {
    const md = referenceToMarkdown(structuredRef);
    expect(md).toContain("Compute");
    expect(md).toContain("Virtual Machines");
  });

  it("renders node value in a code block", () => {
    const md = referenceToMarkdown(structuredRef);
    expect(md).toContain("iaas");
  });

  it("includes tags", () => {
    const md = referenceToMarkdown(structuredRef);
    expect(md).toContain("`cloud`");
    expect(md).toContain("`taxonomy`");
  });

  it("includes version and type metadata", () => {
    const md = referenceToMarkdown(structuredRef);
    expect(md).toContain("1.0.0");
    expect(md).toContain("taxonomy");
  });

  it("renders a ref with no nodes gracefully", () => {
    const noNodes: Reference = { ...structuredRef, nodes: [] };
    const md = referenceToMarkdown(noNodes);
    expect(md).toContain("# Cloud Service Taxonomy");
    expect(md).not.toContain("## Structure");
  });

  it("renders a ref with no tags gracefully", () => {
    const noTags: Reference = { ...structuredRef, tags: [] };
    const md = referenceToMarkdown(noTags);
    expect(md).not.toContain("**Tags:**");
  });
});

// ---------------------------------------------------------------------------
// referenceToJson
// ---------------------------------------------------------------------------

describe("referenceToJson", () => {
  it("returns an object with expected top-level keys", () => {
    const json = referenceToJson(structuredRef) as Record<string, unknown>;
    expect(json).toHaveProperty("id", "ref_test_001");
    expect(json).toHaveProperty("name", "Cloud Service Taxonomy");
    expect(json).toHaveProperty("description");
    expect(json).toHaveProperty("type", "taxonomy");
    expect(json).toHaveProperty("version", "1.0.0");
    expect(json).toHaveProperty("tags");
    expect(json).toHaveProperty("nodes");
    expect(json).toHaveProperty("createdAt");
    expect(json).toHaveProperty("updatedAt");
  });

  it("includes the $schema field", () => {
    const json = referenceToJson(structuredRef) as Record<string, unknown>;
    expect(json).toHaveProperty("$schema");
  });

  it("preserves the nodes structure", () => {
    const json = referenceToJson(structuredRef) as Record<string, unknown>;
    const nodes = json.nodes as typeof structuredRef.nodes;
    expect(Array.isArray(nodes)).toBe(true);
    expect(nodes[0].name).toBe("Compute");
    expect(nodes[0].children?.[0].name).toBe("Virtual Machines");
  });

  it("preserves tags array", () => {
    const json = referenceToJson(structuredRef) as Record<string, unknown>;
    expect(json.tags).toEqual(["cloud", "taxonomy"]);
  });
});
