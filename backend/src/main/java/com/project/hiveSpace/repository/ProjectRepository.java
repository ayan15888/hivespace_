package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.Project;
import com.project.hiveSpace.models.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, UUID> {

    Optional<Project> findByNameAndWorkspace(String name, Workspace workspace);

    List<Project> findAllByWorkspace(Workspace workspace);

    boolean existsByNameAndWorkspace(String name, Workspace workspace);
}
