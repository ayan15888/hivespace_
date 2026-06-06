Critical Blocker 2 — Tenant Boundary (Fix After Schema)
The X-Tenant-Id header is a security hole. Any user can pass any tenant ID they belong to in a header and gain access to that tenant's resources without going through the proper switch-tenant flow. The fix is straightforward:
In RbacService.verifyResourceBelongsToTenant():
  Remove the X-Tenant-Id header reading logic entirely.
  Always use currentUser.getTenantId() as the active tenant boundary.
  
  Before: reads X-Tenant-Id header, falls back to user.tenant_id
  After: always uses user.tenant_id, no header involved

In all endpoints that accept tenantId as a path variable
(e.g. GET /api/workspaces/t/{tenantId}):
  Add check: if tenantId != currentUser.getTenantId() → return 403
  This ensures users can only access their active tenant's resources

Implement POST /api/auth/switch-tenant:
  Body: { tenantId: "uuid" }
  1. Verify tenant_members row exists for currentUser + tenantId
  2. UPDATE users SET tenant_id = tenantId WHERE id = currentUserId
  3. Issue new JWT
  4. Return new JWT

This endpoint is the ONLY way to change active tenant context.
All other endpoints enforce current active tenant strictly.