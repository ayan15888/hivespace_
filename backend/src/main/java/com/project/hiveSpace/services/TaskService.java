package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.TaskRequest;
import com.project.hiveSpace.dto.TaskResponse;
import com.project.hiveSpace.dto.TaskAssigneeResponse;
import com.project.hiveSpace.dto.TaskActivityResponse;
import com.project.hiveSpace.dto.UpdateTaskRequest;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import com.project.hiveSpace.security.RbacService;
import com.project.hiveSpace.exceptions.ForbiddenException;
import com.project.hiveSpace.exceptions.DomainValidationException;
import com.project.hiveSpace.exceptions.NotFoundException;
// import com.project.hiveSpace.exceptions.ConflictException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.security.core.context.SecurityContextHolder;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.Set;
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
    private final TeamMemberRepository teamMemberRepository;
    private final RbacService rbacService;
    private final AiDuplicateDetectorService aiDuplicateDetectorService;
    private final SprintRepository sprintRepository;
    private final RedisService redisService;



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

        // Resolve Sprint if sprintId is provided
        Sprint sprint = null;
        if (request.getSprintId() != null) {
            sprint = sprintRepository.findById(request.getSprintId())
                    .orElseThrow(() -> new NotFoundException("Sprint not found"));
            if (!sprint.getProject().getId().equals(projectId)) {
                throw new DomainValidationException("Sprint does not belong to this project");
            }
        }

        // 5. Increment project task sequence and create the task
        project.setTaskSequence(project.getTaskSequence() + 1);
        project = projectRepository.saveAndFlush(project);
        int seq = project.getTaskSequence();

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
                .sprint(sprint)
                .createdAt(new Date())
                .build();
        task.setSequenceNumber(seq);


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
                .newValue(creator.getActualUsername())
                .createdAt(new Date())
                .build();
        taskActivityRepository.save(activity);

        aiDuplicateDetectorService.updateTaskEmbeddingAsync(savedTask);

        redisService.deleteKey("project:" + projectId + ":tasks");
        redisService.deleteKey("project:" + projectId + ":all_tasks");

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

        String cacheKey = "project:" + projectId + ":tasks";
        List<TaskResponse> cachedTasks = redisService.getList(cacheKey, TaskResponse.class);
        if (cachedTasks != null) {
            return cachedTasks;
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project not found"));

        List<TaskResponse> tasks = taskRepository.findAllByProjectAndParentTaskIsNullOrderByCreatedAtDesc(project)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        redisService.setObject(cacheKey, tasks);
        return tasks;
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
        List<Project> projects = new java.util.ArrayList<>(
            memberships.stream()
                .map(ProjectMember::getProject)
                .collect(Collectors.toList())
        );

        List<TeamMember> teamMemberships = teamMemberRepository.findAllByUserId(currentUser.getId());
        Set<UUID> userTeamIds = teamMemberships.stream()
                .map(tm -> tm.getTeam().getId())
                .collect(Collectors.toSet());

        for (UUID teamId : userTeamIds) {
            projectTeamRepository.findByTeamId(teamId).forEach(pt -> {
                if (projects.stream().noneMatch(p -> p.getId().equals(pt.getProject().getId()))) {
                    projects.add(pt.getProject());
                }
            });
        }

        if (projects.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        List<TaskResponse> allTasks = new java.util.ArrayList<>();
        for (Project project : projects) {
            String projectCacheKey = "project:" + project.getId() + ":all_tasks";
            List<TaskResponse> projectTasks = redisService.getList(projectCacheKey, TaskResponse.class);
            if (projectTasks == null) {
                projectTasks = taskRepository.findAllByProject(project)
                        .stream()
                        .map(this::mapToResponse)
                        .collect(Collectors.toList());
                redisService.setObject(projectCacheKey, projectTasks);
            }
            allTasks.addAll(projectTasks);
        }

        // Sort by updatedAt desc
        allTasks.sort((t1, t2) -> {
            Date d1 = t1.getUpdatedAt() != null ? t1.getUpdatedAt() : t1.getCreatedAt();
            Date d2 = t2.getUpdatedAt() != null ? t2.getUpdatedAt() : t2.getCreatedAt();
            if (d1 == null && d2 == null) return 0;
            if (d1 == null) return 1;
            if (d2 == null) return -1;
            return d2.compareTo(d1);
        });

        return allTasks;
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

        TaskStatus oldStatus = task.getStatus();
        validateStatusTransition(oldStatus, status);

        task.setStatus(status);
        task.setUpdatedAt(new Date());

        Task saved = taskRepository.save(task);

        // Fetch current user and log activity
        User currentUser = getCurrentUser();
        TaskActivity activity = TaskActivity.builder()
                .task(saved)
                .user(currentUser)
                .type("STATUS_CHANGED")
                .oldValue(oldStatus.name())
                .newValue(status.name())
                .createdAt(new Date())
                .build();
        taskActivityRepository.save(activity);

        redisService.deleteKey("project:" + saved.getProject().getId() + ":tasks");
        redisService.deleteKey("project:" + saved.getProject().getId() + ":all_tasks");

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

        if (request.getTitle() != null && !request.getTitle().trim().isEmpty() && !request.getTitle().equals(task.getTitle())) {
            String oldValue = task.getTitle();
            task.setTitle(request.getTitle());
            taskActivityRepository.save(TaskActivity.builder()
                    .task(task)
                    .user(actor)
                    .type("TITLE_CHANGED")
                    .oldValue(oldValue)
                    .newValue(request.getTitle())
                    .createdAt(new Date())
                    .build());
            changed = true;
        }
        if (request.getDescription() != null && !request.getDescription().equals(task.getDescription())) {
            String oldValue = task.getDescription();
            task.setDescription(request.getDescription());
            taskActivityRepository.save(TaskActivity.builder()
                    .task(task)
                    .user(actor)
                    .type("DESCRIPTION_CHANGED")
                    .oldValue(oldValue)
                    .newValue(request.getDescription())
                    .createdAt(new Date())
                    .build());
            changed = true;
        }
        if (request.getStatus() != null && request.getStatus() != task.getStatus()) {
            validateStatusTransition(task.getStatus(), request.getStatus());
            TaskStatus oldValue = task.getStatus();
            task.setStatus(request.getStatus());
            taskActivityRepository.save(TaskActivity.builder()
                    .task(task)
                    .user(actor)
                    .type("STATUS_CHANGED")
                    .oldValue(oldValue.name())
                    .newValue(request.getStatus().name())
                    .createdAt(new Date())
                    .build());
            changed = true;
        }
        if (request.getPriority() != null && request.getPriority() != task.getPriority()) {
            TaskPriority oldValue = task.getPriority();
            task.setPriority(request.getPriority());
            taskActivityRepository.save(TaskActivity.builder()
                    .task(task)
                    .user(actor)
                    .type("PRIORITY_CHANGED")
                    .oldValue(oldValue.name())
                    .newValue(request.getPriority().name())
                    .createdAt(new Date())
                    .build());
            changed = true;
        }
        if (request.getLabels() != null && !request.getLabels().equals(task.getLabels())) {
            String oldValue = task.getLabels();
            task.setLabels(request.getLabels());
            taskActivityRepository.save(TaskActivity.builder()
                    .task(task)
                    .user(actor)
                    .type("LABELS_CHANGED")
                    .oldValue(oldValue)
                    .newValue(request.getLabels())
                    .createdAt(new Date())
                    .build());
            changed = true;
        }
        if (request.getPoints() != null && !request.getPoints().equals(task.getPoints())) {
            Integer oldValue = task.getPoints();
            task.setPoints(request.getPoints());
            taskActivityRepository.save(TaskActivity.builder()
                    .task(task)
                    .user(actor)
                    .type("POINTS_CHANGED")
                    .oldValue(oldValue != null ? oldValue.toString() : null)
                    .newValue(request.getPoints() != null ? request.getPoints().toString() : null)
                    .createdAt(new Date())
                    .build());
            changed = true;
        }
        if (request.getDueDate() != null && !request.getDueDate().equals(task.getDueDate())) {
            Date oldValue = task.getDueDate();
            task.setDueDate(request.getDueDate());
            taskActivityRepository.save(TaskActivity.builder()
                    .task(task)
                    .user(actor)
                    .type("DUE_DATE_CHANGED")
                    .oldValue(oldValue != null ? oldValue.toString() : null)
                    .newValue(request.getDueDate() != null ? request.getDueDate().toString() : null)
                    .createdAt(new Date())
                    .build());
            changed = true;
        }

        // Assignee update — transfer ownership if assigneeId changed
        if (request.getAssigneeId() != null) {
            Optional<TaskAssignee> currentOwnerOpt = taskAssigneeRepository.findByTaskAndRole(task, TaskAssigneeRole.OWNER);
            User currentOwner = currentOwnerOpt.map(TaskAssignee::getUser).orElse(null);

            boolean ownerChanged = currentOwner == null || !request.getAssigneeId().equals(currentOwner.getId());
            if (ownerChanged) {
                User newOwner = userRepository.findById(request.getAssigneeId())
                        .orElseThrow(() -> new NotFoundException("Assignee user not found"));

                if (!rbacService.hasProjectRoleForUser(newOwner.getId(), task.getProject().getId(), ProjectMemberRole.VIEWER)) {
                    throw new DomainValidationException("Assignee must be a member of this project");
                }

                // Remove existing OWNER record
                currentOwnerOpt.ifPresent(taskAssigneeRepository::delete);

                // Remove any other role the new owner may have had on this task
                taskAssigneeRepository.findByTaskAndUser(task, newOwner).ifPresent(taskAssigneeRepository::delete);

                // Insert new OWNER record
                TaskAssignee newOwnerRecord = TaskAssignee.builder()
                        .task(task)
                        .user(newOwner)
                        .role(TaskAssigneeRole.OWNER)
                        .assignedAt(new Date())
                        .build();
                taskAssigneeRepository.save(newOwnerRecord);

                taskActivityRepository.save(TaskActivity.builder()
                        .task(task)
                        .user(actor)
                        .type("OWNER_CHANGED")
                        .oldValue(currentOwner != null ? currentOwner.getActualUsername() : null)
                        .newValue(newOwner.getActualUsername())
                        .createdAt(new Date())
                        .build());
                changed = true;
            }
        }

        if (request.getTeamId() != null) {
            UUID projectId = task.getProject().getId();
            Team newTeam = teamRepository.findById(request.getTeamId())
                    .orElseThrow(() -> new NotFoundException("Team not found"));
            if (!projectTeamRepository.existsByProjectIdAndTeamId(projectId, request.getTeamId())) {
                throw new DomainValidationException("Team is not associated with this project");
            }

            Team oldTeam = task.getTeam();
            boolean teamChanged = oldTeam == null || !request.getTeamId().equals(oldTeam.getId());
            if (teamChanged) {
                task.setTeam(newTeam);
                taskActivityRepository.save(TaskActivity.builder()
                        .task(task)
                        .user(actor)
                        .type("TEAM_CHANGED")
                        .oldValue(oldTeam != null ? oldTeam.getName() : "None")
                        .newValue(newTeam.getName())
                        .createdAt(new Date())
                        .build());
                changed = true;
            }
        }

        if (request.getSprintId() != null) {
            Sprint newSprint = sprintRepository.findById(request.getSprintId())
                    .orElseThrow(() -> new NotFoundException("Sprint not found"));
            if (!newSprint.getProject().getId().equals(task.getProject().getId())) {
                throw new DomainValidationException("Sprint does not belong to this project");
            }
            Sprint oldSprint = task.getSprint();
            if (oldSprint == null || !newSprint.getId().equals(oldSprint.getId())) {
                task.setSprint(newSprint);
                taskActivityRepository.save(TaskActivity.builder()
                        .task(task)
                        .user(actor)
                        .type("SPRINT_CHANGED")
                        .oldValue(oldSprint != null ? oldSprint.getName() : "Backlog")
                        .newValue(newSprint.getName())
                        .createdAt(new Date())
                        .build());
                changed = true;
            }
        }

        if (changed) {
            task.setUpdatedAt(new Date());
        }


        Task saved = taskRepository.save(task);

        if (changed) {
            aiDuplicateDetectorService.updateTaskEmbeddingAsync(saved);
        }

        redisService.deleteKey("project:" + saved.getProject().getId() + ":tasks");
        redisService.deleteKey("project:" + saved.getProject().getId() + ":all_tasks");

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

        UUID projectId = task.getProject().getId();
        aiDuplicateDetectorService.deleteTaskEmbedding(taskId);
        taskRepository.delete(task);

        redisService.deleteKey("project:" + projectId + ":tasks");
        redisService.deleteKey("project:" + projectId + ":all_tasks");
    }


    @Transactional(readOnly = true)
    public List<TaskActivityResponse> getTaskActivities(UUID taskId) {
        rbacService.verifyResourceBelongsToTenant(taskId, ResourceType.TASK);
        if (!rbacService.canViewTask(taskId)) {
            throw new ForbiddenException("Access denied: You do not have permission to view this task");
        }

        return taskActivityRepository.findAllByTaskIdOrderByCreatedAtDesc(taskId)
                .stream()
                .map(this::mapToActivityResponse)
                .collect(Collectors.toList());
    }

    private TaskActivityResponse mapToActivityResponse(TaskActivity activity) {
        return TaskActivityResponse.builder()
                .id(activity.getId())
                .taskId(activity.getTask().getId())
                .userId(activity.getUser() != null ? activity.getUser().getId() : null)
                .username(activity.getUser() != null ? activity.getUser().getActualUsername() : null)
                .fullName(activity.getUser() != null ? activity.getUser().getFullName() : null)
                .avatarUrl(activity.getUser() != null ? activity.getUser().getAvatarUrl() : null)
                .type(activity.getType())
                .oldValue(activity.getOldValue())
                .newValue(activity.getNewValue())
                .createdAt(activity.getCreatedAt())
                .build();
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

        if (task.getCreatedBy() != null) {
            response.setCreatedByName(task.getCreatedBy().getFullName());
        }

        if (task.getTeam() != null) {
            response.setTeamId(task.getTeam().getId());
        }
        if (task.getParentTask() != null) {
            response.setParentId(task.getParentTask().getId());
        }

        if (task.getSprint() != null) {
            response.setSprintId(task.getSprint().getId());
            response.setSprintName(task.getSprint().getName());
        }

        response.setTaskIdentifier("HS-" + String.format("%03d", task.getSequenceNumber()));



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
                .username(assignee.getUser().getActualUsername())
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
        boolean valid = switch (currentStatus) {
            case TODO        -> newStatus == TaskStatus.IN_PROGRESS
                             || newStatus == TaskStatus.CANCELLED;
            case IN_PROGRESS -> newStatus == TaskStatus.IN_REVIEW
                             || newStatus == TaskStatus.TODO
                             || newStatus == TaskStatus.CANCELLED;
            case IN_REVIEW   -> newStatus == TaskStatus.DONE
                             || newStatus == TaskStatus.IN_PROGRESS
                             || newStatus == TaskStatus.TODO
                             || newStatus == TaskStatus.CANCELLED;
            case DONE        -> newStatus == TaskStatus.IN_PROGRESS;
            case CANCELLED   -> newStatus == TaskStatus.TODO;
        };
        if (!valid) {
            throw new DomainValidationException("Cannot transition task from " + currentStatus + " to " + newStatus);
        }
    }

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User) {
            return (User) principal;
        }
        throw new IllegalStateException("User not authenticated");
    }
}
