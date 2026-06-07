"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import { Node, mergeAttributes } from "@tiptap/core"
import {
  Bold,
  Italic,
  Link2,
  Code as CodeIcon,
  Heading1,
  Heading2,
  List,
  Quote,
  Sparkles,
  Search,
  CheckSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { parseStoredContent } from "@/components/features/docs/docHelpers"
import { useState, useEffect } from "react"
import type React from "react"

// --- CUSTOM EXTENSIONS ---

/**
 * HivespaceTask Extension
 * Renders a task card like HS-044 inside the editor.
 */
const HivespaceTask = Node.create({
  name: "hivespaceTask",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      taskId: { default: "HS-001" },
      title: { default: "New Task" },
      status: { default: "In Progress" },
      priority: { default: "normal" }, // urgent, high, normal
      assignee: { default: "Rahul S." },
    }
  },

  parseHTML() {
    return [{ tag: "div[data-hivespace-task]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-hivespace-task": "" }),
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const { taskId, title, status, priority, assignee } = node.attrs

      const dom = document.createElement("div")
      dom.className =
        "my-4 bg-zinc-800/80 border border-zinc-700 rounded-lg p-3 flex items-center gap-3 max-w-[500px] hover:border-zinc-500 transition-colors cursor-default group shadow-lg shadow-black/20 select-none"

      const dot = document.createElement("div")
      dot.className = cn(
        "h-1.5 w-1.5 shrink-0 rounded-full",
        priority === "urgent"
          ? "bg-red-500"
          : priority === "high"
            ? "bg-amber-500"
            : "bg-zinc-500"
      )

      const idSpan = document.createElement("span")
      idSpan.className = "font-mono text-xs text-zinc-500 shrink-0"
      idSpan.innerText = taskId

      const titleSpan = document.createElement("span")
      titleSpan.className = "text-sm font-medium text-white flex-1 truncate"
      titleSpan.innerText = title

      const badge = document.createElement("div")
      badge.className =
        "bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded text-[10px] h-5 flex items-center shrink-0"
      badge.innerText = status

      const avatar = document.createElement("div")
      avatar.className =
        "h-6 w-6 rounded-full bg-zinc-700 flex items-center justify-center shrink-0"
      avatar.innerHTML = `<span class="text-[10px] text-zinc-300 font-bold">${assignee
        .split(" ")
        .map((n: string) => n[0])
        .join("")}</span>`

      dom.appendChild(dot)
      dom.appendChild(idSpan)
      dom.appendChild(titleSpan)
      dom.appendChild(badge)
      dom.appendChild(avatar)

      return { dom }
    }
  },
})

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  for (const key of keysA) {
    if (!keysB.includes(key)) return false
    if (!deepEqual(a[key], b[key])) return false
  }
  return true
}

// --- EDITOR COMPONENT ---

export interface EditorContentPayload {
  content: string
  textContent: string
}

interface HivespaceEditorProps {
  documentId?: string
  initialContent?: string | null
  onUpdate?: (payload: EditorContentPayload) => void
}

