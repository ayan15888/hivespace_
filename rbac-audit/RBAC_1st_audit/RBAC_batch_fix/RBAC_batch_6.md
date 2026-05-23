Batch 6 — Final Audit and Hardening

Final security hardening pass:

1. Add a scope guard utility method to RbacService:
   verifyResourceBelongsToTenant(UUID resourceId, ResourceType type, UUID tenantId)
   This should be called at the top of any endpoint that takes
   a resource UUID to prevent cross-tenant access.

2. Verify every controller method that takes a workspaceId
   validates the workspace belongs to the caller's current tenant.

3. Add integration tests for the critical exploit scenarios
   from RBAC_EXPLOIT_SCENARIOS.md:
   - Verify GET /api/tasks returns 403 for non-member
   - Verify POST /api/workspaces with foreign tenantId returns 403
   - Verify DELETE /api/teams/{id}/members/{leadId} by non-lead returns 403
   - Verify last lead cannot be removed from team or project

4. Update RBAC_PERMISSION_MATRIX.md to reflect the new
   implementation after all batches complete — change all
   ⚠️ entries to either ✅ or ❌ as appropriate.