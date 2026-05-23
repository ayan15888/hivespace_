package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.InviteRequest;
import com.project.hiveSpace.dto.InviteResponse;
import com.project.hiveSpace.dto.JoinRequest;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import com.project.hiveSpace.security.RbacService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvitationServiceTests {

    @Mock private InvitationRepository invitationRepository;
    @Mock private TeamRepository teamRepository;
    @Mock private WorkspaceRepository workspaceRepository;
    @Mock private TenantRepository tenantRepository;
    @Mock private UserRepository userRepository;
    @Mock private TenantMemberRepository tenantMemberRepository;
    @Mock private WorkspaceMemberRepository workspaceMemberRepository;
    @Mock private TeamMemberRepository teamMemberRepository;
    @Mock private InvitationAttemptRepository invitationAttemptRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository projectMemberRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private ResendEmailService resendEmailService;
    @Mock private RbacService rbacService;

    @InjectMocks
    private InvitationService invitationService;

    private User currentUser;
    private Tenant tenant;
    private Workspace workspace;
    private Team team;
    private Project project;
    private UUID tenantId;
    private UUID workspaceId;
    private UUID teamId;
    private UUID projectId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        workspaceId = UUID.randomUUID();
        teamId = UUID.randomUUID();
        projectId = UUID.randomUUID();

        currentUser = User.builder()
                .id(UUID.randomUUID())
                .username("inviter")
                .email("inviter@example.com")
                .build();

        tenant = Tenant.builder()
                .id(tenantId)
                .name("Test Tenant")
                .ownerEmail("owner@example.com")
                .membersCount(1)
                .build();

        workspace = Workspace.builder()
                .id(workspaceId)
                .name("Test Workspace")
                .tenant(tenant)
                .membersCount(1)
                .build();

        team = Team.builder()
                .id(teamId)
                .name("Test Team")
                .workspace(workspace)
                .membersCount(1)
                .build();

        project = Project.builder()
                .id(projectId)
                .name("Test Project")
                .workspace(workspace)
                .membersCount(1)
                .build();

        mockSecurityContext(currentUser);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void mockSecurityContext(User user) {
        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(user);
        SecurityContext context = mock(SecurityContext.class);
        when(context.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(context);
    }

    @Test
    void testCreateInvite_Success() {
        InviteRequest request = new InviteRequest();
        request.setTenantId(tenantId);
        request.setWorkspaceId(workspaceId);
        request.setTeamId(teamId);
        request.setTenantRole("MEMBER");
        request.setMaxUses(5);
        request.setPin("123456");
        request.setEmail("invitee@example.com");
        request.setProjectId(projectId);

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(rbacService.canManageInvite(tenantId)).thenReturn(true);
        when(rbacService.isTenantOwner(tenantId)).thenReturn(false);
        when(rbacService.hasTenantRole(tenantId, TenantMemberRole.ADMIN)).thenReturn(true);

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));

        when(rbacService.hasWorkspaceRole(workspaceId, WorkspaceMemberRole.MEMBER)).thenReturn(true);
        when(passwordEncoder.encode(any())).thenReturn("hashed_pin");

        Invitation savedInvite = Invitation.builder()
                .id(UUID.randomUUID())
                .token("secure_token")
                .pinHash("hashed_pin")
                .tenant(tenant)
                .workspace(workspace)
                .team(team)
                .project(project)
                .inviter(currentUser)
                .tenantRole("MEMBER")
                .maxUses(5)
                .currentUses(0)
                .status(InvitationStatus.ACTIVE)
                .expiresAt(new Date())
                .createdAt(new Date())
                .build();

        when(invitationRepository.save(any(Invitation.class))).thenReturn(savedInvite);

        InviteResponse response = invitationService.createInvite(request);

        assertNotNull(response);
        assertEquals("secure_token", response.getToken());
        assertEquals(tenantId, response.getTenantId());
        assertEquals(workspaceId, response.getWorkspaceId());
        assertEquals(teamId, response.getTeamId());
        assertEquals(projectId, response.getProjectId());
        verify(resendEmailService, times(1)).sendInvitationEmail(
                eq("invitee@example.com"), eq("Test Tenant"), eq("Test Workspace"), eq("Test Team"),
                eq("MEMBER"), eq("inviter@example.com"), any(), eq("123456")
        );
    }

    @Test
    void testCreateInvite_ThrowsException_WhenBillingAdminAttempts() {
        InviteRequest request = new InviteRequest();
        request.setTenantId(tenantId);
        request.setWorkspaceId(workspaceId);
        request.setTenantRole("MEMBER");
        request.setMaxUses(1);
        request.setPin("123456");

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(rbacService.canManageInvite(tenantId)).thenReturn(false);

        SecurityException exception = assertThrows(SecurityException.class, () ->
                invitationService.createInvite(request)
        );

        assertEquals("Only organization owners or administrators can create invitations", exception.getMessage());
    }

    @Test
    void testCreateInvite_ThrowsException_WhenWorkspaceBelongsToDifferentTenant() {
        Tenant otherTenant = Tenant.builder().id(UUID.randomUUID()).name("Other Tenant").build();
        Workspace invalidWorkspace = Workspace.builder().id(workspaceId).tenant(otherTenant).build();

        InviteRequest request = new InviteRequest();
        request.setTenantId(tenantId);
        request.setWorkspaceId(workspaceId);
        request.setTenantRole("MEMBER");
        request.setMaxUses(1);
        request.setPin("123456");

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(rbacService.canManageInvite(tenantId)).thenReturn(true);
        when(rbacService.isTenantOwner(tenantId)).thenReturn(false);
        when(rbacService.hasTenantRole(tenantId, TenantMemberRole.ADMIN)).thenReturn(true);
        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(invalidWorkspace));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
                invitationService.createInvite(request)
        );

        assertTrue(exception.getMessage().contains("does not belong to the specified tenant"));
    }

    @Test
    void testCreateInvite_ThrowsException_WhenTeamWorkspaceBelongsToDifferentTenant() {
        Tenant otherTenant = Tenant.builder().id(UUID.randomUUID()).name("Other Tenant").build();
        Workspace otherWorkspace = Workspace.builder().id(UUID.randomUUID()).tenant(otherTenant).build();
        Team invalidTeam = Team.builder().id(teamId).workspace(otherWorkspace).build();

        InviteRequest request = new InviteRequest();
        request.setTenantId(tenantId);
        request.setTeamId(teamId);
        request.setTenantRole("MEMBER");
        request.setMaxUses(1);
        request.setPin("123456");

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(rbacService.canManageInvite(tenantId)).thenReturn(true);
        when(rbacService.isTenantOwner(tenantId)).thenReturn(false);
        when(rbacService.hasTenantRole(tenantId, TenantMemberRole.ADMIN)).thenReturn(true);
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(invalidTeam));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
                invitationService.createInvite(request)
        );

        assertTrue(exception.getMessage().contains("does not belong to the specified tenant"));
    }

    @Test
    void testCreateInvite_ThrowsException_WhenProjectWorkspaceBelongsToDifferentTenant() {
        Tenant otherTenant = Tenant.builder().id(UUID.randomUUID()).name("Other Tenant").build();
        Workspace otherWorkspace = Workspace.builder().id(UUID.randomUUID()).tenant(otherTenant).build();
        Project invalidProject = Project.builder().id(projectId).workspace(otherWorkspace).build();

        InviteRequest request = new InviteRequest();
        request.setTenantId(tenantId);
        request.setProjectId(projectId);
        request.setTenantRole("MEMBER");
        request.setMaxUses(1);
        request.setPin("123456");

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(rbacService.canManageInvite(tenantId)).thenReturn(true);
        when(rbacService.isTenantOwner(tenantId)).thenReturn(false);
        when(rbacService.hasTenantRole(tenantId, TenantMemberRole.ADMIN)).thenReturn(true);
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(invalidProject));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
                invitationService.createInvite(request)
        );

        assertEquals("Project's workspace does not belong to the specified tenant", exception.getMessage());
    }

    @Test
    void testCreateInvite_ThrowsException_WhenCallerWorkspaceRoleExceeded() {
        InviteRequest request = new InviteRequest();
        request.setTenantId(tenantId);
        request.setWorkspaceId(workspaceId);
        request.setTenantRole("MEMBER");
        request.setMaxUses(1);
        request.setPin("123456");

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(rbacService.canManageInvite(tenantId)).thenReturn(true);
        when(rbacService.isTenantOwner(tenantId)).thenReturn(false);
        when(rbacService.hasTenantRole(tenantId, TenantMemberRole.ADMIN)).thenReturn(true);
        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));

        when(rbacService.hasWorkspaceRole(workspaceId, WorkspaceMemberRole.MEMBER)).thenReturn(false);

        SecurityException exception = assertThrows(SecurityException.class, () ->
                invitationService.createInvite(request)
        );

        assertEquals("You must have at least Member access to 'Test Workspace' to invite others into it", exception.getMessage());
    }

    @Test
    void testAcceptInvite_Success() {
        JoinRequest request = new JoinRequest("secure_token", "123456");

        Invitation invitation = Invitation.builder()
                .id(UUID.randomUUID())
                .token("secure_token")
                .pinHash("hashed_pin")
                .tenant(tenant)
                .workspace(workspace)
                .team(team)
                .project(project)
                .workspaces(new java.util.HashSet<>(java.util.List.of(workspace)))
                .teams(new java.util.HashSet<>(java.util.List.of(team)))
                .tenantRole("MEMBER")
                .maxUses(1)
                .currentUses(0)
                .status(InvitationStatus.ACTIVE)
                .expiresAt(new Date(System.currentTimeMillis() + 100000))
                .build();

        when(invitationRepository.findByToken("secure_token")).thenReturn(Optional.of(invitation));
        when(invitationAttemptRepository.countByInvitationIdAndAttemptedAtAfterAndSuccessFalse(any(), any()))
                .thenReturn(0L);
        when(passwordEncoder.matches("123456", "hashed_pin")).thenReturn(true);

        when(tenantMemberRepository.existsByTenantAndUser(tenant, currentUser)).thenReturn(false);
        when(workspaceMemberRepository.existsByWorkspaceAndUser(any(), any())).thenReturn(false);
        when(teamMemberRepository.existsByTeamAndUser(team, currentUser)).thenReturn(false);
        when(projectMemberRepository.existsByProjectAndUser(project, currentUser)).thenReturn(false);

        assertDoesNotThrow(() -> invitationService.acceptInvite(request));

        verify(tenantMemberRepository, times(1)).save(any(TenantMember.class));
        verify(workspaceMemberRepository, atLeast(1)).save(any(WorkspaceMember.class));
        verify(teamMemberRepository, times(1)).save(any(TeamMember.class));
        verify(projectMemberRepository, times(1)).save(any(ProjectMember.class));
        assertEquals(InvitationStatus.EXHAUSTED, invitation.getStatus());
    }

    @Test
    void testAcceptInvite_ThrowsException_WhenWorkspaceTenantNoLongerMatches() {
        JoinRequest request = new JoinRequest("secure_token", "123456");

        Tenant otherTenant = Tenant.builder().id(UUID.randomUUID()).name("Other").build();
        Workspace restructuredWorkspace = Workspace.builder().id(workspaceId).tenant(otherTenant).build();

        Invitation invitation = Invitation.builder()
                .id(UUID.randomUUID())
                .token("secure_token")
                .pinHash("hashed_pin")
                .tenant(tenant)
                .workspaces(new java.util.HashSet<>(java.util.List.of(restructuredWorkspace)))
                .tenantRole("MEMBER")
                .maxUses(1)
                .currentUses(0)
                .status(InvitationStatus.ACTIVE)
                .expiresAt(new Date(System.currentTimeMillis() + 100000))
                .build();

        when(invitationRepository.findByToken("secure_token")).thenReturn(Optional.of(invitation));
        when(invitationAttemptRepository.countByInvitationIdAndAttemptedAtAfterAndSuccessFalse(any(), any()))
                .thenReturn(0L);
        when(passwordEncoder.matches("123456", "hashed_pin")).thenReturn(true);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
                invitationService.acceptInvite(request)
        );

        assertTrue(exception.getMessage().contains("no longer belongs to the invitation's tenant"));
    }

    @Test
    void testAcceptInvite_ThrowsException_WhenTeamWorkspaceNoLongerMatches() {
        JoinRequest request = new JoinRequest("secure_token", "123456");

        Tenant otherTenant = Tenant.builder().id(UUID.randomUUID()).name("Other").build();
        Workspace restructuredWorkspace = Workspace.builder().id(workspaceId).tenant(otherTenant).build();
        Team restructuredTeam = Team.builder().id(teamId).workspace(restructuredWorkspace).build();

        Invitation invitation = Invitation.builder()
                .id(UUID.randomUUID())
                .token("secure_token")
                .pinHash("hashed_pin")
                .tenant(tenant)
                .teams(new java.util.HashSet<>(java.util.List.of(restructuredTeam)))
                .tenantRole("MEMBER")
                .maxUses(1)
                .currentUses(0)
                .status(InvitationStatus.ACTIVE)
                .expiresAt(new Date(System.currentTimeMillis() + 100000))
                .build();

        when(invitationRepository.findByToken("secure_token")).thenReturn(Optional.of(invitation));
        when(invitationAttemptRepository.countByInvitationIdAndAttemptedAtAfterAndSuccessFalse(any(), any()))
                .thenReturn(0L);
        when(passwordEncoder.matches("123456", "hashed_pin")).thenReturn(true);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
                invitationService.acceptInvite(request)
        );

        assertTrue(exception.getMessage().contains("no longer belongs to the invitation's tenant"));
    }
}
