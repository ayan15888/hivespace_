import { create } from 'zustand'
import type { ChannelResponse, MessageResponse, TypingUser } from '@/types/messaging'

interface ChatState {
  // ── Channels ────────────────────────────────────────────────────────────────
  channels: Record<string, ChannelResponse[]>   // keyed by workspaceId
  activeChannelId: string | null

  // ── Messages ────────────────────────────────────────────────────────────────
  messages: Record<string, MessageResponse[]>   // keyed by channelId, newest-first (DESC)
  hasMoreMessages: Record<string, boolean>       // true if more pages exist above

  // ── Threads ─────────────────────────────────────────────────────────────────
  activeThreadParentId: string | null
  threadMessages: Record<string, MessageResponse[]>  // keyed by parentMessageId, ASC

  // ── Typing indicators ────────────────────────────────────────────────────────
  typingUsers: Record<string, TypingUser[]>     // keyed by channelId

  // ── Actions: channels ────────────────────────────────────────────────────────
  setChannels: (workspaceId: string, channels: ChannelResponse[]) => void
  upsertChannel: (channel: ChannelResponse) => void
  setActiveChannel: (channelId: string | null) => void
  decrementUnread: (channelId: string) => void
  clearUnread: (channelId: string) => void

  // ── Actions: messages ─────────────────────────────────────────────────────────
  setMessages: (channelId: string, messages: MessageResponse[], hasMore: boolean) => void
  prependOlderMessages: (channelId: string, messages: MessageResponse[], hasMore: boolean) => void
  appendMessage: (channelId: string, message: MessageResponse) => void
  updateMessage: (channelId: string, updated: MessageResponse) => void
  removeMessage: (channelId: string, messageId: string) => void

  // ── Actions: threads ──────────────────────────────────────────────────────────
  setActiveThread: (parentId: string | null) => void
  setThreadMessages: (parentId: string, messages: MessageResponse[]) => void
  appendThreadMessage: (parentId: string, message: MessageResponse) => void
  updateThreadMessage: (parentId: string, updated: MessageResponse) => void

  // ── Actions: typing ───────────────────────────────────────────────────────────
  setTyping: (channelId: string, userId: string, displayName: string, typing: boolean) => void
}

export const useChatStore = create<ChatState>((set) => ({
  // ── Initial state ─────────────────────────────────────────────────────────────
  channels: {},
  activeChannelId: null,
  messages: {},
  hasMoreMessages: {},
  activeThreadParentId: null,
  threadMessages: {},
  typingUsers: {},

  // ── Channel actions ───────────────────────────────────────────────────────────

  setChannels: (workspaceId, channels) =>
    set((s) => ({
      channels: { ...s.channels, [workspaceId]: channels },
    })),

  upsertChannel: (channel) =>
    set((s) => {
      const existing = s.channels[channel.workspaceId] ?? []
      const idx = existing.findIndex((c) => c.id === channel.id)
      const updated =
        idx >= 0
          ? existing.map((c, i) => (i === idx ? channel : c))
          : [...existing, channel]
      return { channels: { ...s.channels, [channel.workspaceId]: updated } }
    }),

  setActiveChannel: (channelId) => set({ activeChannelId: channelId }),

  decrementUnread: (channelId) =>
    set((s) => {
      const entry = Object.entries(s.channels).find(([, chs]) =>
        chs.some((c) => c.id === channelId)
      )
      if (!entry) return s
      const [wsId, chs] = entry
      return {
        channels: {
          ...s.channels,
          [wsId]: chs.map((c) =>
            c.id === channelId
              ? { ...c, unreadCount: Math.max(0, c.unreadCount - 1) }
              : c
          ),
        },
      }
    }),

  clearUnread: (channelId) =>
    set((s) => {
      const entry = Object.entries(s.channels).find(([, chs]) =>
        chs.some((c) => c.id === channelId)
      )
      if (!entry) return s
      const [wsId, chs] = entry
      return {
        channels: {
          ...s.channels,
          [wsId]: chs.map((c) =>
            c.id === channelId ? { ...c, unreadCount: 0 } : c
          ),
        },
      }
    }),

  // ── Message actions ────────────────────────────────────────────────────────────

  setMessages: (channelId, messages, hasMore) =>
    set((s) => ({
      messages: { ...s.messages, [channelId]: messages },
      hasMoreMessages: { ...s.hasMoreMessages, [channelId]: hasMore },
    })),

  prependOlderMessages: (channelId, older, hasMore) =>
    set((s) => ({
      messages: {
        ...s.messages,
        // existing array is DESC (newest first); older messages go at the end
        [channelId]: [...(s.messages[channelId] ?? []), ...older],
      },
      hasMoreMessages: { ...s.hasMoreMessages, [channelId]: hasMore },
    })),

  appendMessage: (channelId, message) =>
    set((s) => {
      const current = s.messages[channelId] ?? [];
      // Deduplicate: if message already exists, update it instead of duplicating
      const exists = current.some(m => m.id === message.id);
      if (exists) {
        return {
          messages: {
            ...s.messages,
            [channelId]: current.map(m => m.id === message.id ? message : m),
          },
        };
      }
      return {
        messages: {
          ...s.messages,
          [channelId]: [message, ...current],
        },
      };
    }),

  updateMessage: (channelId, updated) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [channelId]: (s.messages[channelId] ?? []).map((m) =>
          m.id === updated.id ? updated : m
        ),
      },
    })),

  removeMessage: (channelId, messageId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [channelId]: (s.messages[channelId] ?? []).map((m) =>
          m.id === messageId
            ? { ...m, isDeleted: true, content: 'Message deleted' }
            : m
        ),
      },
    })),

  // ── Thread actions ─────────────────────────────────────────────────────────────

  setActiveThread: (parentId) => set({ activeThreadParentId: parentId }),

  setThreadMessages: (parentId, messages) =>
    set((s) => ({
      threadMessages: { ...s.threadMessages, [parentId]: messages },
    })),

  appendThreadMessage: (parentId, message) =>
    set((s) => {
      const current = s.threadMessages[parentId] ?? [];
      const exists = current.some(m => m.id === message.id);
      if (exists) {
        return {
          threadMessages: {
            ...s.threadMessages,
            [parentId]: current.map(m => m.id === message.id ? message : m),
          },
        };
      }
      return {
        threadMessages: {
          ...s.threadMessages,
          [parentId]: [...current, message],
        },
      };
    }),

  updateThreadMessage: (parentId, updated) =>
    set((s) => ({
      threadMessages: {
        ...s.threadMessages,
        [parentId]: (s.threadMessages[parentId] ?? []).map((m) =>
          m.id === updated.id ? updated : m
        ),
      },
    })),

  // ── Actions: typing ─────────────────────────────────────────────────────────────

  setTyping: (channelId, userId, displayName, typing) =>
    set((s) => {
      const current = s.typingUsers[channelId] ?? []
      const filtered = current.filter((u) => u.userId !== userId)
      return {
        typingUsers: {
          ...s.typingUsers,
          [channelId]: typing
            ? [...filtered, { userId, displayName, typing }]
            : filtered,
        },
      }
    }),
}))
