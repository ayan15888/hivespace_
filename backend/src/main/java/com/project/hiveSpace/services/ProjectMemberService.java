package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.ProjectMemberResponse;
import com.project.hiveSpace.models.Project;
import com.project.hiveSpace.models.ProjectMember;
import com.project.hiveSpace.models.ProjectMemberRole;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.repository.ProjectMemberRepository;
import com.project.hiveSpace.repository.ProjectRepository;
import com.project.hiveSpace.repository.UserRepository;
import com.project.hiveSpace.repository.WorkspaceMemberRepository;
import com.project.hiveSpace.repository.ProjectTeamRepository;
import com.project.hiveSpace.repository.TeamMemberRepository;
import com.project.hiveSpace.models.ProjectTeam;
import com.project.hiveSpace.models.TeamMember;
import com.project.hiveSpace.models.ResourceType;
import com.project.hiveSpace.security.RbacService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectMemberService {

    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final RbacService rbacService;
    private final ProjectTeamRepository projectTeamRepository;
    private final TeamMemberRepository teamMemberRepository;

    @Transactional(readOnly = true)
    public List<ProjectMemberResponse> getMembersByProject(UUID projectId) {
        rbacService.verifyResourceBelongsToTenant(projectId, ResourceType.PROJECT);
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        UUID workspaceId = project.getWorkspace().getId();
        if (!rbacService.hasProjectRole(projectId, ProjectMemberRole.VIEWER) && !rbacService.canAdminWorkspace(workspaceId)) {
            throw new SecurityException("Access denied: Must be a project member or workspace admin");
        }

        List<ProjectMember> explicitMembers = projectMemberRepository.findAllByProjectId(projectId);
        List<ProjectMemberResponse> responses = explicitMembers.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        Set<UUID> existingUserIds = responses.stream()
                .map(ProjectMemberResponse::getUserId)
                .collect(Collectors.toSet());

        List<ProjectTeam> projectTeams = projectTeamRepository.findByProjectId(projectId);
        for (ProjectTeam pt : projectTeams) {
            List<TeamMember> teamMembers = teamMemberRepository.findAllByTeamId(pt.getTeam().getId());
            for (TeamMember tm : teamMembers) {
                if (!existingUserIds.contains(tm.getUser().getId())) {
                    ProjectMemberResponse virtualMember = ProjectMemberResponse.builder()
                            .id(UUID.randomUUID())
                            .projectId(projectId)
                            .userId(tm.getUser().getId())
                            .username(tm.getUser().getUsername())
                            .email(tm.getUser().getEmail())
                            .fullName(tm.getUser().getFullName())
                            .avatarUrl(tm.getUser().getAvatarUrl())
                            .role(ProjectMemberRole.MEMBER)
                            .joinedAt(tm.getJoinedAt())
                            .belongsToAssignedTeam(true)
                            .build();
                    responses.add(virtualMember);
                    existingUserIds.add(tm.getUser().getId());
                }
            }
        }

        return responses.stream()
                .sorted((m1, m2) -> Boolean.compare(m2.isBelongsToAssignedTeam(), m1.isBelongsToAssignedTeam()))
                .collect(Collectors.toList());
    }

    @Transactional
    public ProjectMemberResponse addMemberToProject(UUID projectId, UUID userId, ProjectMemberRole role) {
        rbacService.verifyResourceBelongsToTenant(projectId, ResourceType.PROJECT);
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        UUID workspaceId = project.getWorkspace().getId();
        if (!rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD) && !rbacService.canAdminWorkspace(workspaceId)) {
            throw new SecurityException("Access denied: Only project leads and workspace admins can add members");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        boolean isInWorkspace = workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId);
        if (!isInWorkspace) {
            throw new SecurityException("User must be a workspace member before joining a project");
        }

        if (projectMemberRepository.existsByProjectAndUser(project, user)) {
            throw new IllegalArgumentException("User is already a member of this project");
        }

        ProjectMemberRole actualRole = role != null ? role : ProjectMemberRole.MEMBER;

        ProjectMember projectMember = ProjectMember.builder()
                .project(project)
                .user(user)
                .role(actualRole)
                .joinedAt(new Date())
                .build();

        ProjectMember saved = projectMemberRepository.save(projectMember);

        // Increment project members count
        project.setMembersCount(project.getMembersCount() + 1);
        projectRepository.save(project);

        return mapToResponse(saved);
    }

    @Transactional
    public ProjectMemberResponse updateMemberRole(UUID projectId, UUID userId, ProjectMemberRole role) {
        rbacService.verifyResourceBelongsToTenant(projectId, ResourceType.PROJECT);
        ProjectMember projectMember = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Membership not found"));

        Project project = projectMember.getProject();
        UUID workspaceId = project.getWorkspace().getId();
        if (!rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD) && !rbacService.canAdminWorkspace(workspaceId)) {
            throw new SecurityException("Access denied: Only project leads and workspace admins can update roles");
        }

        if (projectMember.getRole() == ProjectMemberRole.LEAD && role != ProjectMemberRole.LEAD) {
            if (isLastLead(projectId, userId)) {
                throw new SecurityException("Cannot demote the last project lead");
            }
        }

        projectMember.setRole(role);
        ProjectMember updated = projectMemberRepository.save(projectMember);
        return mapToResponse(updated);
    }

    @Transactional
    public void removeMemberFromProject(UUID projectId, UUID userId) {
        rbacService.verifyResourceBelongsToTenant(projectId, ResourceType.PROJECT);
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        UUID workspaceId = project.getWorkspace().getId();

        User currentUser = rbacService.getCurrentUser();
        if (currentUser == null) {
            throw new SecurityException("User not authenticated");
        }
        UUID currentUserId = currentUser.getId();

        boolean isSelf = currentUserId.equals(userId);
        boolean isProjectLead = rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD);
        boolean isWorkspaceAdmin = rbacService.canAdminWorkspace(workspaceId);

        if (!isSelf && !isProjectLead && !isWorkspaceAdmin) {
            throw new SecurityException("Access denied: Only project leads, workspace admins, or the members themselves can remove members");
        }

        if (isLastLead(projectId, userId)) {
            throw new SecurityException("Cannot remove the last project lead");
        }

        ProjectMember projectMember = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Membership not found"));

        projectMemberRepository.delete(projectMember);

        // Decrement project members count
        if (project.getMembersCount() > 0) {
            project.setMembersCount(project.getMembersCount() - 1);
            projectRepository.save(project);
        }
    }

    private boolean isLastLead(UUID projectId, UUID userId) {
        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Membership not found"));

        if (member.getRole() != ProjectMemberRole.LEAD) return false;

        long leadCount = projectMemberRepository.countByProjectIdAndRole(projectId, ProjectMemberRole.LEAD);
        return leadCount <= 1;
    }

    private ProjectMemberResponse mapToResponse(ProjectMember member) {
        UUID projectId = member.getProject().getId();
        List<ProjectTeam> projectTeams = projectTeamRepository.findByProjectId(projectId);
        Set<UUID> assignedTeamIds = projectTeams.stream()
                .map(pt -> pt.getTeam().getId())
                .collect(Collectors.toSet());

        boolean belongsToAssignedTeam = false;
        if (!assignedTeamIds.isEmpty()) {
            List<TeamMember> userTeams = teamMemberRepository.findAllByUserId(member.getUser().getId());
            belongsToAssignedTeam = userTeams.stream()
                    .anyMatch(ut -> assignedTeamIds.contains(ut.getTeam().getId()));
        }

        return ProjectMemberResponse.builder()
                .id(member.getId())
                .projectId(projectId)
                .userId(member.getUser().getId())
                .username(member.getUser().getUsername())
                .email(member.getUser().getEmail())
                .fullName(member.getUser().getFullName())
                .avatarUrl(member.getUser().getAvatarUrl())
                .role(member.getRole())
                .joinedAt(member.getJoinedAt())
                .belongsToAssignedTeam(belongsToAssignedTeam)
                .build();
    }
}
