package com.project.hiveSpace.models;

import jakarta.persistence.*;
import lombok.*;

import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "workspaces", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"name", "tenant_id"})
})
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Workspace {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", nullable = true)
    private String description;

    @Column(name = "plan", nullable = false)
    private String plan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(name = "created_at", nullable = false)
    private Date createdAt;

    @Builder.Default
    @Column(name = "members_count", nullable = false)
    private int membersCount = 0;

    @Column(name = "updated_at", nullable = false)
    private Date updatedAt;
}
