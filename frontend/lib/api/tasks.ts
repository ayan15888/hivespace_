import { apiFetch } from "./client";

export interface TaskRequest {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  labels?: string;
  dueDate?: string;
  points?: number;
  assigneeId?: string;
  teamId?: string;
  parentId?: string;
  sprintId?: string;
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
  teamId?: string;
  createdByName?: string;
  parentId?: string;
  taskIdentifier?: string;
  subtaskCount?: number;
  assignees?: TaskAssigneeResponse[];
  subtasks?: TaskResponse[];
  sprintId?: string;
  sprintName?: string;
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

export type TaskUpdatePayload = Partial<
  Pick<
    TaskRequest,
    | "title"
    | "description"
    | "status"
    | "priority"
    | "labels"
    | "dueDate"
    | "points"
    | "assigneeId"
    | "teamId"
  >
>;

export async function updateTask(
  taskId: string,
  data: TaskUpdatePayload
): Promise<TaskResponse> {
  return apiFetch(`/api/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTask(taskId: string): Promise<void> {
  return apiFetch(`/api/tasks/${taskId}`, {
    method: "DELETE",
  });
}

// ── Task Activity Log ─────────────────────────────────────────────────────────

export interface TaskActivityResponse {
  id: string;
  taskId: string;
  userId: string | null;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  type: string; // CREATED | STATUS_CHANGED | PRIORITY_CHANGED | TITLE_CHANGED | DESCRIPTION_CHANGED | LABELS_CHANGED | POINTS_CHANGED | DUE_DATE_CHANGED | OWNER_CHANGED | ASSIGNEE_ADDED | ASSIGNEE_REMOVED
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export async function getTaskActivities(taskId: string): Promise<TaskActivityResponse[]> {
  return apiFetch(`/api/tasks/${taskId}/activities`);
}

// ── AI Triage Agent ──────────────────────────────────────────────────────────

export interface TriageSuggestion {
  taskId: string;
  taskIdentifier: string;
  title: string;
  currentPriority: string;
  suggestedPriority: string;
  currentStatus: string;
  suggestedStatus: string;
  reason: string;
}

export async function getTriageSuggestions(projectId: string): Promise<TriageSuggestion[]> {
  return apiFetch(`/api/projects/${projectId}/ai/triage`);
}

export async function applyTriageSuggestions(
  projectId: string,
  suggestions: TriageSuggestion[]
): Promise<void> {
  await apiFetch(`/api/projects/${projectId}/ai/triage/apply`, {
    method: "POST",
    body: JSON.stringify(suggestions),
  });
}

// ── AI Retro Agent ───────────────────────────────────────────────────────────

export async function generateSprintRetro(
  projectId: string,
  startDate?: string,
  endDate?: string,
  sprintId?: string
): Promise<{ documentId: string }> {
  return apiFetch(`/api/projects/${projectId}/ai/retro`, {
    method: "POST",
    body: JSON.stringify({ startDate, endDate, sprintId }),
  });
}

// ── AI Task Generator ────────────────────────────────────────────────────────

export interface GeneratedTaskSuggestion {
  title: string;
  description: string;
  priority: string;
  points: number;
}

export async function generateTasksFromBrief(
  projectId: string,
  brief: string
): Promise<GeneratedTaskSuggestion[]> {
  return apiFetch(`/api/projects/${projectId}/ai/generate-tasks`, {
    method: "POST",
    body: JSON.stringify({ brief }),
  });
}

// ── AI Stale Task Nudger ─────────────────────────────────────────────────────

export interface StaleTask {
  taskId: string;
  taskIdentifier: string;
  title: string;
  assigneeId: string;
  assigneeName: string;
  daysStale: number;
  activeInChat: boolean;
  nudgeMessage: string;
}

export async function getStaleTasks(projectId: string): Promise<StaleTask[]> {
  return apiFetch(`/api/projects/${projectId}/ai/stale-tasks`);
}

export async function nudgeStaleTask(taskId: string): Promise<void> {
  await apiFetch(`/api/tasks/${taskId}/ai/nudge`, {
    method: "POST",
  });
}


export interface DuplicateCheckResult {
  id: string;
  title: string;
  status: string;
  assigneeName: string | null;
  distance: number;
}

export async function detectDuplicates(
  projectId: string,
  title: string,
  description: string
): Promise<DuplicateCheckResult[]> {
  return apiFetch(`/api/projects/${projectId}/tasks/detect-duplicates`, {
    method: "POST",
    body: JSON.stringify({ title, description }),
  });
}





