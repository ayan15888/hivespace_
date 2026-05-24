package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.InviteRequest;
import com.project.hiveSpace.dto.InviteResponse;
import com.project.hiveSpace.dto.JoinRequest;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import com.project.hiveSpace.security.RbacService;
import com.project.hiveSpace.exceptions.ForbiddenException;
// import com.project.hiveSpace.exceptions.DomainValidationException;
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
    private final RbacService rbacService;

    @org.springframework.beans.factory.annotation.Value("${APP_DOMAIN:hive-space.indevs.in}")
    private String appDomain;

    @Transactional
    public InviteResponse createInvite(InviteRequest request) {
        User currentUser = getCurrentUser();
        
        Tenant tenant = tenantRepository.findById(request.getTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found"));

        // Verify that there is at least one workspace created in the tenant/organization before inviting
        java.util.List<Workspace> workspaces = workspaceRepository.findAllByTenant(tenant);
        if (workspaces.isEmpty()) {
            throw new IllegalStateException("At least one workspace must be created in the organization before inviting members.");
        }

        if (!rbacService.canManageInvite(tenant.getId())) {
            throw new ForbiddenException("Only organization owners or administrators can create invitations");
        }

        // Determine inviter's actual role
        TenantMemberRole inviterRole = TenantMemberRole.MEMBER;
        if (rbacService.isTenantOwner(tenant.getId())) {
            inviterRole = TenantMemberRole.OWNER;
        } else if (rbacService.hasTenantRole(tenant.getId(), TenantMemberRole.ADMIN)) {
            inviterRole = TenantMemberRole.ADMIN;
        }

        // Validate target role permission
        String requestedRoleStr = request.getTenantRole() != null ? request.getTenantRole().trim().toUpperCase() : "MEMBER";
        TenantMemberRole targetRole = TenantMemberRole.MEMBER;
        try {
            targetRole = TenantMemberRole.valueOf(requestedRoleStr);
        } catch (IllegalArgumentException e) {
            // Default to MEMBER
        }

        if (targetRole == TenantMemberRole.OWNER) {
            throw new ForbiddenException("The Owner role cannot be assigned via invitation");
        }

        if (inviterRole == TenantMemberRole.ADMIN) {
            if (targetRole == TenantMemberRole.ADMIN || targetRole == TenantMemberRole.OWNER) {
                throw new ForbiddenException("Only organization owners can invite Administrators or Owners");
            }
        }

        // --- Collect target workspaces from single workspaceId + workspaceIds list ---
        java.util.Set<UUID> allWorkspaceIds = new java.util.LinkedHashSet<>();
        if (request.getWorkspaceId() != null) allWorkspaceIds.add(request.getWorkspaceId());
        if (request.getWorkspaceIds() != null) allWorkspaceIds.addAll(request.getWorkspaceIds());

        java.util.Set<Workspace> targetWorkspaceSet = new java.util.LinkedHashSet<>();
        for (UUID wsId : allWorkspaceIds) {
            Workspace ws = workspaceRepository.findById(wsId)
                    .orElseThrow(() -> new IllegalArgumentException("Workspace not found: " + wsId));
            if (!ws.getTenant().getId().equals(tenant.getId())) {
                throw new IllegalArgumentException("Workspace " + wsId + " does not belong to the specified tenant");
            }
            targetWorkspaceSet.add(ws);
        }

        // --- Collect target teams from single teamId + teamIds list ---
        java.util.Set<UUID> allTeamIds = new java.util.LinkedHashSet<>();
        if (request.getTeamId() != null) allTeamIds.add(request.getTeamId());
        if (request.getTeamIds() != null) allTeamIds.addAll(request.getTeamIds());

        java.util.Set<Team> targetTeamSet = new java.util.LinkedHashSet<>();
        for (UUID tId : allTeamIds) {
            Team t = teamRepository.findById(tId)
                    .orElseThrow(() -> new IllegalArgumentException("Team not found: " + tId));
            if (t.getWorkspace() == null || !t.getWorkspace().getTenant().getId().equals(tenant.getId())) {
                throw new IllegalArgumentException("Team " + tId + " does not belong to the specified tenant");
            }
            targetWorkspaceSet.add(t.getWorkspace()); // Make sure we auto-include team workspaces
            targetTeamSet.add(t);
        }

        // Backward compat single fields
        Workspace workspace = targetWorkspaceSet.isEmpty() ? null : targetWorkspaceSet.iterator().next();
        Team team = targetTeamSet.isEmpty() ? null : targetTeamSet.iterator().next();

        Project project = null;
        if (request.getProjectId() != null) {
            project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new IllegalArgumentException("Project not found"));
            if (project.getWorkspace() == null || !project.getWorkspace().getTenant().getId().equals(tenant.getId())) {
                throw new IllegalArgumentException("Project's workspace does not belong to the specified tenant");
            }
        }

        // Validate caller's workspace role for all workspaces the invitee will join
        java.util.Set<Workspace> allInviteWorkspaces = new java.util.HashSet<>(targetWorkspaceSet);
        for (Team t : targetTeamSet) {
            if (t.getWorkspace() != null) allInviteWorkspaces.add(t.getWorkspace());
        }
        if (project != null && project.getWorkspace() != null) {
            allInviteWorkspaces.add(project.getWorkspace());
        }

        for (Workspace w : allInviteWorkspaces) {
            if (!rbacService.hasWorkspaceRole(w.getId(), WorkspaceMemberRole.MEMBER)) {
                throw new ForbiddenException("You must have at least Member access to '" + w.getName() + "' to invite others into it");
            }
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
                .workspaces(targetWorkspaceSet)
                .teams(targetTeamSet)
                .inviter(currentUser)
                .tenantRole(request.getTenantRole() != null ? request.getTenantRole() : "MEMBER")
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
                workspace != null ? workspace.getName() : null,
                team != null ? team.getName() : null,
                request.getTenantRole() != null ? request.getTenantRole() : "MEMBER",
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
        Project project = invitation.getProject();

        // Collect all workspaces from the junction table
        java.util.Set<Workspace> inviteWorkspaces = invitation.getWorkspaces();
        // Collect all teams from the junction table
        java.util.Set<Team> inviteTeams = invitation.getTeams();

        // Structural Consistency Validation — verify all junction-table workspaces still belong to the tenant
        for (Workspace ws : inviteWorkspaces) {
            if (ws.getTenant() == null || !ws.getTenant().getId().equals(tenant.getId())) {
                throw new IllegalArgumentException("Workspace " + ws.getId() + " no longer belongs to the invitation's tenant");
            }
        }
        for (Team t : inviteTeams) {
            Workspace tw = t.getWorkspace();
            if (tw == null || tw.getTenant() == null || !tw.getTenant().getId().equals(tenant.getId())) {
                throw new IllegalArgumentException("Team " + t.getId() + " no longer belongs to the invitation's tenant");
            }
        }
        if (project != null) {
            Workspace pw = project.getWorkspace();
            if (pw == null || pw.getTenant() == null || !pw.getTenant().getId().equals(tenant.getId())) {
                throw new IllegalArgumentException("Project's workspace no longer belongs to the invitation's tenant");
            }
        }

        // --- 1. Join Tenant ---
        if (!tenantMemberRepository.existsByTenantAndUser(tenant, currentUser)) {
            TenantMemberRole assignedTenantRole = parseTenantMemberRole(invitation.getTenantRole());
            TenantMember tenantMember = TenantMember.builder()
                    .tenant(tenant)
                    .user(currentUser)
                    .role(assignedTenantRole)
                    .joinedAt(new Date())
                    .build();
            tenantMemberRepository.save(tenantMember);
        }

        // Dynamically associate user with their active tenant context if not set
        if (currentUser.getTenant() == null) {
            currentUser.setTenant(tenant);
            userRepository.save(currentUser);
        }

        // --- 2. Join all Workspaces from the junction table ---
        for (Workspace ws : inviteWorkspaces) {
            if (!workspaceMemberRepository.existsByWorkspaceAndUser(ws, currentUser)) {
                WorkspaceMember wm = WorkspaceMember.builder()
                        .workspace(ws)
                        .user(currentUser)
                        .role(WorkspaceMemberRole.MEMBER)
                        .joinedAt(new Date())
                        .build();
                workspaceMemberRepository.save(wm);
            }
        }

        // --- 3. Join all Teams from the junction table (and auto-join their workspaces) ---
        for (Team t : inviteTeams) {
            Workspace teamWorkspace = t.getWorkspace();
            if (teamWorkspace != null && !workspaceMemberRepository.existsByWorkspaceAndUser(teamWorkspace, currentUser)) {
                WorkspaceMember wm = WorkspaceMember.builder()
                        .workspace(teamWorkspace)
                        .user(currentUser)
                        .role(WorkspaceMemberRole.MEMBER)
                        .joinedAt(new Date())
                        .build();
                workspaceMemberRepository.save(wm);
            }
            if (!teamMemberRepository.existsByTeamAndUser(t, currentUser)) {
                TeamMember tm = TeamMember.builder()
                        .team(t)
                        .user(currentUser)
                        .role(TeamMemberRole.MEMBER)
                        .joinedAt(new Date())
                        .build();
                teamMemberRepository.save(tm);
            }
        }

        // --- 4. Join Project (if specified) ---
        if (project != null) {
            Workspace projectWorkspace = project.getWorkspace();

            // Ensure user is in the project's workspace
            if (projectWorkspace != null && !workspaceMemberRepository.existsByWorkspaceAndUser(projectWorkspace, currentUser)) {
                WorkspaceMember wm = WorkspaceMember.builder()
                        .workspace(projectWorkspace)
                        .user(currentUser)
                        .role(WorkspaceMemberRole.MEMBER)
                        .joinedAt(new Date())
                        .build();
                workspaceMemberRepository.save(wm);
            }

            if (!projectMemberRepository.existsByProjectAndUser(project, currentUser)) {
                ProjectMember pm = ProjectMember.builder()
                        .project(project)
                        .user(currentUser)
                        .role(ProjectMemberRole.MEMBER)
                        .joinedAt(new Date())
                        .build();
                projectMemberRepository.save(pm);
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
        UUID activeTenantId = currentUser.getTenant() != null ? currentUser.getTenant().getId() : null;
        if (activeTenantId == null || !activeTenantId.equals(tenantId)) {
            throw new ForbiddenException("Access denied: Cannot view invitations of a different organization");
        }

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found"));

        boolean isOwner = tenant.getOwnerEmail().equalsIgnoreCase(currentUser.getEmail());
        TenantMember member = tenantMemberRepository.findByTenantIdAndUserId(tenantId, currentUser.getId())
                .orElse(null);
        boolean isAdmin = member != null
                && (member.getRole() == TenantMemberRole.OWNER || member.getRole() == TenantMemberRole.ADMIN);

        if (!isOwner && !isAdmin) {
            throw new ForbiddenException("Only organization owners or administrators can view invitations");
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
                .workspaceIds(invite.getWorkspaces().stream().map(Workspace::getId).collect(java.util.stream.Collectors.toList()))
                .teamIds(invite.getTeams().stream().map(Team::getId).collect(java.util.stream.Collectors.toList()))
                .inviterUsername(invite.getInviter().getUsername())
                .tenantRole(invite.getTenantRole())
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
