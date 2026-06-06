Batch 3 — Task Security

Fix all task and task assignee authorization gaps:

1. TaskService — add these checks:
   - getAllTasks(): Replace with getTasksForCurrentUser() that returns
     only tasks from projects the current user is a member of.
     Remove the global dump endpoint entirely or restrict it to
     Org Admin/Owner only.
   - getTaskById(taskId): Add canViewTask(taskId) check
   - getTasksByProject(projectId): Add canViewProject(projectId) check
   - createTask(projectId, ...): Add canCreateTask(projectId) check
   - updateTask(taskId, ...): Add canEditTask(taskId) check
   - updateTaskStatus(taskId, ...): Add canEditTask(taskId) check
   - deleteTask(taskId): Require projectRole LEAD or canAdminWorkspace

2. TaskAssigneeService — add caller validation:
   - All methods: get current user at the top
   - listAssignees(taskId): Add canViewTask(taskId) check
   - addAssignee(taskId, ...): Caller must be task OWNER,
     project LEAD, or workspace ADMIN
   - changeOwner(taskId, ...): Caller must be current task OWNER,
     project LEAD, or workspace ADMIN
   - removeAssignee(taskId, userId): Caller must be task OWNER,
     project LEAD, workspace ADMIN, or removing themselves

3. For all task operations — new owner/assignee being added must
   be a project member (this validation already exists but verify
   it uses the new enum-typed RbacService methods from Batch 1)