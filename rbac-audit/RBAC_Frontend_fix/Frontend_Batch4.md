Batch 4 — Remove Mock Flags, Wire Real Permissions
frontend/components/layout/WorkspaceSidebar.tsx
typescript// Remove this
const isProjectLead = true // Use mock role for now

// Replace with
const { canCreateProject, canCreateTeam } = usePermission()

// Gate create buttons
{canCreateProject && (
  <Button onClick={openCreateProject}>New Project</Button>
)}

{canCreateTeam && (
  <Button onClick={openCreateTeam}>New Team</Button>
)}
frontend/components/layout/SettingsSidebar.tsx
typescriptconst { canAccessBilling, canManageMembers } = usePermission()

// Billing section — only OWNER and BILLING_ADMIN
{canAccessBilling && (
  <SidebarItem href="/settings/billing">Billing</SidebarItem>
)}

// Members, Roles, Invites — only OWNER and ADMIN
{canManageMembers && (
  <>
    <SidebarItem href="/settings/members">Members</SidebarItem>
    <SidebarItem href="/settings/roles">Roles</SidebarItem>
  </>
)}
frontend/components/features/teams/ManageTeamSheet.tsx
typescriptconst { canManageTeam } = usePermission()
const hasTeamManagement = canManageTeam(currentUserTeamRole)

// Gate destructive actions
{hasTeamManagement && (
  <Button onClick={addMember}>Add Member</Button>
)}

{hasTeamManagement && (
  <Button variant="destructive" onClick={deleteTeam}>Delete Team</Button>
)}
frontend/components/features/projects/CreateProjectModal.tsx and CreateTeamModal.tsx
Add lead picker:
typescript// Fetch workspace members for lead picker
const { data: workspaceMembers } = useWorkspaceMembers(workspaceId)

// Add to form
<Select
  label="Project Lead (optional)"
  placeholder="Defaults to you"
  options={workspaceMembers?.map(m => ({
    value: m.userId,
    label: m.fullName ?? m.username
  }))}
  value={leadUserId}
  onChange={setLeadUserId}
/>