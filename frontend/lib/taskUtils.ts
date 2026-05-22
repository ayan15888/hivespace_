import type { TaskRequest, TaskResponse } from "@/lib/api/tasks";

export function columnNameToStatus(columnName: string): string {
  const normalized = columnName.trim().toLowerCase().replace(/\s+/g, "_");
  if (normalized === "backlog") return "BACKLOG";
  if (normalized === "todo") return "TODO";
  if (normalized === "in_progress") return "IN_PROGRESS";
  if (normalized === "review" || normalized === "in_review") return "IN_REVIEW";
  if (normalized === "done") return "DONE";
  return columnName.toUpperCase().replace(/\s+/g, "_");
}

export function statusMatchesColumn(taskStatus: string, columnName: string): boolean {
  const taskNorm = String(taskStatus).toLowerCase().replace(/\s+/g, "_");
  const colNorm = columnName.trim().toLowerCase().replace(/\s+/g, "_");
  if (colNorm === "review" && (taskNorm === "in_review" || taskNorm === "review")) {
    return true;
  }
  return taskNorm === colNorm;
}

export function priorityToBackend(priority: string): string {
  const p = priority.trim().toLowerCase();
  if (p === "normal") return "MEDIUM";
  return p.toUpperCase();
}

export function formatTaskDueLabel(dueDate?: string | null): string {
  if (!dueDate) return "Later";
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return "Later";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(d);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return "Overdue";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Merge patch into a full payload so PUT passes backend @NotBlank on title. */
export function toTaskUpdatePayload(
  task: TaskResponse,
  patch: Partial<TaskRequest>
): TaskRequest {
  return {
    title: patch.title ?? task.title,
    description: patch.description ?? task.description ?? "",
    status: patch.status ?? String(task.status),
    priority: patch.priority ?? String(task.priority),
    labels: patch.labels ?? task.labels ?? "",
    dueDate: patch.dueDate !== undefined ? patch.dueDate : task.dueDate,
    points: patch.points !== undefined ? patch.points : task.points,
    assigneeId: patch.assigneeId ?? task.assigneeId,
    teamId: patch.teamId,
    parentId: patch.parentId ?? undefined,
  };
}

export function isTaskAssignedToUser(task: TaskResponse, userId: string): boolean {
  if (task.assigneeId === userId) return true;
  return (task.assignees ?? []).some((a) => a.userId === userId);
}