export function HivespaceEditor({
  documentId,
  initialContent,
  onUpdate,
}: HivespaceEditorProps) {
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: {
          HTMLAttributes: {
            class:
              "bg-zinc-800 rounded-lg p-4 font-mono text-xs text-zinc-300 border border-zinc-700/50 shadow-inner my-4",
          },
        },
        heading: {
          HTMLAttributes: {
            class: "text-white font-bold tracking-tight",
          },
        },
      }),
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
          const { selection } = view.state
          const coords = view.coordsAtPos(selection.from)
          setMenuPos({ top: coords.top + 24, left: coords.left })
          setIsSlashMenuOpen(true)
        } else {
          setIsSlashMenuOpen(false)
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate?.({
        content: JSON.stringify(editor.getJSON()),
        textContent: editor.getText(),
      })
    },
  }, [documentId])

  // Sync content when switching documents or when fetch completes after mount
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const next = initialContent?.trim() || ""
    if (!next) return

    // Do not sync and overwrite the editor content while the user is actively typing
    if (editor.isFocused) return

    if (next.startsWith("<")) {
      if (editor.getHTML() !== next) {
        editor.commands.setContent(next, { emitUpdate: false })
      }
      return
    }

    const parsedNext = parseStoredContent(next)
    const currentJSON = editor.getJSON()

    // Skip update if the editor content is structurally identical to the fetched/saved content
    if (deepEqual(parsedNext, currentJSON)) return

    editor.commands.setContent(parsedNext, { emitUpdate: false })
  }, [editor, documentId, initialContent])

  if (!editor) return null

  const insertBlock = (type: string) => {
    switch (type) {
      case "h1":
        editor.chain().focus().toggleHeading({ level: 1 }).run()
        break
      case "h2":
        editor.chain().focus().toggleHeading({ level: 2 }).run()
        break
      case "h3":
        editor.chain().focus().toggleHeading({ level: 3 }).run()
        break
      case "bulletList":
        editor.chain().focus().toggleBulletList().run()
        break
      case "orderedList":
        editor.chain().focus().toggleOrderedList().run()
        break
      case "codeBlock":
        editor.chain().focus().toggleCodeBlock().run()
        break
      case "blockquote":
        editor.chain().focus().toggleBlockquote().run()
        break
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
          .run()
        break
      case "ai":
        editor
          .chain()
          .focus()
          .insertContent(
            "<p><i>✦ Analyzing document for suggestions...</i></p>"
          )
          .run()
        break
    }
    setIsSlashMenuOpen(false)
  }

  return (
    <div className="relative h-full w-full">
      {/* SELECTION BUBBLE MENU */}
      {editor && (
        // @ts-expect-error -- BubbleMenu has a typing mismatch with this version
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-md shadow-2xl px-1.5 py-1.5 flex gap-1 items-center animate-in fade-in zoom-in-95 duration-200">
            <MenuButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} icon={Bold} />
            <MenuButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} icon={Italic} />
            <div className="w-px h-4 bg-zinc-800 mx-1" />
            <MenuButton active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} icon={Heading1} />
            <MenuButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} icon={Heading2} />
            <div className="w-px h-4 bg-zinc-800 mx-1" />
            <MenuButton active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} icon={CodeIcon} />
            <MenuButton active={editor.isActive("link")} onClick={() => {
              const url = window.prompt("URL");
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }} icon={Link2} />
          </div>
        </BubbleMenu>
      )}

      {/* SLASH COMMAND MENU */}
      {isSlashMenuOpen && (
        <div
          className="fixed z-[100] w-64 animate-in rounded-lg border border-zinc-800 bg-zinc-900 p-1 shadow-2xl duration-200 fade-in slide-in-from-top-2"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <div className="mb-1 flex items-center gap-2 border-b border-zinc-800/50 px-3 py-2">
            <Search className="h-3 w-3 text-zinc-500" />
            <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
              Editor Commands
            </span>
          </div>
          <div className="scrollbar-none max-h-64 overflow-y-auto pb-1">
            <SlashItem
              onClick={() => insertBlock("h1")}
              icon={Heading1}
              label="Heading 1"
              shortcut="⌘ 1"
            />
            <SlashItem
              onClick={() => insertBlock("h2")}
              icon={Heading2}
              label="Heading 2"
              shortcut="⌘ 2"
            />
            <SlashItem
              onClick={() => insertBlock("bulletList")}
              icon={List}
              label="Bullet List"
              shortcut="-"
            />
            <SlashItem
              onClick={() => insertBlock("codeBlock")}
              icon={CodeIcon}
              label="Code Block"
              shortcut="```"
            />
            <SlashItem
              onClick={() => insertBlock("blockquote")}
              icon={Quote}
              label="Quote"
              shortcut=">"
            />

            <div className="mt-2 flex items-center justify-between px-3 py-1.5">
              <span className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase">
                Hivespace Native
              </span>
            </div>
            <SlashItem
              onClick={() => insertBlock("task")}
              icon={CheckSquare}
              label="Task Mention"
              info="Embed HS-task cards"
              className="hover:bg-violet-500/10 hover:text-violet-200"
            />
            <SlashItem
              onClick={() => insertBlock("ai")}
              icon={Sparkles}
              label="Ask AI Assistant"
              info="Draft or fix content"
              className="font-medium text-violet-400 hover:bg-violet-500/10"
            />
          </div>
        </div>
      )}

      <EditorContent editor={editor} className="min-h-full" />

      {/* CSS Overrides for Tiptap */}
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
  )
}

function MenuButton({
  active,
  onClick,
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-7 w-8 items-center justify-center rounded transition-all",
        active
          ? "scale-105 bg-violet-600 text-white shadow shadow-black/30"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} />
    </button>
  )
}

function SlashItem({
  onClick,
  icon: Icon,
  label,
  shortcut,
  info,
  className,
}: {
  onClick: () => void
  icon: React.ElementType
  label: string
  shortcut?: string
  info?: string
  className?: string
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex cursor-pointer flex-col gap-0.5 rounded-md px-2 py-2 transition-colors hover:bg-zinc-800",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-zinc-800 bg-zinc-800/50 transition-colors group-hover:border-zinc-700">
          <Icon className="h-3.5 w-3.5 text-zinc-500 group-hover:text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{label}</span>
          {info && (
            <span className="text-[10px] leading-none text-zinc-600">
              {info}
            </span>
          )}
        </div>
        {shortcut && (
          <span className="ml-auto font-mono text-[10px] text-zinc-700 group-hover:text-zinc-500">
            {shortcut}
          </span>
        )}
      </div>
    </div>
  )
}
