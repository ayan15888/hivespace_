"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import Heading from "@tiptap/extension-heading";
import Paragraph from "@tiptap/extension-paragraph";
import Blockquote from "@tiptap/extension-blockquote";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";

export interface EditorContentPayload {
  content: string;
  textContent: string;
}

const HivespaceTask = Node.create({
  name: "hivespaceTask",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      taskId: { default: "HS-001" },
      title: { default: "New Task" },
      status: { default: "In Progress" },
      priority: { default: "normal" },
      assignee: { default: "Rahul S." },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-hivespace-task]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-hivespace-task": "" })];
  },

  addNodeView() {
    return ({ node }) => {
      const { taskId, title, status, priority, assignee } = node.attrs;
      const dom = document.createElement("div");
      dom.className = "my-4 bg-zinc-50 border border-zinc-200 rounded-lg p-3 flex items-center gap-3 max-w-[500px] hover:border-zinc-350 transition-colors cursor-default group shadow-sm select-none";

      const dot = document.createElement("div");
      dot.className =
        priority === "urgent"
          ? "h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"
          : priority === "high"
            ? "h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
            : "h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400";

      const idSpan = document.createElement("span");
      idSpan.className = "font-mono text-xs text-zinc-400 shrink-0";
      idSpan.innerText = taskId;

      const titleSpan = document.createElement("span");
      titleSpan.className = "text-sm font-medium text-zinc-900 flex-1 truncate";
      titleSpan.innerText = title;

      const badge = document.createElement("div");
      badge.className = "bg-violet-500/10 text-violet-600 border border-violet-500/20 px-2 py-0.5 rounded text-[10px] h-5 flex items-center shrink-0";
      badge.innerText = status;

      const avatar = document.createElement("div");
      avatar.className = "h-6 w-6 rounded-full bg-zinc-200 flex items-center justify-center shrink-0";
      avatar.innerHTML = `<span class="text-[10px] text-zinc-600 font-bold">${assignee
        .split(" ")
        .map((name: string) => name[0])
        .join("")}</span>`;

      dom.appendChild(dot);
      dom.appendChild(idSpan);
      dom.appendChild(titleSpan);
      dom.appendChild(badge);
      dom.appendChild(avatar);

      return { dom };
    };
  },
});

type ExtendableNode<T> = {
  extend: (config: {
    addAttributes: (this: { parent?: () => Record<string, unknown> }) => Record<string, unknown>;
  }) => T;
};

function extendNodeWithStyle<T extends ExtendableNode<T>>(node: T): T {
  return node.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        style: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute("style"),
          renderHTML: (attributes: Record<string, unknown>) => {
            const style = attributes.style;
            if (typeof style !== "string" || !style) return {};
            return { style };
          },
        },
      };
    },
  });
}

export const COLORS = [
  { name: "Default", value: "reset" },
  { name: "White", value: "#ffffff" },
  { name: "Gray", value: "#9ca3af" },
  { name: "Red", value: "#f87171" },
  { name: "Orange", value: "#fb923c" },
  { name: "Amber", value: "#fbbf24" },
  { name: "Green", value: "#4ade80" },
  { name: "Emerald", value: "#34d399" },
  { name: "Blue", value: "#60a5fa" },
  { name: "Indigo", value: "#818cf8" },
  { name: "Violet", value: "#a78bfa" },
  { name: "Purple", value: "#c084fc" },
  { name: "Fuchsia", value: "#e879f9" },
  { name: "Pink", value: "#f472b6" },
  { name: "Rose", value: "#fb7185" },
];

export const CustomHeading = extendNodeWithStyle(Heading).configure({
  HTMLAttributes: { class: "text-zinc-900 font-bold tracking-tight" },
});
export const CustomParagraph = extendNodeWithStyle(Paragraph);
export const CustomBlockquote = extendNodeWithStyle(Blockquote);
export const CustomBulletList = extendNodeWithStyle(BulletList);
export const CustomOrderedList = extendNodeWithStyle(OrderedList);
export const CustomListItem = extendNodeWithStyle(ListItem);
export const CustomTable = extendNodeWithStyle(Table).configure({
  resizable: true,
  HTMLAttributes: { class: "border-collapse border border-zinc-200 w-full my-4 rounded-lg overflow-hidden" },
});
export const CustomTableRow = extendNodeWithStyle(TableRow);
export const CustomTableHeader = extendNodeWithStyle(TableHeader);
export const CustomTableCell = extendNodeWithStyle(TableCell);
export { HivespaceTask };

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
  }
  return true;
}
