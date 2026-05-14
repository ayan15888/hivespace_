package com.project.hiveSpace.models;

import jakarta.persistence.*;
import lombok.*;

import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "projects", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "name", "workspace_id" })
})
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", nullable = true)
    private String description;

    @Column(name = "status", nullable = false)
    private String status;

    @Builder.Default
    @Column(name = "teams_count", nullable = false)
    private int teamsCount = 0;

    @Builder.Default
    @Column(name = "members_count", nullable = false)
    private int membersCount = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Column(name = "created_at", nullable = false)
    private Date createdAt;

    @Column(name = "updated_at", nullable = false)
    private Date updatedAt;
}
