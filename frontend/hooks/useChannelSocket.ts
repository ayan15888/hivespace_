'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
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
  threadParentId?: string
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
  const [isConnected, setIsConnected] = useState(false)
  
  const onMessageRef = useRef(onMessage)
  const onDeleteRef = useRef(onDelete)
  const onTypingRef = useRef(onTyping)
  const onThreadMessageRef = useRef(onThreadMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
    onDeleteRef.current = onDelete
    onTypingRef.current = onTyping
    onThreadMessageRef.current = onThreadMessage
  }, [onMessage, onDelete, onTyping, onThreadMessage])

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${process.env.NEXT_PUBLIC_API_URL || ''}/ws`),
      connectHeaders: { Authorization: `Bearer ${getToken() ?? ''}` },
      beforeConnect: async () => {
        // Refresh token before every connect/reconnect attempt
        client.connectHeaders = { Authorization: `Bearer ${getToken() ?? ''}` }
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        console.log('[STOMP] Connected to channel:', channelId)
        setIsConnected(true)

        client.subscribe(`/topic/channel.${channelId}`, (frame) => {
          const payload = JSON.parse(frame.body) as ChannelBroadcast
          if (isDeleteBroadcast(payload)) {
            onDeleteRef.current(payload.id)
          } else {
            onMessageRef.current(payload)
          }
        })

        client.subscribe(`/topic/typing.${channelId}`, (frame) => {
          onTypingRef.current(JSON.parse(frame.body) as TypingUser)
        })

        if (threadParentId) {
          client.subscribe(`/topic/thread.${threadParentId}`, (frame) => {
            onThreadMessageRef.current?.(JSON.parse(frame.body) as MessageResponse)
          })
        }
      },
      onDisconnect: () => {
        console.log('[STOMP] Disconnected from channel:', channelId)
        setIsConnected(false)
      },
      onStompError: (frame) => {
        console.error('[STOMP] Error:', frame.headers['message'])
      },
      onWebSocketError: (event) => {
        console.error('[STOMP] WebSocket error:', event)
      }
    })

    client.activate()
    clientRef.current = client

    return () => {
      client.deactivate()
    }
  }, [channelId, threadParentId])

  const sendTyping = useCallback((typing: boolean) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: `/app/channel/${channelId}/typing`,
        body: JSON.stringify({ typing }),
      })
    }
  }, [channelId])

  return { sendTyping, isConnected }
}
