package com.project.hiveSpace.models;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "github_sync_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GithubSyncLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String action;

    @Column(name = "github_event_id")
    private String githubEventId;

    @Builder.Default
    @Column(nullable = false)
    private boolean processed = false;

    @Column(name = "created_at", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = new Date();
        }
    }
}
