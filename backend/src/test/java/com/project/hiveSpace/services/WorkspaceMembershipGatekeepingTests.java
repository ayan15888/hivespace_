package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.*;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkspaceMembershipGatekeepingTests {

    @Mock
    private WorkspaceRepository workspaceRepository;

    @Mock
    private WorkspaceMemberRepository workspaceMemberRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private ProjectMemberRepository projectMemberRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private WorkspaceService workspaceService;

    @InjectMocks
    private ProjectMemberService projectMemberService;

    @InjectMocks
    private TeamMemberService teamMemberService;

    private UUID workspaceId;
    private UUID userId;
    private UUID projectId;
    private UUID teamId;

    private Workspace workspace;
    private User user;
    private Project project;
    private Team team;

    @BeforeEach
    void setUp() {
        workspaceId = UUID.randomUUID();
        userId = UUID.randomUUID();
        projectId = UUID.randomUUID();
        teamId = UUID.randomUUID();

        user = User.builder()
                .id(userId)
                .username("testuser")
                .email("test@example.com")
                .fullName("Test User")
                .avatarUrl("http://avatar.com")
                .build();

        workspace = Workspace.builder()
                .id(workspaceId)
                .name("Test Workspace")
                .build();

        project = Project.builder()
                .id(projectId)
                .name("Test Project")
                .workspace(workspace)
                .membersCount(0)
                .build();

        team = Team.builder()
                .id(teamId)
                .name("Test Team")
                .workspace(workspace)
                .membersCount(0)
                .build();
    }

    @Test
    void testGetWorkspaceMembers_Success() {
        WorkspaceMember member = WorkspaceMember.builder()
                .id(UUID.randomUUID())
                .workspace(workspace)
                .user(user)
                .role(WorkspaceMemberRole.MEMBER)
                .joinedAt(new Date())
                .build();

        when(workspaceRepository.existsById(workspaceId)).thenReturn(true);
        when(workspaceMemberRepository.findAllByWorkspaceId(workspaceId)).thenReturn(Collections.singletonList(member));

        List<WorkspaceMemberResponse> result = workspaceService.getWorkspaceMembers(workspaceId);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(userId, result.get(0).getUserId());
        assertEquals("test@example.com", result.get(0).getUsername());
        assertEquals(WorkspaceMemberRole.MEMBER, result.get(0).getRole());
    }

    @Test
    void testAddMemberToProject_ShouldThrowException_WhenUserNotInWorkspace() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)).thenReturn(false);

        SecurityException exception = assertThrows(SecurityException.class, () ->
                projectMemberService.addMemberToProject(projectId, userId, ProjectMemberRole.MEMBER)
        );

        assertEquals("User must be a workspace member before joining a project", exception.getMessage());
        verify(projectMemberRepository, never()).save(any(ProjectMember.class));
    }

    @Test
    void testAddMemberToProject_Success_WhenUserInWorkspace() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)).thenReturn(true);
        when(projectMemberRepository.existsByProjectAndUser(project, user)).thenReturn(false);
        when(projectMemberRepository.save(any(ProjectMember.class))).thenAnswer(invocation -> {
            ProjectMember pm = invocation.getArgument(0);
            pm.setId(UUID.randomUUID());
            return pm;
        });

        ProjectMemberResponse response = projectMemberService.addMemberToProject(projectId, userId, ProjectMemberRole.MEMBER);

        assertNotNull(response);
        assertEquals(projectId, response.getProjectId());
        assertEquals(userId, response.getUserId());
        assertEquals(ProjectMemberRole.MEMBER, response.getRole());
        verify(projectMemberRepository, times(1)).save(any(ProjectMember.class));
    }

    @Test
    void testAddMemberToTeam_ShouldThrowException_WhenUserNotInWorkspace() {
        TeamMemberRequest request = new TeamMemberRequest(userId, TeamMemberRole.MEMBER);

        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)).thenReturn(false);

        SecurityException exception = assertThrows(SecurityException.class, () ->
                teamMemberService.addMemberToTeam(teamId, request)
        );

        assertEquals("User must be a workspace member before joining a team", exception.getMessage());
        verify(teamMemberRepository, never()).save(any(TeamMember.class));
    }

    @Test
    void testAddMemberToTeam_Success_WhenUserInWorkspace() {
        TeamMemberRequest request = new TeamMemberRequest(userId, TeamMemberRole.MEMBER);

        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)).thenReturn(true);
        when(teamMemberRepository.existsByTeamAndUser(team, user)).thenReturn(false);
        when(teamMemberRepository.save(any(TeamMember.class))).thenAnswer(invocation -> {
            TeamMember tm = invocation.getArgument(0);
            tm.setId(UUID.randomUUID());
            return tm;
        });

        TeamMemberResponse response = teamMemberService.addMemberToTeam(teamId, request);

        assertNotNull(response);
        assertEquals(teamId, response.getTeamId());
        assertEquals(userId, response.getUserId());
        assertEquals(TeamMemberRole.MEMBER, response.getRole());
        verify(teamMemberRepository, times(1)).save(any(TeamMember.class));
    }
}
