package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.ProjectTeam;
import com.project.hiveSpace.models.ProjectTeamId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectTeamRepository extends JpaRepository<ProjectTeam, ProjectTeamId> {
    List<ProjectTeam> findByProjectId(UUID projectId);
    List<ProjectTeam> findByTeamId(UUID teamId);
    boolean existsByProjectIdAndTeamId(UUID projectId, UUID teamId);
    void deleteByProjectIdAndTeamId(UUID projectId, UUID teamId);
}
