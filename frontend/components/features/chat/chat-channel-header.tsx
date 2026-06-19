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
}: {
  currentChannel?: { name?: string | null; type?: string | null };
  isConnected: boolean;
  showMembers: boolean;
  onToggleMembers: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[48px] shrink-0 items-center justify-between bg-background/80 backdrop-blur-md px-4 border-b border-border/50">
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
