package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.TaskAssignee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

import java.util.Optional;
import com.project.hiveSpace.models.Task;

@Repository
public interface TaskAssigneeRepository extends JpaRepository<TaskAssignee, UUID> {
    Optional<TaskAssignee> findFirstByTask(Task task);
}
