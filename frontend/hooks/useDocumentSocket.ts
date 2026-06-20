'use client'

import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { getToken } from '@/lib/auth/token'

interface UseDocumentSocketOptions {
  documentId: string
  onRagStatus: (status: 'SYNCING' | 'READY') => void
}

export function useDocumentSocket({ documentId, onRagStatus }: UseDocumentSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const onRagStatusRef = useRef(onRagStatus)

  useEffect(() => {
    onRagStatusRef.current = onRagStatus
  }, [onRagStatus])

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080';
        return new SockJS(`${baseUrl}/ws`);
      },
      connectHeaders: { Authorization: `Bearer ${getToken() ?? ''}` },
      beforeConnect: async () => {
        client.connectHeaders = { Authorization: `Bearer ${getToken() ?? ''}` }
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        console.log('[STOMP] Connected to document:', documentId)
        setIsConnected(true)

        client.subscribe(`/topic/documents.${documentId}`, (frame) => {
          try {
            const payload = JSON.parse(frame.body)
            if (payload && payload.status) {
              onRagStatusRef.current(payload.status)
            }
          } catch (e) {
            console.error('Failed to parse document status socket payload', e)
          }
        })
      },
      onDisconnect: () => {
        console.log('[STOMP] Disconnected from document:', documentId)
        setIsConnected(false)
      }
    })

    client.activate()

    return () => {
      client.deactivate()
    }
  }, [documentId])

  return { isConnected }
}
