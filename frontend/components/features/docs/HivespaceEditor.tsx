"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { parseStoredContent } from "@/components/features/docs/docHelpers";
import {
  CustomBlockquote,
  CustomBulletList,
  CustomHeading,
  CustomListItem,
  CustomOrderedList,
  CustomParagraph,
  CustomTable,
  CustomTableCell,
  CustomTableHeader,
  CustomTableRow,
  deepEqual,
  EditorContentPayload,
  HivespaceTask,
} from "./hivespace-editor-config";
import { HivespaceEditorChrome } from "./hivespace-editor-chrome";

interface HivespaceEditorProps {
  documentId?: string;
  initialContent?: string | null;
  onUpdate?: (payload: EditorContentPayload) => void;
}

export function HivespaceEditor({
  documentId,
  initialContent,
  onUpdate,
}: HivespaceEditorProps) {
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: false,
          paragraph: false,
          blockquote: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          codeBlock: {
            HTMLAttributes: {
              class:
                "bg-zinc-800 rounded-lg p-4 font-mono text-xs text-zinc-300 border border-zinc-700/50 shadow-inner my-4",
            },
          },
        }),
        CustomHeading,
        CustomParagraph,
        CustomBlockquote,
        CustomBulletList,
        CustomOrderedList,
        CustomListItem,
        Placeholder.configure({
          placeholder: "Start writing, or type '/' for commands...",
          emptyEditorClass: "is-editor-empty",
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-violet-400 underline underline-offset-4 cursor-pointer",
          },
        }),
        TextStyle.configure({
          HTMLAttributes: {
            style: null,
          },
        }),
        Color,
        CustomTable,
        CustomTableRow,
        CustomTableHeader,
        CustomTableCell,
        HivespaceTask,
      ],
      content: parseStoredContent(initialContent),
      editorProps: {
        attributes: {
          class:
            "prose prose-invert max-w-none focus:outline-none text-zinc-300 leading-[1.8] text-[15px]",
        },
        handleKeyDown: (view, event) => {
          if (event.key === "/") {
            const { selection } = view.state;
            const coords = view.coordsAtPos(selection.from);
            setMenuPos({ top: coords.top + 24, left: coords.left });
            setIsSlashMenuOpen(true);
          } else {
            setIsSlashMenuOpen(false);
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        onUpdate?.({
          content: JSON.stringify(editor.getJSON()),
          textContent: editor.getText(),
        });
      },
    },
    [documentId],
  );

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const next = initialContent?.trim() || "";
    if (!next) return;
    if (editor.isFocused) return;

    if (next.startsWith("<")) {
      if (editor.getHTML() !== next) {
        editor.commands.setContent(next, { emitUpdate: true });
      }
      return;
    }

    const parsedNext = parseStoredContent(next);
    if (deepEqual(parsedNext, editor.getJSON())) return;
    editor.commands.setContent(parsedNext, { emitUpdate: false });
  }, [editor, documentId, initialContent]);

  if (!editor) return null;

  const insertBlock = (type: string) => {
    switch (type) {
      case "h1":
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case "h2":
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case "h3":
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case "bulletList":
        editor.chain().focus().toggleBulletList().run();
        break;
      case "orderedList":
        editor.chain().focus().toggleOrderedList().run();
        break;
      case "codeBlock":
        editor.chain().focus().toggleCodeBlock().run();
        break;
      case "blockquote":
        editor.chain().focus().toggleBlockquote().run();
        break;
      case "task":
        editor
          .chain()
          .focus()
          .insertContent({
            type: "hivespaceTask",
            attrs: {
              taskId: "HS-044",
              title: "STOMP WebSocket chat broadcast",
              status: "In Progress",
              priority: "urgent",
              assignee: "Meera V.",
            },
          })
          .run();
        break;
      case "ai":
        editor.chain().focus().insertContent("<p><i>✦ Analyzing document for suggestions...</i></p>").run();
        break;
    }
    setIsSlashMenuOpen(false);
  };

  return (
    <div className="relative h-full w-full">
      <HivespaceEditorChrome
        editor={editor}
        isSlashMenuOpen={isSlashMenuOpen}
        menuPos={menuPos}
        onInsertBlock={insertBlock}
      />
      <EditorContent editor={editor} className="min-h-full" />

      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #52525b;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror h1 {
          font-size: 1.875rem;
          line-height: 2.25rem;
          font-weight: 700;
          color: white;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }
        .ProseMirror h2 {
          font-size: 1.25rem;
          line-height: 1.75rem;
          font-weight: 700;
          color: white;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          border-bottom: 1px solid #27272a;
          padding-bottom: 0.5rem;
        }
        .ProseMirror h3 {
          font-size: 1.125rem;
          line-height: 1.75rem;
          font-weight: 700;
          color: white;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        .ProseMirror li {
          margin-bottom: 0.5rem;
        }
        .ProseMirror blockquote {
          border-left: 3px solid #7c5cfc;
          padding-left: 1rem;
          color: #a1a1aa;
          font-style: italic;
          margin: 1.5rem 0;
        }
        .ProseMirror code {
          font-family: "Geist Mono", monospace;
          background: #27272a;
          padding: 0.2rem 0.4rem;
          rounded: 0.25rem;
          font-size: 0.85em;
          color: #e4e4e7;
        }
        .ProseMirror pre code {
          background: none;
          padding: 0;
          color: inherit;
          font-size: inherit;
        }
      `}</style>
    </div>
  );
}
