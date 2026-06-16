# Hivespace — Step 4: Frontend API Client, STOMP Hook & Zustand Store

## Context

You are working on **Hivespace**, a combined Jira + Slack + Notion platform.  
Stack: **Next.js (App Router)**, **Tailwind CSS**, **ShadCN UI**, **Zustand**, **@stomp/stompjs + sockjs-client**.

**Steps 1–3 are complete:**
- All JPA entities exist, `ddl-auto=validate` passes
- All REST endpoints are live and tested
- STOMP WebSocket is running — `/ws` endpoint accepts authenticated connections and broadcasts on `/topic/channel.{id}`, `/topic/thread.{id}`, `/topic/typing.{id}`

This step builds the frontend data layer only — **no UI changes yet**. Step 5 wires everything into the actual chat page.

By the end of this step: typed API functions, a working STOMP hook, and a Zustand store are all in place and individually testable.

---

## Packages Check

Before writing any code, check `package.json`. Add only what is missing:

```bash
npm install @stomp/stompjs sockjs-client
npm install -D @types/sockjs-client
```

Confirm both packages are importable before continuing.

---

## Existing Patterns to Follow

Look at the existing codebase before writing anything new:

- How API base URL is set — likely `process.env.NEXT_PUBLIC_API_URL` with an `apiClient` or `axios` instance. Use the same pattern.
- How JWT token is retrieved — likely from a `useAuthStore` or cookie util. Use the same `getToken()` function.
- How existing Zustand stores are structured — match the file/export pattern exactly.
- How existing TypeScript types are organised — match the directory (`types/`, `lib/types/`, etc.).

**Do not introduce a new HTTP client, token retrieval pattern, or store structure. Conform to what already exists.**

---

## Types to Create

Location: match existing types directory (e.g. `types/messaging.ts` or `lib/types/messaging.ts`)

```typescript
// ─── Enums ────────────────────────────────────────────────────────────────────

export type ChannelType = 'PUBLIC' | 'PRIVATE' | 'DM' | 'THREAD'
export type MessageType = 'TEXT' | 'FILE' | 'SYSTEM' | 'AI'

// ─── Core shapes ──────────────────────────────────────────────────────────────

export interface UserSummary {
  id: string
  fullName: string | null
  avatarUrl: string | null
  avatarColor: string | null
}

export interface ReactionSummary {
  emoji: string
  count: number
  reactedByMe: boolean
}

export interface MessageResponse {
  id: string
  content: string
  type: MessageType
  channelId: string
  sender: UserSummary | null       // null if user was deleted
  parentId: string | null
  isEdited: boolean
  isDeleted: boolean
  createdAt: string                // ISO 8601
  editedAt: string | null
  reactions: ReactionSummary[]
  replyCount: number
}

export interface ChannelResponse {
  id: string
  name: string | null              // null for DM channels
  type: ChannelType
  workspaceId: string
  projectId: string | null
  teamId: string | null
  unreadCount: number
}

// ─── Request shapes ───────────────────────────────────────────────────────────

export interface CreateChannelRequest {
  name: string
  type: ChannelType
  workspaceId: string
  projectId?: string
  teamId?: string
}

export interface OpenDmRequest {
  workspaceId: string
  targetUserId: string
}

export interface SendMessageRequest {
  content: string
  type?: MessageType               // defaults to TEXT
  parentId?: string
}

export interface EditMessageRequest {
  content: string
}

// ─── WebSocket payloads ───────────────────────────────────────────────────────

export interface TypingUser {
  userId: string
  displayName: string
  typing: boolean
}

export interface DeleteBroadcast {
  id: string
  isDeleted: true
}

// Union type for incoming channel messages — either a full message or a deletion
export type ChannelBroadcast = MessageResponse | DeleteBroadcast

export function isDeleteBroadcast(payload: ChannelBroadcast): payload is DeleteBroadcast {
  return (payload as DeleteBroadcast).isDeleted === true
}
```

---

## File 1: `lib/api/channels.ts`

