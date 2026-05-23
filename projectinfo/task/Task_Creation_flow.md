Let me walk through this completely — from the moment someone clicks "New Task" to the task appearing on the board.

Two Entry Points for Task Creation
Entry Point 1 — Quick Create on the Board
User clicks the + button at the bottom of any Kanban column. An inline input appears directly in that column. User types the title and presses Enter. Task is created instantly with that column's status pre-filled. No modal, no navigation. Exactly how Linear works.
Entry Point 2 — Full Create Modal
User clicks "New Task" button in the top right of the project board, or presses a keyboard shortcut like C. A full modal or side panel opens with all fields available. Used when the user knows upfront they want to set priority, assignee, due date etc.

Quick Create Flow — Step by Step
User clicks + in TODO column
        ↓
Inline input appears at bottom of column
        ↓
User types "Fix login redirect bug" → presses Enter
        ↓
Frontend immediately adds a ghost card to the column
(optimistic UI — card appears before API responds)
        ↓
POST /api/projects/{projectId}/tasks
{
  title: "Fix login redirect bug",
  status: "TODO"               ← taken from the column
  priority: "MEDIUM"           ← default
  createdBy: currentUserId
}
        ↓
Backend creates task row
Backend creates task_assignees row (creator as OWNER)
Backend creates task_activities row (CREATED event)
        ↓
Returns created task with id
        ↓
Frontend replaces ghost card with real card
using the returned task id (HS-042 etc)
If the API call fails, remove the ghost card and show a toast error. Never leave ghost cards on the board.

Full Create Flow — Step by Step
User clicks "New Task" or presses C
        ↓
Modal opens with form
        ↓
User fills fields (title required, rest optional)
        ↓
User clicks Create
        ↓
Frontend validates — title must not be empty
        ↓
POST /api/projects/{projectId}/tasks
{
  title: "...",
  description: "...",
  status: "TODO",
  priority: "HIGH",
  dueDate: "2025-02-28",
  teamId: "...",
  parentId: null,
  points: 3,
  labels: "frontend,bug"
}
        ↓
Backend runs in one transaction:
  1. Insert into tasks
  2. Insert into task_assignees (creator as OWNER)
  3. Insert into task_activities (type: CREATED)
        ↓
Returns full task object
        ↓
Frontend adds card to the correct column on the board
Modal closes

What Happens in the Backend Service
This is the exact logic your Spring Boot TaskService.createTask() method should follow:
java@Transactional
public TaskResponse createTask(UUID projectId, CreateTaskRequest request, UUID currentUserId) {

    // 1. Verify user is a project member and not a VIEWER
    ProjectMember member = projectMemberRepository
        .findByProjectIdAndUserId(projectId, currentUserId)
        .orElseThrow(() -> new ForbiddenException("Not a project member"));

    if (member.getRole().equals("VIEWER")) {
        throw new ForbiddenException("Viewers cannot create tasks");
    }

    // 2. Generate task identifier (HS-042 style)
    int taskCount = taskRepository.countByProjectId(projectId);
    String taskIdentifier = "HS-" + (taskCount + 1);

    // 3. Create the task
    Task task = Task.builder()
        .title(request.getTitle())
        .description(request.getDescription())
        .status(request.getStatus() != null ? request.getStatus() : "TODO")
        .priority(request.getPriority() != null ? request.getPriority() : "MEDIUM")
        .projectId(projectId)
        .teamId(request.getTeamId())
        .parentId(request.getParentId())
        .createdBy(currentUserId)
        .dueDate(request.getDueDate())
        .points(request.getPoints())
        .labels(request.getLabels())
        .build();

    task = taskRepository.save(task);

    // 4. Auto-assign creator as OWNER
    TaskAssignee owner = TaskAssignee.builder()
        .taskId(task.getId())
        .userId(currentUserId)
        .role("OWNER")
        .build();
    taskAssigneeRepository.save(owner);

    // 5. Log activity
    TaskActivity activity = TaskActivity.builder()
        .taskId(task.getId())
        .userId(currentUserId)
        .type("CREATED")
        .newValue(request.getTitle())
        .build();
    taskActivityRepository.save(activity);

    return TaskResponse.from(task, List.of(owner));
}
All three inserts happen inside @Transactional — if any one fails, all three roll back. You never get a task without an owner or without an activity log entry.

