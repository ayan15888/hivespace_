package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.InvitationAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;
import java.util.UUID;

@Repository
public interface InvitationAttemptRepository extends JpaRepository<InvitationAttempt, UUID> {
    List<InvitationAttempt> findAllByInvitationId(UUID invitationId);
    long countByInvitationIdAndAttemptedAtAfterAndSuccessFalse(UUID invitationId, Date after);
}
