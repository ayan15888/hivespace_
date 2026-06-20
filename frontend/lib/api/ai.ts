import { apiFetch } from "./client";
import type { MessageResponse } from "@/types/messaging";

export interface AiDraftResponse {
  isDraft: true;
  draftContent: string;
}

export type AiCommandResponse = MessageResponse | AiDraftResponse;

export async function sendAiCommand(
  channelId: string,
  input: string,
): Promise<AiCommandResponse> {
  return apiFetch(`/api/channels/${channelId}/ai-command`, {
    method: "POST",
    body: JSON.stringify({ input }),
  });
}
