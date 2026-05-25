package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.ProjectResponse;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import com.project.hiveSpace.security.RbacService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;
import java.util.List;
import com.project.hiveSpace.dto.TeamResponse;
import com.project.hiveSpace.exceptions.ForbiddenException;
import com.project.hiveSpace.exceptions.DomainValidationException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectTeamAssignmentTests {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private ProjectTeamRepository projectTeamRepository;

    @Mock
    private ProjectMemberRepository projectMemberRepository;

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @Mock
    private WorkspaceRepository workspaceRepository;

    @Mock
    private WorkspaceMemberRepository workspaceMemberRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RbacService rbacService;

    @InjectMocks
    private ProjectService projectService;

    private UUID projectId;
    private UUID teamId;
    private UUID workspaceId;

    private Workspace workspace;
    private Project project;
    private Team team;
    private User actor;

    @BeforeEach
    void setUp() {
        projectId = UUID.randomUUID();
        teamId = UUID.randomUUID();
        workspaceId = UUID.randomUUID();

        actor = User.builder()
                .id(UUID.randomUUID())
                .username("actor")
                .build();

        workspace = Workspace.builder()
                .id(workspaceId)
                .name("Workspace")
                .build();

        project = Project.builder()
                .id(projectId)
                .name("Project")
                .workspace(workspace)
                .build();

        team = Team.builder()
                .id(teamId)
                .name("Team")
                .workspace(workspace)
                .build();
    }

    @Test
    void testAssignTeam_Success_AsProjectLead() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD)).thenReturn(true);
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(projectTeamRepository.existsByProjectIdAndTeamId(projectId, teamId)).thenReturn(false);
        when(projectTeamRepository.countByProjectId(projectId)).thenReturn(1L);

        ProjectResponse response = projectService.assignTeam(projectId, teamId, actor);

        assertNotNull(response);
        assertEquals(1, response.getTeamsCount());
        verify(projectTeamRepository, times(1)).save(any(ProjectTeam.class));
    }

    @Test
    void testAssignTeam_Failure_AccessDenied() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD)).thenReturn(false);
        when(rbacService.canAdminWorkspace(workspaceId)).thenReturn(false);

        ForbiddenException exception = assertThrows(ForbiddenException.class, () ->
                projectService.assignTeam(projectId, teamId, actor)
        );

        assertEquals("Access denied: Only project leads and workspace admins can assign teams", exception.getMessage());
        verify(projectTeamRepository, never()).save(any(ProjectTeam.class));
    }

    @Test
    void testAssignTeam_Failure_DifferentWorkspaces() {
        Workspace otherWorkspace = Workspace.builder()
                .id(UUID.randomUUID())
                .build();
        team.setWorkspace(otherWorkspace);

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD)).thenReturn(true);
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));

        DomainValidationException exception = assertThrows(DomainValidationException.class, () ->
                projectService.assignTeam(projectId, teamId, actor)
        );

        assertEquals("Team and project must belong to the same workspace", exception.getMessage());
        verify(projectTeamRepository, never()).save(any(ProjectTeam.class));
    }

    @Test
    void testAssignTeam_Idempotent_IfAlreadyAssigned() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD)).thenReturn(true);
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(projectTeamRepository.existsByProjectIdAndTeamId(projectId, teamId)).thenReturn(true);

        ProjectResponse response = projectService.assignTeam(projectId, teamId, actor);

        assertNotNull(response);
        assertEquals(0, response.getTeamsCount());
        verify(projectTeamRepository, never()).save(any(ProjectTeam.class));
    }

    @Test
    void testGetAssignedTeams_Success() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(rbacService.hasProjectRole(projectId, ProjectMemberRole.VIEWER)).thenReturn(true);

        ProjectTeam projectTeam = ProjectTeam.builder()
                .project(project)
                .team(team)
                .build();
        when(projectTeamRepository.findByProjectId(projectId)).thenReturn(List.of(projectTeam));
        when(projectTeamRepository.findByTeamId(teamId)).thenReturn(List.of(projectTeam));

        List<TeamResponse> assignedTeams = projectService.getAssignedTeams(projectId);

        assertNotNull(assignedTeams);
        assertEquals(1, assignedTeams.size());
        assertEquals(teamId, assignedTeams.get(0).getId());
    }

    @Test
    void testGetAssignedTeams_Failure_AccessDenied() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(rbacService.hasProjectRole(projectId, ProjectMemberRole.VIEWER)).thenReturn(false);
        when(rbacService.canAdminWorkspace(workspaceId)).thenReturn(false);

        ForbiddenException exception = assertThrows(ForbiddenException.class, () ->
                projectService.getAssignedTeams(projectId)
        );

        assertEquals("Access denied: Must be a project viewer or workspace admin to see assigned teams", exception.getMessage());
    }

    @Test
    void testUnassignTeam_Success() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD)).thenReturn(true);
        when(projectTeamRepository.existsByProjectIdAndTeamId(projectId, teamId)).thenReturn(true);
        when(projectTeamRepository.countByProjectId(projectId)).thenReturn(0L);

        ProjectResponse response = projectService.unassignTeam(projectId, teamId, actor);

        assertNotNull(response);
        assertEquals(0, response.getTeamsCount());
        verify(projectTeamRepository, times(1)).deleteByProjectIdAndTeamId(projectId, teamId);
    }

    @Test
    void testUnassignTeam_Failure_AccessDenied() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(rbacService.hasProjectRole(projectId, ProjectMemberRole.LEAD)).thenReturn(false);
        when(rbacService.canAdminWorkspace(workspaceId)).thenReturn(false);

        ForbiddenException exception = assertThrows(ForbiddenException.class, () ->
                projectService.unassignTeam(projectId, teamId, actor)
        );

        assertEquals("Access denied: Only project leads and workspace admins can unassign teams", exception.getMessage());
        verify(projectTeamRepository, never()).deleteByProjectIdAndTeamId(any(), any());
    }
}
