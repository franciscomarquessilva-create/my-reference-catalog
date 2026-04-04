import {
  usesFreeTextReference,
  supportsJsonExport,
  TYPE_LABELS,
  TYPE_COLORS,
} from "@/lib/reference-types";
import { ReferenceType } from "@/types/reference";

const ALL_TYPES: ReferenceType[] = [
  "ontology",
  "taxonomy",
  "model",
  "schema",
  "configuration",
  "markdown",
  "other",
];

describe("usesFreeTextReference", () => {
  it("returns true for markdown", () => {
    expect(usesFreeTextReference("markdown")).toBe(true);
  });

  it("returns true for other", () => {
    expect(usesFreeTextReference("other")).toBe(true);
  });

  it("returns false for structured types", () => {
    const structured: ReferenceType[] = ["ontology", "taxonomy", "model", "schema", "configuration"];
    for (const t of structured) {
      expect(usesFreeTextReference(t)).toBe(false);
    }
  });
});

describe("supportsJsonExport", () => {
  it("returns false for markdown", () => {
    expect(supportsJsonExport("markdown")).toBe(false);
  });

  it("returns true for all non-markdown types", () => {
    const nonMarkdown = ALL_TYPES.filter((t) => t !== "markdown");
    for (const t of nonMarkdown) {
      expect(supportsJsonExport(t)).toBe(true);
    }
  });
});

describe("TYPE_LABELS", () => {
  it("has a label for every reference type", () => {
    for (const t of ALL_TYPES) {
      expect(TYPE_LABELS[t]).toBeTruthy();
    }
  });

  it("labels are non-empty strings", () => {
    for (const t of ALL_TYPES) {
      expect(typeof TYPE_LABELS[t]).toBe("string");
      expect(TYPE_LABELS[t].length).toBeGreaterThan(0);
    }
  });
});

describe("TYPE_COLORS", () => {
  it("has a color class for every reference type", () => {
    for (const t of ALL_TYPES) {
      expect(TYPE_COLORS[t]).toBeTruthy();
    }
  });

  it("color values are valid Tailwind class strings", () => {
    for (const t of ALL_TYPES) {
      // Each value should contain at least one space (bg-X text-Y)
      expect(TYPE_COLORS[t]).toMatch(/\S+ \S+/);
    }
  });
});
