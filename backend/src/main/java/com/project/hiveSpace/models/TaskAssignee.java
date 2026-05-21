package com.project.hiveSpace.models;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "task_assignees", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "task_id", "user_id" })
})
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TaskAssignee {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private TaskAssigneeRole role = TaskAssigneeRole.OWNER;

    @Column(name = "assigned_at", nullable = false)
    private Date assignedAt;

    @PrePersist
    void prePersist() {
        if (assignedAt == null) {
            assignedAt = new Date();
        }
        if (role == null) {
            role = TaskAssigneeRole.OWNER;
        }
    }
}
