package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.SprintRequest;
import com.project.hiveSpace.dto.SprintResponse;
import com.project.hiveSpace.exceptions.DomainValidationException;
import com.project.hiveSpace.exceptions.ForbiddenException;
import com.project.hiveSpace.exceptions.NotFoundException;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import com.project.hiveSpace.security.RbacService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SprintService {

    private final SprintRepository sprintRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final TaskActivityRepository taskActivityRepository;
    private final RbacService rbacService;
    private final RedisService redisService;

    public record BurndownPoint(Date date, int totalPoints, int remainingPoints) {}

    @Transactional
    public SprintResponse createSprint(UUID projectId, SprintRequest request, User creator) {
        rbacService.verifyResourceBelongsToTenant(projectId, ResourceType.PROJECT);
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project not found"));

        if (!rbacService.canCreateTask(projectId)) { // Reuse task creation permissions
            throw new ForbiddenException("Access denied: You do not have permission to create sprints");
        }

        if (request.getName() == null || request.getName().isBlank()) {
            throw new DomainValidationException("Sprint name cannot be empty");
        }

        Sprint sprint = Sprint.builder()
                .name(request.getName().trim())
                .goal(request.getGoal() != null ? request.getGoal().trim() : null)
                .status(SprintStatus.PLANNING)
                .project(project)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .createdBy(creator)
                .createdAt(new Date())
                .build();

        Sprint saved = sprintRepository.save(sprint);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SprintResponse> getSprintsForProject(UUID projectId) {
        rbacService.verifyResourceBelongsToTenant(projectId, ResourceType.PROJECT);
        if (!rbacService.canViewProject(projectId)) {
            throw new ForbiddenException("Access denied: You cannot view sprints for this project");
        }
        return sprintRepository.findAllByProjectIdOrderByCreatedAtDesc(projectId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public SprintResponse startSprint(UUID sprintId) {
        rbacService.verifyResourceBelongsToTenant(sprintId, ResourceType.SPRINT);
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new NotFoundException("Sprint not found"));

        if (!rbacService.canEditProject(sprint.getProject().getId())) {
            throw new ForbiddenException("Access denied: You cannot start sprints");
        }

        if (sprint.getStatus() != SprintStatus.PLANNING) {
            throw new DomainValidationException("Only sprints in PLANNING status can be started");
        }

        // Check database constraint: only one ACTIVE sprint per project
        if (sprintRepository.existsByProjectIdAndStatus(sprint.getProject().getId(), SprintStatus.ACTIVE)) {
            throw new DomainValidationException("There is already an active sprint in this project");
        }

        sprint.setStatus(SprintStatus.ACTIVE);
        if (sprint.getStartDate() == null) {
            sprint.setStartDate(new Date());
        }
        if (sprint.getEndDate() == null) {
            // Default to 14 days from start
            Calendar cal = Calendar.getInstance();
            cal.setTime(sprint.getStartDate());
            cal.add(Calendar.DATE, 14);
            sprint.setEndDate(cal.getTime());
        }
        sprint.setUpdatedAt(new Date());

        Sprint saved = sprintRepository.save(sprint);
        return mapToResponse(saved);
    }

    @Transactional
    public SprintResponse completeSprint(UUID sprintId, UUID targetSprintId) {
        rbacService.verifyResourceBelongsToTenant(sprintId, ResourceType.SPRINT);
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new NotFoundException("Sprint not found"));

        if (!rbacService.canEditProject(sprint.getProject().getId())) {
            throw new ForbiddenException("Access denied: You cannot complete sprints");
        }

        if (sprint.getStatus() != SprintStatus.ACTIVE) {
            throw new DomainValidationException("Only ACTIVE sprints can be completed");
        }

        Sprint targetSprint = null;
        if (targetSprintId != null) {
            rbacService.verifyResourceBelongsToTenant(targetSprintId, ResourceType.SPRINT);
            targetSprint = sprintRepository.findById(targetSprintId)
                    .orElseThrow(() -> new NotFoundException("Target sprint not found"));
            if (targetSprint.getStatus() == SprintStatus.COMPLETED) {
                throw new DomainValidationException("Cannot move tasks to a completed sprint");
            }
        }

        // Complete the sprint
        sprint.setStatus(SprintStatus.COMPLETED);
        sprint.setUpdatedAt(new Date());
        sprintRepository.save(sprint);

        // Process tasks
        List<Task> sprintTasks = taskRepository.findAllBySprintId(sprintId);
        for (Task task : sprintTasks) {
            if (task.getStatus() != TaskStatus.DONE && task.getStatus() != TaskStatus.CANCELLED) {
                // Move incomplete task to target sprint or backlog (null)
                task.setSprint(targetSprint);
                task.setUpdatedAt(new Date());
                taskRepository.save(task);

                // Log activity
                taskActivityRepository.save(TaskActivity.builder()
                        .task(task)
                        .type("SPRINT_CHANGED")
                        .oldValue(sprint.getName())
                        .newValue(targetSprint != null ? targetSprint.getName() : "Backlog")
                        .createdAt(new Date())
                        .build());
            }
        }

        redisService.deleteKey("project:" + sprint.getProject().getId() + ":tasks");
        redisService.deleteKey("project:" + sprint.getProject().getId() + ":all_tasks");

        return mapToResponse(sprint);
    }

    @Transactional
    public void associateTaskWithSprint(UUID taskId, UUID sprintId) {
        rbacService.verifyResourceBelongsToTenant(taskId, ResourceType.TASK);
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task not found"));

        if (!rbacService.canEditTask(taskId)) {
            throw new ForbiddenException("Access denied: You do not have permission to edit this task");
        }

        Sprint sprint = null;
        if (sprintId != null) {
            rbacService.verifyResourceBelongsToTenant(sprintId, ResourceType.SPRINT);
            sprint = sprintRepository.findById(sprintId)
                    .orElseThrow(() -> new NotFoundException("Sprint not found"));
        }

        String oldSprintName = task.getSprint() != null ? task.getSprint().getName() : "Backlog";
        String newSprintName = sprint != null ? sprint.getName() : "Backlog";

        if (!oldSprintName.equals(newSprintName)) {
            task.setSprint(sprint);
            task.setUpdatedAt(new Date());
            taskRepository.save(task);

            taskActivityRepository.save(TaskActivity.builder()
                    .task(task)
                    .type("SPRINT_CHANGED")
                    .oldValue(oldSprintName)
                    .newValue(newSprintName)
                    .createdAt(new Date())
                    .build());

            redisService.deleteKey("project:" + task.getProject().getId() + ":tasks");
            redisService.deleteKey("project:" + task.getProject().getId() + ":all_tasks");
        }
    }

    @Transactional(readOnly = true)
    public List<BurndownPoint> getBurndownData(UUID sprintId) {
        rbacService.verifyResourceBelongsToTenant(sprintId, ResourceType.SPRINT);
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new NotFoundException("Sprint not found"));

        if (sprint.getStartDate() == null) {
            return List.of();
        }

        Date start = sprint.getStartDate();
        Date end = sprint.getEndDate() != null ? sprint.getEndDate() : new Date();

        List<Task> tasks = taskRepository.findAllBySprintId(sprintId);
        List<BurndownPoint> points = new ArrayList<>();

        // Collect all days in range
        List<Date> dates = new ArrayList<>();
        Calendar cal = Calendar.getInstance();
        cal.setTime(start);
        
        // Zero out time for daily boundaries
        cal.set(Calendar.HOUR_OF_DAY, 23);
        cal.set(Calendar.MINUTE, 59);
        cal.set(Calendar.SECOND, 59);
        cal.set(Calendar.MILLISECOND, 999);

        Date currentDay = cal.getTime();
        Date maxLimit = end.after(new Date()) ? end : new Date();
        
        while (currentDay.before(maxLimit) || isSameDay(currentDay, maxLimit)) {
            dates.add(currentDay);
            cal.add(Calendar.DATE, 1);
            currentDay = cal.getTime();
        }

        // Sum points
        int totalPoints = tasks.stream()
                .mapToInt(t -> t.getPoints() != null ? t.getPoints() : 0)
                .sum();

        for (Date date : dates) {
            int remaining = 0;
            for (Task task : tasks) {
                TaskStatus statusAtDay = getStatusAt(task, date);
                if (statusAtDay != TaskStatus.DONE && statusAtDay != TaskStatus.CANCELLED) {
                    remaining += (task.getPoints() != null ? task.getPoints() : 0);
                }
            }
            points.add(new BurndownPoint(date, totalPoints, remaining));
        }

        return points;
    }

    private TaskStatus getStatusAt(Task task, Date date) {
        TaskStatus status = task.getStatus();
        List<TaskActivity> activities = taskActivityRepository.findAllByTaskIdOrderByCreatedAtDesc(task.getId());
        for (TaskActivity activity : activities) {
            if ("STATUS_CHANGED".equals(activity.getType()) && activity.getCreatedAt().after(date)) {
                try {
                    status = TaskStatus.valueOf(activity.getOldValue());
                } catch (Exception e) {
                    // skip
                }
            }
        }
        return status;
    }

    private boolean isSameDay(Date d1, Date d2) {
        Calendar cal1 = Calendar.getInstance();
        Calendar cal2 = Calendar.getInstance();
        cal1.setTime(d1);
        cal2.setTime(d2);
        return cal1.get(Calendar.YEAR) == cal2.get(Calendar.YEAR) &&
               cal1.get(Calendar.DAY_OF_YEAR) == cal2.get(Calendar.DAY_OF_YEAR);
    }

    private SprintResponse mapToResponse(Sprint sprint) {
        return SprintResponse.builder()
                .id(sprint.getId())
                .name(sprint.getName())
                .goal(sprint.getGoal())
                .status(sprint.getStatus())
                .projectId(sprint.getProject().getId())
                .startDate(sprint.getStartDate())
                .endDate(sprint.getEndDate())
                .createdById(sprint.getCreatedBy() != null ? sprint.getCreatedBy().getId() : null)
                .createdByName(sprint.getCreatedBy() != null ? sprint.getCreatedBy().getFullName() : null)
                .createdAt(sprint.getCreatedAt())
                .updatedAt(sprint.getUpdatedAt())
                .build();
    }
}
