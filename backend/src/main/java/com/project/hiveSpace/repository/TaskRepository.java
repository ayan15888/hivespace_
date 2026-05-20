package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.Project;
import com.project.hiveSpace.models.Task;
import com.project.hiveSpace.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findAllByProject(Project project);
    List<Task> findAllByOrderByUpdatedAtDesc();
}
