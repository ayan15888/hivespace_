package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.*;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.services.GithubIntegrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/github")
@RequiredArgsConstructor
public class GithubIntegrationController {

    private final GithubIntegrationService githubIntegrationService;

    @PostMapping("/connections")
    @PreAuthorize("@rbac.canManageInvite(#request.tenantId)")
    public ResponseEntity<GithubConnectionResponse> connectOrg(
            @Valid @RequestBody GithubConnectionRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(githubIntegrationService.connectOrg(
                request.getTenantId(),
                user,
                request.getCode(),
                request.getGithubOrgName()
        ));
    }

    @GetMapping("/connections")
    @PreAuthorize("@rbac.canManageInvite(#tenantId)")
    public ResponseEntity<List<GithubConnectionResponse>> getConnectedOrgs(
            @RequestParam UUID tenantId) {
        return ResponseEntity.ok(githubIntegrationService.getConnectedOrgs(tenantId));
    }

    @DeleteMapping("/connections/{connectionId}")
    @PreAuthorize("@rbac.canManageInvite(#tenantId)")
    public ResponseEntity<Void> disconnectOrg(
            @PathVariable UUID connectionId,
            @RequestParam UUID tenantId) {
        githubIntegrationService.disconnectOrg(tenantId, connectionId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/repo-links")
    @PreAuthorize("@rbac.canEditProject(#request.projectId)")
    public ResponseEntity<GithubRepoLinkResponse> linkRepository(
            @Valid @RequestBody GithubRepoLinkRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(githubIntegrationService.linkRepository(
                request.getProjectId(),
                user,
                request.getGithubRepoFullName()
        ));
    }

    @GetMapping("/repo-links")
    @PreAuthorize("@rbac.canViewProject(#projectId)")
    public ResponseEntity<List<GithubRepoLinkResponse>> getLinkedRepos(
            @RequestParam UUID projectId) {
        return ResponseEntity.ok(githubIntegrationService.getLinkedRepos(projectId));
    }

    @DeleteMapping("/repo-links/{linkId}")
    @PreAuthorize("@rbac.canEditProject(#projectId)")
    public ResponseEntity<Void> unlinkRepository(
            @PathVariable UUID linkId,
            @RequestParam UUID projectId) {
        githubIntegrationService.unlinkRepository(projectId, linkId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/proxy/prs")
    @PreAuthorize("@rbac.canViewProject(#projectId)")
    public ResponseEntity<List<java.util.Map<String, Object>>> getRepositoryPRs(
            @RequestParam UUID projectId,
            @RequestParam String repoFullName,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(githubIntegrationService.getRepositoryPRs(
                user.getTenant().getId(),
                repoFullName
        ));
    }

    @GetMapping("/proxy/commits")
    @PreAuthorize("@rbac.canViewProject(#projectId)")
    public ResponseEntity<List<java.util.Map<String, Object>>> getRepositoryCommits(
            @RequestParam UUID projectId,
            @RequestParam String repoFullName,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(githubIntegrationService.getRepositoryCommits(
                user.getTenant().getId(),
                repoFullName
        ));
    }

    @GetMapping("/proxy/issues")
    @PreAuthorize("@rbac.canViewProject(#projectId)")
    public ResponseEntity<List<java.util.Map<String, Object>>> getRepositoryIssues(
            @RequestParam UUID projectId,
            @RequestParam String repoFullName,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(githubIntegrationService.getRepositoryIssues(
                user.getTenant().getId(),
                repoFullName
        ));
    }
}
