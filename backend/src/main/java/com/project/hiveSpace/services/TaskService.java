package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.TaskRequest;
import com.project.hiveSpace.dto.TaskResponse;
import com.project.hiveSpace.dto.TaskAssigneeResponse;
import com.project.hiveSpace.dto.UpdateTaskRequest;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
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

    @Transactional
    public TaskResponse createTask(UUID projectId, TaskRequest request, User creator) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        // 1. Verify user is a project member and not a VIEWER
        ProjectMember member = projectMemberRepository
                .findByProjectIdAndUserId(projectId, creator.getId())
                .orElseThrow(() -> new SecurityException("Not a project member"));

        if (member.getRole() == ProjectMemberRole.VIEWER) {
            throw new SecurityException("Viewers cannot create tasks");
        }

        // 2. Resolve default status and priority if they are null
        TaskStatus status = request.getStatus() != null ? request.getStatus() : TaskStatus.TODO;
        TaskPriority priority = request.getPriority() != null ? request.getPriority() : TaskPriority.MEDIUM;

        // 3. Resolve parent task if parentId is provided
        Task parentTask = null;
        if (request.getParentId() != null) {
            parentTask = taskRepository.findById(request.getParentId())
                    .orElseThrow(() -> new IllegalArgumentException("Parent task not found"));
        }

        // 4. Resolve team if teamId is provided
        Team team = null;
        if (request.getTeamId() != null) {
            team = teamRepository.findById(request.getTeamId())
                    .orElseThrow(() -> new IllegalArgumentException("Team not found"));
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
                .updatedAt(new Date())
                .build();

        // 6. Assign the owner
        User ownerUser = creator;
        if (request.getAssigneeId() != null) {
            User explicitlyAssigned = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new IllegalArgumentException("Assignee user not found"));
            // Verify if the assignee is a member of this project
            if (!projectMemberRepository.existsByProjectAndUser(project, explicitlyAssigned)) {
                throw new IllegalArgumentException("Assignee must be a member of this project");
            }
            ownerUser = explicitlyAssigned;
        }
        task.setAssignee(ownerUser);

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
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
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
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        return taskRepository.findAllByProjectAndParentTaskIsNullOrderByCreatedAtDesc(project)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getAllTasks() {
        return taskRepository.findAllByOrderByUpdatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TaskResponse updateTaskStatus(UUID taskId, String statusStr) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

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

        task.setStatus(status);
        task.setUpdatedAt(new Date());

        Task saved = taskRepository.save(task);
        return mapToResponse(saved);
    }

    @Transactional
    public TaskResponse updateTask(UUID taskId, UpdateTaskRequest request, User actor) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        // 1. Verify user is a project member and not a VIEWER
        ProjectMember member = projectMemberRepository
                .findByProjectIdAndUserId(task.getProject().getId(), actor.getId())
                .orElseThrow(() -> new SecurityException("Not a project member"));

        if (member.getRole() == ProjectMemberRole.VIEWER) {
            throw new SecurityException("Viewers cannot update tasks");
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
                    .orElseThrow(() -> new IllegalArgumentException("Assignee user not found"));
            // Verify if the assignee is a member of this project
            if (!projectMemberRepository.existsByProjectAndUser(task.getProject(), newAssignee)) {
                throw new IllegalArgumentException("Assignee must be a member of this project");
            }
            task.setAssignee(newAssignee);

            // Also need to update/insert OWNER in task_assignees
            Optional<TaskAssignee> currentOwnerOpt = taskAssigneeRepository.findByTaskAndRole(task, TaskAssigneeRole.OWNER);
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
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));

        ProjectMember member = projectMemberRepository
                .findByProjectIdAndUserId(task.getProject().getId(), actor.getId())
                .orElseThrow(() -> new SecurityException("Not a project member"));

        if (member.getRole() == ProjectMemberRole.VIEWER) {
            throw new SecurityException("Viewers cannot delete tasks");
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

        User assigneeUser = task.getAssignee();
        if (assigneeUser == null) {
            Optional<TaskAssignee> assigneeOpt = assignees.stream()
                    .filter(ta -> ta.getRole() == TaskAssigneeRole.OWNER)
                    .findFirst();
            if (assigneeOpt.isPresent()) {
                assigneeUser = assigneeOpt.get().getUser();
            }
        }

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
}
