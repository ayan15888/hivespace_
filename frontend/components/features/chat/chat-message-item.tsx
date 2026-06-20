"use client"

import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MessageSquare, Trash2, Edit2, Users, Sparkles } from "lucide-react"
import type { ChannelMemberInfo } from "@/lib/api/channels"
import type { MessageResponse, UserSummary } from "@/types/messaging"
import type { ElementType } from "react"
import { deleteMessage, editMessage } from "@/lib/api/messages"
import { EMOJIS } from "@/app/(auth)/dashboard/chat/[channel]/chat-utils"

export function ChatMessageItem({
  message,
  channelId,
  currentUserId,
  onReply,
  onReact,
  isThreadParent,
  themeColor = "#7C5CFC",
  channelMembers = [],
}: {
  message: MessageResponse & { isGrouped?: boolean }
  channelId: string
  currentUserId?: string
  onReply?: () => void
  onReact?: (emoji: string, reacted: boolean) => void
  isThreadParent?: boolean
  themeColor?: string
  channelMembers?: ChannelMemberInfo[]
}) {
  const isAI = message.type === "AI" || !message.sender
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(message.content)
  const isMyMessage = message.sender?.id === currentUserId

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const getInitials = (user: UserSummary | null) => {
    if (!user?.fullName) return "?"
    return user.fullName
      .split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColorClass = (user: UserSummary | null) => {
    if (!user) return "bg-zinc-800"
    if (user.avatarColor) return user.avatarColor
    const colors = [
      "bg-emerald-500",
      "bg-blue-500",
      "bg-violet-500",
      "bg-orange-500",
      "bg-pink-500",
    ]
    const index =
      Math.abs(
        user.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
      ) % colors.length
    return colors[index]
  }

  const handleEditSubmit = async () => {
    if (!editValue.trim() || editValue === message.content) {
      setIsEditing(false)
      return
    }

    try {
      await editMessage(channelId, message.id, { content: editValue.trim() })
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to edit message", err)
    }
  }

  const handleDeleteClick = async () => {
    if (!confirm("Delete this message?")) return

    try {
      await deleteMessage(channelId, message.id)
    } catch (err) {
      console.error("Failed to delete message", err)
    }
  }

  const renderLineContent = (lineText: string) => {
    if (!lineText) return null

    const regex = /(@\w+|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
    const parts = lineText.split(regex)

    return parts.map((part, index) => {
      if (part.startsWith("@") && part.length > 1) {
        const username = part.slice(1)
        if (
          username.toLowerCase() === "all" ||
          username.toLowerCase() === "everyone"
        ) {
          return (
            <span
              key={index}
              className="mx-1 inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2 py-0.5 align-middle"
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-zinc-300">
                <Users className="h-[10px] w-[10px]" />
              </span>
              <span
                className="font-bold tracking-tight text-white"
                style={{ color: themeColor }}
              >
                {part}
              </span>
            </span>
          )
        }

        const member = channelMembers.find(
          (item) => item.username.toLowerCase() === username.toLowerCase()
        )
        const displayUsername =
          member?.fullName || member?.username || username
        const initial = displayUsername.charAt(0).toUpperCase()
        const colors = [
          "bg-emerald-500",
          "bg-blue-500",
          "bg-violet-500",
          "bg-orange-500",
          "bg-pink-500",
        ]
        const colorIndex =
          Math.abs(
            displayUsername
              .split("")
              .reduce((acc, char) => acc + char.charCodeAt(0), 0)
          ) % colors.length
        const avatarContent = member?.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt=""
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span
            className={cn(
              "flex h-full w-full items-center justify-center rounded-full text-[9px] font-bold text-white",
              member?.avatarColor ? "" : colors[colorIndex]
            )}
            style={
              member?.avatarColor
                ? { backgroundColor: member.avatarColor }
                : undefined
            }
          >
            {initial}
          </span>
        )

        return (
          <span
            key={index}
            className="mx-1 inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2 py-0.5 align-middle"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full">
              {avatarContent}
            </span>
            <span
              className="font-bold tracking-tight text-white"
              style={{ color: themeColor }}
            >
              {part}
            </span>
          </span>
        )
      }

      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={index}
            className="mx-1 rounded border border-zinc-700/50 bg-zinc-800 px-1.5 py-0.5 font-mono text-[12px] text-pink-400"
          >
            {part.slice(1, -1)}
          </code>
        )
      }

      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-extrabold text-white">
            {part.slice(2, -2)}
          </strong>
        )
      }

      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <span key={index} className="font-semibold italic text-white/95">
            {part.slice(1, -1)}
          </span>
        )
      }

      return (
        <span key={index} className="whitespace-pre-wrap">
          {part}
        </span>
      )
    })
  }

  const renderMessageContent = (content: string) => {
    const lines = (content || "").split("\n")
    return lines.map((line, lineIndex) => {
      if (line === "") {
        return <div key={lineIndex} className="min-h-[1.25rem]" />
      }

      const isBullet =
        line.trimStart().startsWith("* ") || line.trimStart().startsWith("- ")
      if (isBullet) {
        const cleanLine = line.trimStart().replace(/^(\*|-)\s+/, "")
        return (
          <div key={lineIndex} className="my-1 flex items-start gap-2 pl-4">
            <span className="mt-1 select-none font-bold text-zinc-500">•</span>
            <div className="flex-1 text-sm text-foreground">
              {renderLineContent(cleanLine)}
            </div>
          </div>
        )
      }

      return (
        <div key={lineIndex} className="min-h-[1.25rem] text-sm text-foreground">
          {renderLineContent(line)}
        </div>
      )
    })
  }

  return (
    <div
      className={cn(
        "group relative flex gap-3 rounded-sm px-2 py-1 transition-colors hover:bg-muted/20",
        isAI ? "mt-2 rounded-r-md p-3" : "",
        message.isGrouped ? "mt-0" : "mt-4"
      )}
      style={
        isAI
          ? {
              borderLeft: `2px solid ${themeColor}`,
              backgroundColor: `${themeColor}10`,
            }
          : undefined
      }
    >
      {!message.isGrouped ? (
        <Avatar className="mt-0.5 h-8 w-8 shrink-0 shadow-lg shadow-black/20">
          {isAI ? (
            <AvatarFallback
              className="text-xs font-bold text-white bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
                <path d="M12,2 C12,7.5 16.5,12 22,12 C16.5,12 12,16.5 12,22 C12,16.5 7.5,12 2,12 C7.5,12 12,7.5 12,2 Z" />
              </svg>
            </AvatarFallback>
          ) : message.sender?.avatarUrl ? (
            <img
              src={message.sender.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <AvatarFallback
              className={cn(
                "text-xs font-bold text-white",
                getAvatarColorClass(message.sender)
              )}
            >
              {getInitials(message.sender)}
            </AvatarFallback>
          )}
        </Avatar>
      ) : (
        <div className="flex w-8 shrink-0 justify-center">
          <span className="invisible absolute left-0 mt-1 pl-3 text-[10px] font-medium text-zinc-700 group-hover:visible">
            {formatTimestamp(message.createdAt)}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {!message.isGrouped && (
          <div className="mb-0.5 flex items-center">
            <span className="cursor-pointer text-sm font-semibold text-foreground hover:underline">
              {isAI ? "Hex" : (message.sender?.fullName || "Deleted User")}
            </span>
            <span className="ml-2 text-[10px] font-medium text-muted-foreground">
              {new Date(message.createdAt).toLocaleDateString()}{" "}
              {formatTimestamp(message.createdAt)}
            </span>
            {message.isEdited && (
              <span className="ml-2 text-[9px] text-zinc-500">(edited)</span>
            )}
          </div>
        )}

        {isAI && (
          <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
            <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" style={{ color: themeColor }}>
              <path d="M12,2 C12,7.5 16.5,12 22,12 C16.5,12 12,16.5 12,22 C12,16.5 7.5,12 2,12 C7.5,12 12,7.5 12,2 Z" />
            </svg>
            AI Assistant
          </span>
        )}

        {isEditing ? (
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={editValue}
              onChange={(event) => setEditValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleEditSubmit()
                if (event.key === "Escape") setIsEditing(false)
              }}
              className="border-zinc-850 flex-1 rounded border bg-zinc-900 px-2 py-1 text-sm text-foreground outline-none"
            />
            <Button
              size="sm"
              onClick={handleEditSubmit}
              className="h-8 text-xs text-white"
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(false)}
              className="h-8 text-xs text-zinc-500"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              "text-sm leading-relaxed tracking-wide",
              message.isDeleted ? "text-zinc-500 italic" : "text-foreground"
            )}
            style={{ wordSpacing: "0.03em" }}
          >
            {message.isDeleted ? (
              message.content
            ) : (
              <>{renderMessageContent(message.content || "")}</>
            )}
          </div>
        )}

        {!message.isDeleted &&
          message.reactions &&
          message.reactions.length > 0 && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {message.reactions.map((reaction, index) => (
                <div
                  key={index}
                  onClick={() =>
                    onReact?.(reaction.emoji, reaction.reactedByMe)
                  }
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium transition-all",
                    reaction.reactedByMe
                      ? "border-transparent"
                      : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                  )}
                  style={
                    reaction.reactedByMe
                      ? {
                          backgroundColor: `${themeColor}30`,
                          color: themeColor,
                          borderColor: `${themeColor}50`,
                        }
                      : undefined
                  }
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </div>
              ))}
            </div>
          )}

        {!isThreadParent && message.replyCount > 0 && (
          <button
            onClick={onReply}
            className="mt-2 flex items-center gap-1 self-start text-left text-[11px] font-semibold tracking-tight hover:underline"
            style={{ color: themeColor }}
          >
            <MessageSquare className="h-3 w-3" />
            <span>
              {message.replyCount}{" "}
              {message.replyCount === 1 ? "reply" : "replies"}
            </span>
          </button>
        )}
      </div>

      {!isThreadParent && !message.isDeleted && (
        <div className="absolute -top-4 right-4 hidden scale-95 items-center rounded-md border border-zinc-700 bg-zinc-900 p-1 shadow-xl group-hover:flex">
          {EMOJIS.slice(0, 4).map((emoji) => {
            const hasReacted =
              message.reactions?.find((reaction) => reaction.emoji === emoji)
                ?.reactedByMe ?? false
            return (
              <button
                key={emoji}
                onClick={() => onReact?.(emoji, hasReacted)}
                className="flex h-7 w-7 items-center justify-center rounded text-sm transition-colors hover:bg-zinc-800"
              >
                {emoji}
              </button>
            )
          })}
          <div className="mx-1 h-3 w-px bg-zinc-700" />
          <ActionIcon icon={MessageSquare} onClick={onReply} />
          {isMyMessage && (
            <>
              <ActionIcon icon={Edit2} onClick={() => setIsEditing(true)} />
              <ActionIcon icon={Trash2} onClick={handleDeleteClick} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ActionIcon({
  icon: Icon,
  onClick,
}: {
  icon: ElementType
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-muted hover:text-foreground"
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} />
    </button>
  )
}
