package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.TaskRequest;
import com.project.hiveSpace.dto.TaskResponse;
import com.project.hiveSpace.models.Project;
import com.project.hiveSpace.models.Task;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.models.TaskAssignee;
import com.project.hiveSpace.models.TaskAssigneeRole;
import com.project.hiveSpace.repository.ProjectRepository;
import com.project.hiveSpace.repository.TaskRepository;
import com.project.hiveSpace.repository.UserRepository;
import com.project.hiveSpace.repository.TaskAssigneeRepository;
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
    private final UserRepository userRepository;
    private final TaskAssigneeRepository taskAssigneeRepository;

    @Transactional
    public TaskResponse createTask(UUID projectId, TaskRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        User assignee = null;
        if (request.getAssigneeId() != null) {
            assignee = userRepository.findById(request.getAssigneeId()).orElse(null);
        }

        Task task = Task.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .status(request.getStatus())
                .priority(request.getPriority())
                .labels(request.getLabels())
                .dueDate(request.getDueDate())
                .points(request.getPoints())
                .project(project)
                .assignee(assignee)
                .createdAt(new Date())
                .updatedAt(new Date())
                .build();

        Task savedTask = taskRepository.save(task);

        if (assignee != null) {
            TaskAssignee taskAssignee = TaskAssignee.builder()
                    .task(savedTask)
                    .user(assignee)
                    .role(TaskAssigneeRole.OWNER)
                    .assignedAt(new Date())
                    .build();
            taskAssigneeRepository.save(taskAssignee);
        }

        return mapToResponse(savedTask);
    }

    public List<TaskResponse> getTasksByProject(UUID projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        return taskRepository.findAllByProject(project)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<TaskResponse> getAllTasks() {
        return taskRepository.findAllByOrderByUpdatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
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

        User assigneeUser = task.getAssignee();
        if (assigneeUser == null) {
            Optional<TaskAssignee> assigneeOpt = taskAssigneeRepository.findFirstByTask(task);
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
