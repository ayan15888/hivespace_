"use client";

import { Clock, FileText, GitFork, Globe, GlobeLock, Loader2, MoreHorizontal, Share2, Sparkles, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DocumentContentResponse } from "@/lib/api/documents";
import type { ElementType } from "react";

type EditorHeaderProps = {
  activeDocument: DocumentContentResponse | null;
  saveStatus: "saving" | "saved" | "idle";
  ragStatus: "SYNCING" | "READY";
  view: "editor" | "graph";
  isHistoryOpen: boolean;
  isRedesigning: boolean;
  onGoHome: () => void;
  onSetView: (view: "editor" | "graph") => void;
  onOpenHistory: () => void;
  onRedesignWithAi: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
};

export function DocEditorHeader({
  activeDocument,
  saveStatus,
  ragStatus,
  view,
  isHistoryOpen,
  isRedesigning,
  onGoHome,
  onSetView,
  onOpenHistory,
  onRedesignWithAi,
  onTogglePublish,
  onDelete,
}: EditorHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[44px] shrink-0 items-center justify-between border-b border-border/50 bg-background px-4">
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="sm" onClick={onGoHome} className="mr-2 h-7 px-2 text-xs text-zinc-500 hover:text-white">
          Home
        </Button>
        <span className="mr-2 text-zinc-800">/</span>
        <span className="text-[11px] font-medium text-white truncate max-w-[300px]">
          {activeDocument?.title || "Untitled"}
        </span>
        {activeDocument?.isPublished && (
          <div className="ml-2 flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5">
            <Globe className="h-3 w-3 text-emerald-400" />
            <span className="text-[10px] text-emerald-400">Published</span>
          </div>
        )}
        {saveStatus === "saving" && (
          <span className="ml-3 flex items-center gap-1 text-[10px] text-zinc-500 animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving...
          </span>
        )}
        {saveStatus === "saved" && ragStatus === "SYNCING" && (
          <span className="ml-3 flex items-center gap-1.5 text-[10px] text-violet-400 animate-pulse font-medium">
            <Sparkles className="h-3 w-3 animate-[spin_3s_linear_infinite]" /> Syncing with AI...
          </span>
        )}
        {saveStatus === "saved" && ragStatus === "READY" && (
          <span className="ml-3 flex items-center gap-1 text-[10px] text-emerald-500 animate-in fade-in">
            <Check className="h-3 w-3" /> Saved & AI Ready
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <TooltipProvider>
          <div className="flex rounded-md border border-zinc-700 bg-zinc-800 p-0.5 shadow-inner">
            <ViewToggle active={view === "editor"} icon={FileText} onClick={() => onSetView("editor")} label="Editor" />
            <ViewToggle active={view === "graph"} icon={GitFork} onClick={() => onSetView("graph")} label="Graph" />
            <ViewToggle active={isHistoryOpen} icon={Clock} onClick={onOpenHistory} label="History" />
          </div>
          <div className="mx-1 h-4 w-px bg-zinc-800" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onRedesignWithAi}
                disabled={isRedesigning}
                className="flex h-8 items-center gap-1.5 rounded-md border-violet-500/25 bg-violet-600/15 px-2.5 text-[11px] font-medium text-violet-400 shadow-lg shadow-violet-500/5 transition-all hover:border-violet-500/40 hover:bg-violet-600/25"
              >
                {isRedesigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Redesign with AI
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="border-zinc-700 bg-zinc-900 py-1 text-[10px] text-zinc-300">
              Redesign document layout, tables & diagrams with AI
            </TooltipContent>
          </Tooltip>

          <div className="mx-1 h-4 w-px bg-zinc-800" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onTogglePublish}
                className={cn(
                  "h-8 w-8 rounded-md",
                  activeDocument?.isPublished ? "text-emerald-400 hover:text-emerald-300" : "text-zinc-400 hover:text-white",
                )}
              >
                {activeDocument?.isPublished ? <GlobeLock className="h-4 w-4" strokeWidth={1.5} /> : <Share2 className="h-4 w-4" strokeWidth={1.5} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="border-zinc-700 bg-zinc-900 py-1 text-[10px] text-zinc-300">
              {activeDocument?.isPublished ? "Unpublish" : "Publish (Admin/Lead only)"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-zinc-400 hover:text-white">
              <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 border-zinc-700 bg-zinc-900 p-1 text-zinc-200">
            <PageAction icon={FileText} label="Duplicate" />
            <PageAction icon={MoreHorizontal} label="Move to" />
            <div className="my-1 h-px bg-zinc-800" />
            <PageAction icon={Trash2} label="Delete" className="text-red-400" onClick={onDelete} />
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}

function ViewToggle({
  active,
  icon: Icon,
  onClick,
  label,
}: {
  active: boolean;
  icon: ElementType;
  onClick: () => void;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "flex h-8 w-9 items-center justify-center rounded transition-all",
            active ? "bg-violet-600 text-white shadow shadow-black/20" : "text-zinc-500 hover:text-zinc-300",
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="border-zinc-700 bg-zinc-900 py-1 text-[10px] text-zinc-300">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function PageAction({
  icon: Icon,
  label,
  className,
  onClick,
}: {
  icon: ElementType;
  label: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded px-3 py-2 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
      {label}
    </button>
  );
}
