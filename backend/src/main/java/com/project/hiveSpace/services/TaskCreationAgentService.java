package com.project.hiveSpace.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.hiveSpace.dto.ChannelMemberResponse;
import com.project.hiveSpace.dto.TaskRequest;
import com.project.hiveSpace.models.Channel;
import com.project.hiveSpace.models.TaskPriority;
import com.project.hiveSpace.models.TaskStatus;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.repository.ChannelRepository;
import com.project.hiveSpace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * TaskCreationAgentService runs in its OWN @Transactional (read-write) context.
 *
 * This service is deliberately separate from SlashCommandService (which is
 * @Transactional(readOnly=true)) to avoid the Spring AOP self-invocation problem
 * that causes "Transaction silently rolled back because it has been marked as rollback-only".
 *
 * Sequence:
 *   1. Resolve channel → project
 *   2. Fetch channel members as Kimi context
 *   3. Call NvidiaAIService with moonshotai/kimi-k2.6 to extract structured JSON
 *   4. Parse JSON → TaskRequest
 *   5. Resolve assignee UUID
 *   6. Call TaskService.createTask (write transaction)
 */
@Service
@RequiredArgsConstructor
public class TaskCreationAgentService {

    private final NvidiaAIService nvidiaAIService;
    private final ChannelService channelService;
    private final ChannelRepository channelRepository;
    private final UserRepository userRepository;
    private final TaskService taskService;

