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
    private final ProjectRepository projectRepository;
    private final WorkspaceRepository workspaceRepository;
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    
    private final TenantMemberRepository tenantMemberRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final InvitationAttemptRepository invitationAttemptRepository;
    
    private final PasswordEncoder passwordEncoder;

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
                ("OWNER".equalsIgnoreCase(inviterMember.getRole()) || "ADMIN".equalsIgnoreCase(inviterMember.getRole())));

        if (!isAuthorized) {
            throw new IllegalArgumentException("Only organization owners or administrators can create invitations");
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
                .inviter(currentUser)
                .role(request.getRole() != null ? request.getRole() : "MEMBER")
                .maxUses(request.getMaxUses() != null ? request.getMaxUses() : 1)
                .currentUses(0)
                .status("ACTIVE")
                .expiresAt(expiresAt)
                .createdAt(new Date())
                .build();

        Invitation saved = invitationRepository.save(invitation);
        
        InviteResponse response = mapToResponse(saved);
        // We include the raw plain PIN only upon successful creation so the inviter can copy it
        response.setPin(rawPin);
        return response;
    }

    @Transactional
    public void acceptInvite(JoinRequest request) {
        User currentUser = getCurrentUser();
        
        Invitation invitation = invitationRepository.findByToken(request.getToken())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired invitation link"));

        // 1. Check expiration/exhaustion status
        if (!"ACTIVE".equalsIgnoreCase(invitation.getStatus())) {
            throw new IllegalArgumentException("This invitation is no longer active");
        }

        if (invitation.getExpiresAt().before(new Date())) {
            invitation.setStatus("EXPIRED");
            invitationRepository.save(invitation);
            throw new IllegalArgumentException("This invitation link has expired");
        }

        if (invitation.getCurrentUses() >= invitation.getMaxUses()) {
            invitation.setStatus("EXHAUSTED");
            invitationRepository.save(invitation);
            throw new IllegalArgumentException("This invitation has reached its maximum usage limit");
        }

        // 2. PIN Rate Limiting Check (Invitation Security)
        // Count failed attempts on this invite within the last 15 minutes
        Date fifteenMinutesAgo = new Date(System.currentTimeMillis() - 15 * 60 * 1000);
        long failedAttempts = invitationAttemptRepository
                .countByInvitationIdAndAttemptedAtAfterAndSuccessFalse(invitation.getId(), fifteenMinutesAgo);

        if (failedAttempts >= 5) {
            invitation.setStatus("REVOKED");
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
            TenantMember tenantMember = TenantMember.builder()
                    .tenant(tenant)
                    .user(currentUser)
                    .role(invitation.getRole())
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
                    .role("MEMBER")
                    .joinedAt(new Date())
                    .build();
            workspaceMemberRepository.save(workspaceMember);

            workspace.setMembersCount(workspace.getMembersCount() + 1);
            workspaceRepository.save(workspace);
        }

        // --- 3. Join Project and Team (if team is specified) ---
        if (team != null) {
            Project project = team.getProject();
            
            // Join Project
            if (!projectMemberRepository.existsByProjectAndUser(project, currentUser)) {
                ProjectMember projectMember = ProjectMember.builder()
                        .project(project)
                        .user(currentUser)
                        .role("MEMBER")
                        .joinedAt(new Date())
                        .build();
                projectMemberRepository.save(projectMember);
                
                project.setMembersCount(project.getMembersCount() + 1);
                projectRepository.save(project);
            }

            // Join Team
            if (!teamMemberRepository.existsByTeamAndUser(team, currentUser)) {
                TeamMember teamMember = TeamMember.builder()
                        .team(team)
                        .user(currentUser)
                        .role("MEMBER")
                        .joinedAt(new Date())
                        .build();
                teamMemberRepository.save(teamMember);

                team.setMembersCount(team.getMembersCount() + 1);
                teamRepository.save(team);
            }
        }

        // 5. Increment Use Counter
        invitation.setCurrentUses(invitation.getCurrentUses() + 1);
        if (invitation.getCurrentUses() >= invitation.getMaxUses()) {
            invitation.setStatus("EXHAUSTED");
        }
        invitationRepository.save(invitation);
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
                .workspaceId(invite.getWorkspace() != null ? invite.getWorkspace().getId() : null)
                .workspaceName(invite.getWorkspace() != null ? invite.getWorkspace().getName() : null)
                .teamId(invite.getTeam() != null ? invite.getTeam().getId() : null)
                .teamName(invite.getTeam() != null ? invite.getTeam().getName() : null)
                .inviterUsername(invite.getInviter().getUsername())
                .role(invite.getRole())
                .maxUses(invite.getMaxUses())
                .currentUses(invite.getCurrentUses())
                .status(invite.getStatus())
                .expiresAt(invite.getExpiresAt())
                .createdAt(invite.getCreatedAt())
                .build();
    }
}
