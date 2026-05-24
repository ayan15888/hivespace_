package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.*;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import com.project.hiveSpace.security.RbacService;
import com.project.hiveSpace.exceptions.ForbiddenException;
import com.project.hiveSpace.exceptions.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShareableLinkService {

    private final ShareableLinkRepository shareableLinkRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final RbacService rbacService;

    @Value("${APP_DOMAIN:hive-space.indevs.in}")
    private String appDomain;

    @Transactional
    public ShareableLinkResponse generateShareLink(UUID projectId, User actor) {
        rbacService.verifyResourceBelongsToTenant(projectId, ResourceType.PROJECT);
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project not found"));

        // Caller must have role VIEWER or higher in the project
        if (!rbacService.hasProjectRole(projectId, ProjectMemberRole.VIEWER) && 
            !rbacService.canAdminWorkspace(project.getWorkspace().getId())) {
            throw new ForbiddenException("Access denied: You do not have permission to share this project");
        }

        // If active link already exists, return it
        ShareableLink link = shareableLinkRepository.findByProjectIdAndIsActiveTrue(projectId)
                .orElse(null);

        if (link == null) {
            String token = UUID.randomUUID().toString().replace("-", "");
            link = ShareableLink.builder()
                    .token(token)
                    .scopeType("PROJECT")
                    .project(project)
                    .createdBy(actor)
                    .isActive(true)
                    .createdAt(new Date())
                    .build();
            link = shareableLinkRepository.save(link);
        }

        return mapToResponse(link);
    }

    @Transactional
    public SharedProjectResponse getPublicProjectData(String token) {
        ShareableLink link = shareableLinkRepository.findByToken(token)
                .orElseThrow(() -> new NotFoundException("Invalid or expired share link"));

        if (!link.getIsActive()) {
            throw new NotFoundException("This shareable link has been revoked");
        }

        if (link.getExpiresAt() != null && link.getExpiresAt().before(new Date())) {
            link.setIsActive(false);
            shareableLinkRepository.save(link);
            throw new NotFoundException("This shareable link has expired");
        }

        // Track access stats
        link.setAccessCount(link.getAccessCount() + 1);
        link.setLastAccessedAt(new Date());
        shareableLinkRepository.save(link);

        Project project = link.getProject();
        ProjectResponse projectResponse = ProjectResponse.builder()
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

        List<TaskResponse> tasks = taskRepository.findAllByProjectId(project.getId())
                .stream()
                .map(this::mapTaskToResponse)
                .collect(Collectors.toList());

        return SharedProjectResponse.builder()
                .project(projectResponse)
                .tasks(tasks)
                .build();
    }

    @Transactional
    public void revokeShareLink(UUID linkId, User actor) {
        ShareableLink link = shareableLinkRepository.findById(linkId)
                .orElseThrow(() -> new NotFoundException("Shareable link not found"));

        Project project = link.getProject();
        UUID workspaceId = project.getWorkspace().getId();

        // Must be project LEAD or workspace ADMIN to revoke
        boolean isLead = rbacService.hasProjectRole(project.getId(), ProjectMemberRole.LEAD);
        boolean isWorkspaceAdmin = rbacService.canAdminWorkspace(workspaceId);

        if (!isLead && !isWorkspaceAdmin) {
            throw new ForbiddenException("Access denied: Only project leads and workspace admins can revoke share links");
        }

        link.setIsActive(false);
        shareableLinkRepository.save(link);
    }

    private ShareableLinkResponse mapToResponse(ShareableLink link) {
        String url = "https://" + appDomain + "/share/" + link.getToken();
        return ShareableLinkResponse.builder()
                .id(link.getId())
                .token(link.getToken())
                .url(url)
                .projectId(link.getProject().getId())
                .scopeType(link.getScopeType())
                .isActive(link.getIsActive())
                .expiresAt(link.getExpiresAt())
                .createdAt(link.getCreatedAt())
                .build();
    }

    private TaskResponse mapTaskToResponse(Task task) {
        TaskResponse response = TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus())
                .priority(task.getPriority())
                .labels(task.getLabels())
                .dueDate(task.getDueDate())
                .points(task.getPoints())
                .projectId(task.getProject().getId())
                .projectName(task.getProject().getName())
                .projectColor(task.getProject().getColor())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();

        if (task.getTeam() != null) {
            response.setTeamId(task.getTeam().getId());
        }
        if (task.getParentTask() != null) {
            response.setParentId(task.getParentTask().getId());
        }

        // Dynamically compute the sequential task identifier
        int seq = taskRepository.countByProjectAndCreatedAtLessThanEqual(task.getProject(), task.getCreatedAt());
        response.setTaskIdentifier("HS-" + String.format("%03d", seq));

        if (task.getAssignee() != null) {
            User user = task.getAssignee();
            response.setAssigneeId(user.getId());
            response.setAssigneeName(user.getFullName());
            response.setAssigneeInitials(toInitials(user.getFullName()));
        }

        return response;
    }

    private String toInitials(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            return "";
        }
        String[] parts = fullName.trim().split("\\s+");
        StringBuilder initials = new StringBuilder();
        if (parts.length > 0 && !parts[0].isEmpty()) {
            initials.append(parts[0].charAt(0));
        }
        if (parts.length > 1 && !parts[1].isEmpty()) {
            initials.append(parts[1].charAt(0));
        }
        return initials.toString().toUpperCase();
    }
}
