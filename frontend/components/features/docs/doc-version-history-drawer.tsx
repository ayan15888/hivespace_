"use client";

import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { DocumentVersionResponse } from "@/lib/api/documents";
import { formatDate, getInitials } from "./docHelpers";

type DocVersionHistoryDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  versions: DocumentVersionResponse[];
  versionsLoading: boolean;
  selectedVersionId: string | null;
  onSelectVersion: (versionId: string | null) => void;
};

export function DocVersionHistoryDrawer({
  open,
  onClose,
  title,
  versions,
  versionsLoading,
  selectedVersionId,
  onSelectVersion,
}: DocVersionHistoryDrawerProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 animate-in cursor-pointer bg-black/40 backdrop-blur-xs duration-300 fade-in"
        onClick={onClose}
      />
      <aside className="relative flex w-[320px] animate-in flex-col border-l border-zinc-800 bg-zinc-900 shadow-2xl duration-300 slide-in-from-right">
        <header className="flex h-[44px] items-center justify-between border-b border-zinc-800 px-4">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[#E5E1E4]">Version History</span>
            <span className="text-[10px] text-zinc-500">{title || "Document"}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-zinc-500 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="p-3">
          {selectedVersionId && (
            <div className="mb-4 flex animate-in flex-col gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 slide-in-from-top-2">
              <p className="text-[11px] font-medium text-amber-300">You are viewing a past version.</p>
              <Button className="h-7 w-full rounded-sm bg-amber-500 text-[10px] font-bold tracking-wider text-black uppercase shadow-lg shadow-black/20 hover:bg-amber-600">
                Restore this version
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-2">
          <VersionRow
            label="Current version"
            author="Current"
            time="Now"
            isCurrent
            isActive={selectedVersionId === null}
            onClick={() => onSelectVersion(null)}
          />
          <div className="mx-2 my-2 h-px bg-zinc-800 opacity-50" />
          {versionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
            </div>
          ) : versions.length === 0 ? (
            <p className="py-8 text-center text-[10px] text-zinc-600 italic">No previous versions yet</p>
          ) : (
            versions.map((version) => (
              <VersionRow
                key={version.id}
                label={formatDate(version.createdAt)}
                author={version.savedByName || "Unknown"}
                time={`v${versions.length - versions.indexOf(version)}`}
                isActive={selectedVersionId === version.id}
                onClick={() => onSelectVersion(version.id)}
              />
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

function VersionRow({
  label,
  author,
  time,
  isCurrent,
  isActive,
  onClick,
}: {
  label: string;
  author: string;
  time: string;
  isCurrent?: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex cursor-pointer flex-col rounded-md border-l-2 p-3 transition-all",
        isActive ? "border-violet-500 bg-zinc-800/60 text-white" : "border-transparent text-zinc-400 hover:bg-zinc-800/40",
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className={cn("text-xs font-medium", isCurrent ? "text-violet-400" : "text-zinc-200")}>{label}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <Avatar className="h-4 w-4">
          <AvatarFallback className="bg-zinc-700 text-[7px]">{getInitials(author)}</AvatarFallback>
        </Avatar>
        <span className="text-[10px] text-zinc-500">{author}</span>
        <span className="ml-auto whitespace-nowrap text-[10px] text-zinc-600">{time}</span>
      </div>
    </div>
  );
}
