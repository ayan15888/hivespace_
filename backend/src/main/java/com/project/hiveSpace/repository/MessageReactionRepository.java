package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.MessageReaction;
import com.project.hiveSpace.models.MessageReactionId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageReactionRepository extends JpaRepository<MessageReaction, MessageReactionId> {

    List<MessageReaction> findByIdMessageId(UUID messageId);
}