    @Value("${nvidia.model.redesign:moonshotai/kimi-k2.6}")
    private String kimiModel;

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public String createTaskFromPrompt(UUID channelId, UUID requestingUserId, String taskPrompt) {

        // 1. Resolve the requesting user (creator)
        User creator = userRepository.findById(requestingUserId)
                .orElseThrow(() -> new RuntimeException("Requesting user not found."));

        // 2. Resolve channel → project (eager fetch via channelRepository)
        Channel channel = channelRepository.findById(channelId).orElse(null);
        if (channel == null || channel.getProject() == null) {
            return "⚠️ I can only create tasks inside a **project channel**. " +
                    "Please use Hex from a channel that is linked to a project.";
        }

        UUID projectId = channel.getProject().getId();

        // 3. Fetch project members as context for the model
        List<ChannelMemberResponse> members = channelService.getChannelMembers(channelId, requestingUserId);
        String membersJson = members.stream()
                .map(m -> String.format("{\"username\":\"%s\",\"fullName\":\"%s\"}",
                        m.getUsername() != null ? m.getUsername() : "",
                        m.getFullName() != null ? m.getFullName() : ""))
                .collect(Collectors.joining(",", "[", "]"));

        String currentDate = LocalDate.now(ZoneId.systemDefault()).toString();

        // 4. Build system prompt for Kimi
        String systemPrompt = "You are an advanced AI project assistant for hiveSpace. " +
                "Your job is to extract task properties from the user's natural language input and output a strict JSON object.\n\n" +
                "CONTEXT INFORMATION:\n" +
                "1. Current Date: " + currentDate + "\n" +
                "2. Valid Project Members (JSON array): " + membersJson + "\n\n" +
                "JSON SCHEMA SPECIFICATION:\n" +
                "Your output MUST be a valid JSON object matching the following structure exactly:\n" +
                "{\n" +
                "  \"title\": \"Short, clear title of the task (Required, never null)\",\n" +
                "  \"description\": \"More detailed description, or null if none\",\n" +
                "  \"priority\": \"Must be one of: URGENT, HIGH, MEDIUM, LOW (Default: MEDIUM)\",\n" +
                "  \"status\": \"Must be one of: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED (Default: TODO)\",\n" +
                "  \"dueDate\": \"ISO-8601 date string YYYY-MM-DD or null if none mentioned\",\n" +
                "  \"points\": null,\n" +
                "  \"labels\": \"Comma-separated string of tags/labels or null if none\",\n" +
                "  \"assigneeUsername\": \"A username string from the provided members array, or null if no match\"\n" +
                "}\n\n" +
                "RULES:\n" +
                "1. Relative dates like 'by tomorrow', 'next Friday', 'end of week' MUST be calculated as absolute YYYY-MM-DD dates relative to Current Date (" + currentDate + ").\n" +
                "2. For assignee: match names like 'John', '@john', 'John Smith' against the members array by username or fullName. If no match found, set assigneeUsername to null.\n" +
                "3. Respond with ONLY the raw JSON object. No markdown code blocks, no extra text, no explanation.";

        // 5. Call Kimi via NvidiaAIService
        String rawJson;
        try {
            rawJson = nvidiaAIService.chatCompletion(systemPrompt, taskPrompt, kimiModel, 2000, 0.1);
            // Strip markdown code fences if model wrapped the JSON anyway
            rawJson = rawJson.trim();
            if (rawJson.startsWith("```")) {
                int firstNewline = rawJson.indexOf('\n');
                if (firstNewline != -1) rawJson = rawJson.substring(firstNewline).trim();
                if (rawJson.endsWith("```")) rawJson = rawJson.substring(0, rawJson.length() - 3).trim();
            }
        } catch (Exception e) {
            System.err.println("[TaskCreationAgent] AI call failed: " + e.getMessage());
            return "⚠️ The AI could not process your request right now. Please try again.";
        }

        // 6. Parse JSON → TaskRequest
        TaskRequest taskRequest;
        String resolvedAssigneeName = null;
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode node = mapper.readTree(rawJson);

            String title = node.has("title") && !node.get("title").isNull()
                    ? node.get("title").asText().trim() : null;
            if (title == null || title.isBlank()) {
                return "⚠️ I couldn't extract a task title from your message. Could you be more specific?";
            }

            String description = node.has("description") && !node.get("description").isNull()
                    ? node.get("description").asText() : null;
            String labels = node.has("labels") && !node.get("labels").isNull()
                    ? node.get("labels").asText() : null;

            TaskPriority priority = TaskPriority.MEDIUM;
            if (node.has("priority") && !node.get("priority").isNull()) {
                try { priority = TaskPriority.valueOf(node.get("priority").asText().toUpperCase()); }
                catch (Exception ignored) {}
            }

            TaskStatus status = TaskStatus.TODO;
            if (node.has("status") && !node.get("status").isNull()) {
                try { status = TaskStatus.valueOf(node.get("status").asText().toUpperCase()); }
                catch (Exception ignored) {}
            }

            Date dueDate = null;
            if (node.has("dueDate") && !node.get("dueDate").isNull()) {
                try {
                    dueDate = new SimpleDateFormat("yyyy-MM-dd").parse(node.get("dueDate").asText());
                } catch (Exception ignored) {}
            }

            Integer points = null;
            if (node.has("points") && !node.get("points").isNull() && node.get("points").isInt()) {
                points = node.get("points").asInt();
            }

            UUID assigneeId = null;
            if (node.has("assigneeUsername") && !node.get("assigneeUsername").isNull()) {
                String username = node.get("assigneeUsername").asText().trim();
                if (!username.isBlank()) {
                    User assignee = userRepository.findByUsername(username).orElse(null);
                    if (assignee != null) {
                        assigneeId = assignee.getId();
                        resolvedAssigneeName = assignee.getFullName() != null
                                ? assignee.getFullName() : assignee.getUsername();
                    }
                }
            }

            taskRequest = TaskRequest.builder()
                    .title(title)
                    .description(description)
                    .status(status)
                    .priority(priority)
                    .labels(labels)
                    .dueDate(dueDate)
                    .points(points)
                    .assigneeId(assigneeId)
                    .build();

        } catch (Exception e) {
            System.err.println("[TaskCreationAgent] JSON parse error: " + e.getMessage() + " | Raw: " + rawJson);
            return "⚠️ The AI returned an unexpected response format. Please try rephrasing your request.";
        }

        // 7. Persist via TaskService (this runs inside our @Transactional context)
        // If this throws, the REQUIRES_NEW transaction rolls back cleanly.
        var created = taskService.createTask(projectId, taskRequest, creator);

        StringBuilder sb = new StringBuilder();
        sb.append("✅ **Task Created:** [")
          .append(created.getTaskIdentifier() != null ? created.getTaskIdentifier() : "New Task")
          .append("] ")
          .append(created.getTitle());

        if (resolvedAssigneeName != null) {
            sb.append("\n👤 Assigned to **").append(resolvedAssigneeName).append("**");
        }
        if (created.getDueDate() != null) {
            sb.append("\n📅 Due: **")
              .append(new SimpleDateFormat("MMM d, yyyy").format(created.getDueDate()))
              .append("**");
        }
        sb.append("\n🏷️ Priority: **").append(created.getPriority()).append("**");

        return sb.toString();
    }
}
