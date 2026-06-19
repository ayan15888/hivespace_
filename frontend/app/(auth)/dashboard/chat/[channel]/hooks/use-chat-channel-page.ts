"use client"

import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useChannelSocket } from "@/hooks/useChannelSocket"
import { useProjects } from "@/hooks/useProjects"
import { useAuthStore } from "@/store/authStore"
import { useChatStore } from "@/store/chatStore"
import { useWorkspaceStore } from "@/store/workspaceStore"
import { PROJECT_COLOR_MAP } from "@/lib/constants/colors"
import {
  addReaction,
  getMessages,
  getThreadMessages,
  removeReaction,
  sendMessage,
} from "@/lib/api/messages"
import { getChannelMembers, markChannelRead } from "@/lib/api/channels"
import type { MessageResponse } from "@/types/messaging"
import { buildGroupedMessages } from "../chat-utils"
import { useChatChannelComposer } from "./use-chat-channel-composer"

export function useChatChannelPage(channelId: string) {
  const { projects } = useProjects()
  const { user: currentUser } = useAuthStore()
  const { activeWorkspace } = useWorkspaceStore()
  const {
    channels,
    messages,
    setMessages,
    prependOlderMessages,
    appendMessage,
    updateMessage,
    removeMessage,
    clearUnread,
    typingUsers,
    setTyping,
    activeThreadParentId,
    setActiveThread,
    threadMessages,
    setThreadMessages,
    appendThreadMessage,
    updateThreadMessage,
    hasMoreMessages,
  } = useChatStore()

  const workspaceChannels = activeWorkspace
    ? (channels[activeWorkspace.id] ?? [])
    : []
  const currentChannel = workspaceChannels.find(
    (channel) => channel.id === channelId
  )
  const currentProject = projects.find(
    (project) => project.id === currentChannel?.projectId
  )
  const themeColor = PROJECT_COLOR_MAP[currentProject?.color || ""] || "#7C5CFC"

  const channelMessages = messages[channelId] ?? []
  const hasMore = hasMoreMessages[channelId] ?? true
  const groupedMessages = buildGroupedMessages(channelMessages)
  const activeThread =
    channelMessages.find((message) => message.id === activeThreadParentId) ||
    null
  const activeTypingUsers = typingUsers[channelId] ?? []
  const otherTypingUsers = activeTypingUsers.filter(
    (typingUser) => typingUser.userId !== currentUser?.id && typingUser.typing
  )

  const [showMembers, setShowMembers] = useState(false)
  const [loading, setLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Load initial messages with TanStack Query
  const { isLoading: isMessagesLoading } = useQuery({
    queryKey: ["messages", channelId],
    queryFn: async () => {
      const msgs = await getMessages(channelId)
      setMessages(channelId, msgs, msgs.length === 50)
      await markChannelRead(channelId).catch(() => {})
      clearUnread(channelId)
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop =
            messagesContainerRef.current.scrollHeight
        }
      }, 50)
      return msgs
    },
    enabled: !!channelId,
    refetchOnWindowFocus: false,
  })

  // Load channel members with TanStack Query when showMembers is true
  const { data: channelMembersQuery, isLoading: isMembersLoading } = useQuery({
    queryKey: ["channel-members", channelId],
    queryFn: () => getChannelMembers(channelId),
    enabled: showMembers && !!channelId,
    refetchOnWindowFocus: false,
  })

  const channelMembers = channelMembersQuery ?? []
  const membersLoading = isMembersLoading

  useEffect(() => {
    setShowMembers(false)
  }, [channelId])

  useEffect(() => {
    if (channelMessages.length === 0) return

    const timeout = setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight
      }
    }, 50)

    return () => clearTimeout(timeout)
  }, [channelId, channelMessages.length])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && activeThreadParentId) {
        setActiveThread(null)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [activeThreadParentId, setActiveThread])

  useEffect(() => {
    if (!activeThreadParentId) return

    getThreadMessages(channelId, activeThreadParentId)
      .then((msgs) => setThreadMessages(activeThreadParentId, msgs))
      .catch((error) => {
        console.error("Failed to fetch thread messages", error)
      })
  }, [activeThreadParentId, channelId, setThreadMessages])

  const { sendTyping, isConnected } = useChannelSocket({
    channelId,
    onMessage: (message) => {
      const freshMessages = useChatStore.getState().messages[channelId] ?? []
      if (message.parentId) {
        const freshThreadList =
          useChatStore.getState().threadMessages[message.parentId] ?? []
        const exists = freshThreadList.some((item) => item.id === message.id)
        if (exists) {
          updateThreadMessage(message.parentId, message)
        } else {
          appendThreadMessage(message.parentId, message)
          const parentMessage = freshMessages.find(
            (item) => item.id === message.parentId
          )
          if (parentMessage) {
            updateMessage(channelId, {
              ...parentMessage,
              replyCount: parentMessage.replyCount + 1,
            })
          }
        }
        return
      }

      const exists = freshMessages.some((item) => item.id === message.id)
      if (exists) {
        updateMessage(channelId, message)
        return
      }

      appendMessage(channelId, message)
      const container = messagesContainerRef.current
      if (
        container &&
        container.scrollHeight - container.scrollTop - container.clientHeight <
          150
      ) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 100)
      }
    },
    onDelete: (messageId) => {
      removeMessage(channelId, messageId)
    },
    onReaction: (event) => {
      const isSelf = event.userId === currentUser?.id
      if (isSelf) return

      const freshMessage = useChatStore
        .getState()
        .messages[channelId]?.find((item) => item.id === event.messageId)
      if (!freshMessage) return

      const previousReactions = freshMessage.reactions ?? []
      const updatedReactions =
        event.delta === 1
          ? previousReactions.some((reaction) => reaction.emoji === event.emoji)
            ? previousReactions.map((reaction) =>
                reaction.emoji === event.emoji
                  ? {
                      ...reaction,
                      count: reaction.count + 1,
                      reactedByMe: reaction.reactedByMe || isSelf,
                    }
                  : reaction
              )
            : [
                ...previousReactions,
                { emoji: event.emoji, count: 1, reactedByMe: isSelf },
              ]
          : previousReactions
              .map((reaction) =>
                reaction.emoji === event.emoji
                  ? {
                      ...reaction,
                      count: reaction.count - 1,
                      reactedByMe: isSelf ? false : reaction.reactedByMe,
                    }
                  : reaction
              )
              .filter((reaction) => reaction.count > 0)

      updateMessage(channelId, { ...freshMessage, reactions: updatedReactions })
    },
    onTyping: (event) => {
      setTyping(channelId, event.userId, event.displayName, event.typing)
    },
    threadParentId: activeThreadParentId || undefined,
    onThreadMessage: (message) => {
      if (!activeThreadParentId) return
      const freshThreadList =
        useChatStore.getState().threadMessages[activeThreadParentId] ?? []
      const exists = freshThreadList.some((item) => item.id === message.id)
      if (exists) {
        updateThreadMessage(activeThreadParentId, message)
      } else {
        appendThreadMessage(activeThreadParentId, message)
      }
    },
  })

  useEffect(() => {
    if (isConnected) return

    const interval = setInterval(() => {
      getMessages(channelId)
        .then((msgs) => {
          const currentIds = new Set(
            useChatStore
              .getState()
              .messages[channelId]?.map((item) => item.id) ?? []
          )
          const hasNew = msgs.some((item) => !currentIds.has(item.id))
          if (hasNew) {
            setMessages(channelId, msgs, msgs.length === 50)
          }
        })
        .catch((error) => {
          console.error("Polling messages failed", error)
        })
    }, 4000)

    return () => clearInterval(interval)
  }, [channelId, isConnected, setMessages])

  const handleScroll = () => {
    const container = messagesContainerRef.current
    if (!container || !hasMore || loading) return
    if (container.scrollTop !== 0 || channelMessages.length === 0) return

    setLoading(true)
    const oldestMessageId = channelMessages[channelMessages.length - 1].id
    const previousHeight = container.scrollHeight

    getMessages(channelId, oldestMessageId)
      .then((olderMessages) => {
        prependOlderMessages(
          channelId,
          olderMessages,
          olderMessages.length === 50
        )
        setTimeout(() => {
          container.scrollTop = container.scrollHeight - previousHeight
        }, 50)
      })
      .catch((error) => {
        console.error("Failed to load older messages", error)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const toggleMembersPanel = () => {
    setShowMembers((prev) => !prev)
  }

  const composer = useChatChannelComposer({
    channelId,
    themeColor,
    onMessageSent: (message: MessageResponse) => {
      appendMessage(channelId, message)
    },
    sendTyping,
    messagesEndRef,
  })

  const handleSendThreadReply = async () => {
    if (!composer.threadInputValue.trim() || !activeThreadParentId) return

    const content = composer.threadInputValue.trim()
    composer.setThreadInputValue("")

    try {
      const message = await sendMessage(channelId, {
        content,
        parentId: activeThreadParentId,
      })
      appendThreadMessage(activeThreadParentId, message)

      const parentMessage = channelMessages.find(
        (item) => item.id === activeThreadParentId
      )
      if (parentMessage) {
        updateMessage(channelId, {
          ...parentMessage,
          replyCount: parentMessage.replyCount + 1,
        })
      }
    } catch (error) {
      console.error("Failed to send thread reply", error)
    }
  }

  const handleReactionClick = async (
    messageId: string,
    emoji: string,
    reactedByMe: boolean
  ) => {
    const previousMessage = useChatStore
      .getState()
      .messages[channelId]?.find((item) => item.id === messageId)
    if (previousMessage) {
      const previousReactions = previousMessage.reactions ?? []
      const updatedReactions = reactedByMe
        ? previousReactions
            .map((reaction) =>
              reaction.emoji === emoji
                ? { ...reaction, count: reaction.count - 1, reactedByMe: false }
                : reaction
            )
            .filter((reaction) => reaction.count > 0)
        : previousReactions.some((reaction) => reaction.emoji === emoji)
          ? previousReactions.map((reaction) =>
              reaction.emoji === emoji
                ? { ...reaction, count: reaction.count + 1, reactedByMe: true }
                : reaction
            )
          : [...previousReactions, { emoji, count: 1, reactedByMe: true }]

      updateMessage(channelId, {
        ...previousMessage,
        reactions: updatedReactions,
      })
    }

    try {
      if (reactedByMe) {
        await removeReaction(messageId, emoji)
      } else {
        await addReaction(messageId, emoji)
      }
    } catch (error) {
      console.error("Failed to update reaction", error)
      if (previousMessage) updateMessage(channelId, previousMessage)
    }
  }

  return {
    activeThread,
    activeThreadParentId,
    channelMembers,
    currentChannel,
    currentUser,
    filteredMentionMembers: composer.filteredMentionMembers,
    groupedMessages,
    handleInputChange: composer.handleInputChange,
    handleReactionClick,
    handleScroll,
    handleSend: composer.handleSend,
    handleSendThreadReply,
    inputFocused: composer.inputFocused,
    inputValue: composer.inputValue,
    insertMention: composer.insertMention,
    isConnected,
    loading: loading || isMessagesLoading,
    mentionDropdownVisible: composer.mentionDropdownVisible,
    mentionIndex: composer.mentionIndex,
    membersLoading,
    messagesContainerRef,
    messagesEndRef,
    otherTypingUsers,
    setActiveThread,
    setInputFocused: composer.setInputFocused,
    setInputValue: composer.setInputValue,
    setMentionDropdownVisible: composer.setMentionDropdownVisible,
    setMentionIndex: composer.setMentionIndex,
    setShowMembers,
    setThreadInputValue: composer.setThreadInputValue,
    showMembers,
    textareaRef: composer.textareaRef,
    threadInputValue: composer.threadInputValue,
    threadMessages,
    themeColor,
    toggleMembersPanel,
  }
}
