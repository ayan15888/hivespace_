package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.TeamRequest;
import com.project.hiveSpace.dto.TeamResponse;
import com.project.hiveSpace.models.Project;
import com.project.hiveSpace.models.Team;
import com.project.hiveSpace.repository.ProjectRepository;
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
    private final ProjectRepository projectRepository;

    @Transactional
    public TeamResponse createTeam(TeamRequest request) {
        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        if (teamRepository.existsByNameAndProject(request.getName(), project)) {
            throw new IllegalArgumentException(
                    "A team with the name '" + request.getName() + "' already exists in this project");
        }

        Team team = Team.builder()
                .name(request.getName())
                .description(request.getDescription())
                .project(project)
                .membersCount(0)
                .createdAt(new Date())
                .updatedAt(new Date())
                .build();

        Team savedTeam = teamRepository.save(team);

        // Increment teams count on project
        project.setTeamsCount(project.getTeamsCount() + 1);
        projectRepository.save(project);

        return mapToResponse(savedTeam);
    }

    public List<TeamResponse> getTeamsByProject(UUID projectId) {
        if (!projectRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Project not found");
        }

        return teamRepository.findAllByProjectId(projectId)
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
                .projectId(team.getProject().getId())
                .createdAt(team.getCreatedAt())
                .updatedAt(team.getUpdatedAt())
                .build();
    }
}
