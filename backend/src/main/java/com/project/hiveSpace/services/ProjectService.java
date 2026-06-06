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
import com.project.hiveSpace.models.ResourceType;
import com.project.hiveSpace.models.TeamMember;
import com.project.hiveSpace.repository.ProjectMemberRepository;
import com.project.hiveSpace.repository.ProjectRepository;
import com.project.hiveSpace.repository.TeamRepository;
import com.project.hiveSpace.repository.ProjectTeamRepository;
import com.project.hiveSpace.repository.WorkspaceRepository;
import com.project.hiveSpace.repository.WorkspaceMemberRepository;
import com.project.hiveSpace.repository.UserRepository;
import com.project.hiveSpace.repository.TeamMemberRepository;
import com.project.hiveSpace.security.RbacService;
import com.project.hiveSpace.exceptions.ForbiddenException;
import com.project.hiveSpace.exceptions.DomainValidationException;
import com.project.hiveSpace.exceptions.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import com.project.hiveSpace.models.WorkspaceMemberRole;

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
    private final TeamMemberRepository teamMemberRepository;

    @Transactional
    public ProjectResponse createProject(UUID workspaceId, ProjectRequest request, User creator) {
        rbacService.verifyResourceBelongsToTenant(workspaceId, ResourceType.WORKSPACE);
        if (!rbacService.canCreateProject(workspaceId)) {
            throw new ForbiddenException("Access denied: You do not have permission to create a project in this workspace");
        }

        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Workspace not found"));

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
                throw new DomainValidationException("Assigned lead must be a workspace member first");
            }
        }

        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .status(request.getStatus())
                .workspace(workspace)
                .createdBy(creator)
                .color(request.getColor())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .createdAt(new Date())
                .updatedAt(new Date())
                .build();

        Project savedProject = projectRepository.save(project);

        if (leadUserId != null) {
            User leadUser = userRepository.findById(leadUserId)
                    .orElseThrow(() -> new NotFoundException("Lead user not found"));

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
        rbacService.verifyResourceBelongsToTenant(workspaceId, ResourceType.WORKSPACE);
        if (!rbacService.hasWorkspaceRole(workspaceId, WorkspaceMemberRole.VIEWER)) {
            throw new ForbiddenException("Access denied: You do not have permission to view projects in this workspace");
        }

        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Workspace not found"));

        User currentUser = rbacService.getCurrentUser();
        if (currentUser == null) {
            throw new ForbiddenException("User not authenticated");
        }

        List<Project> allProjects = projectRepository.findAllByWorkspace(workspace);

        // Workspace ADMIN sees all projects
        if (rbacService.canAdminWorkspace(workspaceId)) {
            return allProjects.stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }

        // Regular members see projects they are members of, OR projects assigned to teams they are members of
        List<ProjectMember> memberships = projectMemberRepository.findAllByUserId(currentUser.getId());
        Set<UUID> memberProjectIds = memberships.stream()
                .map(pm -> pm.getProject().getId())
                .collect(Collectors.toSet());

        List<TeamMember> teamMemberships = teamMemberRepository.findAllByUserId(currentUser.getId());
        Set<UUID> userTeamIds = teamMemberships.stream()
                .map(tm -> tm.getTeam().getId())
                .collect(Collectors.toSet());

        Set<UUID> assignedProjectIds = new java.util.HashSet<>();
        for (UUID teamId : userTeamIds) {
            projectTeamRepository.findByTeamId(teamId).forEach(pt -> assignedProjectIds.add(pt.getProject().getId()));
        }

        return allProjects.stream()
                .filter(project -> memberProjectIds.contains(project.getId()) || assignedProjectIds.contains(project.getId()))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProjectResponse assignTeam(UUID projectId, UUID teamId, User actor) {
        rbacService.verifyResourceBelongsToTenant(projectId, ResourceType.PROJECT);
        rbacService.verifyResourceBelongsToTenant(teamId, ResourceType.TEAM);
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project not found"));

        UUID workspaceId = project.getWorkspace().getId();

        // RBAC validation: caller must be Project Lead or Workspace Admin
        boolean isLead = rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD);
        boolean isWorkspaceAdmin = rbacService.canAdminWorkspace(workspaceId);
        if (!isLead && !isWorkspaceAdmin) {
            throw new ForbiddenException("Access denied: Only project leads and workspace admins can assign teams");
        }

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found"));

        // Validate team and project are in the same workspace
        if (!team.getWorkspace().getId().equals(workspaceId)) {
            throw new DomainValidationException("Team and project must belong to the same workspace");
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
        }

        return mapToResponse(project);
    }

    private ProjectResponse mapToResponse(Project project) {
        long teamsCount = projectTeamRepository.countByProjectId(project.getId());
        long membersCount = projectMemberRepository.countByProjectId(project.getId());

        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .status(project.getStatus())
                .teamsCount((int) teamsCount)
                .membersCount((int) membersCount)
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
        rbacService.verifyResourceBelongsToTenant(projectId, ResourceType.PROJECT);
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project not found"));

        UUID workspaceId = project.getWorkspace().getId();
        if (!rbacService.hasProjectRole(projectId, ProjectMemberRole.VIEWER) && !rbacService.canAdminWorkspace(workspaceId)) {
            throw new ForbiddenException("Access denied: Must be a project viewer or workspace admin to see assigned teams");
        }

        return projectTeamRepository.findByProjectId(projectId)
                .stream()
                .map(assoc -> mapTeamToResponse(assoc.getTeam()))
                .collect(Collectors.toList());
    }

    @Transactional
    public ProjectResponse unassignTeam(UUID projectId, UUID teamId, User actor) {
        rbacService.verifyResourceBelongsToTenant(projectId, ResourceType.PROJECT);
        rbacService.verifyResourceBelongsToTenant(teamId, ResourceType.TEAM);
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project not found"));

        UUID workspaceId = project.getWorkspace().getId();

        // RBAC validation: caller must be Project Lead or Workspace Admin
        boolean isLead = rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD);
        boolean isWorkspaceAdmin = rbacService.canAdminWorkspace(workspaceId);
        if (!isLead && !isWorkspaceAdmin) {
            throw new ForbiddenException("Access denied: Only project leads and workspace admins can unassign teams");
        }

        //Team team = teamRepository.findById(teamId).orElseThrow(() -> new IllegalArgumentException("Team not found"));

        // Validate team belongs to project
        if (projectTeamRepository.existsByProjectIdAndTeamId(projectId, teamId)) {
            projectTeamRepository.deleteByProjectIdAndTeamId(projectId, teamId);
        }

        return mapToResponse(project);
    }

    private TeamResponse mapTeamToResponse(Team team) {
        List<ProjectTeam> associations = projectTeamRepository.findByTeamId(team.getId());
        UUID firstProjectId = associations.isEmpty() ? null : associations.get(0).getProject().getId();
        long membersCount = teamMemberRepository.countByTeamId(team.getId());
 
        return TeamResponse.builder()
                .id(team.getId())
                .name(team.getName())
                .description(team.getDescription())
                .membersCount((int) membersCount)
                .workspaceId(team.getWorkspace().getId())
                .projectId(firstProjectId)
                .createdAt(team.getCreatedAt())
                .updatedAt(team.getUpdatedAt())
                .build();
    }

    @Transactional
    public ProjectResponse updateProject(UUID projectId, ProjectRequest request, User actor) {
        rbacService.verifyResourceBelongsToTenant(projectId, ResourceType.PROJECT);
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project not found"));

        UUID workspaceId = project.getWorkspace().getId();

        // RBAC validation: caller must be Project Lead or Workspace Admin
        boolean isLead = rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD);
        boolean isWorkspaceAdmin = rbacService.canAdminWorkspace(workspaceId);
        if (!isLead && !isWorkspaceAdmin) {
            throw new ForbiddenException("Access denied: Only project leads and workspace admins can update project settings");
        }

        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setStatus(request.getStatus());
        project.setColor(request.getColor());
        project.setStartDate(request.getStartDate());
        project.setEndDate(request.getEndDate());
        project.setUpdatedAt(new Date());

        // Update Lead User if changed
        if (request.getLeadUserId() != null) {
            User newLead = userRepository.findById(request.getLeadUserId())
                    .orElseThrow(() -> new NotFoundException("Lead user not found"));

            // Must be workspace member first
            boolean isWorkspaceMember = workspaceMemberRepository
                    .existsByWorkspaceIdAndUserId(workspaceId, newLead.getId());
            if (!isWorkspaceMember) {
                throw new DomainValidationException("Assigned lead must be a workspace member first");
            }

            // Remove existing lead project member if present, or update role
            projectMemberRepository.findByProjectIdAndUserId(projectId, newLead.getId()).ifPresentOrElse(
                pm -> {
                    pm.setRole(ProjectMemberRole.LEAD);
                    projectMemberRepository.save(pm);
                },
                () -> {
                    ProjectMember member = ProjectMember.builder()
                            .project(project)
                            .user(newLead)
                            .role(ProjectMemberRole.LEAD)
                            .joinedAt(new Date())
                            .build();
                    projectMemberRepository.save(member);
                }
            );
        }

        Project saved = projectRepository.save(project);
        return mapToResponse(saved);
    }
}
