import { apiFetch } from "./client";

export interface AiConversationResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessageResponse {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface StartConversationResponse {
  conversationId: string;
  title: string;
  assistantResponse: string;
}

export async function listConversations(workspaceId: string): Promise<AiConversationResponse[]> {
  return apiFetch(`/api/ai/conversations?workspaceId=${workspaceId}`);
}

export async function getConversationMessages(conversationId: string): Promise<AiMessageResponse[]> {
  return apiFetch(`/api/ai/conversations/${conversationId}/messages`);
}

export async function startConversation(workspaceId: string, content: string): Promise<StartConversationResponse> {
  return apiFetch(`/api/ai/conversations`, {
    method: "POST",
    body: JSON.stringify({ workspaceId, content }),
  });
}

export async function sendConversationMessage(conversationId: string, content: string): Promise<{ assistantResponse: string }> {
  return apiFetch(`/api/ai/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function deleteConversation(conversationId: string): Promise<void> {
  return apiFetch(`/api/ai/conversations/${conversationId}`, {
    method: "DELETE",
  });
}
