package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.AiConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiConversationRepository extends JpaRepository<AiConversation, UUID> {
    List<AiConversation> findByWorkspaceIdAndUserIdOrderByUpdatedAtDesc(UUID workspaceId, UUID userId);
}
