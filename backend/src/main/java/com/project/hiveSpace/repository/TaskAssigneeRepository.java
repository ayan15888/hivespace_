package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.TaskAssignee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;
import java.util.List;
import java.util.Optional;
import com.project.hiveSpace.models.Task;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.models.TaskAssigneeRole;

@Repository
public interface TaskAssigneeRepository extends JpaRepository<TaskAssignee, UUID> {
    Optional<TaskAssignee> findFirstByTask(Task task);
    List<TaskAssignee> findAllByTask(Task task);
    boolean existsByTaskAndUser(Task task, User user);
    Optional<TaskAssignee> findByTaskAndUser(Task task, User user);
    Optional<TaskAssignee> findByTaskAndRole(Task task, TaskAssigneeRole role);
    Optional<TaskAssignee> findByTaskIdAndUserId(UUID taskId, UUID userId);
}
