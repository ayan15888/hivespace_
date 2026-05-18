package com.project.hiveSpace.models;

import jakarta.persistence.*;
import lombok.*;

import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "invitation_attempts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvitationAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invitation_id", nullable = false)
    private Invitation invitation;

    @Column(name = "ip_address", nullable = false)
    private String ipAddress;

    @Builder.Default
    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "attempted_at", nullable = false)
    private Date attemptedAt = new Date();

    @Builder.Default
    @Column(name = "success", nullable = false)
    private boolean success = false;
}
