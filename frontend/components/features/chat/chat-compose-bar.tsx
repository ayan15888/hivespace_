"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  AtSign,
  ArrowUp,
  Hash,
  PlusCircle,
  Smile,
  Bold,
  Italic,
  Code as CodeIcon,
  Link as LinkIcon,
  List as ListIcon,
  Users,
} from "lucide-react"
import type { ChangeEvent, RefObject, ElementType } from "react"
import { useState, useEffect } from "react"
import type { MentionMember } from "@/app/(auth)/dashboard/chat/[channel]/chat-utils"

const SUGGESTIONS = [
  { command: "/ai summarize", description: "Summarize the last 50 messages in this channel" },
  { command: "/ai summarize from ", description: "Summarize messages in a specific date range" },
  { command: "/ai ask ", description: "Answer questions using the channel history" },
  { command: "/ai draft a reply to ", description: "Draft a response to a channel member" }
]

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
  suggestedReplies = [],
  onSelectSuggestion,
}: {
  currentChannelName?: string
  inputValue: string
  inputFocused: boolean
  onInputChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onInputFocus: () => void
  onInputBlur: () => void
  onSend: () => void
  themeColor: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  mentionDropdownVisible: boolean
  mentionIndex: number
  filteredMentionMembers: MentionMember[]
  onInsertMention: (username: string) => void
  onMentionIndexChange: (value: number) => void
  onMentionDropdownVisibleChange: (value: boolean) => void
  suggestedReplies?: string[]
  onSelectSuggestion?: (suggestion: string) => void
}) {
  const [aiSuggestIndex, setAiSuggestIndex] = useState(0)
  const [dismissedSuggestions, setDismissedSuggestions] = useState(false)

  useEffect(() => {
    if (inputValue === "") {
      setDismissedSuggestions(false)
    }
  }, [inputValue])

  const filteredSuggestions = SUGGESTIONS.filter(s => 
    s.command.toLowerCase().startsWith(inputValue.toLowerCase()) ||
    (inputValue.toLowerCase().startsWith(s.command.toLowerCase()) && inputValue.length <= s.command.length)
  )

  const showAiSuggestions = 
    !dismissedSuggestions &&
    inputValue.startsWith("/") && 
    filteredSuggestions.length > 0

  const isAiMode = inputValue.toLowerCase().startsWith("/ai")
  const canSend = inputValue.trim().length > 0

  return (
    <div className="shrink-0 p-4 pt-0">
      {suggestedReplies.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="text-[10px] self-center font-bold text-zinc-500 uppercase tracking-wider mr-1">Suggest:</span>
          {suggestedReplies.map((reply) => (
            <button
              key={reply}
              onClick={() => onSelectSuggestion?.(reply)}
              className="group relative flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/5 px-3 py-1 text-xs font-medium text-purple-300 transition-all hover:border-purple-500/40 hover:bg-purple-500/10 hover:text-purple-200 cursor-pointer"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-pink-400 group-hover:scale-110 transition-transform" />
              {reply}
            </button>
          ))}
        </div>
      )}
      <div
        className={cn(
          "relative flex flex-col rounded-xl border bg-hs-card/80 backdrop-blur-sm transition-all duration-200",
          isAiMode
            ? "shadow-[0_0_20px_rgba(168,85,247,0.25)] border-purple-500/50"
            : inputFocused
              ? "shadow-[0_0_15px_rgba(124,92,252,0.1)] border-border"
              : "border-border"
        )}
        style={
          isAiMode
            ? { borderColor: "#a855f7" }
            : inputFocused
              ? { borderColor: `${themeColor}80` }
              : undefined
        }
      >
        {inputFocused && (
          <div className="flex h-9 animate-in items-center gap-1 border-b border-zinc-700/50 px-3 fade-in slide-in-from-top-1">
            <ToolbarButton icon={Bold} />
            <ToolbarButton icon={Italic} />
            <ToolbarButton icon={CodeIcon} />
            <div className="mx-1 h-3.5 w-px bg-zinc-700/50" />
            <ToolbarButton icon={LinkIcon} />
            <ToolbarButton icon={ListIcon} />
          </div>
        )}

        <div className="relative flex flex-col p-2">
          {isAiMode && (
            <div className="mx-2 mt-1 mb-1.5 flex items-center gap-1.5 rounded-md bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/20 px-2.5 py-1 text-[10px] text-foreground w-fit animate-in fade-in slide-in-from-top-1">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current animate-pulse text-purple-400">
                <path d="M12,2 C12,7.5 16.5,12 22,12 C16.5,12 12,16.5 12,22 C12,16.5 7.5,12 2,12 C7.5,12 12,7.5 12,2 Z" />
              </svg>
              <span className="font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 uppercase">
                HEX AI Command Mode
              </span>
            </div>
          )}

          {showAiSuggestions && (
            <div className="absolute bottom-full left-0 z-50 mb-2 w-72 overflow-hidden rounded-lg border border-purple-500/30 bg-zinc-950 shadow-2xl p-1 animate-in slide-in-from-bottom-1 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold text-purple-400 tracking-wider uppercase border-b border-zinc-800">
                AI Commands
              </div>
              <div className="scrollbar-thin scrollbar-thumb-white/10 max-h-48 overflow-y-auto py-1">
                {filteredSuggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.command}
                    onClick={() => {
                      const mockEvent = {
                        target: { value: suggestion.command }
                      } as ChangeEvent<HTMLTextAreaElement>;
                      onInputChange(mockEvent);
                    }}
                    onMouseEnter={() => setAiSuggestIndex(index)}
                    className={cn(
                      "flex flex-col cursor-pointer px-3 py-1.5 transition-colors rounded-md",
                      index === aiSuggestIndex
                        ? "bg-purple-500/20 border border-purple-500/30"
                        : "hover:bg-white/5 border border-transparent"
                    )}
                  >
                    <span className="text-xs font-semibold text-purple-200">
                      {suggestion.command}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {suggestion.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mentionDropdownVisible && (
            <div className="absolute bottom-full left-0 z-50 mb-2 w-64 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
              {filteredMentionMembers.length === 0 ? (
                <div className="p-3 text-xs text-zinc-500">
                  No members found
                </div>
              ) : (
                <div className="scrollbar-thin scrollbar-thumb-white/10 max-h-48 overflow-y-auto py-1">
                  {filteredMentionMembers.map((member, index) => (
                    <div
                      key={member.userId || member.username}
                      onClick={() => onInsertMention(member.username)}
                      onMouseEnter={() => onMentionIndexChange(index)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors",
                        index === mentionIndex
                          ? "bg-white/10"
                          : "hover:bg-white/5"
                      )}
                    >
                      {member.isAll ? (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                          <Users className="h-3 w-3 text-zinc-400" />
                        </div>
                      ) : (
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                          style={{
                            backgroundColor: member.avatarColor || themeColor,
                          }}
                        >
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt=""
                              className="h-full w-full rounded-full object-cover"
                            />
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
                          <span className="truncate text-[10px] text-zinc-500">
                            @{member.username}
                          </span>
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
              if (showAiSuggestions) {
                if (event.key === "ArrowDown") {
                  event.preventDefault()
                  setAiSuggestIndex((aiSuggestIndex + 1) % filteredSuggestions.length)
                  return
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault()
                  setAiSuggestIndex((aiSuggestIndex - 1 + filteredSuggestions.length) % filteredSuggestions.length)
                  return
                }
                if (event.key === "Enter" || event.key === "Tab") {
                  event.preventDefault()
                  const suggestion = filteredSuggestions[aiSuggestIndex]
                  if (suggestion) {
                    const mockEvent = {
                      target: { value: suggestion.command }
                    } as ChangeEvent<HTMLTextAreaElement>
                    onInputChange(mockEvent)
                  }
                  return
                }
                if (event.key === "Escape") {
                  event.preventDefault()
                  setDismissedSuggestions(true)
                  return
                }
              }

              if (mentionDropdownVisible) {
                if (filteredMentionMembers.length === 0) {
                  return
                }
                if (event.key === "ArrowDown") {
                  event.preventDefault()
                  onMentionIndexChange(
                    (mentionIndex + 1) % filteredMentionMembers.length
                  )
                  return
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault()
                  onMentionIndexChange(
                    (mentionIndex - 1 + filteredMentionMembers.length) %
                      filteredMentionMembers.length
                  )
                  return
                }
                if (event.key === "Enter" || event.key === "Tab") {
                  event.preventDefault()
                  if (filteredMentionMembers[mentionIndex]) {
                    onInsertMention(
                      filteredMentionMembers[mentionIndex].username
                    )
                  }
                  return
                }
                if (event.key === "Escape") {
                  onMentionDropdownVisibleChange(false)
                  return
                }
              }

              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                onSend()
              }
            }}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            placeholder={`Message #${currentChannelName || "Chat"}`}
            className={cn(
              "min-h-[40px] w-full resize-none border-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground/60 transition-colors",
              isAiMode ? "text-purple-300 font-semibold" : "text-foreground"
            )}
          />

          <div className="mt-1 flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <IconButton icon={PlusCircle} />
              <IconButton icon={AtSign} />
              <IconButton icon={Hash} />
              <IconButton icon={Smile} />
              <div className="ml-1 flex items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-tighter text-zinc-600 uppercase">
                  /
                </span>
                <span className="text-[10px] text-zinc-500">for AI</span>
              </div>
            </div>

            <Button
              size="icon"
              onClick={onSend}
              disabled={!canSend}
              className={cn(
                "h-7 w-7 rounded-md transition-all",
                canSend
                  ? "cursor-pointer text-white hover:opacity-90"
                  : "bg-zinc-700 text-zinc-500"
              )}
              style={
                canSend
                  ? isAiMode
                    ? { background: "linear-gradient(to right, #7C5CFC, #ec4899)" }
                    : { backgroundColor: themeColor }
                  : undefined
              }
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function IconButton({ icon: Icon }: { icon: ElementType }) {
  return (
    <button className="text-muted-foreground transition-colors hover:text-foreground">
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
    </button>
  )
}

function ToolbarButton({ icon: Icon }: { icon: ElementType }) {
  return (
    <button className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-muted/50 hover:text-foreground">
      <Icon className="h-3.5 w-3.5" />
    </button>
  )
}
