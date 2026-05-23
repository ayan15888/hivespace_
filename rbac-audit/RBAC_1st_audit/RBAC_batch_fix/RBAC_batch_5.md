Batch 5 — Invitation Scope Validation

Fix invitation cross-scope confusion:

1. InvitationService.generateInvitation:
   - Add scope validation: if workspaceId provided, verify
     workspace.tenantId == invitation.tenantId
   - Add scope validation: if teamId provided, verify
     team's workspace belongs to same tenant
   - Add scope validation: if projectId provided, verify
     project's workspace belongs to same tenant
   - Remove BILLING_ADMIN ability to generate invitations:
     check caller role is OWNER or ADMIN only
   - Validate that any assigned workspace role does not exceed
     the caller's own workspace role

2. InvitationService.acceptInvitation (join flow):
   - Wrap all membership creations in single @Transactional:
     * tenant_members row
     * workspace_members rows (from invitation_workspaces)
     * team_members rows (from invitation_teams)
   - Verify each workspace still belongs to the tenant at
     acceptance time (tenant could have been restructured)
   - Verify each team still belongs to the correct workspace
     at acceptance time