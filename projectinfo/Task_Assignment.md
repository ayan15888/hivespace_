Task Assignment
The Three Roles
OWNER        → primary accountable person, shown on Kanban card
COLLABORATOR → helping but not primary owner
REVIEWER     → needs to approve or sign off the output
Who Can Assign

Project Lead — can assign anyone in the project
Task OWNER — can add collaborators and reviewers to their own task
Project Member — can assign themselves as collaborator on any task
Workspace Admin / Org Admin — can assign anyone

The Assignment Flow
Assigning the Owner (changing primary assignee):
Project Lead opens task detail
        ↓
Clicks the Owner avatar / "Unassigned" field
        ↓
Member picker appears showing project members only
        ↓
Selects a person
        ↓
Frontend calls PATCH /api/tasks/{taskId}/assignees/owner
Body: { userId: "..." }
        ↓
Backend finds existing OWNER row in task_assignees
updates user_id to the new person
OR removes old OWNER row and inserts new one
        ↓
Task card updates immediately on the board
Adding a Collaborator or Reviewer:
Anyone opens task detail
        ↓
Clicks "Add Collaborator" or "Add Reviewer"
        ↓
Member picker shows project members
(excludes people already assigned to this task)
        ↓
Frontend calls POST /api/tasks/{taskId}/assignees
Body: { userId: "...", role: "COLLABORATOR" }
        ↓
New row inserted in task_assignees
        ↓
Their avatar appears in the task detail assignees list
Removing an Assignee:
DELETE /api/tasks/{taskId}/assignees/{userId}
Cannot remove the OWNER if they are the only assignee. Backend rejects this — a task must always have one OWNER.
Backend Endpoints
GET    /api/tasks/{taskId}/assignees              -- list all assignees
POST   /api/tasks/{taskId}/assignees              -- add collaborator or reviewer
PATCH  /api/tasks/{taskId}/assignees/owner        -- change the owner
DELETE /api/tasks/{taskId}/assignees/{userId}     -- remove an assignee
The Member Picker — What It Shows
This is important. When adding assignees to a task the picker should only show project members. Not all workspace members, not all org members — only people already in this project.
GET /api/projects/{projectId}/members
Filter out people already assigned to the task before showing the list.

How All Three Connect Together
Workspace created
        ↓
Project created inside workspace
Creator auto-assigned as Project Lead
        ↓
Project Lead adds workspace members to project
        ↓
Project Member creates a task
Creator auto-assigned as task OWNER
        ↓
Task OWNER or Project Lead assigns
collaborators and reviewers from project members
        ↓
Task appears on Kanban board showing
OWNER avatar prominently
Collaborator avatars stacked beside it

Kanban Card Display
Based on task_assignees, the card should show:
┌─────────────────────────────────┐
│ HS-042                    HIGH  │
│ Fix login redirect bug          │
│                                 │
│ 🔴 Due Jan 31                   │
│                                 │
│ [R] [S] [P]  ← avatars          │
│  ↑    ↑   ↑                     │
│ Owner Collab Rev                │
└─────────────────────────────────┘
Owner avatar is slightly larger or has a distinct border. Collaborator and reviewer avatars are smaller and stacked. Hovering shows names and roles in a tooltip.

Task Activity Log
Every assignment change gets logged in task_activities automatically by your Spring Boot service:
javataskActivityRepository.save(TaskActivity.builder()
    .taskId(taskId)
    .userId(currentUserId)
    .type("ASSIGNED")
    .newValue(assignedUser.getUsername())
    .build());
This powers the task timeline showing "Rahul assigned Sanjay as Reviewer — 2 hours ago."

No Schema Changes Needed
Your current schema handles everything described here perfectly. All three flows — project creation, task creation, task assignment — use tables that already exist with the correct constraints. Nothing new needed.