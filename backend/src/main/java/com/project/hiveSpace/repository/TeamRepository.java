package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.Workspace;
import com.project.hiveSpace.models.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeamRepository extends JpaRepository<Team, UUID> {

    List<Team> findByWorkspaceId(UUID workspaceId);

    boolean existsByNameAndWorkspaceId(String name, UUID workspaceId);

    long countByWorkspaceId(UUID workspaceId);

    Optional<Team> findByNameAndWorkspace(String name, Workspace workspace);

    boolean existsByNameAndWorkspace(String name, Workspace workspace);
}
