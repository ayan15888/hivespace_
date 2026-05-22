import { apiFetch } from "./client";

export interface CreateOrgRequest {
  name: string;
  slug: string;
  description?: string;
  plan?: string;
}

export interface OrgResponse {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  plan: string;
  active: boolean;
  membersCount: number;
  workspacesCount: number;
}

export interface MemberResponse {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  jobTitle: string;
  role: string;
}

export async function createOrganization(data: CreateOrgRequest): Promise<OrgResponse> {
  return apiFetch("/api/tenants", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      plan: data.plan || "FREE"
    }),
  });
}

export async function getMyOrganizations(): Promise<OrgResponse[]> {
  // Note: The backend uses /api/tenants/u/{userId}
  // We'll need the user ID from the auth state
  // But for now, we'll assume a helper endpoint or handle it in the hook
  return apiFetch("/api/tenants/me"); 
}

export async function joinOrganization(inviteCode: string): Promise<void> {
  return apiFetch(`/api/invitations/accept/${inviteCode}`, {
    method: "POST",
  });
}

export async function getOrganizationMembers(orgId: string): Promise<MemberResponse[]> {
  return apiFetch(`/api/tenants/${orgId}/members`);
}

export async function updateOrganizationMemberRole(
  orgId: string,
  userId: string,
  role: string
): Promise<MemberResponse> {
  return apiFetch(`/api/tenants/${orgId}/members/${userId}/role?role=${encodeURIComponent(role)}`, {
    method: "PUT",
  });
}

export async function removeOrganizationMember(orgId: string, userId: string): Promise<void> {
  return apiFetch(`/api/tenants/${orgId}/members/${userId}`, {
    method: "DELETE",
  });
}
