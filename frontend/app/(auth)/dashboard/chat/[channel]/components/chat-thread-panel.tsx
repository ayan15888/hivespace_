"use client";

import { Button } from "@/components/ui/button";
import { X, ArrowUp } from "lucide-react";
import type { ChannelMemberInfo } from "@/lib/api/channels";
import type { MessageResponse } from "@/types/messaging";
import { ChatMessageItem } from "./chat-message-item";

export function ChatThreadPanel({
  activeThread,
  activeThreadParentId,
  channelId,
  currentChannelName,
  currentUserId,
  themeColor,
  channelMembers,
  threadMessages,
  threadInputValue,
  onClose,
  onThreadInputChange,
  onSendThreadReply,
}: {
  activeThread: (MessageResponse & { isGrouped?: boolean }) | null;
  activeThreadParentId: string | null;
  channelId: string;
  currentChannelName?: string | null;
  currentUserId?: string;
  themeColor: string;
  channelMembers: ChannelMemberInfo[];
  threadMessages: Record<string, MessageResponse[]>;
  threadInputValue: string;
  onClose: () => void;
  onThreadInputChange: (value: string) => void;
  onSendThreadReply: () => void;
}) {
  if (!activeThread) return null;

  return (
    <aside className="relative z-30 flex w-[340px] shrink-0 flex-col border-l border-border/30 bg-background/70 shadow-[-8px_0_30px_-15px_rgba(0,0,0,0.6)] backdrop-blur-2xl animate-in slide-in-from-right duration-300">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-40"
        style={{ backgroundImage: `linear-gradient(to bottom, ${themeColor}30, transparent)` }}
      />

      <header className="relative z-10 flex h-[56px] items-center justify-between border-b border-white/5 px-5">
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold tracking-tight text-foreground drop-shadow-sm">Thread</span>
          <span className="text-[11px] font-medium text-muted-foreground"># {currentChannelName || "Chat"}</span>
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

      <div className="relative z-10 flex flex-1 flex-col gap-6 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-white/10">
        <div className="relative opacity-90">
          <div className="absolute -inset-2 -z-10 rounded-xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent" />
          <ChatMessageItem
            message={{ ...activeThread, isGrouped: false }}
            channelId={channelId}
            currentUserId={currentUserId}
            isThreadParent
            themeColor={themeColor}
            channelMembers={channelMembers}
          />
        </div>

        <div className="relative my-2 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span className="whitespace-nowrap rounded-full border border-white/5 bg-background/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {threadMessages[activeThreadParentId!]?.length || 0} Replies
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {(threadMessages[activeThreadParentId!] ?? []).map((reply) => (
          <ChatMessageItem
            key={reply.id}
            message={{ ...reply, isGrouped: false }}
            channelId={channelId}
            currentUserId={currentUserId}
            themeColor={themeColor}
            channelMembers={channelMembers}
          />
        ))}
      </div>

      <div className="relative z-10 border-t border-white/5 bg-background/40 p-4 backdrop-blur-md">
        <div className="group relative flex gap-2">
          <div
            className="absolute -inset-0.5 rounded-lg opacity-20 blur transition-opacity duration-300 group-focus-within:opacity-40"
            style={{ backgroundColor: themeColor }}
          />
          <input
            type="text"
            value={threadInputValue}
            onChange={(event) => onThreadInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSendThreadReply();
              }
            }}
            placeholder="Reply to thread..."
            className="relative z-10 flex-1 rounded-lg border border-white/10 bg-zinc-950/80 px-4 py-2 text-sm text-foreground outline-none backdrop-blur-sm placeholder:text-zinc-500 shadow-inner transition-all focus:border-white/20"
          />
          <Button
            size="icon"
            onClick={onSendThreadReply}
            style={{ backgroundColor: themeColor }}
            className="relative z-10 h-9 w-9 shrink-0 rounded-lg text-white shadow-lg transition-all hover:brightness-110"
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
          </Button>
        </div>
      </div>
    </aside>
  );
}
