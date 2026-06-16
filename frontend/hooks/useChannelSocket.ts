'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { getToken } from '@/lib/auth/token'
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
  
  const onMessageRef = useRef(onMessage)
  const onDeleteRef = useRef(onDelete)
  const onTypingRef = useRef(onTyping)
  const onThreadMessageRef = useRef(onThreadMessage)

  // Keep callback refs updated with latest component state
  useEffect(() => {
    onMessageRef.current = onMessage
    onDeleteRef.current = onDelete
    onTypingRef.current = onTyping
    onThreadMessageRef.current = onThreadMessage
  })

  useEffect(() => {
    const token = getToken()
    if (!token) return

    const client = new Client({
      webSocketFactory: () =>
        new SockJS(`${process.env.NEXT_PUBLIC_API_URL || ""}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      onConnect: () => {
        // Channel topic — new messages, edits, deletes, reactions
        client.subscribe(`/topic/channel.${channelId}`, (frame) => {
          const payload = JSON.parse(frame.body) as ChannelBroadcast

          if (isDeleteBroadcast(payload)) {
            onDeleteRef.current(payload.id)
          } else {
            onMessageRef.current(payload)
          }
        })

        // Typing indicator topic
        client.subscribe(`/topic/typing.${channelId}`, (frame) => {
          const event = JSON.parse(frame.body) as TypingUser
          onTypingRef.current(event)
        })

        // Thread topic — only if viewing a thread panel
        if (threadParentId && onThreadMessageRef.current) {
          client.subscribe(`/topic/thread.${threadParentId}`, (frame) => {
            const msg = JSON.parse(frame.body) as MessageResponse
            onThreadMessageRef.current?.(msg)
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
      const client = clientRef.current;
      if (client && client.connected) {
        try {
          client.publish({
            destination: `/app/channel/${channelId}/typing`,
            body: JSON.stringify({ typing }),
          });
        } catch (e) {
          console.error("Failed to publish typing status", e);
        }
      }
    },
    [channelId]
  )

  return { sendTyping }
}
