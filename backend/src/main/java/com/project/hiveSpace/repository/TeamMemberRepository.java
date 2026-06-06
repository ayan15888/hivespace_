package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.Team;
import com.project.hiveSpace.models.TeamMember;
import com.project.hiveSpace.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.project.hiveSpace.models.TeamMemberRole;

@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMember, UUID> {
    List<TeamMember> findAllByTeamId(UUID teamId);
    List<TeamMember> findAllByUserId(UUID userId);
    Optional<TeamMember> findByTeamIdAndUserId(UUID teamId, UUID userId);
    boolean existsByTeamAndUser(Team team, User user);
    boolean existsByUserId(UUID userId);
    long countByTeamIdAndRole(UUID teamId, TeamMemberRole role);
    long countByTeamId(UUID teamId);
}
