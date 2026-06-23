package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.Sprint;
import com.project.hiveSpace.models.SprintStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface SprintRepository extends JpaRepository<Sprint, UUID> {
    List<Sprint> findAllByProjectIdOrderByCreatedAtDesc(UUID projectId);
    boolean existsByProjectIdAndStatus(UUID projectId, SprintStatus status);
}
