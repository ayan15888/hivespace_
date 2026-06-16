'use client'

import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { openDm } from '@/lib/api/channels'

export default function DmPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()
  const { activeWorkspace } = useWorkspaceStore()

  useEffect(() => {
    if (!activeWorkspace?.id || !userId) return

    openDm(activeWorkspace.id, userId)
      .then((channel) => {
        router.replace(`/dashboard/chat/${channel.id}`)
      })
      .catch((err) => {
        console.error('Failed to open DM channel', err)
      })
  }, [activeWorkspace?.id, userId, router])

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Opening Direct Message...</span>
      </div>
    </div>
  )
}
