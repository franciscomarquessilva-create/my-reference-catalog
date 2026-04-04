"use client";

import { useState, useCallback } from "react";
import { ReferenceNode } from "@/types/reference";

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

interface NodeEditorProps {
  node: ReferenceNode;
  depth: number;
  onUpdate: (updated: ReferenceNode) => void;
  onDelete: () => void;
}

export default function NodeEditor({
  node,
  depth,
  onUpdate,
  onDelete,
}: NodeEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);

  const update = useCallback(
    (patch: Partial<ReferenceNode>) => {
      onUpdate({ ...node, ...patch });
    },
    [node, onUpdate]
  );

  const addChild = useCallback(() => {
    const child: ReferenceNode = {
      id: generateId(),
      name: "New Child Node",
      description: "",
      type: "property",
      children: [],
    };
    onUpdate({ ...node, children: [...(node.children ?? []), child] });
  }, [node, onUpdate]);

  const updateChild = useCallback(
    (idx: number, updated: ReferenceNode) => {
      const children = [...(node.children ?? [])];
      children[idx] = updated;
      onUpdate({ ...node, children });
    },
    [node, onUpdate]
  );

  const deleteChild = useCallback(
    (idx: number) => {
      const children = (node.children ?? []).filter((_, i) => i !== idx);
      onUpdate({ ...node, children });
    },
    [node, onUpdate]
  );

  const isLeaf = (node.children ?? []).length === 0;
  const indentStyle = {
    marginLeft: `${depth * 20}px`,
    ...(isLeaf ? { maxWidth: "1000px" } : {}),
  };

  return (
    <div style={indentStyle} className="border border-gray-200 rounded-lg bg-gray-50 min-w-max">
      {/* Node Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-gray-400 hover:text-gray-600 w-4 text-xs"
        >
          {(node.children ?? []).length > 0 ? (expanded ? "▼" : "▶") : "•"}
        </button>

        {editing ? (
          <div className="flex-1 grid grid-cols-2 gap-2">
            <input
              autoFocus
              type="text"
              value={node.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Node name"
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={node.type ?? ""}
              onChange={(e) => update({ type: e.target.value })}
              placeholder="Type (e.g. entity, property)"
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <textarea
              value={node.description ?? ""}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Description"
              rows={3}
              style={{ maxWidth: "1000px" }}
              className="border border-gray-300 rounded px-2 py-1 text-sm col-span-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
            />
            <input
              type="text"
              value={node.value ?? ""}
              onChange={(e) => update({ value: e.target.value })}
              placeholder="Value (optional)"
              className="border border-gray-300 rounded px-2 py-1 text-sm col-span-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm text-gray-800">{node.name}</span>
            {node.type && (
              <span className="ml-2 text-xs text-gray-400 font-mono">{node.type}</span>
            )}
            {node.description && (
              <p className="text-xs text-gray-500 truncate">{node.description}</p>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            title={editing ? "Done editing" : "Edit node"}
            className="text-xs px-2 py-1 text-gray-500 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
          >
            {editing ? "✓" : "✏️"}
          </button>
          <button
            type="button"
            onClick={addChild}
            title="Add child node"
            className="text-xs px-2 py-1 text-gray-500 hover:text-green-600 rounded hover:bg-green-50 transition-colors"
          >
            +child
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete node"
            className="text-xs px-2 py-1 text-gray-500 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded && (node.children ?? []).length > 0 && (
        <div className="px-2 pb-2 space-y-1">
          {(node.children ?? []).map((child, idx) => (
            <NodeEditor
              key={child.id}
              node={child}
              depth={depth + 1}
              onUpdate={(updated) => updateChild(idx, updated)}
              onDelete={() => deleteChild(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
