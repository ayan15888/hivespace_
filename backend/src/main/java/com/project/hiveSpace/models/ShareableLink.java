package com.project.hiveSpace.models;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "shareable_links")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ShareableLink {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(name = "scope_type", nullable = false)
    private String scopeType; // "PROJECT", "WORKSPACE", "TEAM"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id")
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(columnDefinition = "jsonb")
    private String scope;

    @Column(name = "password_hash")
    private String passwordHash;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "expires_at")
    private Date expiresAt;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "last_accessed_at")
    private Date lastAccessedAt;

    @Column(name = "access_count", nullable = false)
    @Builder.Default
    private Integer accessCount = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_at", nullable = false)
    private Date createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = new Date();
        }
        if (accessCount == null) {
            accessCount = 0;
        }
        if (isActive == null) {
            isActive = true;
        }
    }
}
