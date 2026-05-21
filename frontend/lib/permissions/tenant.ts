import type { MemberResponse, OrgResponse } from "@/lib/api/orgs"
import { TENANT_ROLES, type TenantRole } from "@/types/roles"

/** Normalize API/DB role strings to tenant_members.role values from HIveSpaceSchema.sql */
export function normalizeTenantRole(value: string): TenantRole {
  const role = value?.toUpperCase?.() ?? ""
  return (TENANT_ROLES as readonly string[]).includes(role) ? (role as TenantRole) : "MEMBER"
}

export function getCurrentOrgMembership(
  members: MemberResponse[],
  userEmail?: string | null,
) {
  if (!userEmail) return undefined
  return members.find((m) => m.email.toLowerCase() === userEmail.toLowerCase())
}

export function isOrgOwner(userEmail: string | undefined, org: OrgResponse | null) {
  return !!userEmail && !!org && userEmail.toLowerCase() === org.ownerEmail.toLowerCase()
}

/** Full org directory: owner, admin, and member roles (not billing-only). */
export function canViewOrgMemberDirectory(
  members: MemberResponse[],
  userEmail?: string | null,
  org?: OrgResponse | null,
) {
  if (isOrgOwner(userEmail, org ?? null)) return true
  const membership = getCurrentOrgMembership(members, userEmail)
  if (!membership) return false
  const role = normalizeTenantRole(membership.role)
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER"
}

/** Invite links, role changes, and other management actions. */
export function canManageOrgMembers(
  members: MemberResponse[],
  userEmail?: string | null,
  org?: OrgResponse | null,
) {
  if (isOrgOwner(userEmail, org ?? null)) return true
  const membership = getCurrentOrgMembership(members, userEmail)
  if (!membership) return false
  const role = normalizeTenantRole(membership.role)
  return role === "OWNER" || role === "ADMIN"
}
