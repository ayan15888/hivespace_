"use client";

import { Button } from "@/components/ui/button";
import { Users, X } from "lucide-react";
import type { ChannelMemberInfo } from "@/lib/api/channels";

export function ChatMembersPanel({
  showMembers,
  membersLoading,
  channelMembers,
  currentUserId,
  themeColor,
  onClose,
}: {
  showMembers: boolean;
  membersLoading: boolean;
  channelMembers: ChannelMemberInfo[];
  currentUserId?: string;
  themeColor: string;
  onClose: () => void;
}) {
  if (!showMembers) return null;

  return (
    <aside className="relative z-30 flex w-[280px] shrink-0 flex-col border-l border-border/30 bg-background/70 shadow-[-8px_0_30px_-15px_rgba(0,0,0,0.6)] backdrop-blur-2xl animate-in slide-in-from-right duration-300">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-30"
        style={{ backgroundImage: `linear-gradient(to bottom, ${themeColor}20, transparent)` }}
      />

      <header className="relative z-10 flex h-[56px] items-center justify-between border-b border-white/5 px-5">
        <div className="flex items-center gap-2.5">
          <div className="rounded-md border border-white/5 bg-white/5 p-1.5 backdrop-blur-sm">
            <Users className="h-4 w-4 text-foreground/80" strokeWidth={1.5} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-foreground drop-shadow-sm">Members</span>
          {channelMembers.length > 0 && (
            <span className="rounded-full border border-white/5 bg-white/10 px-2 py-0.5 text-[10px] font-bold text-foreground shadow-sm">
              {channelMembers.length}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-full bg-white/5 text-muted-foreground backdrop-blur-sm transition-all hover:bg-white/10 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="relative z-10 flex flex-1 flex-col gap-1.5 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/10">
        {membersLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 animate-pulse">
              <div className="h-8 w-8 shrink-0 rounded-full bg-white/10" />
              <div className="flex w-full flex-col gap-1.5">
                <div className="h-3 w-24 rounded bg-white/10" />
                <div className="h-2 w-16 rounded bg-white/5" />
              </div>
            </div>
          ))
        ) : channelMembers.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center opacity-50">
            <Users className="mb-3 h-8 w-8" />
            <p className="text-xs font-medium text-foreground">No members found</p>
          </div>
        ) : (
          channelMembers.map((member) => {
            const initials = (member.fullName || member.username || "?")
              .split(" ")
              .map((name) => name[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const isCurrentUser = member.userId === currentUserId;

            return (
              <div
                key={member.userId}
                className="group flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-all hover:border-white/5 hover:bg-white/10"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-md shadow-black/20"
                  style={{ backgroundColor: member.avatarColor || themeColor }}
                >
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-semibold text-foreground drop-shadow-sm">
                    {member.fullName || member.username}
                    {isCurrentUser && (
                      <span className="ml-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground/80">
                        you
                      </span>
                    )}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground transition-colors group-hover:text-muted-foreground/80">
                    @{member.username}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
