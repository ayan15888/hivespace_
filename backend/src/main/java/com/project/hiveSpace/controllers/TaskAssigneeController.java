package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.AddAssigneeRequest;
import com.project.hiveSpace.dto.ChangeOwnerRequest;
import com.project.hiveSpace.dto.TaskAssigneeResponse;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.services.TaskAssigneeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks/{taskId}/assignees")
@RequiredArgsConstructor
public class TaskAssigneeController {
    private final TaskAssigneeService assigneeService;

    @GetMapping
    public ResponseEntity<List<TaskAssigneeResponse>> getAssignees(@PathVariable UUID taskId) {
        return ResponseEntity.ok(assigneeService.getAssigneesForTask(taskId));
    }

    @PostMapping
    public ResponseEntity<TaskAssigneeResponse> addAssignee(
            @PathVariable UUID taskId,
            @RequestBody @Valid AddAssigneeRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(assigneeService.addAssignee(taskId, request, user));
    }

    @PatchMapping("/owner")
    public ResponseEntity<TaskAssigneeResponse> changeOwner(
            @PathVariable UUID taskId,
            @RequestBody @Valid ChangeOwnerRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(assigneeService.changeOwner(taskId, request, user));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> removeAssignee(
            @PathVariable UUID taskId,
            @PathVariable UUID userId,
            @AuthenticationPrincipal User user) {
        assigneeService.removeAssignee(taskId, userId, user);
        return ResponseEntity.noContent().build();
    }
}
