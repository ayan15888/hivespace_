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

    // Temporary store for pending OAuth tokens between init and save steps
    private final java.util.concurrent.ConcurrentHashMap<String, String> pendingTokens = new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * Step 1 of new connect flow: exchange OAuth code for a token, fetch the user's
     * personal account and orgs from GitHub, and return a selection list.
     * The token is cached temporarily under a UUID ref.
     */
    public GithubInitConnectionResponse initConnection(UUID tenantId, String code) {
        String accessToken = gitHubService.getAccessToken(code);

        String tokenRef = UUID.randomUUID().toString();
        pendingTokens.put(tokenRef, accessToken);

        WebClient client = webClientBuilder.baseUrl("https://api.github.com").build();

        // Fetch personal account info
        Map<String, Object> userInfo;
        try {
            userInfo = client.get()
                    .uri("/user")
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .bodyToMono(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
        } catch (Exception e) {
            pendingTokens.remove(tokenRef);
            throw new RuntimeException("Failed to fetch GitHub user info: " + e.getMessage(), e);
        }

        String personalLogin = userInfo != null ? (String) userInfo.get("login") : null;
        String personalAvatarUrl = userInfo != null ? (String) userInfo.get("avatar_url") : null;

        // Fetch list of orgs the authenticated user belongs to
        List<Map<String, Object>> orgsRaw;
        try {
            orgsRaw = client.get()
                    .uri("/user/orgs")
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .bodyToMono(new org.springframework.core.ParameterizedTypeReference<List<Map<String, Object>>>() {})
                    .block();
        } catch (Exception e) {
            log.warn("Failed to fetch GitHub user orgs: {}", e.getMessage());
            orgsRaw = Collections.emptyList();
        }

        List<GithubInitConnectionResponse.GithubOrgInfo> orgs = (orgsRaw == null ? Collections.<Map<String, Object>>emptyList() : orgsRaw)
                .stream()
                .map(org -> GithubInitConnectionResponse.GithubOrgInfo.builder()
                        .login((String) org.get("login"))
                        .avatarUrl((String) org.get("avatar_url"))
                        .description((String) org.get("description"))
                        .build())
                .collect(Collectors.toList());

        return GithubInitConnectionResponse.builder()
                .tokenRef(tokenRef)
                .personalLogin(personalLogin)
                .personalAvatarUrl(personalAvatarUrl)
                .orgs(orgs)
                .build();
    }

    /**
     * Step 2 of new connect flow: the user has selected which account/org to connect.
     * Retrieve the cached token, save the connection, and clean up.
     */
    public GithubConnectionResponse saveConnection(UUID tenantId, User user, String githubOrgName, String tokenRef) {
        String accessToken = pendingTokens.remove(tokenRef);
        if (accessToken == null) {
            throw new IllegalStateException("Token reference expired or not found. Please restart the connection flow.");
        }

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NoSuchElementException("Tenant not found"));

        Optional<GithubConnection> existingOpt = githubConnectionRepository.findByTenantIdAndGithubOrgName(tenantId, githubOrgName);
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
                    .githubOrgName(githubOrgName)
                    .accessToken(accessToken)
                    .webhookSecret(webhookSecret)
                    .connectedBy(user)
                    .connectedAt(new Date())
                    .build();
        }

        GithubConnection saved = githubConnectionRepository.save(connection);
        return mapToResponse(saved);
    }

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

        // Validate format
        String[] parts = repoFullName.split("/");
        if (parts.length != 2) {
            throw new IllegalArgumentException("Invalid repository format. Expected 'owner/repo'");
        }
        String orgName = parts[0];

        if (githubRepoLinkRepository.existsByProjectIdAndGithubRepoFullName(projectId, repoFullName)) {
            throw new IllegalStateException("Repository is already linked to this project");
        }

        // Try to find a matching org connection for webhook registration.
        // If not found by exact name, fall back to any available connection for this tenant.
        Optional<GithubConnection> connectionOpt = githubConnectionRepository.findByTenantIdAndGithubOrgName(tenantId, orgName);
        if (!connectionOpt.isPresent()) {
            connectionOpt = githubConnectionRepository.findByTenantId(tenantId).stream().findFirst();
        }

        // Setup Repository Webhook on GitHub (best-effort — never blocks linking)
        if (connectionOpt.isPresent()) {
            try {
                registerWebhookOnGitHub(repoFullName, connectionOpt.get().getAccessToken(), connectionOpt.get().getWebhookSecret());
            } catch (Exception e) {
                log.warn("Failed to register webhook on GitHub for repository: {}. Proceeding with link anyway. Error: {}", repoFullName, e.getMessage());
            }
        } else {
            log.warn("No GitHub connection found for tenant {} — skipping webhook registration for repo {}", tenantId, repoFullName);
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

    public GithubRepoLinkResponse createAndLinkRepository(UUID projectId, User user, String orgName, String repoName, boolean isPrivate) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NoSuchElementException("Project not found"));

        UUID tenantId = project.getWorkspace().getTenant().getId();

        // Try exact org-name match first, fall back to any connection for the tenant
        Optional<GithubConnection> connectionOpt = githubConnectionRepository.findByTenantIdAndGithubOrgName(tenantId, orgName);
        if (!connectionOpt.isPresent()) {
            connectionOpt = githubConnectionRepository.findByTenantId(tenantId).stream().findFirst();
        }
        GithubConnection connection = connectionOpt
                .orElseThrow(() -> new IllegalStateException("No GitHub account is connected to this organization. Please connect one first."));

        WebClient client = webClientBuilder.baseUrl("https://api.github.com").build();
        
        Map<String, Object> body = Map.of(
                "name", repoName,
                "private", isPrivate,
                "auto_init", true
        );

        Map<String, Object> response;
        try {
            response = client.post()
                    .uri("/orgs/" + orgName + "/repos")
                    .header("Authorization", "Bearer " + connection.getAccessToken())
                    .header("Accept", "application/vnd.github+json")
                    .header("X-GitHub-Api-Version", "2022-11-28")
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(status -> status.isError(), resp ->
                        resp.bodyToMono(String.class).flatMap(errBody -> {
                            log.warn("GitHub org repo creation failed ({}): {}", resp.statusCode(), errBody);
                            return reactor.core.publisher.Mono.error(new RuntimeException(errBody));
                        })
                    )
                    .bodyToMono(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
        } catch (Exception e) {
            log.warn("Failed to create repo under org {}, trying as user repo. Reason: {}", orgName, e.getMessage());
            try {
                response = client.post()
                        .uri("/user/repos")
                        .header("Authorization", "Bearer " + connection.getAccessToken())
                        .header("Accept", "application/vnd.github+json")
                        .header("X-GitHub-Api-Version", "2022-11-28")
                        .bodyValue(body)
                        .retrieve()
                        .onStatus(status -> status.isError(), resp ->
                            resp.bodyToMono(String.class).flatMap(errBody -> {
                                log.warn("GitHub user repo creation also failed ({}): {}", resp.statusCode(), errBody);
                                // Try to extract message from JSON body
                                String msg = errBody;
                                try {
                                    com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
                                    Map<String, Object> parsed = om.readValue(errBody, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
                                    if (parsed.containsKey("message")) msg = (String) parsed.get("message");
                                } catch (Exception ignored) {}
                                return reactor.core.publisher.Mono.error(new RuntimeException(msg));
                            })
                        )
                        .bodyToMono(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {})
                        .block();
            } catch (Exception ex) {
                String errorMsg = ex.getMessage();
                // Try to parse JSON error from GitHub
                if (errorMsg != null && errorMsg.contains("message")) {
                    try {
                        com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
                        Map<String, Object> parsed = om.readValue(errorMsg, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
                        if (parsed.containsKey("message")) errorMsg = (String) parsed.get("message");
                    } catch (Exception ignored) {}
                }
                throw new RuntimeException("GitHub error: " + errorMsg, ex);
            }
        }

        String repoFullName = (String) response.get("full_name");
        return linkRepository(projectId, user, repoFullName);
    }
}
