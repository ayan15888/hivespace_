package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.ProjectRequest;
import com.project.hiveSpace.dto.ProjectResponse;
import com.project.hiveSpace.dto.TeamResponse;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.models.ProjectMember;
import com.project.hiveSpace.models.ProjectMemberRole;
import com.project.hiveSpace.models.Project;
import com.project.hiveSpace.models.Workspace;
import com.project.hiveSpace.models.Team;
import com.project.hiveSpace.models.ProjectTeam;
import com.project.hiveSpace.repository.ProjectMemberRepository;
import com.project.hiveSpace.repository.ProjectRepository;
import com.project.hiveSpace.repository.TeamRepository;
import com.project.hiveSpace.repository.ProjectTeamRepository;
import com.project.hiveSpace.repository.WorkspaceRepository;
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
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final WorkspaceRepository workspaceRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TeamRepository teamRepository;
    private final ProjectTeamRepository projectTeamRepository;
    private final RbacService rbacService;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;

    @Transactional
    public ProjectResponse createProject(UUID workspaceId, ProjectRequest request, User creator) {
        if (!rbacService.canCreateProject(workspaceId)) {
            throw new SecurityException("Access denied: You do not have permission to create a project in this workspace");
        }

        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Workspace not found"));

        if (projectRepository.existsByNameAndWorkspace(request.getName(), workspace)) {
            throw new IllegalArgumentException(
                    "A project with the name '" + request.getName() + "' already exists in this workspace");
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

        int initialMembersCount = (leadUserId != null && !leadUserId.equals(creator.getId())) ? 2 : 1;

        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .status(request.getStatus())
                .workspace(workspace)
                .createdBy(creator)
                .teamsCount(0)
                .membersCount(initialMembersCount)
                .color(request.getColor())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .createdAt(new Date())
                .updatedAt(new Date())
                .build();

        Project savedProject = projectRepository.save(project);

        if (leadUserId != null) {
            User leadUser = userRepository.findById(leadUserId)
                    .orElseThrow(() -> new IllegalArgumentException("Lead user not found"));

            ProjectMember leadMember = ProjectMember.builder()
                    .project(savedProject)
                    .user(leadUser)
                    .role(ProjectMemberRole.LEAD)
                    .joinedAt(new Date())
                    .build();
            projectMemberRepository.save(leadMember);

            if (!leadUserId.equals(creator.getId())) {
                ProjectMember creatorMember = ProjectMember.builder()
                        .project(savedProject)
                        .user(creator)
                        .role(ProjectMemberRole.MEMBER)
                        .joinedAt(new Date())
                        .build();
                projectMemberRepository.save(creatorMember);
            }
        } else {
            ProjectMember projectMember = ProjectMember.builder()
                    .project(savedProject)
                    .user(creator)
                    .role(ProjectMemberRole.LEAD)
                    .joinedAt(new Date())
                    .build();
            projectMemberRepository.save(projectMember);
        }

        return mapToResponse(savedProject);
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> getProjectsByWorkspace(UUID workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Workspace not found"));

        return projectRepository.findAllByWorkspace(workspace)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProjectResponse assignTeam(UUID projectId, UUID teamId, User actor) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        UUID workspaceId = project.getWorkspace().getId();

        // RBAC validation: caller must be Project Lead or Workspace Admin
        boolean isLead = rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD);
        boolean isWorkspaceAdmin = rbacService.canAdminWorkspace(workspaceId);
        if (!isLead && !isWorkspaceAdmin) {
            throw new SecurityException("Access denied: Only project leads and workspace admins can assign teams");
        }

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        // Validate team and project are in the same workspace
        if (!team.getWorkspace().getId().equals(workspaceId)) {
            throw new IllegalArgumentException("Team and project must belong to the same workspace");
        }

        // Check if already assigned
        if (!projectTeamRepository.existsByProjectIdAndTeamId(projectId, teamId)) {
            ProjectTeam association = ProjectTeam.builder()
                    .project(project)
                    .team(team)
                    .assignedBy(actor)
                    .assignedAt(new Date())
                    .build();
            projectTeamRepository.save(association);

            project.setTeamsCount(project.getTeamsCount() + 1);
            project = projectRepository.save(project);
        }

        return mapToResponse(project);
    }

    private ProjectResponse mapToResponse(Project project) {
        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .status(project.getStatus())
                .teamsCount(project.getTeamsCount())
                .membersCount(project.getMembersCount())
                .workspaceId(project.getWorkspace().getId())
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .color(project.getColor())
                .startDate(project.getStartDate())
                .endDate(project.getEndDate())
                .build();
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> getAssignedTeams(UUID projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        UUID workspaceId = project.getWorkspace().getId();
        if (!rbacService.hasProjectRole(projectId, ProjectMemberRole.VIEWER) && !rbacService.canAdminWorkspace(workspaceId)) {
            throw new SecurityException("Access denied: Must be a project viewer or workspace admin to see assigned teams");
        }

        return projectTeamRepository.findByProjectId(projectId)
                .stream()
                .map(assoc -> mapTeamToResponse(assoc.getTeam()))
                .collect(Collectors.toList());
    }

    @Transactional
    public ProjectResponse unassignTeam(UUID projectId, UUID teamId, User actor) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        UUID workspaceId = project.getWorkspace().getId();

        // RBAC validation: caller must be Project Lead or Workspace Admin
        boolean isLead = rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD);
        boolean isWorkspaceAdmin = rbacService.canAdminWorkspace(workspaceId);
        if (!isLead && !isWorkspaceAdmin) {
            throw new SecurityException("Access denied: Only project leads and workspace admins can unassign teams");
        }

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

        // Validate team belongs to project
        if (projectTeamRepository.existsByProjectIdAndTeamId(projectId, teamId)) {
            projectTeamRepository.deleteByProjectIdAndTeamId(projectId, teamId);

            if (project.getTeamsCount() > 0) {
                project.setTeamsCount(project.getTeamsCount() - 1);
                project = projectRepository.save(project);
            }
        }

        return mapToResponse(project);
    }

    private TeamResponse mapTeamToResponse(Team team) {
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
