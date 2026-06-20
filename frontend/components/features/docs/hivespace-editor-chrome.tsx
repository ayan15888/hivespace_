"use client";

import { BubbleMenu } from "@tiptap/react/menus";
import { Bold, CheckSquare, Code as CodeIcon, Heading1, Heading2, Italic, Link2, List, Quote, Search, Sparkles } from "lucide-react";
import type { Editor } from "@tiptap/react";
import type { ElementType } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { COLORS } from "./hivespace-editor-config";

type MenuState = {
  isSlashMenuOpen: boolean;
  menuPos: { top: number; left: number };
};

type HivespaceEditorChromeProps = MenuState & {
  editor: Editor;
  onInsertBlock: (type: string) => void;
};

export function HivespaceEditorChrome({
  editor,
  isSlashMenuOpen,
  menuPos,
  onInsertBlock,
}: HivespaceEditorChromeProps) {
  return (
    <>
      <BubbleMenu editor={editor}>
        <div className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-1.5 shadow-2xl">
          <MenuButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} icon={Bold} />
          <MenuButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} icon={Italic} />
          <div className="mx-1 h-4 w-px bg-zinc-800" />
          <MenuButton active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} icon={Heading1} />
          <MenuButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} icon={Heading2} />
          <div className="mx-1 h-4 w-px bg-zinc-800" />
          <MenuButton active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} icon={CodeIcon} />
          <MenuButton active={editor.isActive("link")} onClick={() => {
            const url = window.prompt("URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }} icon={Link2} />
          <div className="mx-1 h-4 w-px bg-zinc-800" />
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="relative flex cursor-pointer items-center justify-center rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                title="Text Color"
              >
                <span className="font-serif text-[13px] font-bold underline decoration-violet-500 decoration-2">A</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="flex w-40 flex-col gap-1.5 border-zinc-700 bg-zinc-900 p-2 text-zinc-200 shadow-2xl">
              <div className="px-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500">Text Color</div>
              <div className="grid grid-cols-5 gap-1.5 p-0.5">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => {
                      if (color.value === "reset") {
                        editor.chain().focus().unsetColor().run();
                      } else {
                        editor.chain().focus().setColor(color.value).run();
                      }
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-800 transition-transform hover:scale-110"
                    style={{ backgroundColor: color.value === "reset" ? "transparent" : color.value }}
                    title={color.name}
                  >
                    {color.value === "reset" && <div className="h-px w-full rotate-45 bg-red-500/80" />}
                    {editor.isActive("textStyle", { color: color.value }) && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </BubbleMenu>

      {isSlashMenuOpen && (
        <div className="fixed z-[100] w-64 animate-in rounded-lg border border-zinc-800 bg-zinc-900 p-1 shadow-2xl duration-200 fade-in slide-in-from-top-2" style={{ top: menuPos.top, left: menuPos.left }}>
          <div className="mb-1 flex items-center gap-2 border-b border-zinc-800/50 px-3 py-2">
            <Search className="h-3 w-3 text-zinc-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Editor Commands</span>
          </div>
          <div className="scrollbar-none max-h-64 overflow-y-auto pb-1">
            <SlashItem onClick={() => onInsertBlock("h1")} icon={Heading1} label="Heading 1" shortcut="⌘ 1" />
            <SlashItem onClick={() => onInsertBlock("h2")} icon={Heading2} label="Heading 2" shortcut="⌘ 2" />
            <SlashItem onClick={() => onInsertBlock("bulletList")} icon={List} label="Bullet List" shortcut="-" />
            <SlashItem onClick={() => onInsertBlock("codeBlock")} icon={CodeIcon} label="Code Block" shortcut="```" />
            <SlashItem onClick={() => onInsertBlock("blockquote")} icon={Quote} label="Quote" shortcut=">" />

            <div className="mt-2 flex items-center justify-between px-3 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Hivespace Native</span>
            </div>
            <SlashItem onClick={() => onInsertBlock("task")} icon={CheckSquare} label="Task Mention" info="Embed HS-task cards" className="hover:bg-violet-500/10 hover:text-violet-200" />
            <SlashItem onClick={() => onInsertBlock("ai")} icon={Sparkles} label="Ask AI Assistant" info="Draft or fix content" className="font-medium text-violet-400 hover:bg-violet-500/10" />
          </div>
        </div>
      )}
    </>
  );
}

function MenuButton({
  active,
  onClick,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  icon: ElementType;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-7 w-8 items-center justify-center rounded transition-all",
        active ? "scale-105 bg-violet-600 text-white shadow shadow-black/30" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} />
    </button>
  );
}

function SlashItem({
  onClick,
  icon: Icon,
  label,
  shortcut,
  info,
  className,
}: {
  onClick: () => void;
  icon: ElementType;
  label: string;
  shortcut?: string;
  info?: string;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex cursor-pointer flex-col gap-0.5 rounded-md px-2 py-2 transition-colors hover:bg-zinc-800",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-zinc-800 bg-zinc-800/50 transition-colors group-hover:border-zinc-700">
          <Icon className="h-3.5 w-3.5 text-zinc-500 group-hover:text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{label}</span>
          {info && <span className="text-[10px] leading-none text-zinc-600">{info}</span>}
        </div>
        {shortcut && <span className="ml-auto font-mono text-[10px] text-zinc-700 group-hover:text-zinc-500">{shortcut}</span>}
      </div>
    </div>
  );
}
