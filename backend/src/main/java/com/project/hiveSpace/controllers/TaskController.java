package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.TaskRequest;
import com.project.hiveSpace.dto.TaskResponse;
import com.project.hiveSpace.services.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(
            @PathVariable UUID projectId,
            @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.ok(taskService.createTask(projectId, request));
    }

    @GetMapping
    public ResponseEntity<List<TaskResponse>> getTasksByProject(@PathVariable UUID projectId) {
        return ResponseEntity.ok(taskService.getTasksByProject(projectId));
    }
}
