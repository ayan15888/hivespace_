import { apiFetch } from "./client";

export interface SprintRequest {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

export interface SprintResponse {
  id: string;
  name: string;
  goal: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
  projectId: string;
  startDate: string | null;
  endDate: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BurndownPoint {
  date: string;
  totalPoints: number;
  remainingPoints: number;
}

export async function createSprint(projectId: string, data: SprintRequest): Promise<SprintResponse> {
  return apiFetch(`/api/projects/${projectId}/sprints`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getSprintsForProject(projectId: string): Promise<SprintResponse[]> {
  return apiFetch(`/api/projects/${projectId}/sprints`);
}

export async function startSprint(sprintId: string): Promise<SprintResponse> {
  return apiFetch(`/api/sprints/${sprintId}/start`, {
    method: "PATCH",
  });
}

export async function completeSprint(sprintId: string, targetSprintId?: string): Promise<SprintResponse> {
  const url = targetSprintId 
    ? `/api/sprints/${sprintId}/complete?targetSprintId=${targetSprintId}`
    : `/api/sprints/${sprintId}/complete`;
  return apiFetch(url, {
    method: "PATCH",
  });
}

export async function associateTaskWithSprint(taskId: string, sprintId: string | null): Promise<void> {
  const url = sprintId 
    ? `/api/tasks/${taskId}/sprint?sprintId=${sprintId}`
    : `/api/tasks/${taskId}/sprint`;
  await apiFetch(url, {
    method: "PATCH",
  });
}

export async function getBurndownData(sprintId: string): Promise<BurndownPoint[]> {
  return apiFetch(`/api/sprints/${sprintId}/burndown`);
}
