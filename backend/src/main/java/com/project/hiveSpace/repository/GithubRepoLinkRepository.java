package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.GithubRepoLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GithubRepoLinkRepository extends JpaRepository<GithubRepoLink, UUID> {
    List<GithubRepoLink> findByProjectId(UUID projectId);
    Optional<GithubRepoLink> findByProjectIdAndGithubRepoFullName(UUID projectId, String githubRepoFullName);
    Optional<GithubRepoLink> findByProjectIdAndId(UUID projectId, UUID id);
    boolean existsByProjectIdAndGithubRepoFullName(UUID projectId, String githubRepoFullName);
}
