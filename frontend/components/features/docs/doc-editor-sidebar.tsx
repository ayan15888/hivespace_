"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { DocumentContentResponse } from "@/lib/api/documents";
import { formatTimeAgo, getInitials } from "./docHelpers";

type DocEditorSidebarProps = {
  activeDocument: DocumentContentResponse | null;
};

export function DocEditorSidebar({ activeDocument }: DocEditorSidebarProps) {
  return (
    <aside className="flex w-[280px] shrink-0 animate-in flex-col overflow-y-auto border-l border-border/50 bg-hs-nav duration-300 slide-in-from-right">
      <div className="flex flex-col gap-8 p-6">
        <section className="flex flex-col gap-4">
          <h3 className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase">Page Info</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-7 w-7 border border-zinc-700">
                <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-400">
                  {getInitials(activeDocument?.createdByName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-zinc-200">
                  {activeDocument?.createdByName || "Unknown"}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {activeDocument?.updatedAt ? `Last edited ${formatTimeAgo(activeDocument.updatedAt)}` : ""}
                </span>
              </div>
            </div>
            <div className="flex justify-between rounded-md bg-zinc-800/20 p-2 text-[11px] text-zinc-500">
              <span>Version</span>
              <span className="text-zinc-300">v{activeDocument?.version || 1}</span>
            </div>
            <div className="flex justify-between rounded-md bg-zinc-800/20 p-2 text-[11px] text-zinc-500">
              <span>Status</span>
              <span className={activeDocument?.isPublished ? "text-emerald-400" : "text-zinc-400"}>
                {activeDocument?.isPublished ? "Published" : "Draft"}
              </span>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}
