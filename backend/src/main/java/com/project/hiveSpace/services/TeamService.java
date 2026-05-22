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

    @Transactional
    public TeamResponse createTeam(TeamRequest request, User creator) {
        Workspace workspace = workspaceRepository.findById(request.getWorkspaceId())
                .orElseThrow(() -> new IllegalArgumentException("Workspace not found"));

        if (teamRepository.existsByNameAndWorkspace(request.getName(), workspace)) {
            throw new IllegalArgumentException(
                    "A team with the name '" + request.getName() + "' already exists in this workspace");
        }

        Project associatedProject = null;
        if (request.getProjectId() != null) {
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
