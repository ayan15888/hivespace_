package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.*;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class GithubIntegrationService {

    private final GithubConnectionRepository githubConnectionRepository;
    private final GithubRepoLinkRepository githubRepoLinkRepository;
    private final TenantRepository tenantRepository;
    private final ProjectRepository projectRepository;
    private final GitHubService gitHubService;
    private final WebClient.Builder webClientBuilder;

    @Value("${APP_DOMAIN:hive-space.indevs.in}")
    private String appDomain;

    public GithubConnectionResponse connectOrg(UUID tenantId, User user, String code, String orgName) {
        // Exchange code for token
        String accessToken = gitHubService.getAccessToken(code);

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NoSuchElementException("Tenant not found"));

        // Check if connection already exists
        Optional<GithubConnection> existingOpt = githubConnectionRepository.findByTenantIdAndGithubOrgName(tenantId, orgName);
        
        GithubConnection connection;
        if (existingOpt.isPresent()) {
            connection = existingOpt.get();
            connection.setAccessToken(accessToken);
            connection.setConnectedBy(user);
            connection.setConnectedAt(new Date());
        } else {
            String webhookSecret = UUID.randomUUID().toString().replace("-", "");
            connection = GithubConnection.builder()
                    .tenant(tenant)
                    .githubOrgName(orgName)
                    .accessToken(accessToken)
                    .webhookSecret(webhookSecret)
                    .connectedBy(user)
                    .connectedAt(new Date())
                    .build();
        }

        GithubConnection saved = githubConnectionRepository.save(connection);
        return mapToResponse(saved);
    }

    public List<GithubConnectionResponse> getConnectedOrgs(UUID tenantId) {
        return githubConnectionRepository.findByTenantId(tenantId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void disconnectOrg(UUID tenantId, UUID connectionId) {
        GithubConnection connection = githubConnectionRepository.findByTenantIdAndId(tenantId, connectionId)
                .orElseThrow(() -> new NoSuchElementException("GitHub Connection not found for this tenant"));
        
        githubConnectionRepository.delete(connection);
    }

    public GithubRepoLinkResponse linkRepository(UUID projectId, User user, String repoFullName) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NoSuchElementException("Project not found"));

        UUID tenantId = project.getWorkspace().getTenant().getId();

        // Extract organization/owner name from repository full name (e.g. "owner/repo")
        String[] parts = repoFullName.split("/");
        if (parts.length != 2) {
            throw new IllegalArgumentException("Invalid repository format. Expected 'owner/repo'");
        }
        String orgName = parts[0];

        // Find connection for this organization
        GithubConnection connection = githubConnectionRepository.findByTenantIdAndGithubOrgName(tenantId, orgName)
                .orElseThrow(() -> new IllegalArgumentException("GitHub Organization '" + orgName + "' is not connected to this organization. Please connect it first."));

        if (githubRepoLinkRepository.existsByProjectIdAndGithubRepoFullName(projectId, repoFullName)) {
            throw new IllegalStateException("Repository is already linked to this project");
        }

        // Setup Repository Webhook on GitHub
        try {
            registerWebhookOnGitHub(repoFullName, connection.getAccessToken(), connection.getWebhookSecret());
        } catch (Exception e) {
            log.warn("Failed to register webhook on GitHub for repository: {}. Proceeding with link anyway. Error: {}", repoFullName, e.getMessage());
        }

        GithubRepoLink repoLink = GithubRepoLink.builder()
                .project(project)
                .githubRepoFullName(repoFullName)
                .linkedBy(user)
                .linkedAt(new Date())
                .build();

        GithubRepoLink saved = githubRepoLinkRepository.save(repoLink);
        return mapToResponse(saved);
    }

    public List<GithubRepoLinkResponse> getLinkedRepos(UUID projectId) {
        return githubRepoLinkRepository.findByProjectId(projectId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void unlinkRepository(UUID projectId, UUID linkId) {
        GithubRepoLink repoLink = githubRepoLinkRepository.findByProjectIdAndId(projectId, linkId)
                .orElseThrow(() -> new NoSuchElementException("Repository link not found for this project"));

        githubRepoLinkRepository.delete(repoLink);
    }

    private void registerWebhookOnGitHub(String repoFullName, String token, String secret) {
        String webhookUrl = "https://" + appDomain + "/api/github/webhooks";
        
        WebClient client = webClientBuilder.baseUrl("https://api.github.com").build();
        
        Map<String, Object> config = Map.of(
                "url", webhookUrl,
                "content_type", "json",
                "secret", secret,
                "insecure_ssl", "0"
        );
        
        Map<String, Object> body = Map.of(
                "name", "web",
                "active", true,
                "events", List.of("push", "pull_request", "issues", "issue_comment"),
                "config", config
        );

        client.post()
                .uri("/repos/" + repoFullName + "/hooks")
                .header("Authorization", "Bearer " + token)
                .header("Accept", "application/vnd.github+json")
                .header("X-GitHub-Api-Version", "2022-11-28")
                .bodyValue(body)
                .retrieve()
                .onStatus(status -> status.isError(), response -> 
                    response.bodyToMono(String.class)
                            .flatMap(errorBody -> Mono.error(new RuntimeException("GitHub API error: " + errorBody)))
                )
                .toBodilessEntity()
                .block();
    }

    private GithubConnectionResponse mapToResponse(GithubConnection c) {
        return GithubConnectionResponse.builder()
                .id(c.getId())
                .tenantId(c.getTenant().getId())
                .githubOrgName(c.getGithubOrgName())
                .connectedByUsername(c.getConnectedBy() != null ? c.getConnectedBy().getActualUsername() : null)
                .connectedAt(c.getConnectedAt())
                .build();
    }

    private GithubRepoLinkResponse mapToResponse(GithubRepoLink r) {
        return GithubRepoLinkResponse.builder()
                .id(r.getId())
                .projectId(r.getProject().getId())
                .githubRepoFullName(r.getGithubRepoFullName())
                .linkedByUsername(r.getLinkedBy() != null ? r.getLinkedBy().getActualUsername() : null)
                .linkedAt(r.getLinkedAt())
                .build();
    }

    public List<Map<String, Object>> getRepositoryPRs(UUID tenantId, String repoFullName) {
        String orgName = repoFullName.split("/")[0];
        GithubConnection connection = githubConnectionRepository.findByTenantIdAndGithubOrgName(tenantId, orgName)
                .orElseThrow(() -> new IllegalArgumentException("No GitHub connection found for organization " + orgName));

        WebClient client = webClientBuilder.baseUrl("https://api.github.com").build();
        try {
            return client.get()
                    .uri("/repos/" + repoFullName + "/pulls?state=all&per_page=10")
                    .header("Authorization", "Bearer " + connection.getAccessToken())
                    .header("Accept", "application/vnd.github+json")
                    .header("X-GitHub-Api-Version", "2022-11-28")
                    .retrieve()
                    .bodyToMono(new org.springframework.core.ParameterizedTypeReference<List<Map<String, Object>>>() {})
                    .block();
        } catch (Exception e) {
            log.error("Failed to fetch PRs from GitHub for repo: {}", repoFullName, e);
            return Collections.emptyList();
        }
    }

    public List<Map<String, Object>> getRepositoryCommits(UUID tenantId, String repoFullName) {
        String orgName = repoFullName.split("/")[0];
        GithubConnection connection = githubConnectionRepository.findByTenantIdAndGithubOrgName(tenantId, orgName)
                .orElseThrow(() -> new IllegalArgumentException("No GitHub connection found for organization " + orgName));

        WebClient client = webClientBuilder.baseUrl("https://api.github.com").build();
        try {
            return client.get()
                    .uri("/repos/" + repoFullName + "/commits?per_page=10")
                    .header("Authorization", "Bearer " + connection.getAccessToken())
                    .header("Accept", "application/vnd.github+json")
                    .header("X-GitHub-Api-Version", "2022-11-28")
                    .retrieve()
                    .bodyToMono(new org.springframework.core.ParameterizedTypeReference<List<Map<String, Object>>>() {})
                    .block();
        } catch (Exception e) {
            log.error("Failed to fetch commits from GitHub for repo: {}", repoFullName, e);
            return Collections.emptyList();
        }
    }

    public List<Map<String, Object>> getRepositoryIssues(UUID tenantId, String repoFullName) {
        String orgName = repoFullName.split("/")[0];
        GithubConnection connection = githubConnectionRepository.findByTenantIdAndGithubOrgName(tenantId, orgName)
                .orElseThrow(() -> new IllegalArgumentException("No GitHub connection found for organization " + orgName));

        WebClient client = webClientBuilder.baseUrl("https://api.github.com").build();
        try {
            return client.get()
                    .uri("/repos/" + repoFullName + "/issues?state=all&per_page=10")
                    .header("Authorization", "Bearer " + connection.getAccessToken())
                    .header("Accept", "application/vnd.github+json")
                    .header("X-GitHub-Api-Version", "2022-11-28")
                    .retrieve()
                    .bodyToMono(new org.springframework.core.ParameterizedTypeReference<List<Map<String, Object>>>() {})
                    .block();
        } catch (Exception e) {
            log.error("Failed to fetch issues from GitHub for repo: {}", repoFullName, e);
            return Collections.emptyList();
        }
    }
}
