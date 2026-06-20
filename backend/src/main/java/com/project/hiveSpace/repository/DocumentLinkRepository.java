package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.DocumentLink;
import com.project.hiveSpace.models.DocumentLinkId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentLinkRepository extends JpaRepository<DocumentLink, DocumentLinkId> {
    List<DocumentLink> findAllBySourceDocId(UUID sourceDocId);
    List<DocumentLink> findAllByTargetDocId(UUID targetDocId);
    void deleteBySourceDocIdAndTargetDocId(UUID sourceDocId, UUID targetDocId);
    boolean existsBySourceDocIdAndTargetDocId(UUID sourceDocId, UUID targetDocId);
}