The Task Identifier (HS-042)
You need a way to generate these. The simplest approach is counting existing tasks per project and incrementing. But counting is not safe under concurrent inserts — two users creating tasks simultaneously could get the same number.
The safe approach is a dedicated sequence per project. Add this to your schema:
sqlALTER TABLE projects
ADD COLUMN task_sequence INTEGER NOT NULL DEFAULT 0;
Then in your Spring Boot service, use a locking update to get the next number:
sqlUPDATE projects
SET task_sequence = task_sequence + 1
WHERE id = ?
RETURNING task_sequence;
This is atomic — no two tasks ever get the same number for the same project. The returned value becomes the task's identifier suffix.

Assigning Someone Else During Creation
In the full create modal there is an assignee picker. This is optional — if left empty the creator is the owner. If the user picks someone else:
User opens full create modal
        ↓
Clicks assignee field
        ↓
GET /api/projects/{projectId}/members
Returns list of project members
        ↓
User selects Sanjay
        ↓
On submit, backend creates task_assignees row
with Sanjay as OWNER instead of the creator
        ↓
Creator is not auto-assigned since they explicitly
chose someone else as owner
Your backend logic for this:
javaUUID ownerId = request.getAssigneeId() != null 
    ? request.getAssigneeId()   // explicitly chosen
    : currentUserId;            // default to creator

Subtask Creation
Subtasks use the same endpoint. The only difference is parentId is set:
POST /api/projects/{projectId}/tasks
{
  title: "Write unit tests for login",
  parentId: "parent-task-uuid-here",
  status: "TODO",
  priority: "MEDIUM"
}
On the board, subtasks are not shown as separate cards. They appear inside the parent task detail panel as a checklist. The parent card shows a subtask progress indicator like 2/5 subtasks on the card.

What the Kanban Board Fetches
When the board loads it calls:
GET /api/projects/{projectId}/tasks
Returns all tasks grouped by status. Your backend query:
sqlSELECT 
  t.*,
  json_agg(
    json_build_object(
      'userId', ta.user_id,
      'role', ta.role,
      'username', u.username,
      'avatarUrl', u.avatar_url
    )
  ) as assignees
FROM tasks t
LEFT JOIN task_assignees ta ON ta.task_id = t.id
LEFT JOIN users u ON u.id = ta.user_id
WHERE t.project_id = ?
AND t.parent_id IS NULL    -- exclude subtasks from board view
GROUP BY t.id
ORDER BY t.created_at DESC;
parent_id IS NULL excludes subtasks from the main board. Subtasks only appear inside the parent task detail.

Frontend Board State Management
Use Zustand to manage board state:
typescript// taskStore.ts
{
  tasks: Record<string, Task[]>  // keyed by status
  addTask: (task: Task) => void  // optimistic add
  updateTask: (task: Task) => void
  removeTask: (taskId: string) => void
  moveTask: (taskId: string, newStatus: string) => void  // drag and drop
}
When drag and drop moves a card between columns:
typescript// 1. Immediately update local state (optimistic)
moveTask(taskId, newStatus)

// 2. Call API in background
PATCH /api/tasks/{taskId}
{ status: "IN_PROGRESS" }

// 3. If API fails, revert the move and show toast

No Schema Changes Needed Except One
Add the task_sequence column to projects for safe task identifier generation:
sqlALTER TABLE projects
ADD COLUMN task_sequence INTEGER NOT NULL DEFAULT 0;
Everything else is already in your schema. Tasks, task_assignees, task_activities — all ready to go.