package com.project.hiveSpace.models;

import com.project.hiveSpace.utils.EncryptionConverter;
import jakarta.persistence.*;
import lombok.*;
import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "github_connections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GithubConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(name = "github_org_name", nullable = false)
    private String githubOrgName;

    @Convert(converter = EncryptionConverter.class)
    @Column(name = "access_token", nullable = false, columnDefinition = "TEXT")
    private String accessToken;

    @Column(name = "webhook_secret", nullable = false)
    private String webhookSecret;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "connected_by")
    private User connectedBy;

    @Column(name = "connected_at", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date connectedAt;

    @PrePersist
    void prePersist() {
        if (connectedAt == null) {
            connectedAt = new Date();
        }
    }
}
