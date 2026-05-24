package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.TeamMemberRequest;
import com.project.hiveSpace.dto.TeamMemberResponse;
import com.project.hiveSpace.models.Team;
import com.project.hiveSpace.models.TeamMember;
import com.project.hiveSpace.models.TeamMemberRole;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.models.ResourceType;
import com.project.hiveSpace.repository.TeamMemberRepository;
import com.project.hiveSpace.repository.TeamRepository;
import com.project.hiveSpace.repository.UserRepository;
import com.project.hiveSpace.repository.WorkspaceMemberRepository;
import com.project.hiveSpace.security.RbacService;
import com.project.hiveSpace.exceptions.DomainValidationException;
import com.project.hiveSpace.exceptions.ForbiddenException;
import com.project.hiveSpace.exceptions.NotFoundException;
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
    private final RbacService rbacService;

    @Transactional(readOnly = true)
    public List<TeamMemberResponse> getMembersByTeam(UUID teamId) {
        rbacService.verifyResourceBelongsToTenant(teamId, ResourceType.TEAM);
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found"));

        UUID workspaceId = team.getWorkspace().getId();
        if (!rbacService.hasTeamRole(teamId, TeamMemberRole.MEMBER) && !rbacService.canAdminWorkspace(workspaceId)) {
            throw new ForbiddenException("Access denied: Must be a team member or workspace admin");
        }

        return teamMemberRepository.findAllByTeamId(teamId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TeamMemberResponse addMemberToTeam(UUID teamId, TeamMemberRequest request) {
        rbacService.verifyResourceBelongsToTenant(teamId, ResourceType.TEAM);
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found"));

        UUID workspaceId = team.getWorkspace().getId();
        if (!rbacService.hasTeamRole(teamId, TeamMemberRole.LEAD) && !rbacService.canAdminWorkspace(workspaceId)) {
            throw new ForbiddenException("Access denied: Only team leads and workspace admins can add members");
        }

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new NotFoundException("User not found"));

        boolean isInWorkspace = workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, request.getUserId());
        if (!isInWorkspace) {
            throw new DomainValidationException("User must be a workspace member before joining a team");
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
        rbacService.verifyResourceBelongsToTenant(teamId, ResourceType.TEAM);
        TeamMember teamMember = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new NotFoundException("Membership not found"));

        Team team = teamMember.getTeam();
        UUID workspaceId = team.getWorkspace().getId();
        if (!rbacService.hasTeamRole(teamId, TeamMemberRole.LEAD) && !rbacService.canAdminWorkspace(workspaceId)) {
            throw new ForbiddenException("Access denied: Only team leads and workspace admins can update roles");
        }

        if (teamMember.getRole() == TeamMemberRole.LEAD && role != TeamMemberRole.LEAD) {
            if (isLastLead(teamId, userId)) {
                throw new DomainValidationException("Cannot demote the last team lead");
            }
        }

        teamMember.setRole(role);
        TeamMember updated = teamMemberRepository.save(teamMember);
        return mapToResponse(updated);
    }

    @Transactional
    public void removeMemberFromTeam(UUID teamId, UUID userId) {
        rbacService.verifyResourceBelongsToTenant(teamId, ResourceType.TEAM);
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found"));

        UUID workspaceId = team.getWorkspace().getId();

        User currentUser = rbacService.getCurrentUser();
        if (currentUser == null) {
            throw new ForbiddenException("User not authenticated");
        }
        UUID currentUserId = currentUser.getId();

        boolean isSelf = currentUserId.equals(userId);
        boolean isTeamLead = rbacService.hasTeamRole(teamId, TeamMemberRole.LEAD);
        boolean isWorkspaceAdmin = rbacService.canAdminWorkspace(workspaceId);

        if (!isSelf && !isTeamLead && !isWorkspaceAdmin) {
            throw new ForbiddenException("Access denied: Only team leads, workspace admins, or the members themselves can remove members");
        }

        if (isLastLead(teamId, userId)) {
            throw new DomainValidationException("Cannot remove the last team lead");
        }

        TeamMember teamMember = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new NotFoundException("Membership not found"));

        teamMemberRepository.delete(teamMember);

        // Decrement member count on team
        if (team.getMembersCount() > 0) {
            team.setMembersCount(team.getMembersCount() - 1);
            teamRepository.save(team);
        }
    }

    private boolean isLastLead(UUID teamId, UUID userId) {
        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new NotFoundException("Membership not found"));

        if (member.getRole() != TeamMemberRole.LEAD) return false;

        long leadCount = teamMemberRepository.countByTeamIdAndRole(teamId, TeamMemberRole.LEAD);
        return leadCount <= 1;
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
