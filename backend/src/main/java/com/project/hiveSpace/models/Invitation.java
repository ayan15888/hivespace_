package com.project.hiveSpace.models;

import jakarta.persistence.*;
import lombok.*;

import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "invitations", uniqueConstraints = {
        @UniqueConstraint(columnNames = "token")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invitation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String token; // Secure random token shown in URLs

    @Column(name = "pin_hash", nullable = false)
    private String pinHash; // Bcrypt hash of the PIN

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant; // Direct organization invitation

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id")
    private Workspace workspace; // Optional workspace scope

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team; // Optional team scope

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project; // Optional project scope

    @ManyToMany
    @JoinTable(name = "invitation_workspaces", joinColumns = @JoinColumn(name = "invitation_id"), inverseJoinColumns = @JoinColumn(name = "workspace_id"))
    @Builder.Default
    private java.util.Set<Workspace> workspaces = new java.util.HashSet<>();

    @ManyToMany
    @JoinTable(name = "invitation_teams", joinColumns = @JoinColumn(name = "invitation_id"), inverseJoinColumns = @JoinColumn(name = "team_id"))
    @Builder.Default
    private java.util.Set<Team> teams = new java.util.HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inviter_id", nullable = false)
    private User inviter;

    @Builder.Default
    @Column(name = "tenant_role", nullable = false)
    private String tenantRole = "MEMBER";

    @Builder.Default
    @Column(name = "max_uses", nullable = false)
    private int maxUses = 1;

    @Builder.Default
    @Column(name = "current_uses", nullable = false)
    private int currentUses = 0;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private InvitationStatus status = InvitationStatus.ACTIVE;

    @Column(name = "expires_at", nullable = false)
    private Date expiresAt;

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private Date createdAt = new Date();
}
