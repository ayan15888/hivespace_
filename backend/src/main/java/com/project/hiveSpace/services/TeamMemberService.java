package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.TeamMemberRequest;
import com.project.hiveSpace.dto.TeamMemberResponse;
import com.project.hiveSpace.models.Team;
import com.project.hiveSpace.models.TeamMember;
import com.project.hiveSpace.models.TeamMemberRole;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.repository.TeamMemberRepository;
import com.project.hiveSpace.repository.TeamRepository;
import com.project.hiveSpace.repository.UserRepository;
import com.project.hiveSpace.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamMemberService {

    private final TeamMemberRepository teamMemberRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    @Transactional(readOnly = true)
    public List<TeamMemberResponse> getMembersByTeam(UUID teamId) {
        if (!teamRepository.existsById(teamId)) {
            throw new IllegalArgumentException("Team not found");
        }

        return teamMemberRepository.findAllByTeamId(teamId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TeamMemberResponse addMemberToTeam(UUID teamId, TeamMemberRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        boolean isInWorkspace = workspaceMemberRepository.existsByWorkspaceIdAndUserId(team.getWorkspace().getId(), request.getUserId());
        if (!isInWorkspace) {
            throw new SecurityException("User must be a workspace member before joining a team");
        }

        if (teamMemberRepository.existsByTeamAndUser(team, user)) {
            throw new IllegalArgumentException("User is already a member of this team");
        }

        TeamMemberRole role = request.getRole() != null ? request.getRole() : TeamMemberRole.MEMBER;

        TeamMember teamMember = TeamMember.builder()
                .team(team)
                .user(user)
                .role(role)
                .joinedAt(new Date())
                .build();

        TeamMember saved = teamMemberRepository.save(teamMember);

        // Increment member count in team
        team.setMembersCount(team.getMembersCount() + 1);
        teamRepository.save(team);

        return mapToResponse(saved);
    }

    @Transactional
    public TeamMemberResponse updateMemberRole(UUID teamId, UUID userId, TeamMemberRole role) {
        TeamMember teamMember = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Membership not found"));

        teamMember.setRole(role);
        TeamMember updated = teamMemberRepository.save(teamMember);
        return mapToResponse(updated);
    }

    @Transactional
    public void removeMemberFromTeam(UUID teamId, UUID userId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        TeamMember teamMember = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Membership not found"));

        teamMemberRepository.delete(teamMember);

        // Decrement member count on team
        if (team.getMembersCount() > 0) {
            team.setMembersCount(team.getMembersCount() - 1);
            teamRepository.save(team);
        }
    }

    private TeamMemberResponse mapToResponse(TeamMember member) {
        return TeamMemberResponse.builder()
                .id(member.getId())
                .teamId(member.getTeam().getId())
                .userId(member.getUser().getId())
                .username(member.getUser().getUsername())
                .email(member.getUser().getEmail())
                .fullName(member.getUser().getFullName())
                .avatarUrl(member.getUser().getAvatarUrl())
                .role(member.getRole())
                .joinedAt(member.getJoinedAt())
                .build();
    }
}
