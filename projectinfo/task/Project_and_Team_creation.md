1. Project Creation
Who Can Create a Project
Only Workspace Admin, Org Admin, and Org Owner can create projects inside a workspace.
The Flow
Workspace Admin clicks "New Project"
        ↓
Fills project creation form
        ↓
Frontend calls POST /api/workspaces/{workspaceId}/projects
        ↓
Backend creates project row
        ↓
Backend automatically creates a project_members row
for the creator with role LEAD
        ↓
Redirect to new project board
What the Form Collects
Project Name     [required]
Description      [optional]
Color            [optional — for sidebar color coding]
Start Date       [optional]
End Date         [optional]
Status           [defaults to ACTIVE, no need to show on creation form]
That is it. Keep the creation form minimal. Everything else — members, teams, GitHub linking — is configured after creation inside the project settings.
Backend Endpoint
POST /api/workspaces/{workspaceId}/projects
Body: {
  name: string,
  description?: string,
  color?: string,
  startDate?: string,
  endDate?: string
}
Spring Boot service does two things in one transaction:
java// 1. Create the project
Project project = projectRepository.save(newProject);

// 2. Auto-assign creator as Project Lead
ProjectMember lead = ProjectMember.builder()
    .projectId(project.getId())
    .userId(currentUserId)
    .role("LEAD")
    .build();
projectMemberRepository.save(lead);
Both happen together or neither happens. If the second insert fails the project does not get created either.

2. Task Creation
Who Can Create Tasks

Project Lead — always
Project Member — always
Workspace Admin, Org Admin — always
Project Viewer — cannot create tasks, read-only

The Flow
Member clicks "New Task" on the Kanban board
        ↓
Quick-create inline input appears on the board column
(just title, Enter to save — like Linear)
        ↓
Frontend calls POST /api/projects/{projectId}/tasks
        ↓
Backend creates task row
        ↓
Backend automatically creates task_assignees row
for the creator with role OWNER
        ↓
Task appears on board immediately (optimistic UI)
Two Modes of Task Creation
Quick create — inline on the board. Just a title field. Everything else gets defaults. Press Enter and the task appears immediately.
Full create — opens a task detail panel with all fields. Used when the member knows upfront they want to set priority, assignee, due date, team etc.
What the Full Form Collects
Title            [required]
Description      [optional — rich text via Tiptap later]
Status           [defaults to TODO — matches the column they created in]
Priority         [URGENT / HIGH / MEDIUM / LOW — defaults to MEDIUM]
Due Date         [optional]
Points           [optional — story points]
Labels           [optional — comma separated tags]
Team             [optional — pick from teams in this workspace]
Parent Task      [optional — for subtasks]
Assignees        [optional — covered in section 3 below]
Backend Endpoint
POST /api/projects/{projectId}/tasks
Body: {
  title: string,
  description?: string,
  status?: string,        // defaults to TODO
  priority?: string,      // defaults to MEDIUM
  dueDate?: string,
  points?: number,
  labels?: string,
  teamId?: string,
  parentId?: string       // for subtasks
}
Spring Boot service again does two things in one transaction:
java// 1. Create the task
Task task = taskRepository.save(newTask);

// 2. Auto-assign creator as OWNER in task_assignees
TaskAssignee owner = TaskAssignee.builder()
    .taskId(task.getId())
    .userId(currentUserId)
    .role("OWNER")
    .build();
taskAssigneeRepository.save(owner);
The creator is always auto-assigned as OWNER. They can change the owner later but every task must have exactly one OWNER in task_assignees at all times.