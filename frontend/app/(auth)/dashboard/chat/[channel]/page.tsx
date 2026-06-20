"use client"

import { use } from "react"
import { ChatChannelPage } from "@/components/features/chat/chat-channel-page"

export default function ChatPage({
  params,
}: {
  params: Promise<{ channel: string }>
}) {
  const { channel } = use(params)
  return <ChatChannelPage channelId={channel} />
}