```typescript
import { apiClient } from '@/lib/api/client'  // use existing client — adjust import path
import type {
  ChannelResponse,
  CreateChannelRequest,
  OpenDmRequest,
} from '@/types/messaging'

export async function getWorkspaceChannels(workspaceId: string): Promise<ChannelResponse[]> {
  const res = await apiClient.get(`/workspaces/${workspaceId}/channels`)
  return res.data
}

export async function createChannel(data: CreateChannelRequest): Promise<ChannelResponse> {
  const res = await apiClient.post('/channels', data)
  return res.data
}

export async function openDm(workspaceId: string, targetUserId: string): Promise<ChannelResponse> {
  const req: OpenDmRequest = { workspaceId, targetUserId }
  const res = await apiClient.post('/channels/dm', req)
  return res.data
}

export async function markChannelRead(channelId: string): Promise<void> {
  await apiClient.post(`/channels/${channelId}/read`)
}
```

---

## File 2: `lib/api/messages.ts`

```typescript
import { apiClient } from '@/lib/api/client'  // adjust path
import type {
  MessageResponse,
  SendMessageRequest,
  EditMessageRequest,
} from '@/types/messaging'

export async function getMessages(
  channelId: string,
  before?: string         // message ID cursor — undefined means load latest
): Promise<MessageResponse[]> {
  const params = before ? { before } : {}
  const res = await apiClient.get(`/channels/${channelId}/messages`, { params })
  return res.data
}

export async function sendMessage(
  channelId: string,
  data: SendMessageRequest
): Promise<MessageResponse> {
  const res = await apiClient.post(`/channels/${channelId}/messages`, data)
  return res.data
}

export async function editMessage(
  channelId: string,
  messageId: string,
  data: EditMessageRequest
): Promise<MessageResponse> {
  const res = await apiClient.patch(`/channels/${channelId}/messages/${messageId}`, data)
  return res.data
}

export async function deleteMessage(
  channelId: string,
  messageId: string
): Promise<void> {
  await apiClient.delete(`/channels/${channelId}/messages/${messageId}`)
}

export async function getThreadMessages(
  channelId: string,
  parentId: string
): Promise<MessageResponse[]> {
  const res = await apiClient.get(`/channels/${channelId}/messages/${parentId}/thread`)
  return res.data
}

export async function addReaction(messageId: string, emoji: string): Promise<void> {
  await apiClient.post(`/messages/${messageId}/reactions`, { emoji })
}

export async function removeReaction(messageId: string, emoji: string): Promise<void> {
  await apiClient.delete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`)
}
```

---

## File 3: `hooks/useChannelSocket.ts`

```typescript
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { getToken } from '@/lib/auth/token'   // use existing token util — adjust path
import type { ChannelBroadcast, MessageResponse, TypingUser } from '@/types/messaging'
import { isDeleteBroadcast } from '@/types/messaging'

interface UseChannelSocketOptions {
  channelId: string
  onMessage: (msg: MessageResponse) => void
  onDelete: (messageId: string) => void
  onTyping: (event: TypingUser) => void
  threadParentId?: string                      // if set, also subscribe to thread topic
  onThreadMessage?: (msg: MessageResponse) => void
}

