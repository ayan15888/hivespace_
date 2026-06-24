package com.project.hiveSpace.models;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "github_repo_links")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GithubRepoLink {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "github_repo_full_name", nullable = false)
    private String githubRepoFullName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_by")
    private User linkedBy;

    @Column(name = "linked_at", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date linkedAt;

    @PrePersist
    void prePersist() {
        if (linkedAt == null) {
            linkedAt = new Date();
        }
    }
}
