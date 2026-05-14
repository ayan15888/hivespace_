import { apiFetch } from "./client";

export interface TaskRequest {
  title: string;
  description?: string;
  status: string;
  priority: string;
  labels?: string;
  dueDate?: string;
  points?: number;
  assigneeId?: string;
}

export interface TaskResponse {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  labels: string;
  dueDate: string;
  points: number;
  projectId: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeInitials?: string;
}

export async function createTask(projectId: string, data: TaskRequest): Promise<TaskResponse> {
  return apiFetch(`/api/projects/${projectId}/tasks`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTasksByProject(projectId: string): Promise<TaskResponse[]> {
  return apiFetch(`/api/projects/${projectId}/tasks`);
}
