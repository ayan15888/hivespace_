Batch 3 — Fix Invite UI Components
frontend/hooks/useInviteModal.ts
The key change is collapsing multiple per-scope invites into one multi-scope invite:
typescript// Old — created one invite per workspace/team/email
// New — create one invite with arrays

const generateInvite = async () => {
  const response = await invitesApi.generate(tenantId, {
    tenantRole: selectedRole,          // was: role
    workspaceIds: selectedWorkspaceIds, // was: single workspaceId
    teamIds: selectedTeamIds,           // was: single teamId
    maxUses: maxUses,
  })

  // PIN only available on creation — store it temporarily for display
  setCreatedPin(response.pin ?? null)
  setCreatedToken(response.token)
}
frontend/components/common/invite-modal/InviteLinkSection.tsx
PIN display must handle null:
typescript// Only show PIN if it exists (creation response only)
{pin ? (
  <div>
    <span>Security PIN:</span>
    <code>{pin}</code>
    <p>Share this PIN separately from the link</p>
  </div>
) : (
  <p className="text-muted-foreground text-sm">
    PIN was shown at creation time only
  </p>
)}
frontend/app/(public)/invite/[orgSlug]/[token]/page.tsx
typescript// Replace role with tenantRole and show scope grants
<p>You are joining <strong>{invite.orgName}</strong> as <strong>{invite.tenantRole}</strong></p>

{invite.workspaceNames.length > 0 && (
  <p>You will be added to: {invite.workspaceNames.join(', ')}</p>
)}
{invite.teamNames.length > 0 && (
  <p>You will join teams: {invite.teamNames.join(', ')}</p>
)}
