package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.User;
import com.project.hiveSpace.models.Workspace;
import com.project.hiveSpace.models.WorkspaceMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, UUID> {
    List<WorkspaceMember> findAllByWorkspaceId(UUID workspaceId);
    List<WorkspaceMember> findAllByUserId(UUID userId);
    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);
    boolean existsByWorkspaceAndUser(Workspace workspace, User user);
    boolean existsByUserId(UUID userId);
    boolean existsByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);
}
