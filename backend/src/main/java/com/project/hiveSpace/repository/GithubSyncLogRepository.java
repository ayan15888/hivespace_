package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.GithubSyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GithubSyncLogRepository extends JpaRepository<GithubSyncLog, UUID> {
    Optional<GithubSyncLog> findByGithubEventId(String githubEventId);
}
