import { apiFetch } from "./client";
import { ProjectResponse } from "./projects";
import { TaskResponse } from "./tasks";

export interface ShareableLinkResponse {
  id: string;
  token: string;
  url: string;
  projectId: string;
  scopeType: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface SharedProjectResponse {
  project: ProjectResponse;
  tasks: TaskResponse[];
}

/**
 * Generates (or retrieves if already exists) a shareable link for a project.
 */
export async function generateShareLink(projectId: string): Promise<ShareableLinkResponse> {
  return apiFetch(`/api/projects/${projectId}/share`, {
    method: "POST",
  });
}

/**
 * Fetches public project data using the share link token.
 */
export async function getPublicProjectData(token: string): Promise<SharedProjectResponse> {
  return apiFetch(`/api/share/${token}`);
}

/**
 * Revokes a shareable link.
 */
export async function revokeShareLink(linkId: string): Promise<void> {
  return apiFetch(`/api/share/${linkId}/revoke`, {
    method: "PATCH",
  });
}
