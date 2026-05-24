# Hivespace — Lead Assignment, Task Creation & Assignment Flow Reference

> **Primary reference for coding agents working on lead assignment,
> task creation, and task assignment features.**
> Treat every rule in this document as non-negotiable.
> Do not deviate without updating this document first.
>
> Last updated: 2026-05-23

---

## Table of Contents

1. [Project Lead Assignment](#1-project-lead-assignment)
2. [Team Lead Assignment](#2-team-lead-assignment)
3. [Task Creation — Complete Flow](#3-task-creation--complete-flow)
4. [Task Assignment — Complete Flow](#4-task-assignment--complete-flow)
5. [Task Status Transitions](#5-task-status-transitions)
6. [Task Identifier Generation](#6-task-identifier-generation)
7. [Subtask Flow](#7-subtask-flow)
8. [Backend Service Contracts](#8-backend-service-contracts)
9. [Frontend Component Contracts](#9-frontend-component-contracts)
10. [Database Operations Reference](#10-database-operations-reference)
11. [Error Handling Reference](#11-error-handling-reference)

---

## 1. Project Lead Assignment

### 1.1 Rules

- Every project must have **at least one LEAD at all times** — this is a hard invariant
- A project can have **multiple LEADs simultaneously** (no upper limit)
- The LEAD must already be a **workspace member** of the project's workspace
  before they can be assigned as LEAD — backend enforces this
- The LEAD does not need to be a project member before being assigned LEAD —
  the LEAD assignment creates their project membership simultaneously
- Creator of a project becomes LEAD automatically unless `leadUserId` is explicitly
  provided during creation
- If `leadUserId` is provided during creation and equals the creator, only one
  project_members row is created (not two)
- If `leadUserId` is provided and differs from the creator, two rows are created:
  `leadUserId → LEAD` and `creatorId → MEMBER`

### 1.2 Assignment During Project Creation

**Who can specify a lead:** WORKSPACE ADMIN, TENANT ADMIN, TENANT OWNER only
(these are the only roles allowed to create projects).

**Request shape:**

```json
POST /api/workspaces/{workspaceId}/projects
{
  "name": "Auth Service Redesign",
  "description": "Redesign the authentication flow",
  "color": "#6366f1",
  "startDate": "2025-02-01T00:00:00Z",
  "endDate": "2025-03-31T00:00:00Z",
  "leadUserId": "uuid-of-intended-lead-or-null"
}
```

**Backend logic (ProjectService.createProject):**

```
Step 1: verifyResourceBelongsToTenant(workspaceId, WORKSPACE)
Step 2: canCreateProject(workspaceId)
        → must be WORKSPACE ADMIN or Tenant ADMIN/OWNER
        → throws 403 if insufficient

Step 3: If leadUserId is provided:
        a. Verify leadUserId != null and is a valid UUID
        b. workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, leadUserId)
           → if false: throw 400 "Assigned lead must be a workspace member first"
        c. Fetch lead user's details for response

Step 4: BEGIN @Transactional

  a. INSERT INTO projects:
     (id, name, description, color, workspace_id,
      start_date, end_date, created_by, status='ACTIVE',
      task_sequence=0, created_at, updated_at)

  b. Determine LEAD user:
     leadId = leadUserId ?? currentUserId

  c. INSERT INTO project_members:
     (id, project_id, user_id=leadId, role='LEAD', joined_at)

  d. If leadUserId is provided AND leadUserId != currentUserId:
     INSERT INTO project_members:
     (id, project_id, user_id=currentUserId, role='MEMBER', joined_at)

  e. INSERT INTO task_activities equivalent:
     (This is a project-level event log if you have one,
      or skip for now and add when project activity log is built)

Step 5: COMMIT

Step 6: Return ProjectResponse with:
  - project details
  - lead user details
  - creator details (may differ from lead)
  - member count
```

**Frontend (CreateProjectModal.tsx):**

```
Form fields:
  Name:         [text input, required, min 1 char, max 100 chars]
  Description:  [textarea, optional, max 500 chars]
  Color:        [color picker, optional, default #6366f1]
  Start Date:   [date picker, optional]
  End Date:     [date picker, optional]
                Validation: end date must be after start date if both provided
  Project Lead: [member picker, optional]
                Source: GET /api/workspaces/{workspaceId}/members
                Placeholder: "Default: You"
                Shows: avatar + full name + username for each member
                Search: filter by name/username as user types
                If user selects themselves explicitly: same as leaving it blank
                Note below picker: "Must already be a workspace member"

Submission:
  Validate name not empty
  Validate dates if provided
  POST /api/workspaces/{workspaceId}/projects with leadUserId (null if not selected)

On success:
  Close modal
  Add project to workspace sidebar
  Navigate to new project board
  Show toast: "Project created. You are the [lead/member]."

On 400 "Assigned lead must be a workspace member first":
  Show inline error below lead picker:
  "This person is not yet in this workspace. Add them to the workspace first."
  Do not close modal
```

### 1.3 Changing a Project Lead After Creation

**Who can change leads:** PROJECT LEAD, WORKSPACE ADMIN, TENANT ADMIN, TENANT OWNER.

**Scenario A — Promote existing member to LEAD:**

```
PATCH /api/projects/{projectId}/members/{userId}/role
Body: { "role": "LEAD" }

Backend:
  1. verifyResourceBelongsToTenant(projectId, PROJECT)
  2. canManageProjectMembers(projectId)
  3. Verify userId is an existing project_members row
  4. UPDATE project_members SET role = 'LEAD'
     WHERE project_id = ? AND user_id = ?
  5. Create activity log entry: ROLE_CHANGED, old=MEMBER, new=LEAD
  6. Return updated member
```

**Scenario B — Add a new workspace member directly as LEAD:**

```
POST /api/projects/{projectId}/members
Body: { "userId": "uuid", "role": "LEAD" }

Backend:
  1. verifyResourceBelongsToTenant(projectId, PROJECT)
  2. canManageProjectMembers(projectId)
  3. workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)
     → 400 if not workspace member
  4. Check no existing project_members row (UNIQUE constraint)
     → 409 if already a member
  5. INSERT INTO project_members (project_id, userId, role=LEAD)
  6. Create activity log entry: MEMBER_ADDED with role=LEAD
  7. Return new member
```

**Scenario C — Demote current LEAD to MEMBER:**

```
PATCH /api/projects/{projectId}/members/{userId}/role
Body: { "role": "MEMBER" }

Backend:
  1. verifyResourceBelongsToTenant(projectId, PROJECT)
  2. canManageProjectMembers(projectId)
  3. Check last-lead invariant:
     leadCount = projectMemberRepository.countByProjectIdAndRole(projectId, LEAD)
     currentRole = projectMemberRepository.findRole(projectId, userId)
     If currentRole == LEAD AND leadCount == 1:
       throw 400 "Cannot demote the last project lead.
                  Assign another lead before demoting this one."
  4. UPDATE project_members SET role = 'MEMBER'
  5. Activity log: ROLE_CHANGED
  6. Return updated member
```

**Frontend — Project Members Tab:**

```
Member list shows each member with:
  [Avatar] [Full Name] [Username] [Role Badge] [Actions dropdown]

Role Badge colors:
  LEAD   → amber/yellow badge
  MEMBER → blue badge
  VIEWER → gray badge

Actions dropdown (visible only if canManageProjectMembers):
  "Promote to Lead"    → visible for MEMBER and VIEWER rows
  "Change to Member"   → visible for LEAD rows (disabled if last lead, with tooltip)
  "Change to Viewer"   → visible for LEAD and MEMBER rows
  "Remove from Project" → visible for all rows
                          (disabled for last lead, with tooltip "Assign another lead first")

Last lead row behavior:
  "Change to Member" option: disabled, tooltip = "Assign another lead first"
  "Remove" option: disabled, tooltip = "Assign another lead first"
  The LEAD badge has a 👑 icon or star to indicate "last lead" status
```

### 1.4 Project Lead Invariant Enforcement Summary

| Action | Allowed | Blocked By |
|---|---|---|
| Demote last lead to MEMBER | ❌ | Backend + Frontend |
| Remove last lead | ❌ | Backend + Frontend |
| Last lead self-leave | ❌ | Backend |
| Add second lead | ✅ | — |
| Demote one of two leads | ✅ | — |
| Remove one of two leads | ✅ | — |
| Transfer: promote new → demote old | ✅ | Do in two separate calls |

---

## 2. Team Lead Assignment

### 2.1 Rules

- Every team must have **at least one LEAD at all times** — hard invariant
- A team can have **multiple LEADs** (no upper limit)
- The LEAD must already be a **workspace member** before being assigned LEAD
- Creator becomes LEAD automatically unless `leadUserId` is explicitly provided
- Same dual-row creation logic as projects applies

### 2.2 Assignment During Team Creation

**Who can create teams:** WORKSPACE MEMBER and above.

```json
POST /api/workspaces/{workspaceId}/teams
{
  "name": "Backend Team",
  "description": "Server-side development team",
  "leadUserId": "uuid-or-null",
  "projectId": "uuid-or-null"
}
```

**Backend logic (TeamService.createTeam):**

```
Step 1: verifyResourceBelongsToTenant(workspaceId, WORKSPACE)
Step 2: canCreateTeam(workspaceId)
        → Workspace MEMBER+ or Tenant ADMIN/OWNER
        → Workspace VIEWER cannot create teams

Step 3: If leadUserId provided:
        workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, leadUserId)
        → 400 if not workspace member: "Assigned lead must be a workspace member first"

Step 4: If projectId provided:
        a. Verify project belongs to same workspace
           → 400 if not: "Project does not belong to this workspace"
        b. Verify caller has project MEMBER+ access
           → 403 if not: "Must be a project member to associate team"

Step 5: BEGIN @Transactional

  a. INSERT INTO teams:
     (id, name, description, workspace_id,
      created_by, created_at, updated_at)

  b. leadId = leadUserId ?? currentUserId

  c. INSERT INTO team_members:
     (id, team_id, user_id=leadId, role='LEAD', joined_at)

  d. If leadUserId provided AND leadUserId != currentUserId:
     INSERT INTO team_members:
     (id, team_id, user_id=currentUserId, role='MEMBER', joined_at)

  e. If projectId provided:
     INSERT INTO project_teams:
     (project_id, team_id, assigned_at, assigned_by=currentUserId)

Step 6: COMMIT
Step 7: Return TeamResponse
```

**Frontend (CreateTeamModal.tsx):**

```
Form fields:
  Name:         [text input, required, max 100 chars]
  Description:  [textarea, optional, max 500 chars]
  Team Lead:    [member picker, optional]
                Source: GET /api/workspaces/{workspaceId}/members
                Placeholder: "Default: You"
  Associate with Project: [project picker, optional]
                Source: GET /api/workspaces/{workspaceId}/projects
                Note: Only shows projects the current user is a member of
                      (backend will reject if not a project member anyway)

On success:
  Close modal
  Add team to sidebar
  Navigate to team page
  Show toast: "Team created. You are the [lead/member]."
```

### 2.3 Changing a Team Lead After Creation

Identical pattern to project lead changes. Same three scenarios, same invariant checks.

```
Promote to lead:    PATCH /api/teams/{teamId}/members/{userId}/role { role: "LEAD" }
Add new as lead:    POST  /api/teams/{teamId}/members { userId, role: "LEAD" }
Demote from lead:   PATCH /api/teams/{teamId}/members/{userId}/role { role: "MEMBER" }
                    → blocked if last lead
```

**Backend invariant:**

```java
private void checkLastLeadInvariant(UUID teamId, UUID userId) {
    TeamMember member = teamMemberRepository
        .findByTeamIdAndUserId(teamId, userId)
        .orElseThrow(() -> new ResourceNotFoundException("Member not found"));

    if (!member.getRole().equals(TeamMemberRole.LEAD)) return;

    long leadCount = teamMemberRepository.countByTeamIdAndRole(teamId, TeamMemberRole.LEAD);
    if (leadCount == 1) {
        throw new SecurityException(
            "Cannot demote or remove the last team lead. " +
            "Assign another lead before making this change."
        );
    }
}
```

---

## 3. Task Creation — Complete Flow

### 3.1 Pre-conditions

Before any task creation attempt:
- User must be authenticated (valid JWT)
- User must be a PROJECT MEMBER or PROJECT LEAD
- PROJECT VIEWER cannot create tasks — hard block
- WORKSPACE ADMIN cannot create tasks unless they are also a project member

### 3.2 Quick Create (Inline Kanban)

**Trigger:** User clicks `+` at bottom of any Kanban column.

```
UI BEHAVIOR:

1. Click [+] in TODO column
   → Inline input field appears at bottom of that column
   → Input is auto-focused
   → Placeholder text: "Task title... (Enter to create, Esc to cancel)"

2. User types title:
   → Character count shown if approaching limit (max 255 chars)
   → No other fields visible

3. User presses Enter:
   → Validate: title is not empty (trim whitespace first)
   → If empty after trim: show shake animation, do not submit
   → If valid: proceed to optimistic create

4. OPTIMISTIC CREATE:
   → Immediately insert ghost card at top of that column
   → Ghost card shows:
      - Title text
      - Spinner/skeleton in place of identifier
      - Current user avatar (they will be OWNER)
      - MEDIUM priority badge (gray)
      - No due date
   → Input clears and stays open for next task (user can type another)

5. POST /api/projects/{projectId}/tasks
   Body: {
     title: "trimmed title",
     status: "TODO"  ← status of the column user clicked
   }
   All other fields use backend defaults.

6a. SUCCESS response:
    → Replace ghost card with real card
    → Real card shows: HS-{n} identifier, title, MEDIUM priority, owner avatar
    → Input field stays open (user can keep creating tasks)
    → No toast needed — card appearance is confirmation

6b. FAILURE response:
    → Remove ghost card immediately
    → Show toast: "Failed to create task. Please try again."
    → Input retains the typed title so user doesn't lose it
    → Focus returns to input

7. User presses Escape:
   → Cancel inline create
   → Remove input field
   → No API call made

KEYBOARD SHORTCUTS in quick create:
  Enter        → create task
  Shift+Enter  → insert newline (if description was inline — not in quick create)
  Escape       → cancel
  Tab          → confirm title and open full create modal with this title pre-filled
                 (power user flow to add more details)
```

### 3.3 Full Create (Modal)

**Trigger:** "New Task" button (top-right of board), keyboard shortcut `C`,
or `Tab` from inline create.

```
MODAL OPEN BEHAVIOR:
  Animate in from right or center (design choice)
  Auto-focus on title field
  If triggered from Tab in inline create: pre-fill title, cursor at end

FORM LAYOUT:

┌─────────────────────────────────────────────────────┐
│  New Task                                     [×]   │
├─────────────────────────────────────────────────────┤
│  Title *                                            │
│  [                                               ]  │
│                                                     │
│  Description                                        │
│  [  Tiptap editor area (simple for now)          ]  │
│                                                     │
│  Status          Priority                           │
│  [TODO      ▾]   [MEDIUM     ▾]                     │
│                                                     │
│  Due Date        Story Points                       │
│  [📅 Pick date]  [  ] pts                           │
│                                                     │
│  Assignee (Owner)                                   │
│  [👤 Search members...]                             │
│  Note: defaults to you if unselected               │
│                                                     │
│  Team (Optional)                                    │
│  [Select team assigned to this project...]          │
│                                                     │
│  Labels                                             │
│  [bug] [frontend] [+ Add label]                     │
│                                                     │
│  Parent Task (Optional — creates subtask)           │
│  [🔍 Search existing tasks...]                      │
│                                                     │
│            [Cancel]  [Create Task ▶]                │
└─────────────────────────────────────────────────────┘

FIELD VALIDATIONS:
  Title:
    - Required
    - Min 1 char after trim
    - Max 255 chars
    - Show char count at 200+

  Description:
    - Optional
    - No length limit (stored as TEXT)

  Status:
    - Required, default: TODO
    - Options: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED
    - If opened from a column: pre-select that column's status

  Priority:
    - Required, default: MEDIUM
    - Options with visual indicators:
      🔴 URGENT, 🟠 HIGH, 🟡 MEDIUM, 🔵 LOW

  Due Date:
    - Optional
    - Cannot be in the past (show warning but do not block)
    - Time component: always midnight of selected date

  Story Points:
    - Optional integer
    - Quick-select buttons: 1, 2, 3, 5, 8, 13 (Fibonacci)
    - Or type custom number

  Assignee (Owner):
    Source: GET /api/projects/{projectId}/members
    - Filter in real-time as user types
    - Show avatar + name + username for each
    - Show current user at top with "(You)" label
    - Selecting someone else: shows "They will be the task owner"
    - Leaving blank: shows "You will be the task owner"

  Team:
    Source: GET /api/projects/{projectId}/teams
    (teams assigned to this project via project_teams)
    - Optional
    - Only shows teams assigned to this specific project

  Labels:
    - Free-form tags
    - Stored as comma-separated string in tasks.labels
    - Frontend splits/joins on comma
    - Show existing labels as pills, click to remove

  Parent Task:
    Source: GET /api/projects/{projectId}/tasks?excludeSubtasks=true
    - Search by title or identifier (HS-001)
    - Cannot select current task as its own parent
    - Selecting a parent makes this a subtask
    - Subtasks do not appear on the main Kanban board

SUBMISSION:

  User clicks "Create Task":
    1. Validate all required fields
    2. Show loading state on button: "Creating..."
    3. POST /api/projects/{projectId}/tasks
       Body: {
         title: string,
         description: string | null,
         status: string,
         priority: string,
         dueDate: ISO string | null,
         points: number | null,
         labels: string | null,
         assigneeId: string | null,
         teamId: string | null,
         parentId: string | null
       }

  On SUCCESS:
    - Close modal
    - If parentId is null: add card to correct Kanban column
    - If parentId is set: refresh parent task's subtask list
    - Show toast: "Task HS-{n} created"

  On FAILURE:
    - Keep modal open
    - Show specific error inline
    - Reset button to "Create Task"
    - Preserve all form data
```

### 3.4 Backend Task Creation Logic

```java
@Transactional
public TaskResponse createTask(UUID projectId, CreateTaskRequest request, UUID currentUserId) {

    // Step 1: Tenant boundary
    rbacService.verifyResourceBelongsToTenant(projectId, ResourceType.PROJECT);

    // Step 2: Authorization
    if (!rbacService.canCreateTask(projectId)) {
        throw new SecurityException("Must be a project member to create tasks. " +
                                    "Viewers cannot create tasks.");
    }

    // Step 3: Validate assignee if provided
    if (request.getAssigneeId() != null) {
        boolean isProjectMember = projectMemberRepository
            .existsByProjectIdAndUserId(projectId, request.getAssigneeId());
        if (!isProjectMember) {
            throw new BadRequestException(
                "Assignee must be a project member. " +
                "Add them to the project first."
            );
        }
    }

    // Step 4: Validate team if provided
    if (request.getTeamId() != null) {
        boolean isAssignedToProject = projectTeamRepository
            .existsByProjectIdAndTeamId(projectId, request.getTeamId());
        if (!isAssignedToProject) {
            throw new BadRequestException(
                "Team must be assigned to this project. " +
                "Assign the team to the project first."
            );
        }
    }

    // Step 5: Validate parent task if provided
    if (request.getParentId() != null) {
        Task parent = taskRepository.findById(request.getParentId())
            .orElseThrow(() -> new ResourceNotFoundException("Parent task not found"));
        if (!parent.getProjectId().equals(projectId)) {
            throw new BadRequestException("Parent task must belong to the same project");
        }
        if (parent.getParentId() != null) {
            throw new BadRequestException("Cannot nest subtasks more than one level deep");
        }
    }

    // Step 6: Atomic sequence increment
    int sequence = projectRepository.incrementAndGetTaskSequence(projectId);
    // SQL: UPDATE projects SET task_sequence = task_sequence + 1
    //      WHERE id = ? RETURNING task_sequence
    // This is atomic — prevents duplicate identifiers under concurrent inserts

    // Step 7: Create task
    Task task = Task.builder()
        .title(request.getTitle().trim())
        .description(request.getDescription())
        .status(request.getStatus() != null ? request.getStatus() : TaskStatus.TODO)
        .priority(request.getPriority() != null ? request.getPriority() : TaskPriority.MEDIUM)
        .dueDate(request.getDueDate())
        .points(request.getPoints())
        .labels(request.getLabels())
        .projectId(projectId)
        .teamId(request.getTeamId())
        .parentId(request.getParentId())
        .createdBy(currentUserId)
        .sequence(sequence)
        .build();

    task = taskRepository.save(task);

    // Step 8: Create owner assignee
    UUID ownerId = request.getAssigneeId() != null
        ? request.getAssigneeId()
        : currentUserId;

    TaskAssignee ownerAssignee = TaskAssignee.builder()
        .taskId(task.getId())
        .userId(ownerId)
        .role(TaskAssigneeRole.OWNER)
        .build();

    taskAssigneeRepository.save(ownerAssignee);

    // Step 9: Activity log
    taskActivityRepository.save(TaskActivity.builder()
        .taskId(task.getId())
        .userId(currentUserId)
        .type("CREATED")
        .newValue(task.getTitle())
        .build());

    // Step 10: Build and return response
    return buildTaskResponse(task, List.of(ownerAssignee));
}
```

---

## 4. Task Assignment — Complete Flow

### 4.1 Assignment Rules Summary

| Role | Can be assigned as OWNER | Can be assigned as COLLABORATOR | Can be assigned as REVIEWER |
|---|:---:|:---:|:---:|
| PROJECT LEAD | ✅ | ✅ | ✅ |
| PROJECT MEMBER | ✅ | ✅ | ✅ |
| PROJECT VIEWER | ✅ | ✅ | ✅ |
| Non-project member | ❌ | ❌ | ❌ |

| Action | Who Can Do It |
|---|---|
| Change OWNER | Current OWNER, PROJECT LEAD, WORKSPACE ADMIN |
| Add COLLABORATOR | Current OWNER, PROJECT LEAD, WORKSPACE ADMIN |
| Add REVIEWER | Current OWNER, PROJECT LEAD, WORKSPACE ADMIN |
| Remove COLLABORATOR | The COLLABORATOR themselves, Current OWNER, PROJECT LEAD, WORKSPACE ADMIN |
| Remove REVIEWER | The REVIEWER themselves, Current OWNER, PROJECT LEAD, WORKSPACE ADMIN |
| Remove OWNER directly | ❌ Not allowed — change owner instead |

### 4.2 Changing the Task Owner

```
TRIGGER:
  User opens task detail panel
  Clicks on owner avatar in Assignees section
  OR clicks "Change Owner" in task actions menu

UI FLOW:
  Member picker opens as a popover:
    Source: GET /api/projects/{projectId}/members
    Excludes: current OWNER
    Shows: all project members (VIEWER, MEMBER, LEAD)
    Label: "Transfer ownership to..."
    Warning shown: "The current owner will remain as a collaborator unless removed"

  User selects new owner
  Confirmation dialog (optional, recommended):
    "Transfer ownership to {name}?
     You will be added as a collaborator.
     [Cancel] [Transfer]"

POST /api/tasks/{taskId}/assignees/owner
Body: { "userId": "new-owner-uuid" }

Backend:
  1. rbacService.verifyResourceBelongsToTenant(taskId, ResourceType.TASK)
  2. rbacService.canChangeOwner(taskId):
     currentUserId = getCurrentUser().getId()
     isCurrentOwner = taskAssigneeRepository
       .existsByTaskIdAndUserIdAndRole(taskId, currentUserId, OWNER)
     isProjectLead = rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD)
     isWorkspaceAdmin = rbacService.canAdminWorkspace(workspaceId)
     → if none: throw 403

  3. Verify newOwnerId is a project member:
     projectMemberRepository.existsByProjectIdAndUserId(projectId, newOwnerId)
     → 400 if not

  4. BEGIN @Transactional:
     a. Get old owner id from task_assignees WHERE task_id AND role=OWNER
     b. UPDATE task_assignees SET user_id = newOwnerId
        WHERE task_id = ? AND role = 'OWNER'
        (keeps the OWNER row, just changes who it points to)
     c. Check if oldOwnerId still has any row in task_assignees:
        → If no other row exists: do nothing
          (old owner is no longer assigned at all — that's fine)
        → Do NOT auto-add old owner as collaborator
          (leave that decision to the user)
     e. INSERT task_activities:
        type=OWNER_CHANGED,
        old_value=oldOwnerUsername,
        new_value=newOwnerUsername

  5. Return updated task_assignees list

Frontend after success:
  Update owner avatar on Kanban card (prominent position)
  Update owner section in task detail panel
  Show toast: "Ownership transferred to {name}"
```

### 4.3 Adding a Collaborator

```
TRIGGER:
  Task detail panel → Assignees section → [+ Add Collaborator] button
  Visible to: current OWNER, PROJECT LEAD, WORKSPACE ADMIN

UI FLOW:
  Member picker popover:
    Source: GET /api/projects/{projectId}/members
    Excludes: all currently assigned users (owners, existing collaborators, reviewers)
    Shows: remaining project members
    Label: "Add as collaborator..."
    Multi-select: NO — add one at a time

  User selects member → immediate request (no confirmation needed for adding)

POST /api/tasks/{taskId}/assignees
Body: { "userId": "uuid", "role": "COLLABORATOR" }

Backend:
  1. rbacService.verifyResourceBelongsToTenant(taskId, TASK)
  2. Check caller authorization:
     isCurrentOwner OR isProjectLead OR isWorkspaceAdmin
     → 403 if none
  3. Verify targetUserId is a project member
     → 400 if not: "User must be a project member to be assigned"
  4. Check UNIQUE constraint: no existing row for (task_id, user_id)
     → 409 if exists: "User is already assigned to this task"
  5. INSERT task_assignees (task_id, user_id, role=COLLABORATOR)
  6. INSERT task_activities: type=COLLABORATOR_ADDED, new_value=username
  7. Return updated assignees list

Frontend after success:
  Add collaborator avatar to assignee stack on Kanban card
  Add to collaborators list in task detail
  No toast needed for adding (immediate, expected)
```

### 4.4 Adding a Reviewer

```
Identical to Adding a Collaborator except role=REVIEWER.

POST /api/tasks/{taskId}/assignees
Body: { "userId": "uuid", "role": "REVIEWER" }

Additional behavior:
  When task status moves to IN_REVIEW:
    → Send notification to all REVIEWER assignees:
       "Task HS-042 is ready for your review"

  REVIEWER can change status from IN_REVIEW → DONE or IN_REVIEW → IN_PROGRESS
  (this is future behavior — note here for implementation reference)
```

### 4.5 Removing an Assignee

```
TRIGGER:
  Task detail panel → hover over assignee → [×] button appears
  OR right-click/three-dot menu on assignee → "Remove"

RULES:
  - User can always remove themselves (self-removal)
  - OWNER, PROJECT LEAD, WORKSPACE ADMIN can remove anyone except:
    - Cannot use this endpoint to remove the OWNER role
    - OWNER removal must go through change-owner endpoint
  - Removing last COLLABORATOR or REVIEWER is allowed (tasks don't require them)

DELETE /api/tasks/{taskId}/assignees/{userId}

Backend:
  1. rbacService.verifyResourceBelongsToTenant(taskId, TASK)
  2. Check authorization:
     isSelf = (currentUserId == userId)
     isCurrentOwner = taskAssigneeRepository
       .existsByTaskIdAndUserIdAndRole(taskId, currentUserId, OWNER)
     isProjectLead = rbacService.hasProjectRole(projectId, LEAD)
     isWorkspaceAdmin = rbacService.canAdminWorkspace(workspaceId)
     → if none of the above: throw 403
  3. Check target role:
     targetAssignee = taskAssigneeRepository
       .findByTaskIdAndUserId(taskId, userId)
     If targetAssignee.role == OWNER:
       throw 400 "Cannot remove the task owner directly.
                  Use the change-owner endpoint to transfer ownership first."
  4. DELETE FROM task_assignees WHERE task_id = ? AND user_id = ?
  5. INSERT task_activities: type=ASSIGNEE_REMOVED, old_value=username
  6. Return updated assignees list

Frontend:
  Remove avatar from Kanban card assignee stack
  Remove from task detail assignees list
  If removed user was self: show toast "You've been removed from this task"
```

### 4.6 Task Detail Panel — Assignees Section Layout

```
ASSIGNEES SECTION in task detail:

┌─────────────────────────────────────────────────┐
│  ASSIGNEES                                      │
│                                                 │
│  Owner                                          │
│  [👤] Rahul Singh        [Change Owner]         │
│                                                 │
│  Collaborators                                  │
│  [👤] Sanjay Barman   [×]                       │
│  [👤] Priya Mehta     [×]                       │
│  [+ Add Collaborator]                           │
│                                                 │
│  Reviewers                                      │
│  [👤] Ravi Kumar      [×]                       │
│  [+ Add Reviewer]                               │
│                                                 │
└─────────────────────────────────────────────────┘

Visibility of [×] and [+ Add] buttons:
  If current user is OWNER, PROJECT LEAD, or WS ADMIN:
    → All [×] buttons visible
    → All [+ Add] buttons visible
    → [Change Owner] visible
  If current user is a collaborator/reviewer (regular member):
    → Only their own [×] button visible (self-remove)
    → [+ Add] buttons hidden
    → [Change Owner] hidden
  If current user is PROJECT VIEWER:
    → No [×] buttons
    → No [+ Add] buttons
    → [Change Owner] hidden
    → Section is read-only display
```

### 4.7 Kanban Card Display Based on Assignees

```
CARD LAYOUT:

┌─────────────────────────────────────────┐
│ HS-042                    🔴 URGENT     │
│                                         │
│ Fix login redirect after OAuth          │
│                                         │
│ [🏷 bug] [🏷 auth]                      │
│                                         │
│ 📅 Jan 31  ████████░░ 2/3 subtasks     │
│                                         │
│ [R] [S] [P+2]  ●●●  👁 3              │
│  ↑   ↑    ↑         ↑
│ Owner Col Rev+2   3 total assignees    │
└─────────────────────────────────────────┘

Avatar display rules:
  Show max 3 avatars:
    Position 1: OWNER avatar (slightly larger, has ring border)
    Position 2: First COLLABORATOR (if any)
    Position 3: First REVIEWER or "+N" overflow badge

  "+N" badge: shown when total assignees > 3
    e.g., 5 total assignees: show [owner][collab][+3]

  Tooltip on hover: shows all assignees with their roles
    "Rahul Singh (Owner)
     Sanjay Barman (Collaborator)
     Priya Mehta (Reviewer)"

  OWNER avatar ring colors:
    Blue ring  = PROJECT LEAD who is also owner
    Gray ring  = regular MEMBER who is owner
    Gold ring  = TEAM LEAD who is owner
```

---

## 5. Task Status Transitions

### 5.1 Valid Transitions

```
TODO → IN_PROGRESS → IN_REVIEW → DONE
  ↓         ↓            ↓
  └─────────┴──────────── CANCELLED (from any status)
  
Any non-DONE status → TODO (reopen/reset)
IN_REVIEW → IN_PROGRESS (reviewer sends back)
DONE → IN_PROGRESS (reopen completed task)
```

### 5.2 Status Change Authorization

```
Who can change status:
  PROJECT LEAD    → any transition
  PROJECT MEMBER  → any transition
  Task OWNER      → any transition (they are usually also project member)
  Task REVIEWER   → IN_REVIEW → DONE and IN_REVIEW → IN_PROGRESS only
  PROJECT VIEWER  → no transitions
  WORKSPACE ADMIN → no transitions unless also project member

Backend:
PATCH /api/tasks/{taskId}/status
Body: { "status": "IN_PROGRESS" }

  1. verifyResourceBelongsToTenant(taskId, TASK)
  2. canEditTask(taskId) → project role MEMBER+
  3. Validate transition is allowed:
     currentStatus = task.status
     newStatus = request.status
     validateTransition(currentStatus, newStatus)
     → 400 if invalid: "Cannot transition from {current} to {new}"
  4. UPDATE tasks SET status = ?, updated_at = now()
  5. INSERT task_activities:
     type=STATUS_CHANGED, old_value=currentStatus, new_value=newStatus
  6. If newStatus == IN_REVIEW:
     Notify all REVIEWER assignees
  7. Return updated task
```

### 5.3 Kanban Drag-and-Drop Status Change

```
User drags card from TODO column to IN_PROGRESS column:

Frontend (@dnd-kit/core):
  1. onDragStart: mark card as dragging (visual lift effect)
  2. onDragOver: show drop target highlight on destination column
  3. onDragEnd:
     a. Validate the drop target is a valid status column
     b. Optimistically move card to new column in Zustand store
     c. PATCH /api/tasks/{taskId}/status
        Body: { status: "IN_PROGRESS" }
     d. On success: nothing (card already moved optimistically)
     e. On failure:
        → Move card back to original column
        → Show toast: "Failed to update status. Please try again."
        → Log error

Cursor styles:
  dragging: cursor-grabbing
  drag target: show blue highlight outline on column
  invalid drop zone: cursor-not-allowed

Card animation:
  onDragStart: card lifts with slight shadow increase and 5deg rotation
  onDragEnd:   card snaps into position in new column
  onDrop:      column briefly highlights (flash) to confirm receipt
```

---

## 6. Task Identifier Generation

### 6.1 Format

```
{PREFIX}-{SEQUENCE}

Examples:
  HS-1
  HS-42
  HS-1337

Prefix: "HS" (hardcoded for now, configurable per project in future)
Sequence: integer, starts at 1, increments per project
           sequences are per-project, not global
           HS-42 in "Auth Project" is different from HS-42 in "Frontend Project"
```

### 6.2 Atomic Generation

```sql
-- This must be a single atomic SQL statement
-- Never use SELECT then UPDATE (race condition)

UPDATE projects
SET task_sequence = task_sequence + 1
WHERE id = :projectId
RETURNING task_sequence;
```

```java
// In ProjectRepository (Spring Data JPA + native query)
@Modifying
@Query(value = "UPDATE projects SET task_sequence = task_sequence + 1 " +
               "WHERE id = :projectId RETURNING task_sequence",
       nativeQuery = true)
int incrementAndGetTaskSequence(@Param("projectId") UUID projectId);
```

### 6.3 Display

```
On Kanban card:      small text, top-left, muted color (e.g., gray-400)
On task detail:      shown in header beside title
In search results:   shown before title: "HS-042 Fix login redirect"
In activity log:     linked: clicking HS-042 opens that task
In chat:             #HS-042 becomes a clickable task link (future feature)
In commits:          HS-042 in commit message auto-links to task (GitHub integration)
```

---

## 7. Subtask Flow

### 7.1 Rules

- Subtasks are tasks with `parent_id` set
- Maximum depth: 1 level only (no sub-subtasks)
  Backend enforces: if parent task already has a `parent_id`, reject
- Subtasks inherit `project_id` and `team_id` from parent (or can differ — backend accepts what's sent)
- Subtasks do NOT appear on the main Kanban board
- Subtasks appear only inside the parent task's detail panel
- Subtasks have their own identifiers: HS-43, HS-44 (same sequence, not sub-numbered)
- Subtasks can have their own assignees, status, priority, due date

### 7.2 Creating a Subtask

```
TRIGGER:
  Task detail panel → "Subtasks" section → [+ Add Subtask] button
  OR in full create modal: select a Parent Task

UI FLOW (from task detail):
  Click [+ Add Subtask]
  Inline input appears in subtasks list:
    [Task title...] [Enter to create] [Esc to cancel]

  User types title → Enter
  POST /api/projects/{projectId}/tasks
  Body: {
    title: "subtask title",
    parentId: "parent-task-uuid",
    status: "TODO"
  }
  All other fields default to null/defaults

Frontend after success:
  Add subtask to list in parent task detail
  Increment subtask counter on parent Kanban card: "3/5 subtasks"
  Subtask gets its own identifier (HS-{n})
```

### 7.3 Subtask Display in Parent Task Detail

```
SUBTASKS SECTION:

  Progress bar: ████████░░  3/5 complete

  ┌─────────────────────────────────────────────────┐
  │ [✓] HS-43  Write unit tests          [Rahul]   │
  │ [✓] HS-44  Review PR                  [Sanjay] │
  │ [✓] HS-45  Update docs               [Rahul]   │
  │ [ ] HS-46  Deploy to staging          [Priya]  │
  │ [ ] HS-47  Smoke test production      —        │
  │ [+ Add subtask]                                 │
  └─────────────────────────────────────────────────┘

Checkbox behavior:
  Click checkbox → PATCH /api/tasks/{subtaskId}/status
                   Body: { status: "DONE" } or { status: "TODO" }
  Optimistic update: check/uncheck immediately, revert on failure

Clicking subtask title → open subtask detail in a nested panel or modal
Delete subtask → DELETE /api/tasks/{subtaskId} (requires PROJECT LEAD or WS ADMIN)
```

### 7.4 Parent Task Card Progress

```
Kanban card shows subtask progress:

If task has no subtasks: no progress indicator shown
If task has subtasks:
  Show: "2/5 subtasks" in small text
  OR: mini progress bar below title
  When all subtasks done: progress shows "5/5 ✓" in green
```

---

## 8. Backend Service Contracts

### 8.1 TaskService Method Signatures

```java
// Create a new task
@Transactional
TaskResponse createTask(UUID projectId, CreateTaskRequest request);

// Quick create (minimal fields)
@Transactional
TaskResponse quickCreateTask(UUID projectId, String title, String status);

// Get task by ID
TaskResponse getTaskById(UUID taskId);

// Get all tasks for a project (excludes subtasks from main board)
List<TaskResponse> getTasksByProject(UUID projectId, TaskFilters filters);

// Get "my tasks" across all projects in current tenant
List<TaskResponse> getMyTasks();

// Get subtasks for a parent task
List<TaskResponse> getSubtasks(UUID parentTaskId);

// Update task fields
@Transactional
TaskResponse updateTask(UUID taskId, UpdateTaskRequest request);

// Update status only (optimized for drag-and-drop)
@Transactional
TaskResponse updateTaskStatus(UUID taskId, String newStatus);

// Delete task (project lead or workspace admin only)
@Transactional
void deleteTask(UUID taskId);
```

### 8.2 TaskAssigneeService Method Signatures

```java
// Get all assignees for a task
List<TaskAssigneeResponse> getAssignees(UUID taskId);

// Add collaborator or reviewer
@Transactional
TaskAssigneeResponse addAssignee(UUID taskId, UUID userId, TaskAssigneeRole role);

// Change the owner (dedicated endpoint — not a generic update)
@Transactional
TaskAssigneeResponse changeOwner(UUID taskId, UUID newOwnerId);

// Remove an assignee (not applicable for OWNER role)
@Transactional
void removeAssignee(UUID taskId, UUID userId);
```

### 8.3 ProjectService Lead Assignment Methods

```java
// Create project with optional lead
@Transactional
ProjectResponse createProject(UUID workspaceId, CreateProjectRequest request);

// Add a member to a project
@Transactional
ProjectMemberResponse addProjectMember(UUID projectId, UUID userId, ProjectMemberRole role);

// Change a project member's role (with last-lead invariant check)
@Transactional
ProjectMemberResponse updateProjectMemberRole(UUID projectId, UUID userId, ProjectMemberRole newRole);

// Remove a project member (with last-lead invariant check)
@Transactional
void removeProjectMember(UUID projectId, UUID userId);
```

### 8.4 TeamService Lead Assignment Methods

```java
// Create team with optional lead
@Transactional
TeamResponse createTeam(UUID workspaceId, CreateTeamRequest request);

// Add team member
@Transactional
TeamMemberResponse addTeamMember(UUID teamId, UUID userId, TeamMemberRole role);

// Change team member role (with last-lead invariant check)
@Transactional
TeamMemberResponse updateTeamMemberRole(UUID teamId, UUID userId, TeamMemberRole newRole);

// Remove team member (with last-lead invariant check)
@Transactional
void removeTeamMember(UUID teamId, UUID userId);
```

### 8.5 Response DTOs

```java
// TaskResponse — returned for all task operations
public class TaskResponse {
    UUID id;
    String identifier;          // "HS-042"
    String title;
    String description;
    String status;
    String priority;
    LocalDateTime dueDate;
    Integer points;
    String labels;
    UUID projectId;
    UUID teamId;
    UUID parentId;
    UUID createdBy;
    List<TaskAssigneeResponse> assignees;
    int subtaskCount;
    int completedSubtaskCount;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}

// TaskAssigneeResponse
public class TaskAssigneeResponse {
    UUID userId;
    String username;
    String fullName;
    String avatarUrl;
    String role;                // OWNER | COLLABORATOR | REVIEWER
    LocalDateTime assignedAt;
}

// ProjectMemberResponse
public class ProjectMemberResponse {
    UUID userId;
    String username;
    String fullName;
    String avatarUrl;
    String role;                // LEAD | MEMBER | VIEWER
    LocalDateTime joinedAt;
}

// TeamMemberResponse
public class TeamMemberResponse {
    UUID userId;
    String username;
    String fullName;
    String avatarUrl;
    String role;                // LEAD | MEMBER
    LocalDateTime joinedAt;
}
```

---

## 9. Frontend Component Contracts

### 9.1 KanbanBoard Component

```typescript
interface KanbanBoardProps {
  projectId: string
  currentUserProjectRole: ProjectRole | null
}

// Internal state via Zustand taskStore:
// tasks: Record<TaskStatus, Task[]>  — tasks grouped by status column
// draggingTaskId: string | null
// addTask: (task: Task) => void
// updateTaskStatus: (taskId: string, newStatus: TaskStatus) => void
// removeTask: (taskId: string) => void

// Permissions derived from currentUserProjectRole:
// canCreateTask = projectRank(role) >= projectRank('MEMBER')
// canDeleteTask = role === 'LEAD' || isWorkspaceAdmin
// canDragAndDrop = projectRank(role) >= projectRank('MEMBER')
```

### 9.2 TaskCard Component

```typescript
interface TaskCardProps {
  task: Task
  isDragging: boolean
  currentUserProjectRole: ProjectRole | null
  onTaskClick: (taskId: string) => void
}

// Task object must include:
// - id, identifier, title, status, priority
// - assignees: TaskAssignee[]  (with role to determine display order)
// - dueDate: string | null
// - labels: string | null
// - subtaskCount: number
// - completedSubtaskCount: number
```

### 9.3 TaskDetailPanel Component

```typescript
interface TaskDetailPanelProps {
  taskId: string
  onClose: () => void
  currentUserProjectRole: ProjectRole | null
  currentUserId: string
}

// Panel loads task data on mount: GET /api/tasks/{taskId}
// Panel loads assignees: GET /api/tasks/{taskId}/assignees
// Panel loads activities: GET /api/tasks/{taskId}/activities
// Panel loads subtasks: GET /api/tasks/{taskId}/subtasks

// Derived permissions:
// isTaskOwner = assignees.some(a => a.userId === currentUserId && a.role === 'OWNER')
// canEditTask = projectRole MEMBER+ 
// canDeleteTask = projectRole LEAD or isWorkspaceAdmin
// canManageAssignees = isTaskOwner || projectRole LEAD || isWorkspaceAdmin
```

### 9.4 MemberPicker Component

```typescript
interface MemberPickerProps {
  source: 'workspace' | 'project' | 'team'
  sourceId: string                    // workspaceId | projectId | teamId
  excludeUserIds?: string[]           // users to exclude from results
  onSelect: (userId: string) => void
  placeholder?: string
  label?: string
  allowMultiple?: boolean             // default false
}

// Fetches from appropriate endpoint based on source:
// workspace → GET /api/workspaces/{id}/members
// project   → GET /api/projects/{id}/members
// team      → GET /api/teams/{id}/members

// Filters results by excludeUserIds client-side
// Shows: avatar + fullName + username
// Search: filters by fullName or username
// Shows current user at top with "(You)" label
```

### 9.5 CreateProjectModal Component

```typescript
interface CreateProjectModalProps {
  workspaceId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (project: Project) => void
}

// Form state:
// name: string (required)
// description: string
// color: string (default #6366f1)
// startDate: Date | null
// endDate: Date | null
// leadUserId: string | null

// Validation:
// name: required, 1-100 chars
// endDate: must be after startDate if both set

// On submit:
// POST /api/workspaces/{workspaceId}/projects
// Body: { name, description, color, startDate, endDate, leadUserId }
```

### 9.6 CreateTeamModal Component

```typescript
interface CreateTeamModalProps {
  workspaceId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (team: Team) => void
}

// Form state:
// name: string (required)
// description: string
// leadUserId: string | null
// projectId: string | null

// On submit:
// POST /api/workspaces/{workspaceId}/teams
// Body: { name, description, leadUserId, projectId }
```

---

## 10. Database Operations Reference

### 10.1 Task Creation Queries

```sql
-- Atomic sequence increment (always use this, never SELECT then UPDATE)
UPDATE projects
SET task_sequence = task_sequence + 1
WHERE id = :projectId
RETURNING task_sequence;

-- Insert task
INSERT INTO tasks (
  id, title, description, status, priority,
  due_date, points, labels,
  project_id, team_id, created_by, parent_id,
  created_at, updated_at
) VALUES (
  gen_random_uuid(), :title, :description, :status, :priority,
  :dueDate, :points, :labels,
  :projectId, :teamId, :createdBy, :parentId,
  now(), now()
) RETURNING *;

-- Insert owner assignee
INSERT INTO task_assignees (id, task_id, user_id, role, assigned_at)
VALUES (gen_random_uuid(), :taskId, :ownerId, 'OWNER', now());

-- Insert activity
INSERT INTO task_activities (id, task_id, user_id, type, new_value, created_at)
VALUES (gen_random_uuid(), :taskId, :userId, 'CREATED', :title, now());
```

### 10.2 Lead Assignment Queries

```sql
-- Check last lead invariant for project
SELECT COUNT(*) FROM project_members
WHERE project_id = :projectId AND role = 'LEAD';

-- Check last lead invariant for team
SELECT COUNT(*) FROM team_members
WHERE team_id = :teamId AND role = 'LEAD';

-- Insert project lead (during creation)
INSERT INTO project_members (id, project_id, user_id, role, joined_at)
VALUES (gen_random_uuid(), :projectId, :userId, 'LEAD', now());

-- Change project member role
UPDATE project_members
SET role = :newRole
WHERE project_id = :projectId AND user_id = :userId;

-- Check workspace membership before adding to project/team
SELECT EXISTS(
  SELECT 1 FROM workspace_members
  WHERE workspace_id = :workspaceId AND user_id = :userId
);
```

### 10.3 Task Fetch Queries

```sql
-- Board query: all non-subtask tasks for a project with assignees
SELECT
  t.*,
  json_agg(
    json_build_object(
      'userId', ta.user_id,
      'username', u.username,
      'fullName', u.full_name,
      'avatarUrl', u.avatar_url,
      'role', ta.role
    ) ORDER BY
      CASE ta.role
        WHEN 'OWNER' THEN 1
        WHEN 'COLLABORATOR' THEN 2
        WHEN 'REVIEWER' THEN 3
      END
  ) FILTER (WHERE ta.id IS NOT NULL) AS assignees,
  COUNT(sub.id) AS subtask_count,
  COUNT(sub.id) FILTER (WHERE sub.status = 'DONE') AS completed_subtask_count
FROM tasks t
LEFT JOIN task_assignees ta ON ta.task_id = t.id
LEFT JOIN users u ON u.id = ta.user_id
LEFT JOIN tasks sub ON sub.parent_id = t.id
WHERE t.project_id = :projectId
  AND t.parent_id IS NULL
GROUP BY t.id
ORDER BY t.created_at DESC;

-- My tasks: tasks where current user is an assignee, across all their projects
SELECT t.*, ta.role AS assignee_role
FROM tasks t
JOIN task_assignees ta ON ta.task_id = t.id
JOIN project_members pm ON pm.project_id = t.project_id
  AND pm.user_id = :currentUserId
WHERE ta.user_id = :currentUserId
ORDER BY t.updated_at DESC;
```

### 10.4 Owner Change Query

```sql
-- Atomic owner change
UPDATE task_assignees
SET user_id = :newOwnerId
WHERE task_id = :taskId AND role = 'OWNER'
RETURNING *;
```

---

## 11. Error Handling Reference

### 11.1 Backend Error Codes for These Flows

| HTTP Code | When | Message Pattern |
|---|---|---|
| 400 | Assigned lead not in workspace | "Assigned lead must be a workspace member first" |
| 400 | Last lead demotion/removal | "Cannot [demote/remove] the last [project/team] lead. Assign another lead before making this change." |
| 400 | Task title empty | "Task title cannot be empty" |
| 400 | Assignee not project member | "Assignee must be a project member. Add them to the project first." |
| 400 | Team not in project | "Team must be assigned to this project first." |
| 400 | Sub-subtask attempt | "Cannot create subtasks of subtasks. Maximum depth is 1 level." |
| 400 | Remove task OWNER | "Cannot remove the task owner. Use the change-owner endpoint to transfer ownership first." |
| 400 | Invalid status transition | "Cannot transition task from {current} to {requested}" |
| 400 | Duplicate assignee | "This user is already assigned to this task" |
| 403 | Not project member | "Must be a project member to perform this action" |
| 403 | Viewer creating task | "Project viewers cannot create tasks" |
| 403 | Unauthorized assignee change | "Only the task owner, project lead, or workspace admin can manage assignees" |
| 404 | Task not found | "Task not found" |
| 409 | Already project member | "User is already a member of this project" |

### 11.2 Frontend Error Display Rules

```
400 errors → show inline below the relevant field or as a modal error banner
             Never dismiss automatically — user must read and act on it

403 errors → show "You don't have permission" state
             Include: what they need to do to get access
             Example: "Only project leads can manage assignees.
                       Contact your project lead."

404 errors → show "Not found" state
             If task was deleted by someone else: show "This task no longer exists"
             with a [Go to Board] button

409 conflicts → show specific message
               "This user is already a member" — do not treat as generic error

Network errors → show retry button with the original action preserved
                 Do not lose form data on network errors

Optimistic update failures → ALWAYS revert the optimistic UI change
                             ALWAYS show an error toast
                             NEVER leave the UI in a state that doesn't match the server
```

### 11.3 Activity Log Type Reference

All values used in `task_activities.type` column:

```
CREATED              — task created
STATUS_CHANGED       — status transition
OWNER_CHANGED        — task ownership transferred
COLLABORATOR_ADDED   — collaborator assigned
REVIEWER_ADDED       — reviewer assigned
ASSIGNEE_REMOVED     — any non-owner assignee removed
PRIORITY_CHANGED     — priority updated
DUE_DATE_SET         — due date added
DUE_DATE_CHANGED     — due date modified
DUE_DATE_REMOVED     — due date cleared
TITLE_CHANGED        — task title edited
DESCRIPTION_CHANGED  — description edited
LABELS_CHANGED       — labels added/removed
TEAM_ASSIGNED        — team linked to task
TEAM_UNASSIGNED      — team removed from task
POINTS_SET           — story points added
POINTS_CHANGED       — story points updated
SUBTASK_ADDED        — a subtask was created under this parent
SUBTASK_REMOVED      — a subtask was deleted
PARENT_SET           — task converted to subtask
PARENT_REMOVED       — task promoted from subtask to standalone
```

---
