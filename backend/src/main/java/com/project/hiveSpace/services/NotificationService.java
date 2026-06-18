package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.NotificationResponse;
import com.project.hiveSpace.dto.UserSummary;
import com.project.hiveSpace.exceptions.NotFoundException;
import com.project.hiveSpace.models.Notification;
import com.project.hiveSpace.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {
    private final NotificationRepository notificationRepository;

    public Page<NotificationResponse> getUserNotifications(UUID userId, int page, int size) {
        Page<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));
        return notifications.map(this::toResponse);
    }

    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    public void markAsRead(UUID notificationId, UUID userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotFoundException("Notification not found"));
        if (!notification.getUser().getId().equals(userId)) {
            throw new NotFoundException("Notification not found"); // Or Forbidden
        }
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    public void markAllAsRead(UUID userId) {
        List<Notification> unread = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 1000)).stream()
                .filter(n -> !n.getIsRead())
                .toList();
        for (Notification n : unread) {
            n.setIsRead(true);
        }
        notificationRepository.saveAll(unread);
    }

    private NotificationResponse toResponse(Notification notification) {
        UserSummary actor = null;
        if (notification.getActor() != null) {
            actor = new UserSummary(
                    notification.getActor().getId(),
                    notification.getActor().getFullName(),
                    notification.getActor().getAvatarUrl(),
                    notification.getActor().getAvatarColor()
            );
        }
        return new NotificationResponse(
                notification.getId(),
                notification.getUser().getId(),
                actor,
                notification.getType(),
                notification.getContent(),
                notification.getMessage() != null ? notification.getMessage().getId() : null,
                notification.getChannel() != null ? notification.getChannel().getId() : null,
                notification.getIsRead(),
                notification.getCreatedAt()
        );
    }
}
