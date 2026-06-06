package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.Project;
import com.project.hiveSpace.models.Task;
import com.project.hiveSpace.models.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;
import java.util.UUID;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findAllByProject(Project project);
    List<Task> findAllByProjectId(UUID projectId);
    List<Task> findAllByProjectIdOrderByCreatedAtAsc(UUID projectId);
    List<Task> findAllByProjectAndParentTaskIsNullOrderByCreatedAtDesc(Project project);
    List<Task> findAllByOrderByUpdatedAtDesc();
    List<Task> findAllByProjectInOrderByUpdatedAtDesc(List<Project> projects);
    List<Task> findAllByParentTaskOrderByCreatedAtAsc(Task parentTask);
    int countByProjectAndCreatedAtLessThanEqual(Project project, Date createdAt);
    int countByParentTask(Task parentTask);
    int countByParentTaskAndStatus(Task parentTask, TaskStatus status);
}
