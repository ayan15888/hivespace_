package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.TeamRequest;
import com.project.hiveSpace.dto.TeamResponse;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.models.TeamMember;
import com.project.hiveSpace.models.TeamMemberRole;
import com.project.hiveSpace.models.Project;
import com.project.hiveSpace.models.Workspace;
import com.project.hiveSpace.models.Team;
import com.project.hiveSpace.repository.ProjectRepository;
import com.project.hiveSpace.repository.TeamMemberRepository;
import com.project.hiveSpace.repository.WorkspaceRepository;
import com.project.hiveSpace.repository.TeamRepository;
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

    @Transactional
    public TeamResponse createTeam(TeamRequest request, User creator) {
        UUID workspaceId = request.getWorkspaceId();
        if (workspaceId == null) {
            throw new IllegalArgumentException("Workspace ID is required");
        }

        if (!rbacService.hasWorkspaceRole(workspaceId, "MEMBER")) {
            throw new SecurityException("Access denied: Must be a member of the workspace to create a team");
        }

        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Workspace not found"));

        if (teamRepository.existsByNameAndWorkspace(request.getName(), workspace)) {
            throw new IllegalArgumentException(
                    "A team with the name '" + request.getName() + "' already exists in this workspace");
        }

        Project associatedProject = null;
        if (request.getProjectId() != null) {
            if (!rbacService.hasProjectRole(request.getProjectId(), "MEMBER")) {
                throw new SecurityException("Access denied: Must be a member of the project to associate it with the team");
            }
            associatedProject = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new IllegalArgumentException("Project not found"));
            if (!associatedProject.getWorkspace().getId().equals(workspace.getId())) {
                throw new IllegalArgumentException("Associated project must belong to the same workspace");
            }
        }

        Team team = Team.builder()
                .name(request.getName())
                .description(request.getDescription())
                .workspace(workspace)
                .project(associatedProject)
                .createdBy(creator)
                .membersCount(1) // Creator is included
                .createdAt(new Date())
                .updatedAt(new Date())
                .build();

        Team savedTeam = teamRepository.save(team);

        TeamMember lead = TeamMember.builder()
                .team(savedTeam)
                .user(creator)
                .role(TeamMemberRole.LEAD)
                .joinedAt(new Date())
                .build();
        teamMemberRepository.save(lead);

        if (associatedProject != null) {
            associatedProject.setTeamsCount(associatedProject.getTeamsCount() + 1);
            projectRepository.save(associatedProject);
        }

        return mapToResponse(savedTeam);
    }

    @Transactional
    public TeamResponse updateTeam(UUID teamId, TeamRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        UUID workspaceId = team.getWorkspace().getId();
        if (!rbacService.hasTeamRole(teamId, "LEAD") && !rbacService.isWorkspaceAdmin(workspaceId)) {
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
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        UUID workspaceId = team.getWorkspace().getId();
        if (!rbacService.hasTeamRole(teamId, "LEAD") && !rbacService.isWorkspaceAdmin(workspaceId)) {
            throw new SecurityException("Access denied: Only team leads and workspace admins can delete the team");
        }

        // If associated with a project, decrement project's team count
        if (team.getProject() != null) {
            Project project = team.getProject();
            if (project.getTeamsCount() > 0) {
                project.setTeamsCount(project.getTeamsCount() - 1);
                projectRepository.save(project);
            }
        }

        teamRepository.delete(team);
    }

    public List<TeamResponse> getTeamsByWorkspace(UUID workspaceId) {
        if (!workspaceRepository.existsById(workspaceId)) {
            throw new IllegalArgumentException("Workspace not found");
        }

        if (!rbacService.hasWorkspaceRole(workspaceId, "VIEWER")) {
            throw new SecurityException("Access denied: Must be a member of the workspace to view its teams");
        }

        return teamRepository.findByWorkspaceId(workspaceId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private TeamResponse mapToResponse(Team team) {
        return TeamResponse.builder()
                .id(team.getId())
                .name(team.getName())
                .description(team.getDescription())
                .membersCount(team.getMembersCount())
                .workspaceId(team.getWorkspace().getId())
                .projectId(team.getProject() != null ? team.getProject().getId() : null)
                .createdAt(team.getCreatedAt())
                .updatedAt(team.getUpdatedAt())
                .build();
    }
}
