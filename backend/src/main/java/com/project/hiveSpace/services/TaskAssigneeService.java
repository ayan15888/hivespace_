package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.AddAssigneeRequest;
import com.project.hiveSpace.dto.ChangeOwnerRequest;
import com.project.hiveSpace.dto.TaskAssigneeResponse;
import com.project.hiveSpace.models.Task;
import com.project.hiveSpace.models.TaskAssignee;
import com.project.hiveSpace.models.TaskAssigneeRole;
import com.project.hiveSpace.models.TaskActivity;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.repository.TaskRepository;
import com.project.hiveSpace.repository.TaskAssigneeRepository;
//import com.project.hiveSpace.repository.ProjectMemberRepository;
import com.project.hiveSpace.repository.UserRepository;
import com.project.hiveSpace.repository.TaskActivityRepository;
import com.project.hiveSpace.security.RbacService;
import com.project.hiveSpace.models.ProjectMemberRole;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskAssigneeService {

    private final TaskRepository taskRepository;
    private final TaskAssigneeRepository taskAssigneeRepository;
    //private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;
    private final TaskActivityRepository taskActivityRepository;
    private final RbacService rbacService;

    @Transactional(readOnly = true)
    public List<TaskAssigneeResponse> getAssigneesForTask(UUID taskId) {
        if (!rbacService.canViewTask(taskId)) {
            throw new SecurityException("Access denied: You do not have permission to view assignees for this task");
        }

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        return taskAssigneeRepository.findAllByTask(task)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TaskAssigneeResponse addAssignee(UUID taskId, AddAssigneeRequest request, User actor) {
        User currentUser = actor != null ? actor : rbacService.getCurrentUser();
        if (currentUser == null) {
            throw new SecurityException("User not authenticated");
        }

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        // Validate caller: task OWNER, project LEAD, or workspace ADMIN
        boolean isTaskOwner = taskAssigneeRepository.findByTaskAndUser(task, currentUser)
                .map(ta -> ta.getRole() == TaskAssigneeRole.OWNER)
                .orElse(false);

        UUID projectId = task.getProject().getId();
        UUID workspaceId = task.getProject().getWorkspace().getId();
        boolean isProjectLead = rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD);
        boolean isWorkspaceAdmin = rbacService.canAdminWorkspace(workspaceId);

        if (!isTaskOwner && !isProjectLead && !isWorkspaceAdmin) {
            throw new SecurityException("Access denied: Only the task owner, project leads, or workspace admins can add assignees");
        }

        User targetUser = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // RULE: User must be a member of the project
        if (!rbacService.hasProjectRoleForUser(targetUser.getId(), projectId, ProjectMemberRole.VIEWER)) {
            throw new IllegalArgumentException("Assignee must be a member of this project");
        }

        // Check if already assigned
        if (taskAssigneeRepository.existsByTaskAndUser(task, targetUser)) {
            throw new IllegalArgumentException("User is already assigned to this task");
        }

        // Build and save assignee
        TaskAssignee assignee = TaskAssignee.builder()
                .task(task)
                .user(targetUser)
                .role(request.getRole()) // COLLABORATOR or REVIEWER
                .assignedAt(new Date())
                .build();
        TaskAssignee saved = taskAssigneeRepository.save(assignee);

        // Record activity
        TaskActivity activity = TaskActivity.builder()
                .task(task)
                .user(actor)
                .type("ASSIGNED_" + request.getRole().name())
                .newValue(targetUser.getUsername())
                .createdAt(new Date())
                .build();
        taskActivityRepository.save(activity);

        return mapToResponse(saved);
    }

    @Transactional
    public TaskAssigneeResponse changeOwner(UUID taskId, ChangeOwnerRequest request, User actor) {
        User currentUser = actor != null ? actor : rbacService.getCurrentUser();
        if (currentUser == null) {
            throw new SecurityException("User not authenticated");
        }

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        // Validate caller: task OWNER, project LEAD, or workspace ADMIN
        boolean isTaskOwner = taskAssigneeRepository.findByTaskAndUser(task, currentUser)
                .map(ta -> ta.getRole() == TaskAssigneeRole.OWNER)
                .orElse(false);

        UUID projectId = task.getProject().getId();
        UUID workspaceId = task.getProject().getWorkspace().getId();
        boolean isProjectLead = rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD);
        boolean isWorkspaceAdmin = rbacService.canAdminWorkspace(workspaceId);

        if (!isTaskOwner && !isProjectLead && !isWorkspaceAdmin) {
            throw new SecurityException("Access denied: Only the task owner, project leads, or workspace admins can change task ownership");
        }

        User newOwner = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // RULE: Must be a member of the project
        if (!rbacService.hasProjectRoleForUser(newOwner.getId(), projectId, ProjectMemberRole.VIEWER)) {
            throw new IllegalArgumentException("New owner must be a member of this project");
        }

        // 1. Locate and remove/update current OWNER
        Optional<TaskAssignee> currentOwnerOpt = taskAssigneeRepository.findByTaskAndRole(task, TaskAssigneeRole.OWNER);
        String oldOwnerUsername = "None";
        if (currentOwnerOpt.isPresent()) {
            TaskAssignee currentOwner = currentOwnerOpt.get();
            oldOwnerUsername = currentOwner.getUser().getUsername();
            taskAssigneeRepository.delete(currentOwner);
        }

        // If the new owner was previously a collaborator/reviewer, remove their old assignment role first
        taskAssigneeRepository.findByTaskAndUser(task, newOwner).ifPresent(taskAssigneeRepository::delete);

        // 2. Insert new OWNER
        TaskAssignee newAssignee = TaskAssignee.builder()
                .task(task)
                .user(newOwner)
                .role(TaskAssigneeRole.OWNER)
                .assignedAt(new Date())
                .build();
        TaskAssignee saved = taskAssigneeRepository.save(newAssignee);

        // 3. Keep sync with task.assignee for backwards compatibility / quick queries
        task.setAssignee(newOwner);
        taskRepository.save(task);

        // Record activity
        TaskActivity activity = TaskActivity.builder()
                .task(task)
                .user(actor)
                .type("OWNER_CHANGED")
                .oldValue(oldOwnerUsername)
                .newValue(newOwner.getUsername())
                .createdAt(new Date())
                .build();
        taskActivityRepository.save(activity);

        return mapToResponse(saved);
    }

    @Transactional
    public void removeAssignee(UUID taskId, UUID targetUserId, User actor) {
        User currentUser = actor != null ? actor : rbacService.getCurrentUser();
        if (currentUser == null) {
            throw new SecurityException("User not authenticated");
        }

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        // Validate caller: task OWNER, project LEAD, workspace ADMIN, or self
        boolean isSelf = currentUser.getId().equals(targetUserId);
        boolean isTaskOwner = taskAssigneeRepository.findByTaskAndUser(task, currentUser)
                .map(ta -> ta.getRole() == TaskAssigneeRole.OWNER)
                .orElse(false);

        UUID projectId = task.getProject().getId();
        UUID workspaceId = task.getProject().getWorkspace().getId();
        boolean isProjectLead = rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD);
        boolean isWorkspaceAdmin = rbacService.canAdminWorkspace(workspaceId);

        if (!isSelf && !isTaskOwner && !isProjectLead && !isWorkspaceAdmin) {
            throw new SecurityException("Access denied: Only the task owner, project leads, workspace admins, or the user themselves can remove assignments");
        }

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        TaskAssignee assignment = taskAssigneeRepository.findByTaskAndUser(task, targetUser)
                .orElseThrow(() -> new IllegalArgumentException("User assignment not found on this task"));

        // RULE: Cannot remove OWNER if they are the only assignee (or you cannot delete OWNER via standard remove)
        if (assignment.getRole() == TaskAssigneeRole.OWNER) {
            throw new IllegalArgumentException("Cannot delete primary OWNER. Use changeOwner instead.");
        }

        taskAssigneeRepository.delete(assignment);

        // Record activity
        TaskActivity activity = TaskActivity.builder()
                .task(task)
                .user(actor)
                .type("UNASSIGNED")
                .oldValue(assignment.getUser().getUsername())
                .createdAt(new Date())
                .build();
        taskActivityRepository.save(activity);
    }

    private TaskAssigneeResponse mapToResponse(TaskAssignee assignee) {
        return TaskAssigneeResponse.builder()
                .id(assignee.getId())
                .taskId(assignee.getTask().getId())
                .userId(assignee.getUser().getId())
                .fullName(assignee.getUser().getFullName())
                .username(assignee.getUser().getUsername())
                .avatarUrl(assignee.getUser().getAvatarUrl())
                .role(assignee.getRole())
                .assignedAt(assignee.getAssignedAt())
                .build();
    }
}
