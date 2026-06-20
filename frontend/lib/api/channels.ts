import { apiFetch } from "./client"
import type {
  ChannelResponse,
  CreateChannelRequest,
  OpenDmRequest,
} from "@/types/messaging"

export interface ChannelMemberInfo {
  userId: string
  username: string
  fullName: string | null
  avatarUrl: string | null
  avatarColor: string | null
  joinedAt: string
}

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

export async function getChannelMembers(channelId: string): Promise<ChannelMemberInfo[]> {
  return apiFetch(`/api/channels/${channelId}/members`)
}

export async function ensureProjectChannel(projectId: string): Promise<ChannelResponse> {
  return apiFetch(`/api/projects/${projectId}/ensure-channel`, {
    method: 'POST',
  })
}
