import { apiFetch } from "./client"
import type {
  MessageResponse,
  SendMessageRequest,
  EditMessageRequest,
} from "@/types/messaging"

export async function getMessages(
  channelId: string,
  before?: string         // message ID cursor — undefined means load latest
): Promise<MessageResponse[]> {
  const query = before ? `?before=${before}` : ""
  return apiFetch(`/api/channels/${channelId}/messages${query}`)
}

export async function sendMessage(
  channelId: string,
  data: SendMessageRequest
): Promise<MessageResponse> {
  return apiFetch(`/api/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function editMessage(
  channelId: string,
  messageId: string,
  data: EditMessageRequest
): Promise<MessageResponse> {
  return apiFetch(`/api/channels/${channelId}/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteMessage(
  channelId: string,
  messageId: string
): Promise<void> {
  await apiFetch(`/api/channels/${channelId}/messages/${messageId}`, {
    method: 'DELETE',
  })
}

export async function getThreadMessages(
  channelId: string,
  parentId: string
): Promise<MessageResponse[]> {
  return apiFetch(`/api/channels/${channelId}/messages/${parentId}/thread`)
}

export async function addReaction(messageId: string, emoji: string): Promise<void> {
  await apiFetch(`/api/messages/${messageId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  })
}

export async function removeReaction(messageId: string, emoji: string): Promise<void> {
  await apiFetch(`/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
    method: 'DELETE',
  })
}
