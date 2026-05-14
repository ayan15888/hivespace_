package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.Project;
import com.project.hiveSpace.models.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeamRepository extends JpaRepository<Team, UUID> {

    List<Team> findAllByProject(Project project);

    List<Team> findAllByProjectId(UUID projectId);

    Optional<Team> findByNameAndProject(String name, Project project);

    boolean existsByNameAndProject(String name, Project project);
}
