package com.project.hiveSpace.services;

import com.project.hiveSpace.exceptions.NotFoundException;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiStaleTaskNudgerService {

    private final TaskRepository taskRepository;
    private final TaskAssigneeRepository taskAssigneeRepository;
    private final ChannelRepository channelRepository;
    private final MessageRepository messageRepository;
    private final NotificationRepository notificationRepository;
    private final ProjectRepository projectRepository;
    private final NvidiaAIService nvidiaAIService;

    @Value("${nvidia.model.default}")
    private String defaultChatModel;

    @Data
    @Builder
    public static class StaleTaskInfo {
        private String taskId;
        private String taskIdentifier;
        private String title;
        private String assigneeId;
        private String assigneeName;
        private long daysStale;
        private boolean activeInChat;
        private String nudgeMessage;
    }

    @Transactional(readOnly = true)
    public List<StaleTaskInfo> getStaleTasks(UUID projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project not found"));

        List<Task> tasks = taskRepository.findAllByProjectId(projectId);
        
        // Find tasks stuck in IN_PROGRESS for more than 3 days
        Instant threshold = Instant.now().minus(3, ChronoUnit.DAYS);
        Date thresholdDate = Date.from(threshold);

        List<Task> staleTasks = tasks.stream()
                .filter(t -> t.getStatus() == TaskStatus.IN_PROGRESS)
                .filter(t -> t.getUpdatedAt() != null && t.getUpdatedAt().before(thresholdDate))
                .collect(Collectors.toList());

        List<StaleTaskInfo> result = new ArrayList<>();

        for (Task task : staleTasks) {
            // Find assignee (OWNER)
            Optional<TaskAssignee> ownerOpt = taskAssigneeRepository.findByTaskIdAndRole(task.getId(), TaskAssigneeRole.OWNER);
            if (ownerOpt.isEmpty()) {
                continue; // Skip tasks with no owner
            }
            User assignee = ownerOpt.get().getUser();

            // Check if user has been active in project's public channel in the last 3 days
            boolean activeInChat = false;
            Optional<Channel> publicChannelOpt = channelRepository.findByProjectIdAndType(projectId, ChannelType.PUBLIC);
            if (publicChannelOpt.isPresent()) {
                List<Message> recentMessages = messageRepository.findMessagesBetween(
                        publicChannelOpt.get().getId(),
                        threshold,
                        Instant.now()
                );
                activeInChat = recentMessages.stream()
                        .anyMatch(msg -> msg.getSender() != null && msg.getSender().getId().equals(assignee.getId()));
            }

            long daysStale = ChronoUnit.DAYS.between(task.getUpdatedAt().toInstant(), Instant.now());
            
            // Generate LLM nudge message
            String nudgeMessage = generateNudgeMessage(task.getTitle(), assignee.getFullName(), daysStale, activeInChat);

            result.add(StaleTaskInfo.builder()
                    .taskId(task.getId().toString())
                    .taskIdentifier("HS-" + String.format("%03d", task.getSequenceNumber()))
                    .title(task.getTitle())
                    .assigneeId(assignee.getId().toString())
                    .assigneeName(assignee.getFullName())
                    .daysStale(daysStale)
                    .activeInChat(activeInChat)
                    .nudgeMessage(nudgeMessage)
                    .build());
        }

        return result;
    }

    @Transactional
    public void nudgeTask(UUID taskId, User actor) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task not found"));

        Optional<TaskAssignee> ownerOpt = taskAssigneeRepository.findByTaskIdAndRole(taskId, TaskAssigneeRole.OWNER);
        if (ownerOpt.isEmpty()) {
            throw new NotFoundException("Assignee not found for this task");
        }
        User assignee = ownerOpt.get().getUser();

        // Check chat activity and calculate staleness
        long daysStale = 3;
        if (task.getUpdatedAt() != null) {
            daysStale = ChronoUnit.DAYS.between(task.getUpdatedAt().toInstant(), Instant.now());
        }

        boolean activeInChat = false;
        Optional<Channel> publicChannelOpt = channelRepository.findByProjectIdAndType(task.getProject().getId(), ChannelType.PUBLIC);
        if (publicChannelOpt.isPresent()) {
            Instant threshold = Instant.now().minus(3, ChronoUnit.DAYS);
            List<Message> recentMessages = messageRepository.findMessagesBetween(
                    publicChannelOpt.get().getId(),
                    threshold,
                    Instant.now()
            );
            activeInChat = recentMessages.stream()
                    .anyMatch(msg -> msg.getSender() != null && msg.getSender().getId().equals(assignee.getId()));
        }

        String nudgeContent = generateNudgeMessage(task.getTitle(), assignee.getFullName(), daysStale, activeInChat);

        // Create System notification
        Notification notification = Notification.builder()
                .user(assignee)
                .actor(actor)
                .type(NotificationType.SYSTEM)
                .content(nudgeContent)
                .createdAt(new Date())
                .isRead(false)
                .build();

        notificationRepository.save(notification);
    }

    private String generateNudgeMessage(String taskTitle, String assigneeName, long daysStale, boolean activeInChat) {
        String systemPrompt = "You are an AI team lead at hiveSpace. Draft a polite, friendly, and very brief direct message nudge for a colleague.\n" +
                "The colleague has a task stuck in 'IN_PROGRESS' without updates. Under the hood, we notice if they are active in chat. " +
                "Write a supportive 1-2 sentence message asking if they are blocked or need help with the task. " +
                "Do NOT sound robotic, accusatory, or explicitly say you tracked their chat activity. Be conversational and human.";

        String userPrompt = String.format(
                "Colleague: %s | Task: '%s' | Days Stuck: %d | Active in Chat recently: %b",
                assigneeName, taskTitle, daysStale, activeInChat
        );

        try {
            return nvidiaAIService.chatCompletion(systemPrompt, userPrompt, defaultChatModel, 500, 0.4).trim();
        } catch (Exception e) {
            return String.format("Hi %s, is there anything blocking you on '%s'? Let me know if you need help!", assigneeName, taskTitle);
        }
    }
}
