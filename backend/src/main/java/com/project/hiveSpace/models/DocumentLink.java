package com.project.hiveSpace.models;

import jakarta.persistence.*;
import lombok.*;

import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "document_links")
@IdClass(DocumentLinkId.class)
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DocumentLink {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_doc_id", nullable = false)
    private Document sourceDoc;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_doc_id", nullable = false)
    private Document targetDoc;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_at", nullable = false)
    private Date createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = new Date();
    }
}
