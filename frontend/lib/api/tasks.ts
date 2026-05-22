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
  projectName: string;
  projectColor?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeInitials?: string;
  createdAt: string;
  updatedAt: string;
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

export async function getAllTasks(): Promise<TaskResponse[]> {
  return apiFetch("/api/tasks");
}

export interface TaskAssigneeResponse {
  id: string;
  taskId: string;
  userId: string;
  fullName: string;
  username: string;
  avatarUrl?: string;
  role: string;
  assignedAt: string;
}

export async function getTaskAssignees(taskId: string): Promise<TaskAssigneeResponse[]> {
  return apiFetch(`/api/tasks/${taskId}/assignees`);
}

export async function addTaskAssignee(taskId: string, userId: string, role: string): Promise<TaskAssigneeResponse> {
  return apiFetch(`/api/tasks/${taskId}/assignees`, {
    method: "POST",
    body: JSON.stringify({ userId, role }),
  });
}

export async function changeTaskOwner(taskId: string, userId: string): Promise<TaskAssigneeResponse> {
  return apiFetch(`/api/tasks/${taskId}/assignees/owner`, {
    method: "PATCH",
    body: JSON.stringify({ userId }),
  });
}

export async function removeTaskAssignee(taskId: string, userId: string): Promise<void> {
  return apiFetch(`/api/tasks/${taskId}/assignees/${userId}`, {
    method: "DELETE",
  });
}

export async function updateTaskStatus(taskId: string, status: string): Promise<TaskResponse> {
  return apiFetch(`/api/tasks/${taskId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
