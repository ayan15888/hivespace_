The 4 Remaining Items — How To Fix Each
Item 1 — Active Tenant Context (Fix Before Multi-Tenant Features)
This does not block anything you are building right now. Most users will only belong to one tenant during early usage. Fix it when you add the workspace switcher UI or when a user actually needs to belong to multiple orgs.
When you are ready, the fix is two things:
Add tenant context to JWT claims in JwtService:
javareturn Jwts.builder()
    .subject(user.getId().toString())
    .claim("tenantId", user.getTenantId().toString())
    .claim("tenantRole", getTenantRole(user))
    .issuedAt(new Date())
    .expiration(new Date(System.currentTimeMillis() + expiration))
    .signWith(getSigningKey())
    .compact();
Add switch-tenant endpoint:
POST /api/auth/switch-tenant
Body: { tenantId: "target-uuid" }
      ↓
Verify tenant_members row exists for currentUser + targetTenantId
      ↓
Update users.tenant_id to targetTenantId
      ↓
Issue new JWT with updated tenantId claim
      ↓
Frontend stores new token, reloads
Defer this — not blocking current features.

Item 2 — Misleading Error Message (Fix Now, 5 Minutes)
This is a one-line fix. Find the error message in InvitationService that says "role that exceeds your own workspace role" and change it to something accurate:
javathrow new SecurityException(
    "You must have at least Member access to the selected workspace to invite others to it"
);
Give this to your agent as a standalone fix right now. It takes five minutes and prevents future developer confusion.

Item 3 — DB CHECK Constraint on invitations.tenant_role (Fix Now, 2 Minutes)
Run this in Supabase:
sqlALTER TABLE invitations
ADD CONSTRAINT check_invitation_tenant_role
CHECK (tenant_role IN ('OWNER', 'ADMIN', 'BILLING_ADMIN', 'MEMBER'));
Done. Two minutes. Do this now.

Item 4 — Policy Centralization (Fix Incrementally)
Do not do this as a big bang refactor. Instead give your agent this rule going forward:
Every time a new endpoint is added, the authorization check must be a named capability method in RbacService. No inline checks in new code. Existing inline checks get migrated to capability methods one service at a time when that service is being touched for another reason.
The immediate ones worth centralizing now since they are referenced in multiple places:
java// Add these to RbacService
public boolean canDeleteTask(UUID taskId) {
    UUID projectId = taskRepository.findProjectId(taskId);
    return hasProjectRole(projectId, ProjectMemberRole.LEAD) 
        || canAdminWorkspace(getProjectWorkspaceId(projectId));
}

public boolean canAddTaskAssignee(UUID taskId) {
    UUID currentUserId = getCurrentUser().getId();
    boolean isTaskOwner = taskAssigneeRepository
        .existsByTaskIdAndUserIdAndRole(taskId, currentUserId, TaskAssigneeRole.OWNER);
    UUID projectId = taskRepository.findProjectId(taskId);
    return isTaskOwner 
        || hasProjectRole(projectId, ProjectMemberRole.LEAD)
        || canAdminWorkspace(getProjectWorkspaceId(projectId));
}

public boolean canManageInvite(UUID tenantId) {
    return hasTenantRole(tenantId, TenantMemberRole.ADMIN);
}
