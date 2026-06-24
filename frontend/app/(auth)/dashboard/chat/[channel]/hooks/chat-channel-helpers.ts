"use client"

import type { ChannelMemberInfo } from "@/lib/api/channels"
import type { MentionMember } from "../chat-utils"

export function buildMentionMembers(
  channelMembers: ChannelMemberInfo[],
  mentionQuery: string,
  themeColor: string
): MentionMember[] {
  return [
    {
      username: "all",
      fullName: "Everyone in channel",
      isAll: true,
      avatarColor: themeColor,
      userId: "all",
    },
    ...channelMembers.filter(
      (member) =>
        member.username.toLowerCase().includes(mentionQuery) ||
        member.fullName?.toLowerCase().includes(mentionQuery)
    ),
  ]
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return fallback
}
