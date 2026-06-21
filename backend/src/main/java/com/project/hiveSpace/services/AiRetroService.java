package com.project.hiveSpace.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.project.hiveSpace.dto.DocumentRequest;
import com.project.hiveSpace.exceptions.NotFoundException;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.SimpleDateFormat;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiRetroService {

    private final TaskRepository taskRepository;
    private final TaskActivityRepository taskActivityRepository;
    private final MessageRepository messageRepository;
    private final ChannelRepository channelRepository;
    private final ProjectRepository projectRepository;
    private final DocumentRepository documentRepository;
    private final DocumentContentRepository documentContentRepository;
    private final NvidiaAIService nvidiaAIService;
    private final ObjectMapper objectMapper;

    @Value("${nvidia.model.default}")
    private String defaultChatModel;

    @Transactional
    public UUID generateSprintRetrospective(UUID projectId, Instant startDate, Instant endDate, User creator) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project not found"));

        // 1. Fetch all tasks for the project updated in this window
        List<Task> allTasks = taskRepository.findAllByProjectId(projectId);
        
        // Group tasks updated within the range
        List<Task> sprintTasks = allTasks.stream()
                .filter(t -> t.getUpdatedAt() != null && 
                             t.getUpdatedAt().after(Date.from(startDate)) && 
                             t.getUpdatedAt().before(Date.from(endDate)))
                .collect(Collectors.toList());

        Map<TaskStatus, List<Task>> tasksByStatus = sprintTasks.stream()
                .collect(Collectors.groupingBy(Task::getStatus));

        // 2. Identify blockers/regressions in task activities
        List<String> blockerLog = new ArrayList<>();
        for (Task task : allTasks) {
            List<TaskActivity> activities = taskActivityRepository.findAllByTaskIdOrderByCreatedAtDesc(task.getId());
            for (TaskActivity activity : activities) {
                if (activity.getCreatedAt().after(Date.from(startDate)) && activity.getCreatedAt().before(Date.from(endDate))) {
                    if ("STATUS_CHANGED".equals(activity.getType()) && 
                        "IN_PROGRESS".equals(activity.getOldValue()) && 
                        "TODO".equals(activity.getNewValue())) {
                        blockerLog.add(String.format("Task HS-%03d ('%s') reverted from IN PROGRESS to TODO (Possible Blocker).", 
                                task.getSequenceNumber(), task.getTitle()));
                    }
                }
            }
        }

        // 3. Fetch project channel messages for qualitative context
        List<Message> messages = Collections.emptyList();
        Optional<Channel> projectChannelOpt = channelRepository.findByProjectIdAndType(projectId, ChannelType.PUBLIC);
        if (projectChannelOpt.isPresent()) {
            messages = messageRepository.findMessagesBetween(projectChannelOpt.get().getId(), startDate, endDate);
        }

        String chatContext = messages.stream()
                .map(msg -> {
                    String senderName = msg.getSender() != null ? msg.getSender().getFullName() : "AI Assistant";
                    return senderName + ": " + msg.getContent();
                })
                .collect(Collectors.joining("\n"));

        // 4. Synthesize prompt
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
        StringBuilder statsContext = new StringBuilder();
        statsContext.append("Sprint Window: ").append(sdf.format(Date.from(startDate))).append(" to ").append(sdf.format(Date.from(endDate))).append("\n");
        statsContext.append("Total active tasks: ").append(sprintTasks.size()).append("\n");
        for (TaskStatus status : TaskStatus.values()) {
            int count = tasksByStatus.getOrDefault(status, Collections.emptyList()).size();
            statsContext.append("Tasks in status ").append(status).append(": ").append(count).append("\n");
        }

        statsContext.append("\nRegression Events (Blockers):\n");
        if (blockerLog.isEmpty()) {
            statsContext.append("None detected.\n");
        } else {
            for (String blocker : blockerLog) {
                statsContext.append("- ").append(blocker).append("\n");
            }
        }

        statsContext.append("\nTasks Details:\n");
        for (Task task : sprintTasks) {
            statsContext.append(String.format("- HS-%03d: %s (Status: %s, Priority: %s)\n", 
                    task.getSequenceNumber(), task.getTitle(), task.getStatus(), task.getPriority()));
        }

        String systemPrompt = "You are an AI sprint retrospective agent. Read the provided quantitative task list, " +
                "blocker logs, and qualitative team chat history. Generate a beautifully structured, comprehensive sprint retrospective document.\n" +
                "The report MUST include:\n" +
                "1. Executive Summary\n" +
                "2. Metrics & Delivery Summary (total tasks completed, split by status)\n" +
                "3. Key Wins & Achievements\n" +
                "4. Blockers, Regressions & Action items (analyze tasks reverting from in progress to todo, and reference any problems identified in the chat logs)\n\n" +
                "Format using clean markdown with headings (use ## and ###) and list items. Keep it professional, encouraging, and detailed.";

        String userPrompt = "STATISTICS & TASKS:\n" + statsContext.toString() + "\n\nCHAT LOGS:\n" + chatContext;

        String markdownReport;
        try {
            markdownReport = nvidiaAIService.chatCompletion(systemPrompt, userPrompt, defaultChatModel, 4000, 0.3);
        } catch (Exception e) {
            markdownReport = "## Sprint Retrospective\nFailed to compile AI insights: " + e.getMessage();
        }

        // 5. Convert Markdown report to ProseMirror JSON structure
        String contentJson = convertMarkdownToProseMirror(markdownReport);

        // 6. Create document
        Document document = Document.builder()
                .title("Sprint Retro (" + sdf.format(Date.from(startDate)) + " / " + sdf.format(Date.from(endDate)) + ")")
                .icon("📝")
                .workspace(project.getWorkspace())
                .project(project)
                .createdBy(creator)
                .isPublished(false)
                .createdAt(new Date())
                .updatedAt(new Date())
                .build();

        Document savedDoc = documentRepository.save(document);

        DocumentContent content = DocumentContent.builder()
                .documentId(savedDoc.getId())
                .document(savedDoc)
                .content(contentJson)
                .textContent(markdownReport)
                .version(1)
                .updatedAt(new Date())
                .build();
        documentContentRepository.save(content);

        return savedDoc.getId();
    }

    private String convertMarkdownToProseMirror(String markdown) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            ObjectNode docNode = mapper.createObjectNode();
            docNode.put("type", "doc");
            ArrayNode docContent = mapper.createArrayNode();

            String[] lines = markdown.split("\n");
            ObjectNode activeList = null;
            ArrayNode activeListItems = null;

            for (String line : lines) {
                String trimmed = line.trim();
                if (trimmed.isEmpty()) {
                    if (activeList != null) {
                        docContent.add(activeList);
                        activeList = null;
                        activeListItems = null;
                    }
                    continue;
                }

                if (trimmed.startsWith("# ")) {
                    if (activeList != null) {
                        docContent.add(activeList);
                        activeList = null;
                        activeListItems = null;
                    }
                    docContent.add(createHeadingNode(mapper, trimmed.substring(2), 1));
                } else if (trimmed.startsWith("## ")) {
                    if (activeList != null) {
                        docContent.add(activeList);
                        activeList = null;
                        activeListItems = null;
                    }
                    docContent.add(createHeadingNode(mapper, trimmed.substring(3), 2));
                } else if (trimmed.startsWith("### ")) {
                    if (activeList != null) {
                        docContent.add(activeList);
                        activeList = null;
                        activeListItems = null;
                    }
                    docContent.add(createHeadingNode(mapper, trimmed.substring(4), 3));
                } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                    if (activeList == null) {
                        activeList = mapper.createObjectNode();
                        activeList.put("type", "bulletList");
                        activeListItems = mapper.createArrayNode();
                        activeList.set("content", activeListItems);
                    }
                    activeListItems.add(createListItemNode(mapper, trimmed.substring(2)));
                } else {
                    if (activeList != null) {
                        docContent.add(activeList);
                        activeList = null;
                        activeListItems = null;
                    }
                    docContent.add(createParagraphNode(mapper, trimmed));
                }
            }

            if (activeList != null) {
                docContent.add(activeList);
            }

            docNode.set("content", docContent);
            return mapper.writeValueAsString(docNode);
        } catch (Exception e) {
            return "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"" + markdown.replace("\"", "\\\"") + "\"}]}]}";
        }
    }

    private ObjectNode createHeadingNode(ObjectMapper mapper, String text, int level) {
        ObjectNode heading = mapper.createObjectNode();
        heading.put("type", "heading");
        ObjectNode attrs = mapper.createObjectNode();
        attrs.put("level", level);
        heading.set("attrs", attrs);
        
        ArrayNode content = mapper.createArrayNode();
        ObjectNode textNode = mapper.createObjectNode();
        textNode.put("type", "text");
        textNode.put("text", text);
        content.add(textNode);
        heading.set("content", content);
        return heading;
    }

    private ObjectNode createParagraphNode(ObjectMapper mapper, String text) {
        ObjectNode paragraph = mapper.createObjectNode();
        paragraph.put("type", "paragraph");
        ArrayNode content = mapper.createArrayNode();
        ObjectNode textNode = mapper.createObjectNode();
        textNode.put("type", "text");
        textNode.put("text", text);
        content.add(textNode);
        paragraph.set("content", content);
        return paragraph;
    }

    private ObjectNode createListItemNode(ObjectMapper mapper, String text) {
        ObjectNode listItem = mapper.createObjectNode();
        listItem.put("type", "listItem");
        ArrayNode content = mapper.createArrayNode();
        content.add(createParagraphNode(mapper, text));
        listItem.set("content", content);
        return listItem;
    }
}
