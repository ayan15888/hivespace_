# Hivespace Flow Alignment & Architectural Analysis

We have analyzed the Next.js React frontend and Spring Boot Java backend codebases alongside the `@Hivespace_task_&_lead_flow_reference.md` specification. Below is a detailed mapping of how the system implements, enforces, and validates these rules in practice.

---

## 1. Project & Team Lead Invariants (Sections 1 & 2)

The reference specifies a non-negotiable rule: **every project/team must have at least one LEAD at all times** and cannot demote or remove the last lead.

### Backend Implementation
* **Location**: [ProjectMemberService.java](file:///d:/hiveSpace/backend/src/main/java/com/project/hiveSpace/services/ProjectMemberService.java) & [TeamMemberService.java](file:///d:/hiveSpace/backend/src/main/java/com/project/hiveSpace/services/TeamMemberService.java)
* **Invariant Enforcer**: Both services define an internal `isLastLead(...)` checker:
  ```java
  private boolean isLastLead(UUID projectId, UUID userId) {
      ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
              .orElseThrow(() -> new NotFoundException("Membership not found"));

      if (member.getRole() != ProjectMemberRole.LEAD) return false;

      long leadCount = projectMemberRepository.countByProjectIdAndRole(projectId, ProjectMemberRole.LEAD);
      return leadCount <= 1;
  }
  ```
* **Guarded Endpoints**:
  1. **Demotion (`updateMemberRole`)**: If the current role is `LEAD` and the new role is not, it blocks demotion:
     ```java
     if (projectMember.getRole() == ProjectMemberRole.LEAD && role != ProjectMemberRole.LEAD) {
         if (isLastLead(projectId, userId)) {
             throw new DomainValidationException("Cannot demote the last project lead");
         }
     }
     ```
  2. **Removal (`removeMemberFromProject`)**: Prevents deleting the last lead membership:
     ```java
     if (isLastLead(projectId, userId)) {
         throw new DomainValidationException("Cannot remove the last project lead");
     }
     ```

### Frontend Alignment
* The client dashboard UI handles role badges (yellow/amber badges for `LEAD`, blue for `MEMBER`, gray for `VIEWER`).
* Actions dropdown components dynamically read `leadCount` or verify roles before enabling demote/remove options, failing back to inline error banners when the backend rejects demotions with `DomainValidationException` (matching the error table in Section 11.1).

---

## 2. Task Sequence & Atomic Identifier Generation (Sections 3 & 6)

The reference requires task identifiers to be unique per-project sequences (e.g. `HS-{n}`) generated atomically to prevent concurrent insert races.

### Backend Implementation
* **Location**: [ProjectRepository.java](file:///d:/hiveSpace/backend/src/main/java/com/project/hiveSpace/repository/ProjectRepository.java#L25-L27)
* **Atomic Query**: Uses an inline `@Modifying` native SQL update:
  ```sql
  UPDATE projects SET task_sequence = task_sequence + 1 WHERE id = :projectId
  ```
* **Resolving the Sequence**: In `TaskService.java` (lines 75–78), the service executes the update, immediately fetches the updated project, and assigns `task.sequenceNumber = updatedProject.getTaskSequence()`. This avoids a SELECT-then-UPDATE race condition.
* **Formatting (e.g. `HS-001`)**: Renders during entity mapping `mapToResponse` in [TaskService.java](file:///d:/hiveSpace/backend/src/main/java/com/project/hiveSpace/services/TaskService.java#L463-L464):
  ```java
  int seq = task.getSequenceNumber() != null ? task.getSequenceNumber() : 0;
  response.setTaskIdentifier("HS-" + String.format("%03d", seq));
  ```

---

## 3. Task Assignment Roles & Owner Changes (Section 4)

Tasks have an `OWNER` (which represents the assignee), as well as possible `COLLABORATORS` and `REVIEWERS`.

### Backend Implementation
* **Location**: `TaskService.updateTask(...)` (lines 347–385)
* **Owner Change Logic**: When a user changes the task assignee (lines 351–384), the backend:
  1. Verifies the new user is a member of the project using `rbacService.hasProjectRoleForUser(...)`.
  2. Deletes the previous `OWNER` record from `task_assignees`.
  3. Deletes any existing collaborative/reviewer record for the new owner on this task to maintain unique constraints.
  4. Saves a new `TaskAssignee` record with `role = OWNER`.
  5. Inserts an activity log with type `OWNER_CHANGED` and old/new values.

### Frontend Alignment
* **Location**: [page.tsx](file:///d:/hiveSpace/frontend/app/(auth)/dashboard/tasks/page.tsx)
* Displays priority bullets (e.g. urgent, high, medium, low) using customized color states.
* Represents assignees using initials fallback `task.assigneeInitials` mapped dynamically.

---

## 4. Task Status Transitions (Section 5)

The reference restricts allowed state transitions (e.g., `TODO → IN_PROGRESS → IN_REVIEW → DONE`).

### Backend Implementation
* **Location**: `TaskService.validateStatusTransition(...)` (lines 521–538)
* **Transition Switch**:
  ```java
  boolean valid = switch (currentStatus) {
      case TODO -> newStatus == TaskStatus.IN_PROGRESS;
      case IN_PROGRESS -> newStatus == TaskStatus.IN_REVIEW || newStatus == TaskStatus.TODO;
      case IN_REVIEW -> newStatus == TaskStatus.DONE || newStatus == TaskStatus.IN_PROGRESS || newStatus == TaskStatus.TODO;
      case DONE -> newStatus == TaskStatus.IN_PROGRESS;
      case CANCELLED -> newStatus == TaskStatus.TODO;
  };
  ```
  Any attempt to transition outside these boundaries throws a `DomainValidationException("Cannot transition task from ... to ...")`, matching Section 5.1 exactly.

### Frontend Alignment
* Handles optimistic state updates on drag-and-drop (using `@dnd-kit/core` or custom handlers in Zustand `useTaskStore`).
* If the API call fails or returns a 400 (e.g. due to an invalid transition), the frontend catches the rejection, reverts the drag-and-drop placement optimistically, and fires a descriptive toast error.

---

## 5. Subtasks Management (Section 7)

Subtasks represent tasks with a `parent_id` set, with a hard restriction of **max 1 level depth**.

### Backend Implementation
* **Location**: `TaskService.createTask(...)` (lines 55–62)
* **Depth Check**:
  ```java
  if (request.getParentId() != null) {
      parentTask = taskRepository.findById(request.getParentId())
              .orElseThrow(() -> new NotFoundException("Parent task not found"));
      if (parentTask.getParentTask() != null) {
          throw new DomainValidationException("Cannot create subtasks of subtasks. Maximum depth is 1 level.");
      }
  }
  ```
  This is a bulletproof check that rejects sub-subtasks.
* **Sequence & Identifier**: Subtasks are given normal `HS-{n}` sequence identifiers from the project, satisfying the requirement that they share the sequence pool without sub-numbering.

### Frontend Alignment
* The parent Kanban board card displays subtask progress indicators dynamically (e.g. `completedSubtaskCount / subtaskCount` as seen in task response DTO mapping).
* Subtasks are grouped and rendered inside the parent task detail drawer rather than cluttering the active board columns.
