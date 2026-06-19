"use client";

import { useRef, useState } from "react";
import type { RefObject, ChangeEvent } from "react";
import { getChannelMembers } from "@/lib/api/channels";
import { sendAiCommand, sendMessage } from "@/lib/api/messages";
import type { ChannelMemberInfo } from "@/lib/api/channels";
import type { MessageResponse } from "@/types/messaging";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { getErrorMessage, buildMentionMembers } from "./chat-channel-helpers";

interface UseChatChannelComposerOptions {
  channelId: string;
  themeColor: string;
  channelMembers: ChannelMemberInfo[];
  setChannelMembers: (members: ChannelMemberInfo[]) => void;
  onMessageSent: (message: MessageResponse) => void;
  sendTyping: (typing: boolean) => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

export function useChatChannelComposer({
  channelId,
  themeColor,
  channelMembers,
  setChannelMembers,
  onMessageSent,
  sendTyping,
  messagesEndRef,
}: UseChatChannelComposerOptions) {
  const [inputValue, setInputValue] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [threadInputValue, setThreadInputValue] = useState("");
  const [mentionDropdownVisible, setMentionDropdownVisible] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setInputValue(value);
    sendTyping(true);

    const cursor = event.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursor);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith("@")) {
      setMentionQuery(lastWord.slice(1).toLowerCase());
      setMentionDropdownVisible(true);
      setMentionIndex(0);
      if (channelMembers.length === 0) {
        getChannelMembers(channelId)
          .then(setChannelMembers)
          .catch(() => {});
      }
    } else {
      setMentionDropdownVisible(false);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 3000);
  };

  const insertMention = (username: string) => {
    if (!textareaRef.current) return;

    const cursor = textareaRef.current.selectionStart;
    const textBeforeCursor = inputValue.slice(0, cursor);
    const textAfterCursor = inputValue.slice(cursor);
    const words = textBeforeCursor.split(/\s/);
    words.pop();

    const newTextBefore =
      words.length > 0 ? `${words.join(" ")} @${username} ` : `@${username} `;

    setInputValue(newTextBefore + textAfterCursor);
    setMentionDropdownVisible(false);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = newTextBefore.length;
        textareaRef.current.selectionEnd = newTextBefore.length;
      }
    }, 0);
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const content = inputValue.trim();
    setInputValue("");
    sendTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      const message = content.toLowerCase().startsWith("/ai")
        ? await sendAiCommand(channelId, content)
        : await sendMessage(channelId, { content });

      onMessageSent(message);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } catch (error: unknown) {
      console.error("Failed to send message", error);
      toast.error(getErrorMessage(error, "Failed to send message"));
    }
  };

  const filteredMentionMembers = buildMentionMembers(channelMembers, mentionQuery, themeColor);

  return {
    filteredMentionMembers,
    handleInputChange,
    handleSend,
    inputFocused,
    inputValue,
    insertMention,
    mentionDropdownVisible,
    mentionIndex,
    mentionQuery,
    setInputFocused,
    setInputValue,
    setMentionDropdownVisible,
    setMentionIndex,
    setThreadInputValue,
    textareaRef,
    threadInputValue,
  };
}
