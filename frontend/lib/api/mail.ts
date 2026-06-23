import { apiFetch } from "./client";

export interface MailResponse {
  id: string;
  unread: boolean;
  sender: string;
  email: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  initials: string;
  color: string;
}

export interface MailStatus {
  connected: boolean;
  email?: string;
}

export interface SendMailRequest {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
}

export async function getMailStatus(): Promise<MailStatus> {
  return apiFetch("/api/mail/status");
}

export async function getMailInbox(): Promise<MailResponse[]> {
  return apiFetch("/api/mail/inbox");
}

export async function sendMail(data: SendMailRequest): Promise<{ success: boolean }> {
  return apiFetch("/api/mail/send", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function disconnectMail(): Promise<{ success: boolean }> {
  return apiFetch("/api/mail/disconnect", {
    method: "POST",
  });
}

export async function getGoogleAuthUrl(token: string): Promise<{ url: string }> {
  return apiFetch(`/api/auth/google/url?token=${encodeURIComponent(token)}`);
}
