"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { ChannelMemberInfo } from "@/lib/api/channels"
import { ChatMessageItem } from "./chat-message-item"
import type { GroupedItem } from "@/app/(auth)/dashboard/chat/[channel]/chat-utils"
import type { RefObject } from "react"

export function ChatMessageList({
  groupedMessages,
  loading,
  onScroll,
  messagesEndRef,
  messagesContainerRef,
  currentUserId,
  themeColor,
  channelMembers,
  onReply,
  onReact,
  otherTypingUsers,
  channelId,
  isAiLoading = false,
}: {
  groupedMessages: GroupedItem[]
  loading: boolean
  onScroll: () => void
  messagesEndRef: RefObject<HTMLDivElement | null>
  messagesContainerRef: RefObject<HTMLDivElement | null>
  currentUserId?: string
  themeColor: string
  channelMembers: ChannelMemberInfo[]
  onReply: (messageId: string | null) => void
  onReact: (messageId: string, emoji: string, reactedByMe: boolean) => void
  otherTypingUsers: Array<{
    userId: string
    displayName: string
    typing: boolean
  }>
  channelId: string
  isAiLoading?: boolean
}) {
  return (
    <div
      ref={messagesContainerRef}
      onScroll={onScroll}
      className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6"
    >
      {loading && (
        <div className="flex justify-center p-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {groupedMessages.map((item, index) =>
        item.type === "date" ? (
          <DateSeparator key={`date-${index}`} date={item.data} />
        ) : (
          <ChatMessageItem
            key={item.data.id}
            message={item.data}
            channelId={channelId}
            currentUserId={currentUserId}
            onReply={() => onReply(item.data.id)}
            onReact={(emoji, reacted) => onReact(item.data.id, emoji, reacted)}
            themeColor={themeColor}
            channelMembers={channelMembers}
          />
        )
      )}

      {isAiLoading && (
        <div
          className="group relative flex gap-3 rounded-r-md p-3 transition-colors mt-2"
          style={{
            borderLeft: `2px solid ${themeColor}`,
            backgroundColor: `${themeColor}10`,
          }}
        >
          <Avatar className="mt-0.5 h-8 w-8 shrink-0 shadow-lg shadow-black/20 animate-pulse">
            <AvatarFallback
              className="text-xs font-bold text-white bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
                <path d="M12,2 C12,7.5 16.5,12 22,12 C16.5,12 12,16.5 12,22 C12,16.5 7.5,12 2,12 C7.5,12 12,7.5 12,2 Z" />
              </svg>
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="mb-0.5 flex items-center">
              <span className="text-sm font-semibold text-foreground">
                Hex
              </span>
            </div>
            <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
              <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current animate-pulse" style={{ color: themeColor }}>
                <path d="M12,2 C12,7.5 16.5,12 22,12 C16.5,12 12,16.5 12,22 C12,16.5 7.5,12 2,12 C7.5,12 12,7.5 12,2 Z" />
              </svg>
              AI Assistant is thinking
            </span>
            <div className="flex items-center gap-1.5 py-2">
              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-bounce [animation-delay:-0.3s]" />
              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-bounce [animation-delay:-0.15s]" />
              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-pink-500 to-indigo-500 animate-bounce" />
            </div>
          </div>
        </div>
      )}

      {otherTypingUsers.length > 0 && (
        <div className="group mt-2 flex animate-in items-center gap-2 duration-300 slide-in-from-left-2">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="bg-zinc-800 text-[8px] text-zinc-400">
              SA
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500 italic">
              {otherTypingUsers.map((user) => user.displayName).join(", ")}{" "}
              {otherTypingUsers.length === 1 ? "is" : "are"} typing
            </span>
            <div className="flex h-2 items-center gap-1">
              <div className="h-1 w-1 animate-pulse rounded-full bg-zinc-600" />
              <div className="h-1 w-1 animate-pulse rounded-full bg-zinc-600 [animation-delay:200ms]" />
              <div className="h-1 w-1 animate-pulse rounded-full bg-zinc-600 [animation-delay:400ms]" />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="relative my-6 flex h-px items-center justify-center">
      <div className="absolute inset-x-0 h-px bg-border opacity-30" />
      <span className="relative z-10 bg-background px-3 text-[11px] font-bold tracking-[2px] text-muted-foreground uppercase">
        {date}
      </span>
    </div>
  )
}
