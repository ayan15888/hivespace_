package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.InviteRequest;
import com.project.hiveSpace.dto.InviteResponse;
import com.project.hiveSpace.dto.JoinRequest;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.Random;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InvitationService {

    private final InvitationRepository invitationRepository;
    private final TeamRepository teamRepository;
    private final WorkspaceRepository workspaceRepository;
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    
    private final TenantMemberRepository tenantMemberRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final InvitationAttemptRepository invitationAttemptRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    
    private final PasswordEncoder passwordEncoder;
    private final ResendEmailService resendEmailService;

    @org.springframework.beans.factory.annotation.Value("${APP_DOMAIN:hive-space.indevs.in}")
    private String appDomain;

    @Transactional
    public InviteResponse createInvite(InviteRequest request) {
        User currentUser = getCurrentUser();
        
        Tenant tenant = tenantRepository.findById(request.getTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found"));

        // Security Check: Is the inviter an OWNER or ADMIN of this organization?
        TenantMember inviterMember = tenantMemberRepository.findByTenantIdAndUserId(tenant.getId(), currentUser.getId())
                .orElse(null);
                
        // Backward-compatible ownership check
        boolean isOwner = tenant.getOwnerEmail().equalsIgnoreCase(currentUser.getEmail());
        boolean isAuthorized = isOwner || (inviterMember != null &&
                (inviterMember.getRole() == TenantMemberRole.OWNER
                        || inviterMember.getRole() == TenantMemberRole.ADMIN
                        || inviterMember.getRole() == TenantMemberRole.BILLING_ADMIN));

        if (!isAuthorized) {
            throw new SecurityException("Only organization owners or administrators can create invitations");
        }

        // Determine inviter's actual role
        TenantMemberRole inviterRole = TenantMemberRole.MEMBER;
        if (isOwner) {
            inviterRole = TenantMemberRole.OWNER;
        } else if (inviterMember != null) {
            inviterRole = inviterMember.getRole();
        }

        // Validate target role permission
        String requestedRoleStr = request.getRole() != null ? request.getRole().trim().toUpperCase() : "MEMBER";
        TenantMemberRole targetRole = TenantMemberRole.MEMBER;
        try {
            targetRole = TenantMemberRole.valueOf(requestedRoleStr);
        } catch (IllegalArgumentException e) {
            // Default to MEMBER
        }

        if (targetRole == TenantMemberRole.OWNER) {
            throw new SecurityException("The Owner role cannot be assigned via invitation");
        }

        if (inviterRole == TenantMemberRole.ADMIN || inviterRole == TenantMemberRole.BILLING_ADMIN) {
            if (targetRole == TenantMemberRole.ADMIN || targetRole == TenantMemberRole.OWNER) {
                throw new SecurityException("Only organization owners can invite Administrators or Owners");
            }
        }

        Workspace workspace = null;
        if (request.getWorkspaceId() != null) {
            workspace = workspaceRepository.findById(request.getWorkspaceId())
                    .orElseThrow(() -> new IllegalArgumentException("Workspace not found"));
        }

        Team team = null;
        if (request.getTeamId() != null) {
            team = teamRepository.findById(request.getTeamId())
                    .orElseThrow(() -> new IllegalArgumentException("Team not found"));
        }

        Project project = null;
        if (request.getProjectId() != null) {
            project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        }

        // Generate or verify the PIN
        String rawPin = request.getPin();
        if (rawPin == null || rawPin.trim().isEmpty()) {
            rawPin = generateSecurePin();
        }

        String token = generateSecureToken();
        String pinHash = passwordEncoder.encode(rawPin);
        Date expiresAt = new Date(System.currentTimeMillis() + 1000L * 60 * 60 * 24 * 7); // 7 days expiry

        Invitation invitation = Invitation.builder()
                .token(token)
                .pinHash(pinHash)
                .tenant(tenant)
                .workspace(workspace)
                .team(team)
                .project(project)
                .inviter(currentUser)
                .role(request.getRole() != null ? request.getRole() : "MEMBER")
                .maxUses(request.getMaxUses() != null ? request.getMaxUses() : 1)
                .currentUses(0)
                .status(InvitationStatus.ACTIVE)
                .expiresAt(expiresAt)
                .createdAt(new Date())
                .build();

        Invitation saved = invitationRepository.save(invitation);
        
        InviteResponse response = mapToResponse(saved);
        // We include the raw plain PIN only upon successful creation so the inviter can copy it
        response.setPin(rawPin);

        // If email is provided in the request, send it via ResendEmailService
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String domain = appDomain;
            if (domain == null || domain.isBlank()) {
                domain = "hive-space.indevs.in";
            }
            String protocol = domain.contains("localhost") ? "http://" : "https://";
            String inviteUrl = protocol + domain + "/invite/" + tenant.getSlug() + "/" + saved.getToken();
            
            resendEmailService.sendInvitationEmail(
                request.getEmail().trim(),
                tenant.getName(),
                request.getRole() != null ? request.getRole() : "MEMBER",
                currentUser.getUsername(),
                inviteUrl,
                rawPin
            );
        }

        return response;
    }

    @Transactional
    public void acceptInvite(JoinRequest request) {
        User currentUser = getCurrentUser();
        
        Invitation invitation = invitationRepository.findByToken(request.getToken())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired invitation link"));

        // 1. Check expiration/exhaustion status
        if (invitation.getStatus() != InvitationStatus.ACTIVE) {
            throw new IllegalArgumentException("This invitation is no longer active");
        }

        if (invitation.getExpiresAt().before(new Date())) {
            invitation.setStatus(InvitationStatus.EXPIRED);
            invitationRepository.save(invitation);
            throw new IllegalArgumentException("This invitation link has expired");
        }

        if (invitation.getCurrentUses() >= invitation.getMaxUses()) {
            invitation.setStatus(InvitationStatus.EXHAUSTED);
            invitationRepository.save(invitation);
            throw new IllegalArgumentException("This invitation has reached its maximum usage limit");
        }

        // 2. PIN Rate Limiting Check (Invitation Security)
        // Count failed attempts on this invite within the last 15 minutes
        Date fifteenMinutesAgo = new Date(System.currentTimeMillis() - 15 * 60 * 1000);
        long failedAttempts = invitationAttemptRepository
                .countByInvitationIdAndAttemptedAtAfterAndSuccessFalse(invitation.getId(), fifteenMinutesAgo);

        if (failedAttempts >= 5) {
            invitation.setStatus(InvitationStatus.REVOKED);
            invitationRepository.save(invitation);
            throw new IllegalArgumentException("This invitation has been locked due to too many failed PIN attempts");
        }

        // 3. Verify PIN
        boolean pinMatches = passwordEncoder.matches(request.getPin(), invitation.getPinHash());

        // Track attempt in the database
        InvitationAttempt attempt = InvitationAttempt.builder()
                .invitation(invitation)
                .ipAddress("127.0.0.1") // Fallback / mock ip tracking
                .attemptedAt(new Date())
                .success(pinMatches)
                .build();
        invitationAttemptRepository.save(attempt);

        if (!pinMatches) {
            throw new IllegalArgumentException("Invalid security PIN. " + (4 - failedAttempts) + " attempts remaining.");
        }

        // 4. Enroll User Hierarchically into Memberships
        Tenant tenant = invitation.getTenant();
        Workspace workspace = invitation.getWorkspace();
        Team team = invitation.getTeam();
        
        // --- 1. Join Tenant ---
        if (!tenantMemberRepository.existsByTenantAndUser(tenant, currentUser)) {
            TenantMemberRole assignedTenantRole = parseTenantMemberRole(invitation.getRole());
            TenantMember tenantMember = TenantMember.builder()
                    .tenant(tenant)
                    .user(currentUser)
                    .role(assignedTenantRole)
                    .joinedAt(new Date())
                    .build();
            tenantMemberRepository.save(tenantMember);
            
            tenant.setMembersCount(tenant.getMembersCount() + 1);
            tenantRepository.save(tenant);
        }

        // Dynamically associate user with their active tenant context if not set
        if (currentUser.getTenant() == null) {
            currentUser.setTenant(tenant);
            userRepository.save(currentUser);
        }

        // --- 2. Join Workspace (if specified) ---
        if (workspace != null && !workspaceMemberRepository.existsByWorkspaceAndUser(workspace, currentUser)) {
            WorkspaceMember workspaceMember = WorkspaceMember.builder()
                    .workspace(workspace)
                    .user(currentUser)
                    .role(WorkspaceMemberRole.MEMBER)
                    .joinedAt(new Date())
                    .build();
            workspaceMemberRepository.save(workspaceMember);

            workspace.setMembersCount(workspace.getMembersCount() + 1);
            workspaceRepository.save(workspace);
        }

        // --- 3. Join Workspace and Team (if team is specified) ---
        if (team != null) {
            Workspace teamWorkspace = team.getWorkspace();
            
            // Join Workspace
            if (!workspaceMemberRepository.existsByWorkspaceAndUser(teamWorkspace, currentUser)) {
                WorkspaceMember workspaceMember = WorkspaceMember.builder()
                        .workspace(teamWorkspace)
                        .user(currentUser)
                        .role(WorkspaceMemberRole.MEMBER)
                        .joinedAt(new Date())
                        .build();
                workspaceMemberRepository.save(workspaceMember);
                
                teamWorkspace.setMembersCount(teamWorkspace.getMembersCount() + 1);
                workspaceRepository.save(teamWorkspace);
            }

            // Join Team
            if (!teamMemberRepository.existsByTeamAndUser(team, currentUser)) {
                TeamMember teamMember = TeamMember.builder()
                        .team(team)
                        .user(currentUser)
                        .role(TeamMemberRole.MEMBER)
                        .joinedAt(new Date())
                        .build();
                teamMemberRepository.save(teamMember);

                team.setMembersCount(team.getMembersCount() + 1);
                teamRepository.save(team);
            }
        }

        // --- 4. Join Project (if specified) ---
        Project project = invitation.getProject();
        if (project != null) {
            Workspace projectWorkspace = project.getWorkspace();
            
            // Join Workspace if they aren't in it
            if (projectWorkspace != null && !workspaceMemberRepository.existsByWorkspaceAndUser(projectWorkspace, currentUser)) {
                WorkspaceMember workspaceMember = WorkspaceMember.builder()
                        .workspace(projectWorkspace)
                        .user(currentUser)
                        .role(WorkspaceMemberRole.MEMBER)
                        .joinedAt(new Date())
                        .build();
                workspaceMemberRepository.save(workspaceMember);
                projectWorkspace.setMembersCount(projectWorkspace.getMembersCount() + 1);
                workspaceRepository.save(projectWorkspace);
            }

            // Join Project
            if (!projectMemberRepository.existsByProjectAndUser(project, currentUser)) {
                ProjectMember projectMember = ProjectMember.builder()
                        .project(project)
                        .user(currentUser)
                        .role(ProjectMemberRole.MEMBER)
                        .joinedAt(new Date())
                        .build();
                projectMemberRepository.save(projectMember);

                project.setMembersCount(project.getMembersCount() + 1);
                projectRepository.save(project);
            }
        }

        // 5. Increment Use Counter
        invitation.setCurrentUses(invitation.getCurrentUses() + 1);
        if (invitation.getCurrentUses() >= invitation.getMaxUses()) {
            invitation.setStatus(InvitationStatus.EXHAUSTED);
        }
        invitationRepository.save(invitation);
    }

    @Transactional
    public InviteResponse getInvite(String token) {
        Invitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired invitation link"));

        if (invitation.getStatus() != InvitationStatus.ACTIVE) {
            throw new IllegalArgumentException("This invitation is no longer active");
        }

        if (invitation.getExpiresAt().before(new Date())) {
            invitation.setStatus(InvitationStatus.EXPIRED);
            invitationRepository.save(invitation);
            throw new IllegalArgumentException("This invitation link has expired");
        }

        return mapToResponse(invitation);
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public java.util.List<InviteResponse> getInvitationsByTenant(UUID tenantId) {
        User currentUser = getCurrentUser();
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found"));

        boolean isOwner = tenant.getOwnerEmail().equalsIgnoreCase(currentUser.getEmail());
        TenantMember member = tenantMemberRepository.findByTenantIdAndUserId(tenantId, currentUser.getId())
                .orElse(null);
        boolean isAdmin = member != null
                && (member.getRole() == TenantMemberRole.OWNER || member.getRole() == TenantMemberRole.ADMIN);

        if (!isOwner && !isAdmin) {
            throw new SecurityException("Only organization owners or administrators can view invitations");
        }

        return invitationRepository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
                .map(this::mapToResponse)
                .collect(java.util.stream.Collectors.toList());
    }

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User) {
            return (User) principal;
        }
        throw new IllegalStateException("User not authenticated");
    }

    private String generateSecureToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private String generateSecurePin() {
        Random random = new Random();
        return String.format("%06d", random.nextInt(1000000));
    }

    private InviteResponse mapToResponse(Invitation invite) {
        return InviteResponse.builder()
                .id(invite.getId())
                .token(invite.getToken())
                .tenantId(invite.getTenant().getId())
                .tenantName(invite.getTenant().getName())
                .tenantSlug(invite.getTenant().getSlug())
                .workspaceId(invite.getWorkspace() != null ? invite.getWorkspace().getId() : null)
                .workspaceName(invite.getWorkspace() != null ? invite.getWorkspace().getName() : null)
                .teamId(invite.getTeam() != null ? invite.getTeam().getId() : null)
                .teamName(invite.getTeam() != null ? invite.getTeam().getName() : null)
                .projectId(invite.getProject() != null ? invite.getProject().getId() : null)
                .projectName(invite.getProject() != null ? invite.getProject().getName() : null)
                .inviterUsername(invite.getInviter().getUsername())
                .role(invite.getRole())
                .maxUses(invite.getMaxUses())
                .currentUses(invite.getCurrentUses())
                .status(invite.getStatus())
                .expiresAt(invite.getExpiresAt())
                .createdAt(invite.getCreatedAt())
                .build();
    }

    private TenantMemberRole parseTenantMemberRole(String role) {
        if (role == null || role.isBlank()) {
            return TenantMemberRole.MEMBER;
        }
        try {
            return TenantMemberRole.valueOf(role.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return TenantMemberRole.MEMBER;
        }
    }
}
