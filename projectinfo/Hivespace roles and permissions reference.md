# Hivespace — Complete Role & Permission Reference

> **Primary reference document for all coding agents.**
> This file defines every role, every permission, every user flow, and every
> authorization rule in the Hivespace system. Treat this as the single source
> of truth for all RBAC decisions across frontend and backend.
>
> Last updated: 2026-05-23

---

## Table of Contents

1. [System Architecture & Scope Hierarchy](#1-system-architecture--scope-hierarchy)
2. [Role Definitions — All Scopes](#2-role-definitions--all-scopes)
3. [Permission Matrix — What Each Role Can Do](#3-permission-matrix--what-each-role-can-do)
4. [Cross-Scope Inheritance Rules](#4-cross-scope-inheritance-rules)
5. [User Flows — Detailed](#5-user-flows--detailed)
   - 5.1 Registration & Onboarding
   - 5.2 Invite Generation Flow
   - 5.3 Invite Acceptance Flow
   - 5.4 Workspace Creation Flow
   - 5.5 Project Creation Flow
   - 5.6 Team Creation Flow
   - 5.7 Task Creation Flow
   - 5.8 Task Assignment Flow
   - 5.9 Member Management Flow
   - 5.10 Role Change Flow
   - 5.11 Project Progress Sharing Flow
6. [Role-by-Role User Journeys](#6-role-by-role-user-journeys)
7. [Authorization Rules — Backend Enforcement](#7-authorization-rules--backend-enforcement)
8. [Frontend Gating Rules](#8-frontend-gating-rules)
9. [Edge Cases & Invariants](#9-edge-cases--invariants)
10. [API Endpoint Authorization Map](#10-api-endpoint-authorization-map)

---

## 1. System Architecture & Scope Hierarchy

### 1.1 Scope Levels

Every resource in Hivespace lives at exactly one scope level. Authorization always
checks the most specific scope first, then walks up the hierarchy for override rules.

```
TENANT (Organization)
  └── WORKSPACE
        ├── PROJECT
        │     └── TASK
        └── TEAM
```

### 1.2 Scope Definitions

**Tenant** — The top-level organization entity. Represents the company. All users
must be tenant members before they can access anything. The tenant is the security
boundary — no resource from one tenant is accessible to a user whose active tenant
is different, regardless of any other membership.

**Workspace** — A division or department within a tenant. Examples: Engineering,
Design, Marketing. A user can belong to multiple workspaces simultaneously. A user
must be a workspace member before they can be added to any project or team within
that workspace.

**Project** — A specific initiative within a workspace. Has a Kanban board, tasks,
milestones, docs, and optionally assigned teams. A user must be both a workspace
member AND a project member to create or edit tasks.

**Team** — A group of people who work together repeatedly. Teams are
workspace-scoped. They can be optionally associated with projects via the
`project_teams` junction table. A user must be a workspace member before they can
join a team.

**Task** — A unit of work within a project. Tasks have assignees with specific
roles (OWNER, COLLABORATOR, REVIEWER). Task operations require project membership.

### 1.3 Database Tables Per Scope

| Scope | Entity Table | Membership Table | Role Column |
|---|---|---|---|
| Tenant | `tenants` | `tenant_members` | `role` |
| Workspace | `workspaces` | `workspace_members` | `role` |
| Project | `projects` | `project_members` | `role` |
| Team | `teams` | `team_members` | `role` |
| Task | `tasks` | `task_assignees` | `role` |

### 1.4 Tenant Boundary Enforcement

Every backend service method that accepts a resource UUID must call
`rbacService.verifyResourceBelongsToTenant(resourceId, ResourceType)` before
proceeding. This compares the resource's tenant chain against `currentUser.tenant_id`.
If they do not match, the request is rejected with 403 regardless of any other
membership.

---

## 2. Role Definitions — All Scopes

### 2.1 Tenant Roles (`tenant_members.role`)

---

#### OWNER

**There is exactly one OWNER per tenant. Created automatically when the tenant is
created. Cannot be removed, demoted, or reassigned by anyone.**

Full Permissions:
- Every permission that ADMIN has, plus:
- Promote any MEMBER or ADMIN to OWNER (transfers ownership — demotes old owner to ADMIN)
- Promote MEMBER to ADMIN
- Demote ADMIN to MEMBER
- Remove any member including ADMINs
- Access billing portal
- Delete the entire tenant
- Generate invite links for any role including ADMIN

Restrictions:
- Cannot remove themselves unless transferring ownership first
- Only one OWNER exists at any time

UI visibility:
- Sees all settings sections including Billing, Danger Zone, Members, Roles
- Sees all workspaces, all projects, all teams
- All create/edit/delete buttons are enabled

---

#### ADMIN

**Promoted by OWNER. Multiple ADMINs can exist. Has nearly the same access as
OWNER except cannot touch other ADMINs or the OWNER.**

Full Permissions:
- Generate invite links for BILLING_ADMIN and MEMBER roles
- Manage all tenant members with BILLING_ADMIN or MEMBER roles
- Create workspaces in the tenant
- View all workspaces in the tenant
- Access any workspace as if they were WORKSPACE ADMIN (inherited bridge rule)
- Access any project as if they were PROJECT LEAD (via workspace admin bridge)
- Access any team as if they were TEAM LEAD (via workspace admin bridge)
- View tenant member directory
- View invite list

Restrictions:
- Cannot generate invites for ADMIN or OWNER roles (OWNER-only privilege)
- Cannot demote or remove other ADMINs (OWNER-only privilege)
- Cannot demote or remove the OWNER
- Cannot access billing portal (unless also assigned BILLING_ADMIN — not supported, see BILLING_ADMIN)
- Cannot delete the tenant

UI visibility:
- Sees Members, Roles, Invite settings
- Does NOT see Billing section
- All workspace/project/team create buttons enabled
- Role change dropdowns for MEMBER/BILLING_ADMIN rows only

---

#### BILLING_ADMIN

**A narrow role granted to the finance team. Has NO access to the product itself —
only the billing portal.**

Full Permissions:
- View and manage Stripe subscription
- Update payment method
- View and download invoices
- View current plan and seat count

Restrictions:
- Cannot view tenant member directory
- Cannot generate invites
- Cannot view invite list
- Cannot create workspaces
- Cannot access any workspace, project, team, or task data
- Cannot view any project boards or tasks
- Cannot change any roles

UI visibility:
- Only sees the Billing section in settings
- Dashboard is inaccessible (redirected to billing on login)
- No sidebar workspace/project/team navigation

---

#### MEMBER (Tenant Level)

**The default role assigned to all new users who accept an invite. Has no special
powers at the tenant level — their actual permissions come from workspace, project,
and team memberships.**

Full Permissions:
- View tenant member directory
- View workspaces they are explicitly a member of
- Be added to workspaces by WORKSPACE ADMIN or TENANT ADMIN/OWNER

Restrictions:
- Cannot generate invites
- Cannot view invite list
- Cannot create workspaces (workspace creation requires ADMIN or OWNER)
- Cannot manage any other tenant member
- Cannot access billing

UI visibility:
- Settings page shows only their own profile settings
- No Members, Roles, Billing, Invite, or Danger Zone sections
- Only sees workspaces they are members of in the sidebar

---

### 2.2 Workspace Roles (`workspace_members.role`)

---

#### WORKSPACE ADMIN

**Can manage everything within their workspace. Added explicitly by TENANT ADMIN,
TENANT OWNER, or another WORKSPACE ADMIN.**

Full Permissions within workspace:
- Create projects in this workspace
- View all projects in this workspace (even if not a project member)
- Delete tasks in any project in this workspace (without being a project member)
- Add and remove workspace members
- Change workspace member roles (within their scope)
- Create teams in this workspace
- Assign and unassign teams to projects
- Add members to any project in the workspace
- Add members to any team in the workspace
- Override team lead restrictions (can manage team members without being team lead)
- Override project lead restrictions (can manage project members without being project lead)
- View all member emails in this workspace
- Update workspace settings (name, description)

Restrictions:
- Cannot delete workspace itself (TENANT ADMIN/OWNER only)
- Cannot manage tenant-level roles
- Cannot access other workspaces they are not a member of
  (unless they are also TENANT ADMIN/OWNER)
- Cannot create/edit/delete tasks in a project unless they are also a project member
  (workspace admin alone does not bypass the project membership requirement for tasks)

UI visibility:
- All project and team management controls visible and enabled
- Member management fully available
- Workspace settings accessible
- "Create Project" and "Create Team" buttons enabled
- Member role dropdowns visible in all project/team member lists

---

#### WORKSPACE MEMBER

**Standard workspace participant. Most users are at this level.**

Full Permissions within workspace:
- View workspace member directory (names and usernames only, not emails)
- Create teams in this workspace
- View all teams in this workspace
- Be added to projects and teams
- View projects they are explicitly a member of

Restrictions:
- Cannot create projects (project creation requires WORKSPACE ADMIN or higher)
- Cannot view projects they are not a member of
- Cannot manage workspace membership
- Cannot view member email addresses
- Cannot assign teams to projects
- Cannot update workspace settings

UI visibility:
- "Create Project" button hidden or disabled with tooltip "Contact your workspace admin"
- "Create Team" button visible and enabled
- Sees only their own projects in project list
- Member management controls hidden

---

#### WORKSPACE VIEWER

**Read-only workspace access. Cannot create, edit, or delete anything.**

Full Permissions within workspace:
- View workspace member directory
- View all teams in workspace
- View projects they are explicitly a member of (read-only)

Restrictions:
- Cannot create projects, teams, or anything else
- Cannot be assigned tasks (task assignees must be project members, which requires
  at minimum project VIEWER — but workspace VIEWER with no project membership cannot
  be assigned tasks)
- Cannot manage any memberships
- Cannot update any settings

UI visibility:
- All create buttons hidden
- All management controls hidden
- Read-only indicator shown on boards if they happen to be a project viewer too

---

### 2.3 Project Roles (`project_members.role`)

---

#### PROJECT LEAD

**The primary owner and manager of the project. Created automatically for whoever
creates the project, or explicitly assigned during project creation via `leadUserId`.**

Full Permissions within project:
- Add workspace members to the project
- Remove project members
- Change project member roles (LEAD/MEMBER/VIEWER)
- Assign and unassign teams to the project
- Create tasks (any status, any priority)
- Edit any task in the project
- Delete any task in the project
- Change any task's status
- Manage task assignees (add/remove OWNER, COLLABORATOR, REVIEWER on any task)
- Change task OWNER on any task
- Generate stakeholder sharing links for this project
- Archive or complete the project
- Update project settings (name, description, color, dates)
- View all project members

Restrictions:
- Cannot add users who are not workspace members
  (must be workspace member first — backend enforces this)
- Cannot demote or remove the last PROJECT LEAD
  (at least one LEAD must always exist — backend enforces this invariant)
- Cannot add users from other workspaces

UI visibility:
- Full project settings panel accessible
- "Add Member" button enabled
- Role dropdowns for all members visible
- "Delete Task" option in task context menu
- Stakeholder sharing link generator visible
- "Archive Project" button visible
- Team assignment controls visible

---

#### PROJECT MEMBER

**Standard project participant. Can do day-to-day work.**

Full Permissions within project:
- Create tasks
- Edit task title, description, priority, due date, labels, points
- Change task status (move on Kanban board)
- View all tasks in the project
- View all project members
- Add collaborators and reviewers to tasks they own
- Remove themselves from the project

Restrictions:
- Cannot delete tasks (PROJECT LEAD or WORKSPACE ADMIN only)
- Cannot manage project membership (add/remove other members)
- Cannot change project lead or member roles
- Cannot assign or unassign teams to the project
- Cannot generate stakeholder sharing links
- Cannot archive the project
- Cannot add task assignees if not the task OWNER (only owner, project lead,
  or workspace admin can add collaborators/reviewers)

UI visibility:
- Task create button enabled
- Kanban drag-and-drop enabled
- Task delete option hidden in context menu
- Project settings read-only (can view but not edit)
- "Add Member" button hidden
- "Share Project" button hidden

---

#### PROJECT VIEWER

**Read-only project access. Typically used for stakeholders who are internal members.**

Full Permissions within project:
- View all tasks and their details
- View task assignees and activity logs
- View project members
- Remove themselves from the project

Restrictions:
- Cannot create tasks
- Cannot edit any task
- Cannot change any task status
- Cannot manage project membership
- Cannot add themselves as task assignees
- Cannot generate sharing links

UI visibility:
- All create/edit buttons disabled or hidden
- Kanban board in read-only mode (no drag-and-drop)
- "View Only" badge shown on project header
- No task actions in context menu except "View Details"

---

### 2.4 Team Roles (`team_members.role`)

---

#### TEAM LEAD

**Created automatically for whoever creates the team, or explicitly assigned via
`leadUserId` during team creation.**

Full Permissions within team:
- Add workspace members to the team
- Remove team members
- Promote MEMBER to LEAD
- Demote LEAD to MEMBER (cannot demote self if last lead)
- Update team name, description
- Delete the team
- View all team members
- View tasks assigned to the team (via team_id on tasks)

Restrictions:
- Cannot add users who are not workspace members
- Cannot demote or remove the last TEAM LEAD
  (backend invariant: at least one LEAD must always exist)
- Cannot manage users outside their workspace

UI visibility:
- "Add Member" button enabled in team settings
- Role dropdowns visible for all team members
- "Delete Team" button visible
- Team settings panel accessible

---

#### TEAM MEMBER

**Standard team participant.**

Full Permissions within team:
- View all team members
- Remove themselves from the team (self-leave)
- View tasks assigned to the team

Restrictions:
- Cannot add members to the team
- Cannot remove other members
- Cannot change any team member's role
- Cannot update team settings
- Cannot delete the team
- Cannot remove the team lead (even if they are also a project/workspace admin
  at another scope — team operations are scoped to team-level checks)

UI visibility:
- "Add Member" button hidden
- Role dropdowns hidden
- Team settings read-only
- "Leave Team" button visible for themselves only

---

### 2.5 Task Assignee Roles (`task_assignees.role`)

These roles are stored in `task_assignees` and determine display and notification
behavior. They are not currently used for authorization decisions — authorization
on task operations is determined by project role and workspace role.

---

#### TASK OWNER

**The primary accountable person. Every task must have exactly one OWNER at all
times. Created automatically when a task is created (creator becomes OWNER unless
another user is explicitly selected as assignee during creation).**

Characteristics:
- Name and avatar displayed prominently on Kanban card
- Receives all task notifications (status changes, comments, due date alerts)
- Can add COLLABORATOR and REVIEWER assignees to their own task
- Can change their own task's status
- Cannot be removed if they are the only assignee without first assigning a new OWNER

Enforcement:
- Backend prevents removing the OWNER if they are the only assignee
- Backend prevents `task_assignees` having zero rows with role OWNER for any task
- OWNER change is a dedicated endpoint: `PATCH /api/tasks/{taskId}/assignees/owner`

---

#### COLLABORATOR

**Contributing to the task but not primarily accountable.**

Characteristics:
- Avatar shown in smaller stack beside OWNER on Kanban card
- Receives notifications on status changes and comments
- Can edit task details (same as project MEMBER permissions)
- Not shown as the primary owner on task cards

---

#### REVIEWER

**Must approve or sign off the task output before it can be marked DONE.**

Characteristics:
- Avatar shown with distinct indicator (e.g. eye icon) on task card
- Receives notification when task is moved to IN_REVIEW status
- Task is considered review-pending until reviewer acknowledges
- Can change task status from IN_REVIEW to DONE or back to IN_PROGRESS

---

## 3. Permission Matrix — What Each Role Can Do

### 3.1 Tenant-Level Actions

| Action | OWNER | ADMIN | BILLING_ADMIN | MEMBER |
|---|:---:|:---:|:---:|:---:|
| Create tenant | ✅ | ✅ | ✅ | ✅ |
| Delete tenant | ✅ | ❌ | ❌ | ❌ |
| View member directory | ✅ | ✅ | ❌ | ✅ |
| Invite OWNER | ❌ | ❌ | ❌ | ❌ |
| Invite ADMIN | ✅ | ❌ | ❌ | ❌ |
| Invite BILLING_ADMIN | ✅ | ✅ | ❌ | ❌ |
| Invite MEMBER | ✅ | ✅ | ❌ | ❌ |
| View invite list | ✅ | ✅ | ❌ | ❌ |
| Revoke invites | ✅ | ✅ | ❌ | ❌ |
| Promote to ADMIN | ✅ | ❌ | ❌ | ❌ |
| Demote ADMIN | ✅ | ❌ | ❌ | ❌ |
| Remove MEMBER | ✅ | ✅ | ❌ | ❌ |
| Remove ADMIN | ✅ | ❌ | ❌ | ❌ |
| Create workspace | ✅ | ✅ | ❌ | ❌ |
| List workspaces | ✅ | ✅ | ✅ | ✅ |
| Access billing portal | ✅ | ❌ | ✅ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ | ❌ |

### 3.2 Workspace-Level Actions

| Action | WS ADMIN | WS MEMBER | WS VIEWER | Tenant OWNER/ADMIN |
|---|:---:|:---:|:---:|:---:|
| View workspace | ✅ | ✅ | ✅ | ✅ |
| Update workspace settings | ✅ | ❌ | ❌ | ✅ |
| Delete workspace | ❌ | ❌ | ❌ | ✅ |
| View member directory | ✅ | ✅ | ✅ | ✅ |
| View member emails | ✅ | ❌ | ❌ | ✅ |
| Add workspace members | ✅ | ❌ | ❌ | ✅ |
| Remove workspace members | ✅ | ❌ | ❌ | ✅ |
| Change workspace member roles | ✅ | ❌ | ❌ | ✅ |
| Create project | ✅ | ❌ | ❌ | ✅ |
| View all projects | ✅ | ❌ (own only) | ❌ (own only) | ✅ |
| Create team | ✅ | ✅ | ❌ | ✅ |
| View all teams | ✅ | ✅ | ✅ | ✅ |
| Assign team to project | ✅ | ❌ | ❌ | ✅ |

### 3.3 Project-Level Actions

| Action | P LEAD | P MEMBER | P VIEWER | WS ADMIN |
|---|:---:|:---:|:---:|:---:|
| View project | ✅ | ✅ | ✅ | ✅ |
| Update project settings | ✅ | ❌ | ❌ | ✅ |
| Archive/complete project | ✅ | ❌ | ❌ | ✅ |
| View all members | ✅ | ✅ | ✅ | ✅ |
| Add project members | ✅ | ❌ | ❌ | ✅ |
| Remove project members | ✅ | ❌ | ❌ | ✅ |
| Change project member roles | ✅ | ❌ | ❌ | ✅ |
| Assign team to project | ✅ | ❌ | ❌ | ✅ |
| Create tasks | ✅ | ✅ | ❌ | ⚠️ must be project member |
| Edit tasks | ✅ | ✅ | ❌ | ⚠️ must be project member |
| Delete tasks | ✅ | ❌ | ❌ | ✅ |
| Change task status | ✅ | ✅ | ❌ | ⚠️ must be project member |
| Add task assignees | ✅ | ❌ (unless task OWNER) | ❌ | ✅ |
| Change task OWNER | ✅ | ❌ | ❌ | ✅ |
| Generate sharing link | ✅ | ❌ | ❌ | ✅ |

### 3.4 Team-Level Actions

| Action | T LEAD | T MEMBER | WS ADMIN |
|---|:---:|:---:|:---:|
| View team members | ✅ | ✅ | ✅ |
| Add team members | ✅ | ❌ | ✅ |
| Remove team members | ✅ | ❌ (self only) | ✅ |
| Promote member to lead | ✅ | ❌ | ✅ |
| Demote lead to member | ✅ | ❌ | ✅ |
| Update team settings | ✅ | ❌ | ✅ |
| Delete team | ✅ | ❌ | ✅ |

### 3.5 Task Assignee Actions

| Action | Task OWNER | P LEAD | WS ADMIN | P MEMBER |
|---|:---:|:---:|:---:|:---:|
| View assignees | ✅ | ✅ | ✅ | ✅ |
| Add COLLABORATOR | ✅ | ✅ | ✅ | ❌ |
| Add REVIEWER | ✅ | ✅ | ✅ | ❌ |
| Change OWNER | ✅ | ✅ | ✅ | ❌ |
| Remove COLLABORATOR | ✅ | ✅ | ✅ | ❌ (self only) |
| Remove REVIEWER | ✅ | ✅ | ✅ | ❌ (self only) |
| Remove OWNER | ❌ | ✅ (must assign new owner first) | ✅ | ❌ |

---

## 4. Cross-Scope Inheritance Rules

These are the ONLY bridges between scopes. No implicit rank comparisons across scopes.
Every bridge is an explicit named rule.

### Rule 1 — Tenant OWNER/ADMIN inherits Workspace Admin powers

A user with tenant role OWNER or ADMIN automatically has workspace admin capabilities
for every workspace in their tenant, even without an explicit `workspace_members` row.

Affects: All workspace-level operations.

Backend: Implemented in `RbacService.canAdminWorkspace()` as an explicit fallback check.

Frontend: `canAdminWorkspace({ tenantRole: 'ADMIN', workspaceRole: null })` returns `true`.

### Rule 2 — Workspace ADMIN inherits Project Lead powers

A WORKSPACE ADMIN can perform any PROJECT LEAD action in any project within their
workspace, even without a `project_members` row.

Exception: Task create/edit requires explicit project membership. Workspace admin
alone does not grant task create/edit access.

Backend: Implemented in `RbacService.canManageProjectMembers()`.

### Rule 3 — Workspace ADMIN inherits Team Lead powers

A WORKSPACE ADMIN can perform any TEAM LEAD action in any team within their workspace,
even without a `team_members` row.

Backend: Implemented in `RbacService.canManageTeamMembers()`.

### Rule 4 — Task OWNER can add Collaborators and Reviewers

A project MEMBER who is the OWNER of a specific task can add COLLABORATOR and REVIEWER
assignees to that task, even though regular project MEMBERs cannot manage assignees
in general.

Backend: Checked in `TaskAssigneeService` — if caller is task OWNER, allow assignee
management on that task.

### Rule 5 — No other cross-scope inheritance exists

Everything not listed above is strictly scoped. A TEAM LEAD has no project powers
purely from being a team lead. A PROJECT LEAD has no workspace powers. A BILLING_ADMIN
has no workspace, project, or team powers. These are hard rules — do not introduce
new cross-scope bridges without updating this document.

---

## 5. User Flows — Detailed

### 5.1 Registration & Onboarding Flow

```
User visits hivespace.app/signup
        ↓
Fills: email, username, password, full_name
        ↓
POST /api/auth/register
Backend:
  - Validates email uniqueness
  - Validates username uniqueness
  - Hashes password with BCrypt
  - Creates users row (active=true, tenant_id=null initially)
  - Returns JWT
        ↓
Frontend stores JWT in cookie
        ↓
Redirect to /onboarding
        ↓
ONBOARDING SCREEN:

  Check: does sessionStorage have pendingInviteToken?
  ┌─ YES ─────────────────────────────────────────┐
  │ Skip choice screen                             │
  │ Auto-fill token from sessionStorage            │
  │ Show: "You have a pending invite"              │
  │ Show: invite org name and scope grants         │
  │ Ask for PIN                                    │
  │ → Go to Invite Acceptance Flow (section 5.3)  │
  └────────────────────────────────────────────────┘
  ┌─ NO ──────────────────────────────────────────┐
  │ Show two options:                              │
  │  [Create an Organization]  [Join via Invite]  │
  └────────────────────────────────────────────────┘

  CREATE ORGANIZATION path:
        ↓
  Form: org name, slug (auto-generated, editable), description
  Backend validates: slug not in reserved list, slug unique globally
  POST /api/tenants
  Backend:
    - Creates tenants row
    - Creates tenant_members row: userId + tenantId + role=OWNER
    - Updates users.tenant_id = new tenantId
    - Returns tenant + updated JWT with tenantId claim
        ↓
  Redirect to dashboard (empty state)
  Show: "Create your first workspace" prompt

  JOIN VIA INVITE path:
        ↓
  Show two fields:
    Invite Link: [paste full URL]
    PIN: [6-digit OTP input]
        ↓
  As user types link, extract token from URL client-side
  Call GET /api/i/validate?token=...&orgSlug=...
  Show validation result below input:
    ✓ "Joining Acme Corp as Member"
    ✓ "Access to: Engineering workspace, Backend Team"
        ↓
  User enters PIN → Submit
  → Go to Invite Acceptance Flow (section 5.3)
```

---

### 5.2 Invite Generation Flow

**Who can do this:** TENANT OWNER, TENANT ADMIN only.

```
Admin navigates to Settings → Members
        ↓
Clicks "Invite Members" button
        ↓
INVITE MODAL opens

Step 1 — Configure invite:

  INVITE AS (tenant role):
    Dropdown options depend on inviter's role:
    ┌─ If inviter is OWNER ────────────────────────┐
    │  Options: Admin, Billing Admin, Member        │
    └──────────────────────────────────────────────┘
    ┌─ If inviter is ADMIN ────────────────────────┐
    │  Options: Billing Admin, Member               │
    │  (Cannot invite Admin — OWNER privilege only) │
    └──────────────────────────────────────────────┘

  ADD TO WORKSPACE (required, at least one):
    List of all workspaces in the tenant
    Current workspace pre-checked and locked
    Other workspaces are optional checkboxes
    Backend validates: inviter must have at least MEMBER
    access to each selected workspace

  ADD TO TEAM (optional):
    List of all teams across selected workspaces
    Multiple can be selected
    Teams from unselected workspaces are hidden/disabled

  MAX USES:
    Options: 1 (default), 5, 10, Unlimited
    Default is 1 for single-person invites

  EXPIRY:
    Options: 24 hours, 72 hours (default), 7 days, 30 days, Never

Step 2 — Generate:

  User clicks "Generate Link"
  POST /api/i/generate
  Body: {
    tenantRole: "MEMBER",
    workspaceIds: ["ws-uuid-1", "ws-uuid-2"],
    teamIds: ["team-uuid-1"],
    maxUses: 1,
    expiresInHours: 72
  }

  Backend:
    1. Verify caller is TENANT OWNER or ADMIN
    2. Verify tenantRole is valid and caller can assign it
    3. Validate every workspaceId belongs to this tenant
    4. Validate every teamId's workspace belongs to this tenant
    5. Validate inviter has workspace MEMBER+ access to every workspace
       (via hasWorkspaceRole with tenant admin fallback)
    6. Generate cryptographically random token via SecureRandom
    7. Generate 6-digit PIN
    8. Hash PIN with BCrypt → store pin_hash
    9. Create invitations row (token, pin_hash, tenant_id, tenant_role, expires_at, max_uses)
    10. Create invitation_workspaces rows for each workspaceId
    11. Create invitation_teams rows for each teamId
    12. Return: { token, pin, ...inviteDetails }
       (pin is ONLY returned here — never again)

Step 3 — Share:

  Modal shows:
  ┌─────────────────────────────────────────────────┐
  │  INVITE LINK                                    │
  │  hivespace.app/invite/acmecorp/abc123xyz  [Copy]│
  │                                                 │
  │  SECURITY PIN  (shown once — copy now)          │
  │  [ 4 ][ 8 ][ 2 ][ 9 ][ 1 ][ 0 ]               │
  │                                                 │
  │  Send the link and PIN separately.              │
  │  Do not share them in the same message.         │
  │                                                 │
  │  JOINING AS: Member                             │
  │  WORKSPACES: Engineering, Design                │
  │  TEAMS: Backend Team                            │
  │  EXPIRES: 72 hours from now                     │
  │  MAX USES: 1                                    │
  └─────────────────────────────────────────────────┘

  Admin copies link, sends to invitee via WhatsApp/email/Slack
  Admin copies PIN, sends separately
  Modal can be closed — PIN is gone, not stored in UI state after close
```

---

### 5.3 Invite Acceptance Flow

**Who can do this:** Any authenticated user.

```
ENTRY POINT A — Direct link click:
  User receives: hivespace.app/invite/acmecorp/abc123xyz
        ↓
  Opens URL in browser
        ↓
  app/(public)/invite/[orgSlug]/[token]/page.tsx loads
        ↓
  Is user logged in? (check JWT cookie)
  ┌─ NOT logged in ──────────────────────────────────┐
  │ Store token + orgSlug in sessionStorage           │
  │ Redirect to /signup (new user) or /signin         │
  │ After auth completes → return to invite flow      │
  └──────────────────────────────────────────────────┘
  ┌─ Already logged in ──────────────────────────────┐
  │ Proceed directly to validation step              │
  └──────────────────────────────────────────────────┘

ENTRY POINT B — Manual paste during onboarding:
  User pastes link into onboarding "Join" field
  Frontend parses token from URL
  Proceeds to validation step

VALIDATION STEP:
  GET /api/i/validate?token=abc123xyz&orgSlug=acmecorp
  Backend:
    1. Hash the raw token with SHA-256
    2. Query invitations WHERE token_hash = hash
    3. Check status = ACTIVE
    4. Check expires_at > now()
    5. Check current_uses < max_uses
    6. Verify invitation.tenant.slug == orgSlug (cross-check)
    7. Return: {
         orgName, orgSlug, tenantRole,
         workspaceNames[], teamNames[],
         inviterName, expiresAt
       }

  Frontend shows:
  ┌─────────────────────────────────────────────────┐
  │  You've been invited to join Acme Corp           │
  │  Invited by: Rahul Singh                        │
  │  Role: Member                                   │
  │  Workspaces: Engineering, Design                │
  │  Teams: Backend Team                            │
  │  Expires: 47 hours from now                     │
  │                                                 │
  │  Enter PIN to continue:                         │
  │  [ ][ ][ ][ ][ ][ ]                             │
  │                                                 │
  │  [Join Organization]                            │
  └─────────────────────────────────────────────────┘

PIN VALIDATION & ACCEPTANCE:
  User enters 6-digit PIN → clicks Join

  POST /api/i/join
  Body: { token: "abc123xyz", pin: "482910" }

  Backend (all in @Transactional):
    1. Hash raw token → find invitation
    2. Check status, expiry, max_uses (repeat for security)
    3. Log attempt in invitation_attempts (ip_address, timestamp)
    4. Check rate limit: max 5 failed attempts per token per IP per hour
       If exceeded: return 429 Too Many Requests
    5. BCrypt.verify(pin, invitation.pin_hash)
       If wrong: log failed attempt, return 400 "Invalid PIN"
       If correct: continue
    6. Check user is not already a tenant member
    7. BEGIN TRANSACTION:
       a. Create tenant_members row (tenantId, userId, tenantRole)
       b. Update users.tenant_id = tenantId (sets active tenant)
       c. For each invitation_workspaces row:
          - Create workspace_members row (workspaceId, userId, role=MEMBER)
       d. For each invitation_teams row:
          - Create team_members row (teamId, userId, role=MEMBER)
          - If user not yet in team's workspace: create workspace_members too
       e. If invitation has projectId:
          - Create project_members row (projectId, userId, role=MEMBER)
          - Ensure workspace membership exists
       f. Increment invitation.current_uses by 1
       g. If current_uses == max_uses: set status = EXHAUSTED
       h. Log successful attempt in invitation_attempts (success=true)
    8. Issue new JWT with tenantId claim
    9. Return: { jwt, redirectTo: "/dashboard" }

  Frontend:
    Store new JWT
    Clear sessionStorage pending invite data
    Redirect to /dashboard
    Show toast: "Welcome to Acme Corp!"
```

---

### 5.4 Workspace Creation Flow

**Who can do this:** TENANT OWNER, TENANT ADMIN only.

```
Admin clicks "New Workspace" (in sidebar or settings)
        ↓
WORKSPACE CREATE MODAL opens:

  Name: [required]
  Description: [optional]
  (No slug, no plan — these are not workspace fields)

  Submit
        ↓
  POST /api/workspaces
  Body: { name, description, tenantId }

  Backend:
    1. Verify currentUser.tenant_id == request.tenantId
    2. Verify hasTenantRole(tenantId, TenantMemberRole.ADMIN)
       (OWNER satisfies ADMIN via rank)
    3. Create workspaces row (name, description, tenant_id, created_by=userId)
    4. Create workspace_members row (workspaceId, userId, role=ADMIN)
       (creator automatically becomes WORKSPACE ADMIN)
    5. Return workspace object

  Frontend:
    Add workspace to sidebar
    Navigate to new workspace
    Show empty state: "Add your first team or project"
```

---

### 5.5 Project Creation Flow

**Who can do this:** WORKSPACE ADMIN, TENANT ADMIN, TENANT OWNER only.

```
Workspace Admin clicks "New Project"
        ↓
PROJECT CREATE MODAL opens:

  Name: [required]
  Description: [optional]
  Color: [optional color picker]
  Start Date: [optional]
  End Date: [optional]
  Project Lead: [optional — workspace member picker]
    Placeholder: "Defaults to you"
    List shows: all workspace members
    Backend will reject non-workspace-members

  Submit
        ↓
  POST /api/workspaces/{workspaceId}/projects
  Body: {
    name, description, color,
    startDate, endDate,
    leadUserId: "uuid-or-null"
  }

  Backend:
    1. verifyResourceBelongsToTenant(workspaceId, WORKSPACE)
    2. canCreateProject(workspaceId) → must be WS ADMIN or Tenant ADMIN/OWNER
    3. Create projects row (name, description, workspace_id, created_by)
    4. If leadUserId provided:
       a. Verify leadUserId is a workspace member
          → if not: throw 400 "User must be a workspace member first"
       b. Create project_members row: leadUserId + LEAD
       c. If creator != leadUserId:
          Create project_members row: creator + MEMBER
    5. If leadUserId not provided:
       Create project_members row: creator + LEAD
    6. Both inserts in @Transactional — if either fails, rollback both
    7. Return project object

  Frontend:
    Add project to sidebar under current workspace
    Navigate to new project board (empty Kanban)
    Show empty state: "Create your first task"
```

---

### 5.6 Team Creation Flow

**Who can do this:** WORKSPACE MEMBER and above (WORKSPACE ADMIN, TENANT ADMIN, TENANT OWNER).

```
Member clicks "New Team" in sidebar or workspace settings
        ↓
TEAM CREATE MODAL opens:

  Name: [required]
  Description: [optional]
  Team Lead: [optional — workspace member picker]
    Placeholder: "Defaults to you"
  Associate with Project: [optional — project picker from this workspace]
    Note: Member must have at least MEMBER access to selected project

  Submit
        ↓
  POST /api/workspaces/{workspaceId}/teams
  Body: {
    name, description,
    leadUserId: "uuid-or-null",
    projectId: "uuid-or-null"
  }

  Backend:
    1. verifyResourceBelongsToTenant(workspaceId, WORKSPACE)
    2. canCreateTeam(workspaceId) → must be WS MEMBER+ or Tenant ADMIN/OWNER
    3. If projectId provided:
       a. Verify project belongs to same workspace
       b. Verify caller has project MEMBER+ access
    4. Create teams row (name, description, workspace_id, project_id, created_by)
    5. If leadUserId provided:
       a. Verify leadUserId is workspace member
       b. Create team_members: leadUserId + LEAD
       c. If creator != leadUserId: create team_members: creator + MEMBER
    6. If leadUserId not provided:
       Create team_members: creator + LEAD
    7. Both in @Transactional
    8. Return team object

  Frontend:
    Add team to sidebar under workspace
    Navigate to team page
    Show empty state: "Add members to get started"
```

---

### 5.7 Task Creation Flow

**Who can do this:** PROJECT LEAD, PROJECT MEMBER only. (WORKSPACE ADMIN must also
be a project member to create tasks.)

#### Quick Create (Inline on Kanban Board)

```
Project member is viewing the Kanban board
        ↓
Clicks [+] button at bottom of any column
        ↓
Inline input field appears at the bottom of that column

User types task title → presses Enter
        ↓
Frontend:
  1. Immediately insert a ghost card into the column (optimistic UI)
     Ghost card shows: title + spinner + "Saving..."
  2. POST /api/projects/{projectId}/tasks
     Body: {
       title: "typed title",
       status: "TODO"  ← from the column the user clicked
       priority: "MEDIUM"  ← default
     }

Backend:
  1. verifyResourceBelongsToTenant(projectId, PROJECT)
  2. canCreateTask(projectId) → project role must be MEMBER+
  3. Use @Transactional:
     a. UPDATE projects SET task_sequence = task_sequence + 1
        WHERE id = projectId RETURNING task_sequence
        (atomic increment — prevents duplicate task numbers)
     b. Create tasks row:
        title, status=TODO, priority=MEDIUM,
        project_id, created_by=currentUserId
     c. Create task_assignees row:
        task_id, user_id=currentUserId, role=OWNER
     d. Create task_activities row:
        task_id, user_id=currentUserId, type=CREATED, new_value=title
  4. Return full task object including generated identifier

Frontend:
  Replace ghost card with real card showing:
  - Task identifier (HS-{sequence})
  - Title
  - Priority badge
  - Owner avatar (current user)
  - Status (matches column)

If API fails:
  Remove ghost card immediately
  Show toast: "Failed to create task. Please try again."
  Do NOT leave ghost cards in the board
```

#### Full Create (Modal)

```
User clicks "New Task" button (top right of board) or presses [C]
        ↓
TASK CREATE MODAL opens

Fields:
  Title: [required — focus on open]
  Description: [optional — Tiptap editor, simple for now]
  Status: [dropdown — defaults to TODO — options: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED]
  Priority: [dropdown — defaults to MEDIUM — options: URGENT, HIGH, MEDIUM, LOW]
  Due Date: [optional date picker]
  Story Points: [optional number — 1, 2, 3, 5, 8, 13]
  Labels: [optional tags input]
  Assignee (Owner): [optional member picker]
    → Shows project members only (GET /api/projects/{projectId}/members)
    → Placeholder: "Assigned to you by default"
    → If user selects someone else, that person becomes OWNER; creator becomes MEMBER only
  Team: [optional — dropdown of teams assigned to this project]
  Parent Task: [optional — for subtasks, search existing tasks]

Submit
        ↓
Frontend validates: title not empty
        ↓
POST /api/projects/{projectId}/tasks
Body: {
  title, description, status, priority,
  dueDate, points, labels,
  assigneeId: selectedUserId or null,
  teamId: selectedTeamId or null,
  parentId: selectedParentId or null
}

Backend:
  1. verifyResourceBelongsToTenant(projectId, PROJECT)
  2. canCreateTask(projectId)
  3. If assigneeId provided:
     Verify assigneeId is a project member (VIEWER+)
  4. If teamId provided:
     Verify team is assigned to this project via project_teams
  5. If parentId provided:
     Verify parent task belongs to same project
  6. @Transactional:
     a. Atomic task_sequence increment (same as quick create)
     b. Create tasks row with all fields
     c. ownerId = assigneeId ?? currentUserId
        Create task_assignees: ownerId + OWNER
     d. If assigneeId != null AND assigneeId != currentUserId:
        Do NOT auto-add creator as collaborator
        (creator is not automatically added if they assigned to someone else)
     e. Create task_activities: CREATED event
  7. Return full task object

Frontend:
  Close modal
  Add card to the correct column based on status
  Show toast: "Task HS-{n} created"
```

---

### 5.8 Task Assignment Flow

#### Changing the Task Owner

```
Who can do this:
  Current task OWNER, PROJECT LEAD, WORKSPACE ADMIN

User opens task detail panel
        ↓
Clicks on the OWNER avatar or "Change Owner" option
        ↓
Member picker opens:
  GET /api/projects/{projectId}/members
  Filter out current OWNER
  Show only project members (VIEWER+ can be owner, MEMBER+ recommended)

User selects new owner
        ↓
PATCH /api/tasks/{taskId}/assignees/owner
Body: { userId: "new-owner-uuid" }

Backend:
  1. verifyResourceBelongsToTenant(taskId, TASK)
  2. canChangeOwner: caller must be current OWNER, PROJECT LEAD, or WORKSPACE ADMIN
  3. Verify new owner is a project member (VIEWER+)
  4. @Transactional:
     a. UPDATE task_assignees SET user_id = newOwnerId WHERE task_id = taskId AND role = OWNER
        (or DELETE old OWNER row + INSERT new OWNER row)
     b. Create task_activities: type=OWNER_CHANGED, old_value=oldOwnerName, new_value=newOwnerName
  5. Return updated assignee list

Frontend:
  Update task card on board (new owner avatar shown prominently)
  Update task detail panel
```

#### Adding a Collaborator

```
Who can do this:
  Task OWNER, PROJECT LEAD, WORKSPACE ADMIN

User opens task detail → "Assignees" section
        ↓
Clicks "Add Collaborator"
        ↓
Member picker: shows project members, excludes already-assigned users

User selects member
        ↓
POST /api/tasks/{taskId}/assignees
Body: { userId: "uuid", role: "COLLABORATOR" }

Backend:
  1. verifyResourceBelongsToTenant(taskId, TASK)
  2. Caller must be task OWNER, PROJECT LEAD, or WORKSPACE ADMIN
  3. Target must be project member (VIEWER+)
  4. Insert task_assignees row (taskId, userId, COLLABORATOR)
  5. Create task_activities: type=COLLABORATOR_ADDED, new_value=username
  6. Return updated assignees list

Frontend: Update assignee stack on task card and detail panel
```

#### Adding a Reviewer

```
Same flow as adding a Collaborator but role=REVIEWER
POST /api/tasks/{taskId}/assignees
Body: { userId: "uuid", role: "REVIEWER" }

Reviewer receives notification when task moves to IN_REVIEW status.
```

#### Removing an Assignee

```
Who can do this:
  Target user themselves (self-removal), Task OWNER, PROJECT LEAD, WORKSPACE ADMIN

DELETE /api/tasks/{taskId}/assignees/{userId}

Backend:
  1. verifyResourceBelongsToTenant(taskId, TASK)
  2. Caller must be self OR task OWNER OR PROJECT LEAD OR WORKSPACE ADMIN
  3. Cannot remove the OWNER via this endpoint
     (must use change-owner endpoint first, then this becomes the old owner as non-OWNER)
  4. Delete task_assignees row
  5. Create task_activities: type=ASSIGNEE_REMOVED, old_value=username
```

---

### 5.9 Member Management Flow

#### Adding a User to a Workspace

```
Who can do this: WORKSPACE ADMIN, TENANT ADMIN, TENANT OWNER

Workspace Admin opens Settings → Members
        ↓
Clicks "Add Members"
        ↓
Member picker shows all TENANT MEMBERS who are NOT yet workspace members
        ↓
Selects member(s), assigns workspace role (ADMIN/MEMBER/VIEWER)
        ↓
POST /api/workspaces/{workspaceId}/members
Body: { userId, role }

Backend:
  1. verifyResourceBelongsToTenant(workspaceId, WORKSPACE)
  2. canAdminWorkspace(workspaceId) → WS ADMIN or Tenant ADMIN/OWNER
  3. Verify userId is a tenant member
  4. Verify no existing workspace_members row for this pair
  5. Insert workspace_members row
  6. Return updated member list
```

#### Adding a User to a Project

```
Who can do this: PROJECT LEAD, WORKSPACE ADMIN, TENANT ADMIN/OWNER

Project Lead opens Project → Members tab
        ↓
Clicks "Add Member"
        ↓
Member picker shows workspace members who are NOT yet project members
(NOT all tenant members — workspace gate applies)
        ↓
Selects member, assigns project role (LEAD/MEMBER/VIEWER)
        ↓
POST /api/projects/{projectId}/members
Body: { userId, role }

Backend:
  1. verifyResourceBelongsToTenant(projectId, PROJECT)
  2. canManageProjectMembers(projectId) → PROJECT LEAD or WS ADMIN
  3. Verify userId is a workspace member of project's workspace
     → if not: 400 "User must be added to the workspace first"
  4. Insert project_members row
  5. Return updated member list
```

#### Adding a User to a Team

```
Who can do this: TEAM LEAD, WORKSPACE ADMIN, TENANT ADMIN/OWNER

Team Lead opens Team → Members tab
        ↓
Clicks "Add Member"
        ↓
Member picker shows workspace members NOT yet in the team
        ↓
Selects member, assigns team role (LEAD/MEMBER)
        ↓
POST /api/teams/{teamId}/members
Body: { userId, role }

Backend:
  1. verifyResourceBelongsToTenant(teamId, TEAM)
  2. canManageTeamMembers(teamId) → TEAM LEAD or WS ADMIN
  3. Verify userId is workspace member of team's workspace
  4. Insert team_members row
  5. Return updated member list
```

---

### 5.10 Role Change Flow

#### Changing a Project Member's Role

```
Who can do this: PROJECT LEAD, WORKSPACE ADMIN, TENANT ADMIN/OWNER

Project Lead opens Project → Members tab
        ↓
Clicks role dropdown next to a member
        ↓
Options shown: LEAD, MEMBER, VIEWER
        ↓
PATCH /api/projects/{projectId}/members/{userId}/role
Body: { role: "LEAD" }

Backend:
  1. verifyResourceBelongsToTenant(projectId, PROJECT)
  2. canManageProjectMembers(projectId)
  3. If new role != LEAD, check last-lead invariant:
     If target is currently LEAD:
       count = countByProjectIdAndRole(projectId, LEAD)
       if count == 1: throw 400 "Cannot demote the last project lead"
  4. UPDATE project_members SET role = newRole WHERE project_id = ? AND user_id = ?
  5. Create task_activities equivalent for project: ROLE_CHANGED event
```

#### Changing a Team Member's Role

```
Same pattern as project role change.
PATCH /api/teams/{teamId}/members/{userId}/role

Backend enforces: cannot demote last TEAM LEAD
```

---

### 5.11 Project Progress Sharing Flow

**Who can do this:** PROJECT LEAD, WORKSPACE ADMIN, TENANT ADMIN, TENANT OWNER.

```
Project Lead opens project settings → Sharing tab
        ↓
Clicks "Generate Progress Link"
        ↓
SHARING CONFIG PANEL opens:

  Scope: PROJECT (locked — workspace/team sharing is Phase 5)

  What to show:
    [✓] Task status breakdown (chart)
    [✓] Milestone progress
    [✓] Project name and description
    [✓] Team names (not member names)
    [ ] Published docs
    [ ] Assignee names (default off for privacy)

  Password protection: [optional]
  Expires: [7 days / 30 days / Never]
  Max views: [Unlimited]

  [Generate Link]
        ↓
POST /api/projects/{projectId}/share
Body: {
  scope: { showTasks: true, showMilestones: true, showDocs: false, showAssigneeNames: false },
  passwordHash: bcrypt(password) or null,
  expiresAt: date or null
}

Backend:
  1. verifyResourceBelongsToTenant(projectId, PROJECT)
  2. canManageProjectMembers(projectId) → PROJECT LEAD or WS ADMIN
  3. Generate secure random token
  4. Insert shareable_links row:
     token, scope_type=PROJECT, project_id,
     scope=JSONB, password_hash, expires_at,
     is_active=true, access_count=0
  5. Return: { token, shareUrl }

Generated URL format:
  hivespace.app/share/acmecorp/project/{token}

STAKEHOLDER ACCESS (public, no login):

  Stakeholder opens URL in browser
        ↓
  app/(public)/share/[orgSlug]/project/[token]/page.tsx
        ↓
  If password protected: show password prompt
        ↓
  GET /api/share/{token}?orgSlug=acmecorp
  (+ password in body if protected)

  Backend:
    1. Find shareable_links WHERE token = ? AND is_active = true
    2. Check expires_at > now() or null
    3. Verify slug matches token's project's workspace's tenant's slug
    4. If password_hash: BCrypt.verify(submittedPassword, hash)
    5. Async (non-blocking): UPDATE shareable_links
       SET access_count++, last_accessed_at = now()
    6. Read scope JSONB to determine what to return
    7. Return scoped public data:
       - project name + description + status
       - task counts by status (TODO/IN_PROGRESS/IN_REVIEW/DONE/CANCELLED)
       - milestone progress if showMilestones=true
       - published docs list if showDocs=true
       - team names if scope allows (never member details)

  Public page shows:
    Clean, no-sidebar layout
    Acme Corp branding (org name)
    Project name
    Progress chart
    Last updated timestamp
    "Powered by Hivespace" footer

PROJECT LEAD's link management view:
  List of active links with:
  - Created date
  - Expires date (or "Never")
  - Access count
  - Last accessed date (tells them if stakeholder viewed it)
  - [Revoke] button per link

  Revoking:
  PATCH /api/share/{linkId}/revoke
  Backend: UPDATE shareable_links SET is_active = false
```

---

## 6. Role-by-Role User Journeys

### 6.1 Org Owner Journey

Day 1:
1. Signs up → creates org "Acme Corp" → slug "acmecorp"
2. Creates "Engineering" workspace (automatically becomes workspace ADMIN)
3. Creates "Design" workspace
4. Generates invite link (role: ADMIN, workspace: Engineering) → sends to CTO
5. Generates invite link (role: MEMBER, workspaces: Engineering+Design) → sends to team

Ongoing:
- Monitors member list, removes departed employees
- Manages billing plan as team grows
- Creates new workspaces for new departments
- Can override any action in any workspace/project/team if needed
- Transfers ownership to CTO if stepping back

### 6.2 Org Admin Journey

Invited as ADMIN by Owner:
1. Accepts invite → lands in Engineering workspace
2. Creates "Backend Sprint Q3" project
3. Invites 5 developers as MEMBER to the org with Engineering+Backend Team access
4. Adds developers who join to the project

Ongoing:
- Manages Engineering workspace members
- Creates new projects for new features
- Cannot touch billing (Owner does that)
- Cannot demote/remove other Admins

### 6.3 Billing Admin Journey

Invited as BILLING_ADMIN by Owner or Admin:
1. Accepts invite → lands on Billing page directly
2. Updates payment method
3. Downloads monthly invoice for accounting
4. Monitors seat count before budget review

Has NO access to:
- Dashboard
- Projects, tasks, teams
- Member directory
- Anything except the billing portal

### 6.4 Workspace Admin Journey

Promoted to WORKSPACE ADMIN of Engineering by Org Admin:
1. Creates "Auth Service Redesign" project → becomes project lead
2. Adds team members to the project from existing workspace members
3. Assigns Backend Team to the project
4. Creates the Kanban board columns, starts sprint
5. Can override team leads if needed (member removal, role changes)

Cannot do:
- Invite new people to the org (Org Admin privilege)
- Access other workspaces they are not a member of
- Create/edit tasks without being a project member (must add self to project first)

### 6.5 Project Lead Journey

Created project (or assigned as lead during project creation):
1. Project is created → automatically has LEAD role in project_members
2. Adds workspace members to the project (MEMBER or VIEWER)
3. Assigns Backend Team to the project (team's tasks can now be team-scoped)
4. Creates tasks on the Kanban board
5. Assigns tasks to project members
6. Generates stakeholder sharing link → sends to client
7. Moves tasks between columns as sprint progresses
8. Archives project when complete

Cannot do:
- Manage workspace membership (workspace admin privilege)
- Remove workspace members from workspace
- Cannot demote the last project lead (backend invariant)

### 6.6 Project Member Journey

Added to project by Project Lead or Workspace Admin:
1. Receives notification: "You've been added to Auth Service Redesign"
2. Opens project board → sees all tasks
3. Creates task "Fix JWT expiry bug" → automatically becomes task OWNER
4. Adds Sanjay as REVIEWER on the task
5. Updates task description, changes priority to URGENT
6. Moves task from TODO to IN_PROGRESS by dragging on board
7. Moves to IN_REVIEW → Sanjay receives notification
8. Sanjay approves → task moves to DONE

Cannot do:
- Delete tasks (project lead only)
- Manage project membership
- Generate sharing links
- Add assignees to tasks they don't own

### 6.7 Project Viewer Journey

Added as VIEWER (typically a stakeholder who is also a tenant member):
1. Can view all tasks and their details
2. Can view task activity logs
3. Sees the board in read-only mode (no drag-and-drop)
4. Cannot create, edit, or delete anything
5. Can remove themselves from the project

### 6.8 Team Lead Journey

Created a team (or assigned as lead):
1. Team created → automatically TEAM LEAD in team_members
2. Adds workspace members to the team
3. Team is assigned to "Auth Service Redesign" project (by Project Lead or WS Admin)
4. Team members can be assigned to tasks within that project
5. Can promote a member to co-lead
6. Cannot be the last lead to remove themselves (backend prevents it)

### 6.9 Team Member Journey

Added to Backend Team by Team Lead:
1. Receives notification: "You've been added to Backend Team"
2. Team is assigned to a project → member can now be assigned tasks in that project
3. Project Lead adds them to project_members explicitly before assigning tasks
4. Works on tasks, moves through board statuses
5. Can leave the team themselves (self-removal)
6. Cannot manage other team members

---

## 7. Authorization Rules — Backend Enforcement

### 7.1 Rules That Cannot Be Bypassed

These are hard invariants enforced at the service layer. No role override can bypass them.

1. **Last Lead Invariant (Teams)**
   `countByTeamIdAndRole(teamId, LEAD) == 1` blocks demotion/removal of that lead.
   Error: 400 "Cannot remove or demote the last team lead."

2. **Last Lead Invariant (Projects)**
   `countByProjectIdAndRole(projectId, LEAD) == 1` blocks demotion/removal.
   Error: 400 "Cannot remove or demote the last project lead."

3. **Tenant Boundary**
   Every resource operation verifies the resource's tenant chain matches currentUser.tenant_id.
   Error: 403 "Access denied."

4. **Workspace Gate**
   Adding a user to a project or team requires that user to already be a workspace member.
   Error: 400 "User must be added to the workspace first."

5. **PIN Rate Limiting**
   5 failed PIN attempts per token per IP per hour → 429 Too Many Requests.
   Tracked in invitation_attempts table.

6. **Task Must Have Owner**
   Cannot delete the last task_assignees OWNER row without replacing it.
   task_assignees for any task must always have exactly one row with role=OWNER.

7. **Invite Scope Belongs to Tenant**
   All workspaceIds, teamIds, projectId on an invitation must belong to the same tenant.
   Error: 400 "Scope references invalid tenant."

8. **Inviter Cannot Assign Higher Role Than Own**
   ADMIN cannot generate invites with tenantRole=ADMIN (OWNER privilege only).
   BILLING_ADMIN cannot generate any invites.
   Error: 403 "Insufficient privileges to assign this role."

### 7.2 Standard Authorization Check Order

Every mutable backend service method follows this exact order:

```
1. Get currentUser (from JWT via RbacService.getCurrentUser())
2. verifyResourceBelongsToTenant(resourceId, ResourceType)
3. Check capability: canXxx(resourceId) or hasXxxRole(id, RequiredRole)
4. Check invariants (e.g., last-lead check before demotion)
5. Execute business logic
6. Log activity if applicable
7. Return response
```

Never skip step 2. Never skip step 3. Never merge steps.

---

## 8. Frontend Gating Rules

### 8.1 How Frontend Checks Permissions

Never use raw role strings for comparisons on the frontend. Always use the scoped
capability functions from `lib/permissions/`.

```typescript
// WRONG — string comparison, cross-scope risk
if (userRole === 'LEAD') showButton()

// RIGHT — scoped capability function
const { canCreateTask } = usePermission()
if (canCreateTask(currentProjectRole)) showButton()
```

### 8.2 What to Show vs Hide

| User Cannot Do Action | Frontend Behavior |
|---|---|
| Create project (not WS Admin) | Hide "New Project" button entirely |
| Create task (project VIEWER) | Disable task create, show tooltip "Viewers cannot create tasks" |
| Delete task (not project LEAD) | Hide delete option in task context menu |
| Manage members (not LEAD/ADMIN) | Hide "Add Member" button |
| Access billing (not OWNER/BILLING_ADMIN) | Hide Billing section in settings sidebar entirely |
| Manage team (not TEAM LEAD/WS ADMIN) | Disable action buttons with tooltip |
| Generate invite (not OWNER/ADMIN) | Hide Invite button in members settings |

### 8.3 403 Handling

When backend returns 403, frontend must:
1. Not crash or show a blank screen
2. Show a clear "You don't have permission to do this" state
3. Suggest what the user should do ("Contact your workspace admin")
4. Log the event (useful for debugging permission issues)

Never silently swallow 403 errors.

### 8.4 Elements That Must Never Show for BILLING_ADMIN

- Dashboard (redirect to /settings/billing on login)
- Sidebar with workspaces/projects/teams
- Member directory
- Any project board or task
- Any invite controls

---

## 9. Edge Cases & Invariants

### 9.1 What Happens When a User Is Removed from the Org

When `DELETE /api/tenants/{tenantId}/members/{userId}` is called:

```
Backend (all in @Transactional):
  1. Remove tenant_members row
  2. Remove all workspace_members rows for this user in this tenant's workspaces
  3. Remove all project_members rows for this user in this tenant's projects
  4. Remove all team_members rows for this user in this tenant's teams
  5. Remove all task_assignees rows where user is COLLABORATOR or REVIEWER
  6. For tasks where user is OWNER:
     - If task has other assignees: promote oldest COLLABORATOR to OWNER
     - If task has no other assignees: set tasks.created_by only, leave unassigned
       (task is orphaned — project lead must reassign manually)
  7. Set users.tenant_id = null if this was their active tenant
  8. Invalidate user's JWT (force re-login)

Note: Task data is preserved. Only membership is removed.
```

### 9.2 What Happens When a Project Lead Leaves a Project

```
Self-removal:
  Check last-lead invariant — if this user is the last LEAD, prevent removal.
  Error: "You are the last project lead. Assign another lead before leaving."

Forced removal by Workspace Admin:
  Same invariant applies — backend prevents removing last lead.
  Workspace Admin must first promote another member to LEAD.
```

### 9.3 What Happens When a Team Is Deleted

```
Backend (all in @Transactional):
  1. Remove all team_members rows (CASCADE handles this)
  2. Remove all project_teams rows referencing this team
  3. Set tasks.team_id = NULL for all tasks assigned to this team (ON DELETE SET NULL)
  4. Delete teams row

Note: Tasks are NOT deleted. They just lose their team_id association.
```

### 9.4 What Happens When a Project Is Archived

```
status changes to ARCHIVED (not deleted)
  - Tasks are preserved in read-only state
  - Project board becomes read-only
  - Project no longer appears in active project lists by default
  - Shareable links remain active (Project Lead can manually revoke)
  - Team assignments remain (in project_teams)

Re-activation: status can be changed back to ACTIVE by PROJECT LEAD or WS ADMIN
```

### 9.5 Invite Token Security

```
- Token is a cryptographically random UUID/string from SecureRandom
- Stored as SHA-256 hash in invitations.token — raw token never stored
- URL contains raw token — backend hashes on lookup
- PIN is BCrypt hashed — raw PIN never stored after generation
- PIN shown ONLY in the creation response — never retrievable after
- Failed PIN attempts tracked per IP per token — rate limited at 5/hour
- Expired tokens return 400 "Invite has expired" not 404 (avoid enumeration)
- Exhausted tokens return 400 "Invite has been fully used"
- Revoked tokens return 400 "Invite has been revoked"
```

### 9.6 Multi-Tenant User Access

```
A user can belong to multiple tenants via tenant_members rows.
However users.tenant_id stores only ONE active tenant at a time.

Backend verifyResourceBelongsToTenant uses users.tenant_id as the boundary.

To switch active tenant:
  POST /api/auth/switch-tenant
  Body: { tenantId: "target-tenant-uuid" }
  Backend:
    1. Verify tenant_members row exists for currentUser + targetTenantId
    2. UPDATE users SET tenant_id = targetTenantId
    3. Issue new JWT with updated tenantId claim
    4. Return new JWT

Frontend must call this endpoint when user switches org in the UI.
Client-side-only org switching will cause 403 errors.
Until this endpoint is built: disable org switching in the NavRail.
```

---

## 10. API Endpoint Authorization Map

### Tenant Endpoints

| Method | Path | Min Required Role |
|---|---|---|
| POST | `/api/tenants` | Any authenticated user |
| GET | `/api/tenants/me` | Any authenticated user |
| GET | `/api/tenants/{id}/members` | Tenant MEMBER (not BILLING_ADMIN) |
| PUT | `/api/tenants/{id}/members/{uid}/role` | Tenant OWNER or ADMIN |
| DELETE | `/api/tenants/{id}/members/{uid}` | Tenant OWNER or ADMIN |

### Invitation Endpoints

| Method | Path | Min Required Role |
|---|---|---|
| POST | `/api/i/generate` | Tenant OWNER or ADMIN |
| GET | `/api/i/t/{tenantId}` | Tenant OWNER or ADMIN |
| GET | `/api/i/validate` | Public (no auth) |
| POST | `/api/i/join` | Authenticated user |
| DELETE | `/api/i/{id}` | Tenant OWNER or ADMIN |

### Auth Endpoints

| Method | Path | Min Required Role |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/refresh` | Authenticated |
| POST | `/api/auth/switch-tenant` | Authenticated + tenant_members row |

### Workspace Endpoints

| Method | Path | Min Required Role |
|---|---|---|
| POST | `/api/workspaces` | Tenant ADMIN or OWNER |
| GET | `/api/workspaces/t/{tenantId}` | Tenant MEMBER+ |
| GET | `/api/workspaces/{id}` | Workspace VIEWER+ |
| GET | `/api/workspaces/{id}/members` | Workspace VIEWER+ |
| POST | `/api/workspaces/{id}/members` | Workspace ADMIN |
| PATCH | `/api/workspaces/{id}/members/{uid}/role` | Workspace ADMIN |
| DELETE | `/api/workspaces/{id}/members/{uid}` | Workspace ADMIN |

### Project Endpoints

| Method | Path | Min Required Role |
|---|---|---|
| POST | `/api/workspaces/{id}/projects` | Workspace ADMIN |
| GET | `/api/workspaces/{id}/projects` | Workspace VIEWER+ |
| GET | `/api/projects/{id}` | Project VIEWER+ or WS ADMIN |
| PUT | `/api/projects/{id}` | Project LEAD or WS ADMIN |
| GET | `/api/projects/{id}/members` | Project VIEWER+ |
| POST | `/api/projects/{id}/members` | Project LEAD or WS ADMIN |
| PATCH | `/api/projects/{id}/members/{uid}/role` | Project LEAD or WS ADMIN |
| DELETE | `/api/projects/{id}/members/{uid}` | Project LEAD or WS ADMIN (or self) |
| POST | `/api/projects/{id}/teams` | Project LEAD or WS ADMIN |
| DELETE | `/api/projects/{id}/teams/{tid}` | Project LEAD or WS ADMIN |
| POST | `/api/projects/{id}/share` | Project LEAD or WS ADMIN |

### Team Endpoints

| Method | Path | Min Required Role |
|---|---|---|
| POST | `/api/workspaces/{id}/teams` | Workspace MEMBER+ |
| GET | `/api/workspaces/{id}/teams` | Workspace VIEWER+ |
| GET | `/api/teams/{id}` | Team MEMBER or WS ADMIN |
| PUT | `/api/teams/{id}` | Team LEAD or WS ADMIN |
| DELETE | `/api/teams/{id}` | Team LEAD or WS ADMIN |
| GET | `/api/teams/{id}/members` | Team MEMBER or WS ADMIN |
| POST | `/api/teams/{id}/members` | Team LEAD or WS ADMIN |
| PATCH | `/api/teams/{id}/members/{uid}/role` | Team LEAD or WS ADMIN |
| DELETE | `/api/teams/{id}/members/{uid}` | Team LEAD or WS ADMIN (or self) |

### Task Endpoints

| Method | Path | Min Required Role |
|---|---|---|
| POST | `/api/projects/{id}/tasks` | Project MEMBER+ |
| GET | `/api/projects/{id}/tasks` | Project VIEWER+ |
| GET | `/api/tasks` | Tenant MEMBER+ (returns own tasks only) |
| GET | `/api/tasks/{id}` | Project VIEWER+ |
| PUT | `/api/tasks/{id}` | Project MEMBER+ |
| PATCH | `/api/tasks/{id}/status` | Project MEMBER+ |
| DELETE | `/api/tasks/{id}` | Project LEAD or WS ADMIN |
| GET | `/api/tasks/{id}/assignees` | Project VIEWER+ |
| POST | `/api/tasks/{id}/assignees` | Task OWNER, Project LEAD, or WS ADMIN |
| PATCH | `/api/tasks/{id}/assignees/owner` | Task OWNER, Project LEAD, or WS ADMIN |
| DELETE | `/api/tasks/{id}/assignees/{uid}` | Self, Task OWNER, Project LEAD, or WS ADMIN |

### Share Endpoints (Public)

| Method | Path | Auth Required |
|---|---|---|
| GET | `/api/share/{token}` | No (public) |
| PATCH | `/api/share/{linkId}/revoke` | Yes — Project LEAD or WS ADMIN |

---
