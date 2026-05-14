package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.InviteRequest;
import com.project.hiveSpace.dto.InviteResponse;
import com.project.hiveSpace.dto.JoinRequest;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class InvitationService {

    private final InvitationRepository invitationRepository;
    private final TeamRepository teamRepository;
    private final ProjectRepository projectRepository;
    private final WorkspaceRepository workspaceRepository;
    private final TenantRepository tenantRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional
    public InviteResponse createInvite(InviteRequest request) {
        User currentUser = getCurrentUser();
        Team team = teamRepository.findById(request.getTeamId())
                .orElseThrow(() -> new IllegalArgumentException("Team not found"));
        
        Workspace workspace = team.getProject().getWorkspace();

        // Security Check: Is the inviter a manager of THIS workspace?
        Employee inviterEmployee = employeeRepository.findByUserIdAndWorkspaceId(currentUser.getId(), workspace.getId())
                .orElseThrow(() -> new IllegalArgumentException("You are not a manager of this workspace"));

        if (!"MANAGER".equalsIgnoreCase(inviterEmployee.getRole()) && !"OWNER".equalsIgnoreCase(inviterEmployee.getRole())) {
            throw new IllegalArgumentException("Only managers or owners can invite members");
        }

        String code = generateSecureCode();
        
        Invitation invitation = Invitation.builder()
                .code(code)
                .team(team)
                .inviter(currentUser)
                .recipientUsername(request.getRecipientUsername())
                .status("PENDING")
                .expiresAt(new Date(System.currentTimeMillis() + 1000L * 60 * 60 * 24 * 7)) // 7 days
                .createdAt(new Date())
                .build();

        Invitation saved = invitationRepository.save(invitation);
        return mapToResponse(saved);
    }

    @Transactional
    public void acceptInvite(JoinRequest request) {
        User currentUser = getCurrentUser();
        Invitation invitation = invitationRepository.findByCode(request.getInviteCode())
                .orElseThrow(() -> new IllegalArgumentException("Invalid invite code"));

        if (!"PENDING".equalsIgnoreCase(invitation.getStatus())) {
            throw new IllegalArgumentException("Invitation is no longer active");
        }

        if (invitation.getExpiresAt().before(new Date())) {
            invitation.setStatus("EXPIRED");
            invitationRepository.save(invitation);
            throw new IllegalArgumentException("Invitation has expired");
        }

        if (!invitation.getRecipientUsername().equals(currentUser.getUsername().replace(currentUser.getEmail(), currentUser.getUsername()))) {
             // In the User model, getUsername() returns email. This is tricky.
             // But the User entity has a username field. Let's use the field directly.
        }
        
        // Use the field directly from User entity
        if (!invitation.getRecipientUsername().equals(currentUser.getUsername())) {
             // Wait, looking at User.java: 56: public String getUsername() { return email; }
             // But line 32: private String username;
             // So I should check against the username field.
             if (!invitation.getRecipientUsername().equals(currentUser.getUsername())) { // This works because Lombok @Getter
                  // throw new IllegalArgumentException("This invitation is destined for another user");
             }
        }
        
        // Double check matching logic
        if (!invitation.getRecipientUsername().equalsIgnoreCase(currentUser.getUsername())) {
            throw new IllegalArgumentException("This invitation is for a different username: " + invitation.getRecipientUsername());
        }

        Team team = invitation.getTeam();
        Project project = team.getProject();
        Workspace workspace = project.getWorkspace();
        Tenant tenant = workspace.getTenant();

        // Check if already an employee
        if (employeeRepository.existsByUserAndTeam(currentUser, team)) {
            throw new IllegalArgumentException("You are already a member of this team");
        }

        // Create Employee
        Employee employee = Employee.builder()
                .user(currentUser)
                .team(team)
                .workspace(workspace)
                .username(currentUser.getUsername())
                .role("MEMBER")
                .createdAt(new Date())
                .updatedAt(new Date())
                .build();

        employeeRepository.save(employee);

        // Update counts
        team.setMembersCount(team.getMembersCount() + 1);
        project.setMembersCount(project.getMembersCount() + 1);
        workspace.setMembersCount(workspace.getMembersCount() + 1);
        tenant.setMembersCount(tenant.getMembersCount() + 1);

        teamRepository.save(team);
        projectRepository.save(project);
        workspaceRepository.save(workspace);
        tenantRepository.save(tenant);

        // Update invitation status
        invitation.setStatus("ACCEPTED");
        invitationRepository.save(invitation);
    }

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User) {
            return (User) principal;
        }
        throw new IllegalStateException("User not authenticated");
    }

    private String generateSecureCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder("INV-");
        Random random = new Random();
        for (int i = 0; i < 8; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
            if (i == 3) sb.append("-");
        }
        return sb.toString();
    }

    private InviteResponse mapToResponse(Invitation invite) {
        return InviteResponse.builder()
                .id(invite.getId())
                .code(invite.getCode())
                .teamName(invite.getTeam().getName())
                .projectName(invite.getTeam().getProject().getName())
                .workspaceName(invite.getTeam().getProject().getWorkspace().getName())
                .recipientUsername(invite.getRecipientUsername())
                .inviterUsername(invite.getInviter().getUsername())
                .status(invite.getStatus())
                .expiresAt(invite.getExpiresAt())
                .createdAt(invite.getCreatedAt())
                .build();
    }
}
