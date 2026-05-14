package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.Employee;
import com.project.hiveSpace.models.Team;
import com.project.hiveSpace.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, UUID> {
    List<Employee> findAllByTeamId(UUID teamId);
    boolean existsByUserAndTeam(User user, Team team);
    Optional<Employee> findByUserIdAndWorkspaceId(UUID userId, UUID workspaceId);
    boolean existsByUser(User user);
}
