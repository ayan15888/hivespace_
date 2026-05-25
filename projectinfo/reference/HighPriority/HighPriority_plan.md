High Priority — Fix After Blockers
Once the four blockers are resolved, tackle these in order:

1:Task identifier generation — replace count-based computation with atomic sequence:
In TaskService.createTask():
  Replace: int count = taskRepository.countByProjectId(projectId) + 1
  With:    int seq = projectRepository.incrementAndGetTaskSequence(projectId)
  
  In ProjectRepository add:
  @Modifying
  @Query(value = "UPDATE projects SET task_sequence = task_sequence + 1 " +
                 "WHERE id = :projectId RETURNING task_sequence", nativeQuery = true)
  int incrementAndGetTaskSequence(@Param("projectId") UUID projectId);
  
  Store this as the task's sequence number and format as "HS-{seq}" in response.

2:Status transition validation — add a validator:
In TaskService.updateTaskStatus():
  Before setting the new status, call:
  validateStatusTransition(currentStatus, newStatus)
  
  Valid transitions:
    TODO → IN_PROGRESS, CANCELLED
    IN_PROGRESS → IN_REVIEW, TODO, CANCELLED
    IN_REVIEW → DONE, IN_PROGRESS, CANCELLED
    DONE → IN_PROGRESS
    CANCELLED → TODO
    Any → CANCELLED
  
  Invalid transition → throw DomainValidationException 400
  "Cannot transition task from {current} to {requested}"
  
  After setting status, write task_activities row:
  type = STATUS_CHANGED, old_value = currentStatus, new_value = newStatus

3: Task activity log types — align with reference:
Replace these activity type strings in TaskAssigneeService and TaskService:
  "ASSIGNED_COLLABORATOR"  → "COLLABORATOR_ADDED"
  "ASSIGNED_REVIEWER"      → "REVIEWER_ADDED"
  "UNASSIGNED"             → "ASSIGNEE_REMOVED"
  "UPDATED"                → specific type per field changed
                             (PRIORITY_CHANGED, DUE_DATE_CHANGED, etc.)
  Keep: "CREATED", "OWNER_CHANGED"

4:Restrict AddAssigneeRequest to exclude OWNER — one line fix:
In AddAssigneeRequest.java validation:
  role must be in {COLLABORATOR, REVIEWER}
  If OWNER is passed: throw DomainValidationException 400
  "Use the change-owner endpoint to transfer ownership"
  
  OWNER assignment only happens via:
  PATCH /api/tasks/{id}/assignees/owner

5:Subtask depth validation — one check in createTask:
In TaskService.createTask(), if parentId is provided:
  Task parent = taskRepository.findById(parentId)
  if (parent.getParentId() != null) {
    throw new DomainValidationException(
      "Cannot create subtasks of subtasks. Maximum depth is 1 level."
    )
  }

6:Real IP extraction for invite rate limiting:
In InvitationService or wherever IP is captured:
  Replace: String ip = "127.0.0.1"
  With:    String ip = request.getHeader("X-Forwarded-For")
           if ip == null: ip = request.getRemoteAddr()
           if ip contains comma (proxy chain): take first IP only
           ip = ip.split(",")[0].trim()
  
  Pass HttpServletRequest to the service method from the controller.