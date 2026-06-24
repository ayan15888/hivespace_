import { apiFetch } from "./client"

export async function getSuggestedReplies(channelId: string): Promise<string[]> {
  return apiFetch(`/api/channels/${channelId}/suggested-replies`)
}
