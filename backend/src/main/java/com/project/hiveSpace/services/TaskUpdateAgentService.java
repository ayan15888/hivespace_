package com.project.hiveSpace.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.hiveSpace.dto.ChannelMemberResponse;
import com.project.hiveSpace.dto.UpdateTaskRequest;
import com.project.hiveSpace.models.Channel;
import com.project.hiveSpace.models.Project;
import com.project.hiveSpace.models.Task;
import com.project.hiveSpace.models.TaskPriority;
import com.project.hiveSpace.models.TaskStatus;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.models.TaskAssignee;
import com.project.hiveSpace.models.TaskAssigneeRole;
import com.project.hiveSpace.repository.ChannelRepository;
import com.project.hiveSpace.repository.TaskAssigneeRepository;
import com.project.hiveSpace.repository.TaskRepository;
import com.project.hiveSpace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskUpdateAgentService {

    private final NvidiaAIService nvidiaAIService;
    private final ChannelService channelService;
    private final ChannelRepository channelRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final TaskService taskService;
    private final TaskAssigneeRepository taskAssigneeRepository;

    @Value("${nvidia.model.redesign:moonshotai/kimi-k2.6}")
    private String kimiModel;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String updateTaskFromPrompt(UUID channelId, UUID requestingUserId, String updatePrompt) {

        // 1. Resolve requesting user (actor)
        User actor = userRepository.findById(requestingUserId)
                .orElseThrow(() -> new RuntimeException("Requesting user not found."));

        // 2. Resolve channel → project
        Channel channel = channelRepository.findById(channelId).orElse(null);
        if (channel == null || channel.getProject() == null) {
            return "⚠️ I can only update tasks inside a **project channel**.";
        }

        Project project = channel.getProject();
        UUID projectId = project.getId();

        // 3. Fetch project members as context
        List<ChannelMemberResponse> members = channelService.getChannelMembers(channelId, requestingUserId);
        String membersJson = members.stream()
                .map(m -> String.format("{\"username\":\"%s\",\"fullName\":\"%s\"}",
                        m.getUsername() != null ? m.getUsername() : "",
                        m.getFullName() != null ? m.getFullName() : ""))
                .collect(Collectors.joining(",", "[", "]"));

        String currentDate = LocalDate.now(ZoneId.systemDefault()).toString();

        // 4. Build system prompt for Kimi
        String systemPrompt = "You are an advanced AI project assistant for hiveSpace. " +
                "Your job is to extract task update intent from the user's natural language input and output a strict JSON object.\n\n" +
                "CONTEXT INFORMATION:\n" +
                "1. Current Date: " + currentDate + "\n" +
                "2. Valid Project Members (JSON array): " + membersJson + "\n\n" +
                "JSON SCHEMA SPECIFICATION:\n" +
                "Your output MUST be a valid JSON object matching the following structure exactly:\n" +
                "{\n" +
                "  \"sequenceNumber\": \"Integer representing the task number (e.g. from 'task 15' or 'HS-015', extract 15). Required.\",\n" +
                "  \"title\": \"New title, or null if not updating\",\n" +
                "  \"description\": \"New description, or null if not updating\",\n" +
                "  \"priority\": \"URGENT, HIGH, MEDIUM, LOW, or null if not updating\",\n" +
                "  \"status\": \"TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED, or null if not updating\",\n" +
                "  \"dueDate\": \"ISO-8601 date string YYYY-MM-DD or null if not updating\",\n" +
                "  \"points\": \"Integer or null if not updating\",\n" +
                "  \"labels\": \"Comma-separated string or null if not updating\",\n" +
                "  \"assigneeUsername\": \"A username string from the provided members array, or null if not updating\"\n" +
                "}\n\n" +
                "RULES:\n" +
                "1. You MUST extract the sequenceNumber from the user's prompt (like 'update task 5' -> 5).\n" +
                "2. Only populate fields the user explicitly asked to change. Leave everything else null.\n" +
                "3. Relative dates MUST be converted to absolute YYYY-MM-DD based on Current Date.\n" +
                "4. For assignee: match names against the members array. If no match found, set assigneeUsername to null.\n" +
                "5. Respond with ONLY the raw JSON object. No markdown code blocks, no extra text.";

        // 5. Call Kimi
        String rawJson;
        try {
            rawJson = nvidiaAIService.chatCompletion(systemPrompt, updatePrompt, kimiModel, 2000, 0.1);
            rawJson = rawJson.trim();
            if (rawJson.startsWith("```")) {
                int firstNewline = rawJson.indexOf('\n');
                if (firstNewline != -1) rawJson = rawJson.substring(firstNewline).trim();
                if (rawJson.endsWith("```")) rawJson = rawJson.substring(0, rawJson.length() - 3).trim();
            }
        } catch (Exception e) {
            System.err.println("[TaskUpdateAgent] AI call failed: " + e.getMessage());
            return "⚠️ The AI could not process your request right now. Please try again.";
        }

        // 6. Parse JSON
        UpdateTaskRequest updateRequest = new UpdateTaskRequest();
        Integer sequenceNumber = null;
        String resolvedAssigneeName = null;
        StringBuilder changesList = new StringBuilder();

        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode node = mapper.readTree(rawJson);

            if (node.has("sequenceNumber") && !node.get("sequenceNumber").isNull()) {
                sequenceNumber = node.get("sequenceNumber").asInt();
            } else {
                return "⚠️ I couldn't understand which task you want to update. Please specify a task number (like 'Task 15' or 'HS-015').";
            }

            if (node.has("title") && !node.get("title").isNull()) {
                updateRequest.setTitle(node.get("title").asText().trim());
                changesList.append("\n✏️ Title updated");
            }
            if (node.has("description") && !node.get("description").isNull()) {
                updateRequest.setDescription(node.get("description").asText());
                changesList.append("\n📝 Description updated");
            }
            if (node.has("priority") && !node.get("priority").isNull()) {
                try {
                    TaskPriority p = TaskPriority.valueOf(node.get("priority").asText().toUpperCase());
                    updateRequest.setPriority(p);
                    changesList.append("\n🏷️ Priority set to **").append(p).append("**");
                } catch (Exception ignored) {}
            }
            if (node.has("status") && !node.get("status").isNull()) {
                try {
                    TaskStatus s = TaskStatus.valueOf(node.get("status").asText().toUpperCase());
                    updateRequest.setStatus(s);
                    changesList.append("\n📌 Status set to **").append(s).append("**");
                } catch (Exception ignored) {}
            }
            if (node.has("dueDate") && !node.get("dueDate").isNull()) {
                try {
                    Date date = new SimpleDateFormat("yyyy-MM-dd").parse(node.get("dueDate").asText());
                    updateRequest.setDueDate(date);
                    changesList.append("\n📅 Due date updated to **")
                               .append(new SimpleDateFormat("MMM d, yyyy").format(date))
                               .append("**");
                } catch (Exception ignored) {}
            }
            if (node.has("points") && !node.get("points").isNull() && node.get("points").isInt()) {
                int pts = node.get("points").asInt();
                updateRequest.setPoints(pts);
                changesList.append("\n🎯 Points set to **").append(pts).append("**");
            }
            if (node.has("labels") && !node.get("labels").isNull()) {
                updateRequest.setLabels(node.get("labels").asText());
                changesList.append("\n🔖 Labels updated");
            }

            if (node.has("assigneeUsername") && !node.get("assigneeUsername").isNull()) {
                String username = node.get("assigneeUsername").asText().trim();
                if (!username.isBlank()) {
                    User assignee = userRepository.findByUsername(username).orElse(null);
                    if (assignee != null) {
                        updateRequest.setAssigneeId(assignee.getId());
                        resolvedAssigneeName = assignee.getFullName() != null ? assignee.getFullName() : assignee.getUsername();
                        changesList.append("\n👤 Assigned to **").append(resolvedAssigneeName).append("**");
                    }
                }
            }

            // Check if any fields were actually requested to be updated
            if (changesList.length() == 0) {
                return "⚠️ I found task HS-" + String.format("%03d", sequenceNumber) + " but I wasn't sure what to update. Could you clarify what you'd like to change?";
            }

        } catch (Exception e) {
            System.err.println("[TaskUpdateAgent] JSON parse error: " + e.getMessage());
            return "⚠️ I couldn't parse the update details. Please rephrase your request.";
        }

        // 7. Find target task
        Task targetTask = taskRepository.findByProjectAndSequenceNumber(project, sequenceNumber).orElse(null);
        if (targetTask == null) {
            return "⚠️ I couldn't find task **HS-" + String.format("%03d", sequenceNumber) + "** in this project.";
        }

        // We need to carry over required fields that weren't specified, or TaskService might complain.
        // UpdateTaskRequest allows nulls, TaskService checks for nulls and skips updates.
        // Wait, TaskService `updateTask` explicitly checks if request.getTitle() != null.
        // BUT wait, it doesn't accept assigneeId or dueDate.
        // Let's check TaskService.updateTask logic: It only updates Title, Description, Status, Priority, Labels, Points, DueDate.
        // Does TaskService.updateTask update assignee? No! Assignees are handled via TaskAssigneeRepository.
        // Let's manually handle assignee update here since TaskService doesn't do it inside updateTask.

        // 8. Persist via TaskService
        // If this throws, the REQUIRES_NEW transaction rolls back cleanly
        taskService.updateTask(targetTask.getId(), updateRequest, actor);

// Add to imports at top:
// import com.project.hiveSpace.models.TaskAssignee;
// import com.project.hiveSpace.models.TaskAssigneeRole;
// import com.project.hiveSpace.repository.TaskAssigneeRepository;

        // 9. Handle Assignee Update (if provided)
        if (updateRequest.getAssigneeId() != null) {
            User newAssignee = userRepository.findById(updateRequest.getAssigneeId()).orElse(null);
            if (newAssignee != null) {
                // Find existing owner and remove them or update them
                taskAssigneeRepository.findByTaskIdAndRole(targetTask.getId(), TaskAssigneeRole.OWNER)
                    .ifPresent(existing -> taskAssigneeRepository.delete(existing));
                
                TaskAssignee newAssigneeRecord = TaskAssignee.builder()
                        .task(targetTask)
                        .user(newAssignee)
                        .role(TaskAssigneeRole.OWNER)
                        .assignedAt(new Date())
                        .build();
                taskAssigneeRepository.save(newAssigneeRecord);
            }
        }

        StringBuilder response = new StringBuilder();
        response.append("✅ **Task HS-").append(String.format("%03d", sequenceNumber)).append(" Updated**\n");
        response.append(changesList.toString());

        return response.toString();
    }
}
