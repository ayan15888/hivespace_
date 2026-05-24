package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.TaskRequest;
import com.project.hiveSpace.dto.TaskResponse;
import com.project.hiveSpace.dto.TaskAssigneeResponse;
import com.project.hiveSpace.dto.UpdateTaskRequest;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import com.project.hiveSpace.security.RbacService;
import com.project.hiveSpace.exceptions.ForbiddenException;
import com.project.hiveSpace.exceptions.DomainValidationException;
import com.project.hiveSpace.exceptions.NotFoundException;
import com.project.hiveSpace.exceptions.ConflictException;
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
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final TaskAssigneeRepository taskAssigneeRepository;
    private final TaskActivityRepository taskActivityRepository;
    private final ProjectTeamRepository projectTeamRepository;
    private final RbacService rbacService;

    @Transactional
    public TaskResponse createTask(UUID projectId, TaskRequest request, User creator) {
        rbacService.verifyResourceBelongsToTenant(projectId, ResourceType.PROJECT);
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project not found"));

        if (!rbacService.canCreateTask(projectId)) {
            throw new ForbiddenException("Access denied: You do not have permission to create tasks in this project");
        }

        // 2. Resolve default status and priority if they are null
        TaskStatus status = request.getStatus() != null ? request.getStatus() : TaskStatus.TODO;
        TaskPriority priority = request.getPriority() != null ? request.getPriority() : TaskPriority.MEDIUM;

        // 3. Resolve parent task if parentId is provided
        Task parentTask = null;
        if (request.getParentId() != null) {
            parentTask = taskRepository.findById(request.getParentId())
                    .orElseThrow(() -> new NotFoundException("Parent task not found"));
            if (parentTask.getParentTask() != null) {
                throw new DomainValidationException("Cannot create subtasks of subtasks. Maximum depth is 1 level.");
            }
        }

        // 4. Resolve team if teamId is provided
        Team team = null;
        if (request.getTeamId() != null) {
            team = teamRepository.findById(request.getTeamId())
                    .orElseThrow(() -> new NotFoundException("Team not found"));
            if (!projectTeamRepository.existsByProjectIdAndTeamId(projectId, request.getTeamId())) {
                throw new DomainValidationException("Team is not associated with this project");
            }
        }

        // 5. Create the task
        Task task = Task.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .status(status)
                .priority(priority)
                .labels(request.getLabels())
                .dueDate(request.getDueDate())
                .points(request.getPoints())
                .project(project)
                .parentTask(parentTask)
                .team(team)
                .createdBy(creator)
                .createdAt(new Date())
                .build();

        // 6. Assign the owner
        User ownerUser = creator;
        if (request.getAssigneeId() != null) {
            User explicitlyAssigned = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new NotFoundException("Assignee user not found"));
            // Verify if the assignee is a member of this project
            if (!rbacService.hasProjectRoleForUser(explicitlyAssigned.getId(), projectId, ProjectMemberRole.VIEWER)) {
                throw new DomainValidationException("Assignee must be a member of this project");
            }
            ownerUser = explicitlyAssigned;
        }
        Task savedTask = taskRepository.save(task);

        // 7. Save owner assignee record
        TaskAssignee taskAssignee = TaskAssignee.builder()
                .task(savedTask)
                .user(ownerUser)
                .role(TaskAssigneeRole.OWNER)
                .assignedAt(new Date())
                .build();
        taskAssigneeRepository.save(taskAssignee);

        // 8. Save activity log
        TaskActivity activity = TaskActivity.builder()
                .task(savedTask)
                .user(creator)
                .type("CREATED")
                .newValue(creator.getUsername())
                .createdAt(new Date())
                .build();
        taskActivityRepository.save(activity);

        return mapToResponse(savedTask);
    }

    @Transactional(readOnly = true)
    public TaskResponse getTaskById(UUID taskId) {
        rbacService.verifyResourceBelongsToTenant(taskId, ResourceType.TASK);
        if (!rbacService.canViewTask(taskId)) {
            throw new ForbiddenException("Access denied: You do not have permission to view this task");
        }

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task not found"));
        TaskResponse response = mapToResponse(task);

        // Fetch subtasks only if this is a parent task
        if (task.getParentTask() == null) {
            List<Task> subtasks = taskRepository.findAllByParentTaskOrderByCreatedAtAsc(task);
            response.setSubtasks(subtasks.stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList()));
        }

        return response;
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksByProject(UUID projectId) {
        rbacService.verifyResourceBelongsToTenant(projectId, ResourceType.PROJECT);
        if (!rbacService.canViewProject(projectId)) {
            throw new ForbiddenException("Access denied: You do not have permission to view tasks in this project");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project not found"));

        return taskRepository.findAllByProjectAndParentTaskIsNullOrderByCreatedAtDesc(project)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getAllTasks() {
        User currentUser = rbacService.getCurrentUser();
        if (currentUser == null) {
            throw new ForbiddenException("User not authenticated");
        }

        UUID tenantId = currentUser.getTenant() != null ? currentUser.getTenant().getId() : null;
        if (tenantId == null || !rbacService.hasTenantRole(tenantId, TenantMemberRole.MEMBER)) {
            throw new ForbiddenException("Access denied: Must be a member of the organization to view tasks");
        }

        List<ProjectMember> memberships = projectMemberRepository.findAllByUserId(currentUser.getId());
        if (memberships.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        List<Project> projects = memberships.stream()
                .map(ProjectMember::getProject)
                .collect(Collectors.toList());

        return taskRepository.findAllByProjectInOrderByUpdatedAtDesc(projects)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TaskResponse updateTaskStatus(UUID taskId, String statusStr) {
        rbacService.verifyResourceBelongsToTenant(taskId, ResourceType.TASK);
        if (!rbacService.canEditTask(taskId)) {
            throw new ForbiddenException("Access denied: You do not have permission to update this task");
        }

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task not found"));

        TaskStatus status;
        String normalized = statusStr.trim().toUpperCase().replace(" ", "_");
        if (normalized.equals("REVIEW")) {
            status = TaskStatus.IN_REVIEW;
        } else {
            try {
                status = TaskStatus.valueOf(normalized);
            } catch (IllegalArgumentException e) {
                status = TaskStatus.TODO;
            }
        }

        validateStatusTransition(task.getStatus(), status);

        task.setStatus(status);
        task.setUpdatedAt(new Date());

        Task saved = taskRepository.save(task);
        return mapToResponse(saved);
    }

    @Transactional
    public TaskResponse updateTask(UUID taskId, UpdateTaskRequest request, User actor) {
        rbacService.verifyResourceBelongsToTenant(taskId, ResourceType.TASK);
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task not found"));

        if (!rbacService.canEditTask(taskId)) {
            throw new ForbiddenException("Access denied: You do not have permission to update this task");
        }

        boolean changed = false;
        StringBuilder changes = new StringBuilder();

        if (request.getTitle() != null && !request.getTitle().trim().isEmpty() && !request.getTitle().equals(task.getTitle())) {
            changes.append("Title: '").append(task.getTitle()).append("' -> '").append(request.getTitle()).append("'; ");
            task.setTitle(request.getTitle());
            changed = true;
        }
        if (request.getDescription() != null && !request.getDescription().equals(task.getDescription())) {
            task.setDescription(request.getDescription());
            changed = true;
        }
        if (request.getStatus() != null && request.getStatus() != task.getStatus()) {
            validateStatusTransition(task.getStatus(), request.getStatus());
            task.setStatus(request.getStatus());
            changed = true;
        }
        if (request.getPriority() != null && request.getPriority() != task.getPriority()) {
            task.setPriority(request.getPriority());
            changed = true;
        }
        if (request.getLabels() != null && !request.getLabels().equals(task.getLabels())) {
            task.setLabels(request.getLabels());
            changed = true;
        }
        if (request.getPoints() != null && !request.getPoints().equals(task.getPoints())) {
            task.setPoints(request.getPoints());
            changed = true;
        }
        if (request.getDueDate() != null && !request.getDueDate().equals(task.getDueDate())) {
            task.setDueDate(request.getDueDate());
            changed = true;
        }

        // Assignee update
        if (request.getAssigneeId() != null && (task.getAssignee() == null || !request.getAssigneeId().equals(task.getAssignee().getId()))) {
            User newAssignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new NotFoundException("Assignee user not found"));
            // Verify if the assignee is a member of this project
            if (!rbacService.hasProjectRoleForUser(newAssignee.getId(), task.getProject().getId(), ProjectMemberRole.VIEWER)) {
                throw new DomainValidationException("Assignee must be a member of this project");
            }
            task.setAssignee(newAssignee);

            // Also need to update/insert OWNER in task_assignees
        if (request.getAssigneeId() != null) {
            Optional<TaskAssignee> currentOwnerOpt = taskAssigneeRepository.findByTaskAndRole(task, TaskAssigneeRole.OWNER);
            User currentOwner = currentOwnerOpt.isPresent() ? currentOwnerOpt.get().getUser() : null;

            if (currentOwner == null || !request.getAssigneeId().equals(currentOwner.getId())) {
                User newAssignee = userRepository.findById(request.getAssigneeId())
                        .orElseThrow(() -> new IllegalArgumentException("Assignee user not found"));
                // Verify if the assignee is a member of this project
                if (!rbacService.hasProjectRoleForUser(newAssignee.getId(), task.getProject().getId(), ProjectMemberRole.VIEWER)) {
                    throw new IllegalArgumentException("Assignee must be a member of this project");
                }

                if (currentOwnerOpt.isPresent()) {
                    taskAssigneeRepository.delete(currentOwnerOpt.get());
                }
                taskAssigneeRepository.findByTaskAndUser(task, newAssignee).ifPresent(taskAssigneeRepository::delete);

                TaskAssignee newAssigneeRecord = TaskAssignee.builder()
                        .task(task)
                        .user(newAssignee)
                        .role(TaskAssigneeRole.OWNER)
                        .assignedAt(new Date())
                        .build();
                taskAssigneeRepository.save(newAssigneeRecord);
                changed = true;
            }
        }

        if (changed) {
            task.setUpdatedAt(new Date());
        }

        Task saved = taskRepository.save(task);

        if (changed) {
            TaskActivity activity = TaskActivity.builder()
                    .task(saved)
                    .user(actor)
                    .type("UPDATED")
                    .newValue(changes.length() > 0 ? changes.toString() : "Task details updated")
                    .createdAt(new Date())
                    .build();
            taskActivityRepository.save(activity);
        }

        return mapToResponse(saved);
    }

    @Transactional
    public void deleteTask(UUID taskId, User actor) {
        rbacService.verifyResourceBelongsToTenant(taskId, ResourceType.TASK);
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task not found"));

        if (!rbacService.canDeleteTask(taskId)) {
            throw new ForbiddenException("Access denied: Only project leads and workspace admins can delete tasks");
        }

        taskRepository.delete(task);
    }


    private TaskResponse mapToResponse(Task task) {
        TaskResponse response = TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus())
                .priority(task.getPriority())
                .labels(task.getLabels())
                .dueDate(task.getDueDate())
                .points(task.getPoints())
                .projectId(task.getProject().getId())
                .projectName(task.getProject().getName())
                .projectColor(task.getProject().getColor())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();

        if (task.getTeam() != null) {
            response.setTeamId(task.getTeam().getId());
        }
        if (task.getParentTask() != null) {
            response.setParentId(task.getParentTask().getId());
        }

        // Dynamically compute the sequential task identifier (e.g. HS-001)
        int seq = taskRepository.countByProjectAndCreatedAtLessThanEqual(task.getProject(), task.getCreatedAt());
        response.setTaskIdentifier("HS-" + String.format("%03d", seq));

        // Subtask counts
        int subtaskCount = taskRepository.countByParentTask(task);
        int completedSubtaskCount = taskRepository.countByParentTaskAndStatus(task, TaskStatus.DONE);
        response.setSubtaskCount(subtaskCount);
        response.setCompletedSubtaskCount(completedSubtaskCount);

        // Fetch assignees
        List<TaskAssignee> assignees = taskAssigneeRepository.findAllByTask(task);
        response.setAssignees(assignees.stream()
                .map(this::mapToAssigneeResponse)
                .collect(Collectors.toList()));

        TaskAssignee owner = taskAssigneeRepository
                .findByTaskIdAndRole(task.getId(), TaskAssigneeRole.OWNER)
                .orElse(null);
        User assigneeUser = owner != null ? owner.getUser() : null;

        if (assigneeUser != null) {
            response.setAssigneeId(assigneeUser.getId());
            response.setAssigneeName(assigneeUser.getFullName());
            response.setAssigneeInitials(toInitials(assigneeUser.getFullName()));
        }

        return response;
    }

    private TaskAssigneeResponse mapToAssigneeResponse(TaskAssignee assignee) {
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

    private String toInitials(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            return "";
        }
        String[] parts = fullName.trim().split("\\s+");
        StringBuilder initials = new StringBuilder();
        if (parts.length > 0 && !parts[0].isEmpty()) {
            initials.append(parts[0].charAt(0));
        }
        if (parts.length > 1 && !parts[1].isEmpty()) {
            initials.append(parts[1].charAt(0));
        }
        return initials.toString().toUpperCase();
    }

    private void validateStatusTransition(TaskStatus currentStatus, TaskStatus newStatus) {
        if (currentStatus == newStatus) {
            return;
        }
        if (newStatus == TaskStatus.CANCELLED) {
            return;
        }
        boolean valid = switch (currentStatus) {
            case BACKLOG -> newStatus == TaskStatus.TODO || newStatus == TaskStatus.IN_PROGRESS;
            case TODO -> newStatus == TaskStatus.IN_PROGRESS;
            case IN_PROGRESS -> newStatus == TaskStatus.IN_REVIEW || newStatus == TaskStatus.TODO;
            case IN_REVIEW -> newStatus == TaskStatus.DONE || newStatus == TaskStatus.IN_PROGRESS;
            case DONE -> newStatus == TaskStatus.IN_PROGRESS;
            case CANCELLED -> newStatus == TaskStatus.TODO || newStatus == TaskStatus.BACKLOG;
        };
        if (!valid) {
            throw new DomainValidationException("Cannot transition task from " + currentStatus + " to " + newStatus);
        }
    }
}
