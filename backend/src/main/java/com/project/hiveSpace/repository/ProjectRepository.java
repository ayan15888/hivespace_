package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.Project;
import com.project.hiveSpace.models.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, UUID> {

    Optional<Project> findByNameAndWorkspace(String name, Workspace workspace);

    List<Project> findAllByWorkspace(Workspace workspace);

    boolean existsByNameAndWorkspace(String name, Workspace workspace);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE projects SET task_sequence = task_sequence + 1 WHERE id = :projectId", nativeQuery = true)
    int incrementAndGetTaskSequence(@Param("projectId") UUID projectId);
}
