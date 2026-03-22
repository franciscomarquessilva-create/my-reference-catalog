import { Reference, ReferenceNode } from "@/types/reference";

function nodeToMarkdown(node: ReferenceNode, depth: number): string {
  const indent = "#".repeat(depth + 3);
  let md = `${indent} ${node.name}\n\n`;
  if (node.type) md += `**Type:** \`${node.type}\`\n\n`;
  if (node.description) md += `${node.description}\n\n`;
  if (node.value !== undefined && node.value !== "") {
    md += `**Value:**\n\`\`\`\n${node.value}\n\`\`\`\n\n`;
  }
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      md += nodeToMarkdown(child, depth + 1);
    }
  }
  return md;
}

export function referenceToMarkdown(ref: Reference): string {
  let md = `# ${ref.name}\n\n`;
  md += `> ${ref.description}\n\n`;
  md += `| Field | Value |\n`;
  md += `|-------|-------|\n`;
  md += `| **ID** | \`${ref.id}\` |\n`;
  md += `| **Type** | ${ref.type} |\n`;
  md += `| **Version** | ${ref.version} |\n`;
  md += `| **Created** | ${new Date(ref.createdAt).toLocaleString()} |\n`;
  md += `| **Updated** | ${new Date(ref.updatedAt).toLocaleString()} |\n`;
  md += `\n`;

  if (ref.tags.length > 0) {
    md += `**Tags:** ${ref.tags.map((t) => `\`${t}\``).join(", ")}\n\n`;
  }

  if (ref.nodes.length > 0) {
    md += `## Structure\n\n`;
    for (const node of ref.nodes) {
      md += nodeToMarkdown(node, 0);
    }
  }

  return md;
}

export function referenceToJson(ref: Reference): object {
  return {
    $schema: "https://reference-catalog.io/schema/v1",
    id: ref.id,
    name: ref.name,
    description: ref.description,
    type: ref.type,
    version: ref.version,
    tags: ref.tags,
    createdAt: ref.createdAt,
    updatedAt: ref.updatedAt,
    nodes: ref.nodes,
  };
}
