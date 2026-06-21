package com.project.hiveSpace.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.hiveSpace.dto.UpdateTaskRequest;
import com.project.hiveSpace.exceptions.NotFoundException;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.ProjectRepository;
import com.project.hiveSpace.repository.TaskRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiTriageService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final TaskService taskService;
    private final NvidiaAIService nvidiaAIService;

    @Value("${nvidia.model.default}")
    private String defaultChatModel;

    @Data
    public static class TriageSuggestion {
        private String taskId;
        private String taskIdentifier;
        private String title;
        private String currentPriority;
        private String suggestedPriority;
        private String currentStatus;
        private String suggestedStatus;
        private String reason;
    }

    @Transactional(readOnly = true)
    public List<TriageSuggestion> getTriageSuggestions(UUID projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project not found"));

        List<Task> tasks = taskRepository.findAllByProjectId(projectId);
        if (tasks.isEmpty()) {
            return Collections.emptyList();
        }

        // Format task list for LLM context
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
        String currentDate = LocalDate.now(ZoneId.systemDefault()).toString();

        StringBuilder tasksContext = new StringBuilder();
        for (Task task : tasks) {
            String assigneeName = taskService.getTaskById(task.getId()).getAssigneeName();
            tasksContext.append(String.format(
                "ID: %s | HS-%03d | Title: %s | Status: %s | Priority: %s | DueDate: %s | Assignee: %s\n",
                task.getId(),
                task.getSequenceNumber() != null ? task.getSequenceNumber() : 0,
                task.getTitle(),
                task.getStatus(),
                task.getPriority(),
                task.getDueDate() != null ? dateFormat.format(task.getDueDate()) : "None",
                assigneeName != null ? assigneeName : "Unassigned"
            ));
        }

        String systemPrompt = "You are an AI task triage agent for hiveSpace. Your job is to analyze the active tasks in a project and suggest adjustments to priority or status where appropriate to keep the board healthy.\n\n" +
                "RULES FOR TRIAGE:\n" +
                "1. If a task is past its due date (Current Date is " + currentDate + ") or due within 2 days, and status is not DONE, its priority should likely be URGENT or HIGH.\n" +
                "2. If a task has no priority set (or is Medium) but is critical based on the description/title, suggest a change.\n" +
                "3. You must respect the strict state transition rules of the workflow:\n" +
                "   - TODO can only transition to IN_PROGRESS or CANCELLED\n" +
                "   - IN_PROGRESS can only transition to IN_REVIEW, TODO, or CANCELLED\n" +
                "   - IN_REVIEW can only transition to DONE, IN_PROGRESS, TODO, or CANCELLED\n" +
                "   - DONE can only transition to IN_PROGRESS\n" +
                "   - CANCELLED can only transition to TODO\n" +
                "   Therefore, DO NOT suggest direct transitions from TODO to DONE or TODO to IN_REVIEW.\n\n" +
                "4. Suggest changes ONLY for tasks that actually need triage. Do not suggest changes for already DONE/CANCELLED tasks or tasks that are healthy.\n" +
                "5. Your response must be ONLY a valid JSON array of suggestions. Do not include markdown code block syntax (like ```json). Structure:\n" +
                "[\n" +
                "  {\n" +
                "    \"taskId\": \"String UUID\",\n" +
                "    \"taskIdentifier\": \"HS-XXX\",\n" +
                "    \"title\": \"Task Title\",\n" +
                "    \"currentPriority\": \"URGENT/HIGH/MEDIUM/LOW\",\n" +
                "    \"suggestedPriority\": \"URGENT/HIGH/MEDIUM/LOW (or same as current if no change)\",\n" +
                "    \"currentStatus\": \"TODO/IN_PROGRESS/IN_REVIEW/DONE/CANCELLED\",\n" +
                "    \"suggestedStatus\": \"TODO/IN_PROGRESS/IN_REVIEW/DONE/CANCELLED (or same as current if no change)\",\n" +
                "    \"reason\": \"A friendly explanation of why this change is suggested\"\n" +
                "  }\n" +
                "]";

        try {
            String response = nvidiaAIService.chatCompletion(systemPrompt, tasksContext.toString(), defaultChatModel, 3000, 0.2);
            response = response.trim();
            if (response.startsWith("```")) {
                int firstNewline = response.indexOf('\n');
                if (firstNewline != -1) {
                    response = response.substring(firstNewline).trim();
                }
                if (response.endsWith("```")) {
                    response = response.substring(0, response.length() - 3).trim();
                }
            }

            ObjectMapper mapper = new ObjectMapper();
            List<TriageSuggestion> suggestions = mapper.readValue(response, new TypeReference<List<TriageSuggestion>>() {});
            
            // Filter out suggestions that make no changes
            return suggestions.stream()
                    .filter(s -> !s.getCurrentPriority().equalsIgnoreCase(s.getSuggestedPriority()) 
                            || !s.getCurrentStatus().equalsIgnoreCase(s.getSuggestedStatus()))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            e.printStackTrace();
            return Collections.emptyList();
        }
    }

    @Transactional
    public void applyTriageSuggestions(UUID projectId, List<TriageSuggestion> suggestions, User actor) {
        for (TriageSuggestion suggestion : suggestions) {
            try {
                UUID taskId = UUID.fromString(suggestion.getTaskId());
                Task task = taskRepository.findById(taskId)
                        .orElseThrow(() -> new NotFoundException("Task not found: " + taskId));

                UpdateTaskRequest request = new UpdateTaskRequest();
                
                // Set priority if changed
                if (suggestion.getSuggestedPriority() != null && !suggestion.getSuggestedPriority().equalsIgnoreCase(suggestion.getCurrentPriority())) {
                    request.setPriority(TaskPriority.valueOf(suggestion.getSuggestedPriority().toUpperCase()));
                }

                // Set status if changed
                if (suggestion.getSuggestedStatus() != null && !suggestion.getSuggestedStatus().equalsIgnoreCase(suggestion.getCurrentStatus())) {
                    request.setStatus(TaskStatus.valueOf(suggestion.getSuggestedStatus().toUpperCase()));
                }

                // Apply update
                taskService.updateTask(task.getId(), request, actor);
            } catch (Exception e) {
                System.err.println("Failed to apply triage suggestion for task " + suggestion.getTaskIdentifier() + ": " + e.getMessage());
            }
        }
    }
}
