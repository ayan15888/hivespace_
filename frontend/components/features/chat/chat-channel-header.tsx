"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Hash, Pin, Search, Settings, Users } from "lucide-react";
import type { ElementType } from "react";

export function ChatChannelHeader({
  currentChannel,
  isConnected,
  showMembers,
  onToggleMembers,
  initialUnreadCount = 0,
  isSummarizing = false,
  onSummarize,
}: {
  currentChannel?: { name?: string | null; type?: string | null };
  isConnected: boolean;
  showMembers: boolean;
  onToggleMembers: () => void;
  initialUnreadCount?: number;
  isSummarizing?: boolean;
  onSummarize?: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[48px] shrink-0 items-center justify-between bg-background px-4 border-b border-border/50">
      <div className="flex items-center">
        <Hash className="mr-1 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <span className="text-sm font-medium text-foreground">{currentChannel?.name || "Chat"}</span>
        <div className="mx-3 h-4 w-px bg-border/50" />
        <span className="max-w-[400px] truncate text-xs text-muted-foreground">
          {currentChannel?.type === "DM"
            ? "Direct conversation"
            : "Engineering team workspace discussion"}
        </span>
        <div
          title={isConnected ? "Live" : "Reconnecting..."}
          className={cn(
            "ml-3 h-2 w-2 shrink-0 rounded-full transition-colors",
            isConnected ? "bg-emerald-500" : "animate-pulse bg-amber-400"
          )}
        />
        {initialUnreadCount > 0 && onSummarize && (
          <Button
            onClick={onSummarize}
            disabled={isSummarizing}
            className="ml-4 h-7 px-3 rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 flex items-center gap-1 border border-purple-400/30 shadow-[0_0_10px_rgba(168,85,247,0.15)] transition-all animate-in zoom-in-95"
          >
            <svg viewBox="0 0 24 24" className={cn("h-3 w-3 fill-white", isSummarizing && "animate-spin")}>
              <path d="M12,2 C12,7.5 16.5,12 22,12 C16.5,12 12,16.5 12,22 C12,16.5 7.5,12 2,12 C7.5,12 12,7.5 12,2 Z" />
            </svg>
            Catch up ({initialUnreadCount} unread)
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 transition-colors",
            showMembers ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
          onClick={onToggleMembers}
        >
          <Users className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </Button>
        <IconButton icon={Search} />
        <IconButton icon={Pin} />
        <IconButton icon={Settings} />
      </div>
    </header>
  );
}

function IconButton({ icon: Icon }: { icon: ElementType }) {
  return (
    <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground group">
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
    </Button>
  );
}
