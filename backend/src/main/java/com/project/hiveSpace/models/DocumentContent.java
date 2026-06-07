package com.project.hiveSpace.models;

import jakarta.persistence.*;
import lombok.*;

import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "document_content")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DocumentContent implements org.springframework.data.domain.Persistable<UUID> {

    @Id
    @Column(name = "document_id")
    private UUID documentId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "document_id")
    private Document document;

    @Transient
    @Builder.Default
    private boolean isNewEntity = true;

    @Override
    public UUID getId() {
        return this.documentId;
    }

    @Override
    public boolean isNew() {
        return this.isNewEntity;
    }

    @PostPersist
    @PostLoad
    void markNotNew() {
        this.isNewEntity = false;
    }

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "content", columnDefinition = "jsonb")
    private String content;

    @Column(name = "text_content", columnDefinition = "text")
    private String textContent;

    @Column(name = "version", nullable = false)
    @Builder.Default
    private Integer version = 1;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "updated_at", nullable = false)
    private Date updatedAt;

    @PrePersist
    void prePersist() {
        if (updatedAt == null) updatedAt = new Date();
        if (version == null) version = 1;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = new Date();
    }
}
