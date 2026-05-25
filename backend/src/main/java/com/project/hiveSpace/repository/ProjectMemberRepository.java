package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.Project;
import com.project.hiveSpace.models.ProjectMember;
import com.project.hiveSpace.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.project.hiveSpace.models.ProjectMemberRole;

@Repository
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, UUID> {
    List<ProjectMember> findAllByProjectId(UUID projectId);
    List<ProjectMember> findAllByUserId(UUID userId);
    Optional<ProjectMember> findByProjectIdAndUserId(UUID projectId, UUID userId);
    boolean existsByProjectAndUser(Project project, User user);
    boolean existsByUserId(UUID userId);
    long countByProjectIdAndRole(UUID projectId, ProjectMemberRole role);
    long countByProjectId(UUID projectId);
}
