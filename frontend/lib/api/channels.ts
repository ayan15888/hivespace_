import { apiFetch } from "./client"
import type {
  ChannelResponse,
  CreateChannelRequest,
  OpenDmRequest,
} from "@/types/messaging"

export async function getWorkspaceChannels(workspaceId: string): Promise<ChannelResponse[]> {
  return apiFetch(`/api/workspaces/${workspaceId}/channels`)
}

export async function createChannel(data: CreateChannelRequest): Promise<ChannelResponse> {
  return apiFetch('/api/channels', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function openDm(workspaceId: string, targetUserId: string): Promise<ChannelResponse> {
  const req: OpenDmRequest = { workspaceId, targetUserId }
  return apiFetch('/api/channels/dm', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function markChannelRead(channelId: string): Promise<void> {
  await apiFetch(`/api/channels/${channelId}/read`, {
    method: 'POST',
  })
}
