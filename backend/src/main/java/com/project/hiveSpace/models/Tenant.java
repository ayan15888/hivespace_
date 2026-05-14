package com.project.hiveSpace.models;

import jakarta.persistence.*;
import lombok.*;

//
@Entity
@Table(name = "tenants", uniqueConstraints = {
        @UniqueConstraint(columnNames = "name"),
        @UniqueConstraint(columnNames = "slug")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private java.util.UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String slug;

    // Fix: default active to true for builder
    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Plan plan;

    @Column(nullable = false)
    private String ownerEmail;

    @Column(length = 500)
    private String description;

    @Builder.Default
    @Column(name = "members_count", nullable = false)
    private int membersCount = 0;

    @Builder.Default
    @Column(name = "workspaces_count", nullable = false)
    private int workspacesCount = 0;
}
