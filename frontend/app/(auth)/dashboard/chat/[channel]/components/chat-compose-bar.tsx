"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AtSign, ArrowUp, Hash, PlusCircle, Smile, Bold, Italic, Code as CodeIcon, Link as LinkIcon, List as ListIcon, Users } from "lucide-react";
import type { ChangeEvent, RefObject, ElementType } from "react";
import type { MentionMember } from "./chat-utils";

export function ChatComposeBar({
  currentChannelName,
  inputValue,
  inputFocused,
  onInputChange,
  onInputFocus,
  onInputBlur,
  onSend,
  themeColor,
  textareaRef,
  mentionDropdownVisible,
  mentionIndex,
  filteredMentionMembers,
  onInsertMention,
  onMentionIndexChange,
  onMentionDropdownVisibleChange,
}: {
  currentChannelName?: string;
  inputValue: string;
  inputFocused: boolean;
  onInputChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onInputFocus: () => void;
  onInputBlur: () => void;
  onSend: () => void;
  themeColor: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  mentionDropdownVisible: boolean;
  mentionIndex: number;
  filteredMentionMembers: MentionMember[];
  onInsertMention: (username: string) => void;
  onMentionIndexChange: (value: number) => void;
  onMentionDropdownVisibleChange: (value: boolean) => void;
}) {
  const canSend = inputValue.trim().length > 0;

  return (
    <div className="shrink-0 p-4 pt-0">
      <div
        className={cn(
          "relative flex flex-col rounded-xl border bg-hs-card/80 backdrop-blur-sm transition-all duration-200",
          inputFocused ? "shadow-[0_0_15px_rgba(124,92,252,0.1)]" : "border-border"
        )}
        style={inputFocused ? { borderColor: `${themeColor}80` } : undefined}
      >
        {inputFocused && (
          <div className="flex h-9 items-center gap-1 border-b border-zinc-700/50 px-3 animate-in fade-in slide-in-from-top-1">
            <ToolbarButton icon={Bold} />
            <ToolbarButton icon={Italic} />
            <ToolbarButton icon={CodeIcon} />
            <div className="mx-1 h-3.5 w-px bg-zinc-700/50" />
            <ToolbarButton icon={LinkIcon} />
            <ToolbarButton icon={ListIcon} />
          </div>
        )}

        <div className="relative flex flex-col p-2">
          {mentionDropdownVisible && (
            <div className="absolute bottom-full left-0 z-50 mb-2 w-64 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
              {filteredMentionMembers.length === 0 ? (
                <div className="p-3 text-xs text-zinc-500">No members found</div>
              ) : (
                <div className="max-h-48 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-white/10">
                  {filteredMentionMembers.map((member, index) => (
                    <div
                      key={member.userId || member.username}
                      onClick={() => onInsertMention(member.username)}
                      onMouseEnter={() => onMentionIndexChange(index)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors",
                        index === mentionIndex ? "bg-white/10" : "hover:bg-white/5"
                      )}
                    >
                      {member.isAll ? (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                          <Users className="h-3 w-3 text-zinc-400" />
                        </div>
                      ) : (
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                          style={{ backgroundColor: member.avatarColor || themeColor }}
                        >
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                          ) : (
                            (member.fullName || member.username || "?")
                              .split(" ")
                              .map((name) => name[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)
                          )}
                        </div>
                      )}
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-xs font-medium text-foreground">
                          {member.fullName || member.username}
                        </span>
                        {!member.isAll && (
                          <span className="truncate text-[10px] text-zinc-500">@{member.username}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={onInputChange}
            onKeyDown={(event) => {
              if (mentionDropdownVisible) {
                if (filteredMentionMembers.length === 0) {
                  return;
                }
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  onMentionIndexChange((mentionIndex + 1) % filteredMentionMembers.length);
                  return;
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  onMentionIndexChange((mentionIndex - 1 + filteredMentionMembers.length) % filteredMentionMembers.length);
                  return;
                }
                if (event.key === "Enter" || event.key === "Tab") {
                  event.preventDefault();
                  if (filteredMentionMembers[mentionIndex]) {
                    onInsertMention(filteredMentionMembers[mentionIndex].username);
                  }
                  return;
                }
                if (event.key === "Escape") {
                  onMentionDropdownVisibleChange(false);
                  return;
                }
              }

              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            placeholder={`Message #${currentChannelName || "Chat"}`}
            className="min-h-[40px] w-full resize-none border-none bg-transparent px-2 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />

          <div className="mt-1 flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <IconButton icon={PlusCircle} />
              <IconButton icon={AtSign} />
              <IconButton icon={Hash} />
              <IconButton icon={Smile} />
              <div className="ml-1 flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-tighter text-zinc-600">/</span>
                <span className="text-[10px] text-zinc-500">for AI</span>
              </div>
            </div>

            <Button
              size="icon"
              onClick={onSend}
              disabled={!canSend}
              className={cn(
                "h-7 w-7 rounded-md transition-all",
                canSend ? "cursor-pointer text-white hover:opacity-90" : "bg-zinc-700 text-zinc-500"
              )}
              style={canSend ? { backgroundColor: themeColor } : undefined}
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconButton({ icon: Icon }: { icon: ElementType }) {
  return (
    <button className="text-muted-foreground transition-colors hover:text-foreground">
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
    </button>
  );
}

function ToolbarButton({ icon: Icon }: { icon: ElementType }) {
  return (
    <button className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-muted/50 hover:text-foreground">
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
