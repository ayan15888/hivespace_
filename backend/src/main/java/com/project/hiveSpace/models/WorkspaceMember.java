package com.project.hiveSpace.models;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "workspace_members", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "workspace_id", "user_id" })
})
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class WorkspaceMember {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private WorkspaceMemberRole role = WorkspaceMemberRole.MEMBER;

    @Column(name = "joined_at", nullable = false)
    private Date joinedAt;

    @PrePersist
    void prePersist() {
        if (joinedAt == null) {
            joinedAt = new Date();
        }
        if (role == null) {
            role = WorkspaceMemberRole.MEMBER;
        }
    }
}
