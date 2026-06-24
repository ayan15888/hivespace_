import { apiFetch } from "./client";

export interface NotificationResponse {
  id: string;
  userId: string;
  actor: {
    id: string;
    fullName: string;
    avatarUrl: string;
    avatarColor: string;
  };
  type: string;
  content: string;
  messageId: string;
  channelId: string;
  isRead: boolean;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export async function getNotifications(page = 0, size = 20): Promise<Page<NotificationResponse>> {
  return apiFetch<Page<NotificationResponse>>(`/api/notifications?page=${page}&size=${size}`);
}

export async function getUnreadNotificationCount(): Promise<number> {
  return apiFetch<number>("/api/notifications/unread-count");
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await apiFetch(`/api/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await apiFetch("/api/notifications/read-all", {
    method: "PATCH",
  });
}
