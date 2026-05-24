package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.TaskRequest;
import com.project.hiveSpace.dto.TaskResponse;
import com.project.hiveSpace.dto.UpdateTaskRequest;
import com.project.hiveSpace.services.TaskService;
import com.project.hiveSpace.models.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.access.prepost.PreAuthorize;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @PostMapping("/projects/{projectId}/tasks")
    @PreAuthorize("@rbac.canCreateTask(#projectId)")
    public ResponseEntity<TaskResponse> createTask(
            @PathVariable UUID projectId,
            @Valid @RequestBody TaskRequest request,
            @AuthenticationPrincipal User creator) {
        return ResponseEntity.ok(taskService.createTask(projectId, request, creator));
    }

    @GetMapping("/projects/{projectId}/tasks")
    public ResponseEntity<List<TaskResponse>> getTasksByProject(@PathVariable UUID projectId) {
        return ResponseEntity.ok(taskService.getTasksByProject(projectId));
    }

    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<TaskResponse> getTaskById(@PathVariable UUID taskId) {
        return ResponseEntity.ok(taskService.getTaskById(taskId));
    }

    @GetMapping("/tasks")
    public ResponseEntity<List<TaskResponse>> getAllTasks() {
        System.out.println("=== TaskController.getAllTasks CALLED ===");
        return ResponseEntity.ok(taskService.getAllTasks());
    }

    @PatchMapping("/tasks/{taskId}/status")
    @PreAuthorize("@rbac.canEditTask(#taskId)")
    public ResponseEntity<TaskResponse> updateTaskStatus(
            @PathVariable UUID taskId,
            @RequestBody java.util.Map<String, String> body) {
        String status = body.get("status");
        if (status == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(taskService.updateTaskStatus(taskId, status));
    }

    @PutMapping("/tasks/{taskId}")
    @PreAuthorize("@rbac.canEditTask(#taskId)")
    public ResponseEntity<TaskResponse> updateTask(
            @PathVariable UUID taskId,
            @RequestBody UpdateTaskRequest request,
            @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(taskService.updateTask(taskId, request, actor));
    }

    @DeleteMapping("/tasks/{taskId}")
    @PreAuthorize("@rbac.canDeleteTask(#taskId)")
    public ResponseEntity<Void> deleteTask(
            @PathVariable UUID taskId,
            @AuthenticationPrincipal User actor) {
        taskService.deleteTask(taskId, actor);
        return ResponseEntity.noContent().build();
    }
}
