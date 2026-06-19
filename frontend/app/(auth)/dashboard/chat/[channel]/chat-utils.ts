"use client";

import type { ChannelMemberInfo } from "@/lib/api/channels";
import type { MessageResponse } from "@/types/messaging";

export const EMOJIS = ["👍", "🚀", "❤️", "🔥", "👀", "🙌", "🎉", "😮"];

export type GroupedItem =
  | { type: "date"; data: string }
  | { type: "message"; data: MessageResponse & { isGrouped: boolean } };

export type MentionMember = Omit<ChannelMemberInfo, "avatarUrl" | "joinedAt"> & {
  avatarUrl?: string | null;
  joinedAt?: string | null;
  isAll?: boolean;
};

export function buildGroupedMessages(messages: MessageResponse[]): GroupedItem[] {
  const displayMessages = [...messages].reverse();
  const groupedMessages: GroupedItem[] = [];

  let lastDay = "";
  let lastMessage: MessageResponse | null = null;

  displayMessages.forEach((message) => {
    const dateObj = new Date(message.createdAt);
    const messageDay = dateObj.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    let dayChanged = false;

    if (messageDay !== lastDay) {
      groupedMessages.push({ type: "date", data: messageDay });
      lastDay = messageDay;
      dayChanged = true;
    }

    const unixTime = dateObj.getTime() / 1000;
    const lastUnixTime = lastMessage ? new Date(lastMessage.createdAt).getTime() / 1000 : 0;
    const isGrouped =
      !dayChanged &&
      !!lastMessage &&
      lastMessage.sender?.id === message.sender?.id &&
      unixTime - lastUnixTime < 300 &&
      message.type !== "AI" &&
      lastMessage.type !== "AI";

    groupedMessages.push({
      type: "message",
      data: { ...message, isGrouped: !!isGrouped },
    });
    lastMessage = message;
  });

  return groupedMessages;
}