export function useChannelSocket({
  channelId,
  onMessage,
  onDelete,
  onTyping,
  threadParentId,
  onThreadMessage,
}: UseChannelSocketOptions) {
  const clientRef = useRef<Client | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return

    const client = new Client({
      webSocketFactory: () =>
        new SockJS(`${process.env.NEXT_PUBLIC_API_URL}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      onConnect: () => {
        // Channel topic — new messages, edits, deletes, reactions
        client.subscribe(`/topic/channel.${channelId}`, (frame) => {
          const payload = JSON.parse(frame.body) as ChannelBroadcast

          if (isDeleteBroadcast(payload)) {
            onDelete(payload.id)
          } else {
            onMessage(payload)
          }
        })

        // Typing indicator topic
        client.subscribe(`/topic/typing.${channelId}`, (frame) => {
          const event = JSON.parse(frame.body) as TypingUser
          onTyping(event)
        })

        // Thread topic — only if viewing a thread panel
        if (threadParentId && onThreadMessage) {
          client.subscribe(`/topic/thread.${threadParentId}`, (frame) => {
            const msg = JSON.parse(frame.body) as MessageResponse
            onThreadMessage(msg)
          })
        }
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame.headers['message'])
      },
      onDisconnect: () => {
        console.debug('STOMP disconnected from channel', channelId)
      },
    })

    client.activate()
    clientRef.current = client

    return () => {
      client.deactivate()
      clientRef.current = null
    }
  }, [channelId, threadParentId])   // reconnect if channel changes

  // Send typing event to server — call on keypress, debounce the false
  const sendTyping = useCallback(
    (typing: boolean) => {
      clientRef.current?.publish({
        destination: `/app/channel/${channelId}/typing`,
        body: JSON.stringify({ typing }),
      })
    },
    [channelId]
  )

  return { sendTyping }
}
```

**Notes:**
- `onMessage`, `onDelete`, `onTyping` are intentionally separate callbacks — the store handles them differently and splitting them avoids conditional logic inside the hook.
- `reconnectDelay: 5000` — SockJS will auto-reconnect after 5s if the connection drops.
- The hook unmounts cleanly via `client.deactivate()` in the cleanup function — no zombie subscriptions.

---

## File 4: `store/chatStore.ts`

```typescript
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
    set((s) => ({
      messages: {
        ...s.messages,
        // prepend to DESC array so newest stays at index 0
        [channelId]: [message, ...(s.messages[channelId] ?? [])],
      },
    })),

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
    set((s) => ({
      threadMessages: {
        ...s.threadMessages,
        [parentId]: [...(s.threadMessages[parentId] ?? []), message],
      },
    })),

  // ── Typing actions ─────────────────────────────────────────────────────────────

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
```

**Key design notes:**
- Messages are stored **DESC** (newest-first) because that's what the API returns. The chat page reverses the array for display. This keeps `appendMessage` cheap — it just prepends to index 0.
- `removeMessage` does a soft-delete in the store — it sets `isDeleted: true` instead of splicing the row out. This keeps thread reply counts intact.
- `prependOlderMessages` appends to the end of the DESC array — "older" means further back in time, which is the tail of a newest-first list.
- `typingUsers` removes the user entry when `typing: false` — no stale typing indicators in state.

---

## What NOT to Do

- Do NOT fetch data inside the store actions — stores are pure state, all fetching happens in components or hooks.
- Do NOT call `markChannelRead` inside the store — that's a side effect, belongs in the component.
- Do NOT store the full `ChannelResponse` members list in the store at this stage — that's a future concern.
- Do NOT use `localStorage` or `sessionStorage` — all state is in-memory per session.
- Do NOT introduce a new axios instance or HTTP client — reuse the existing `apiClient`.
- Do NOT make `useChannelSocket` fetch messages — the hook is transport only; data fetching is the component's job.
- Do NOT add `useEffect` data-fetching inside the store — Zustand stores are synchronous state machines.

---

## Done When

- [ ] `types/messaging.ts` (or equivalent) created with all types and `isDeleteBroadcast` type guard
- [ ] `lib/api/channels.ts` created with 4 typed functions
- [ ] `lib/api/messages.ts` created with 8 typed functions
- [ ] `hooks/useChannelSocket.ts` created — hook connects, subscribes to channel + typing topics, returns `sendTyping`
- [ ] `store/chatStore.ts` created with all state slices and actions
- [ ] No TypeScript errors (`npx tsc --noEmit` passes cleanly)
- [ ] Manual smoke test for the hook — create a throwaway test component that:
  - Calls `useChannelSocket` with a real channelId
  - Logs incoming messages to the console
  - Confirms the STOMP connection is established (check browser Network tab for the WebSocket upgrade)
  - Sends a message via the REST API and confirms the log fires without a page refresh
- [ ] Remove the throwaway test component before marking this step done