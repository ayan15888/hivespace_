package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.TeamRequest;
import com.project.hiveSpace.dto.TeamResponse;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.models.TeamMember;
import com.project.hiveSpace.models.TeamMemberRole;
import com.project.hiveSpace.models.WorkspaceMemberRole;
import com.project.hiveSpace.models.ProjectMemberRole;
import com.project.hiveSpace.models.Project;
import com.project.hiveSpace.models.ProjectTeam;
import com.project.hiveSpace.models.Workspace;
import com.project.hiveSpace.models.Team;
import com.project.hiveSpace.models.ResourceType;
import com.project.hiveSpace.repository.ProjectRepository;
import com.project.hiveSpace.repository.ProjectTeamRepository;
import com.project.hiveSpace.repository.TeamMemberRepository;
import com.project.hiveSpace.repository.WorkspaceRepository;
import com.project.hiveSpace.repository.TeamRepository;
import com.project.hiveSpace.repository.WorkspaceMemberRepository;
import com.project.hiveSpace.repository.UserRepository;
import com.project.hiveSpace.security.RbacService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;
    private final WorkspaceRepository workspaceRepository;
    private final ProjectRepository projectRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final RbacService rbacService;
    private final ProjectTeamRepository projectTeamRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;

    @Transactional
    public TeamResponse createTeam(TeamRequest request, User creator) {
        UUID workspaceId = request.getWorkspaceId();
        if (workspaceId == null) {
            throw new IllegalArgumentException("Workspace ID is required");
        }

        rbacService.verifyResourceBelongsToTenant(workspaceId, ResourceType.WORKSPACE);

        if (!rbacService.canCreateTeam(workspaceId)) {
            throw new SecurityException("Access denied: You do not have permission to create a team in this workspace");
        }

        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Workspace not found"));

        if (teamRepository.existsByNameAndWorkspace(request.getName(), workspace)) {
            throw new IllegalArgumentException(
                    "A team with the name '" + request.getName() + "' already exists in this workspace");
        }

        Project associatedProject = null;
        if (request.getProjectId() != null) {
            if (!rbacService.hasProjectRole(request.getProjectId(), ProjectMemberRole.MEMBER)) {
                throw new SecurityException("Access denied: Must be a member of the project to associate it with the team");
            }
            associatedProject = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new IllegalArgumentException("Project not found"));
            if (!associatedProject.getWorkspace().getId().equals(workspace.getId())) {
                throw new IllegalArgumentException("Associated project must belong to the same workspace");
            }
        }

        UUID leadUserId = request.getLeadUserId();

        // Validate lead user is a workspace member first (if provided)
        if (leadUserId != null) {
            boolean isWorkspaceMember = workspaceMemberRepository
                    .existsByWorkspaceIdAndUserId(workspaceId, leadUserId);
            if (!isWorkspaceMember) {
                throw new SecurityException("Assigned lead must be a workspace member first");
            }
        }

        boolean shouldAddCreator = (leadUserId == null || leadUserId.equals(creator.getId()))
                || (request.getAddCreatorAsMember() != null && request.getAddCreatorAsMember());

        int initialMembersCount = 1;
        if (leadUserId != null && !leadUserId.equals(creator.getId()) && shouldAddCreator) {
            initialMembersCount = 2;
        }

        Team team = Team.builder()
                .name(request.getName())
                .description(request.getDescription())
                .workspace(workspace)
                .createdBy(creator)
                .membersCount(initialMembersCount)
                .createdAt(new Date())
                .updatedAt(new Date())
                .build();

        Team savedTeam = teamRepository.save(team);

        if (leadUserId != null) {
            User leadUser = userRepository.findById(leadUserId)
                    .orElseThrow(() -> new IllegalArgumentException("Lead user not found"));

            TeamMember leadMember = TeamMember.builder()
                    .team(savedTeam)
                    .user(leadUser)
                    .role(TeamMemberRole.LEAD)
                    .joinedAt(new Date())
                    .build();
            teamMemberRepository.save(leadMember);

            if (!leadUserId.equals(creator.getId()) && shouldAddCreator) {
                TeamMember creatorMember = TeamMember.builder()
                        .team(savedTeam)
                        .user(creator)
                        .role(TeamMemberRole.MEMBER)
                        .joinedAt(new Date())
                        .build();
                teamMemberRepository.save(creatorMember);
            }
        } else {
            TeamMember lead = TeamMember.builder()
                    .team(savedTeam)
                    .user(creator)
                    .role(TeamMemberRole.LEAD)
                    .joinedAt(new Date())
                    .build();
            teamMemberRepository.save(lead);
        }

        if (associatedProject != null) {
            ProjectTeam projectTeam = ProjectTeam.builder()
                    .project(associatedProject)
                    .team(savedTeam)
                    .assignedBy(creator)
                    .assignedAt(new Date())
                    .build();
            projectTeamRepository.save(projectTeam);

            associatedProject.setTeamsCount(associatedProject.getTeamsCount() + 1);
            projectRepository.save(associatedProject);
        }

        return mapToResponse(savedTeam);
    }

    @Transactional
    public TeamResponse updateTeam(UUID teamId, TeamRequest request) {
        rbacService.verifyResourceBelongsToTenant(teamId, ResourceType.TEAM);
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        UUID workspaceId = team.getWorkspace().getId();
        if (!rbacService.hasTeamRole(teamId, TeamMemberRole.LEAD) && !rbacService.canAdminWorkspace(workspaceId)) {
            throw new SecurityException("Access denied: Only team leads and workspace admins can update the team");
        }

        team.setName(request.getName());
        team.setDescription(request.getDescription());
        team.setUpdatedAt(new Date());

        Team saved = teamRepository.save(team);
        return mapToResponse(saved);
    }

    @Transactional
    public void deleteTeam(UUID teamId) {
        rbacService.verifyResourceBelongsToTenant(teamId, ResourceType.TEAM);
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        UUID workspaceId = team.getWorkspace().getId();
        if (!rbacService.hasTeamRole(teamId, TeamMemberRole.LEAD) && !rbacService.canAdminWorkspace(workspaceId)) {
            throw new SecurityException("Access denied: Only team leads and workspace admins can delete the team");
        }

        // Decrement teamsCount for all associated projects, and delete the project_teams records
        List<ProjectTeam> associations = projectTeamRepository.findByTeamId(teamId);
        for (ProjectTeam assoc : associations) {
            Project project = assoc.getProject();
            if (project.getTeamsCount() > 0) {
                project.setTeamsCount(project.getTeamsCount() - 1);
                projectRepository.save(project);
            }
        }
        projectTeamRepository.deleteAll(associations);

        teamRepository.delete(team);
    }

    public List<TeamResponse> getTeamsByWorkspace(UUID workspaceId) {
        rbacService.verifyResourceBelongsToTenant(workspaceId, ResourceType.WORKSPACE);
        if (!workspaceRepository.existsById(workspaceId)) {
            throw new IllegalArgumentException("Workspace not found");
        }

        if (!rbacService.hasWorkspaceRole(workspaceId, WorkspaceMemberRole.VIEWER)) {
            throw new SecurityException("Access denied: Must be a member of the workspace to view its teams");
        }

        return teamRepository.findByWorkspaceId(workspaceId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private TeamResponse mapToResponse(Team team) {
        List<ProjectTeam> associations = projectTeamRepository.findByTeamId(team.getId());
        UUID firstProjectId = associations.isEmpty() ? null : associations.get(0).getProject().getId();

        return TeamResponse.builder()
                .id(team.getId())
                .name(team.getName())
                .description(team.getDescription())
                .membersCount(team.getMembersCount())
                .workspaceId(team.getWorkspace().getId())
                .projectId(firstProjectId)
                .createdAt(team.getCreatedAt())
                .updatedAt(team.getUpdatedAt())
                .build();
    }
}
