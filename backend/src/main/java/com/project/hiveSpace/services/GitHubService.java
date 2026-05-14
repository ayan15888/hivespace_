package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.GitHubUserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class GitHubService {

    @Value("${GITHUB_CLIENT_ID}")
    private String clientId;

    @Value("${GITHUB_CLIENT_SECRET}")
    private String clientSecret;

    private final WebClient.Builder webClientBuilder;

    public String getAccessToken(String code) {
        WebClient webClient = webClientBuilder.baseUrl("https://github.com").build();

        Map<String, Object> response = webClient.post()
                .uri("/login/oauth/access_token")
                .header("Accept", "application/json")
                .bodyValue(Map.of(
                        "client_id", clientId,
                        "client_secret", clientSecret,
                        "code", code
                ))
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (response == null || !response.containsKey("access_token")) {
            throw new RuntimeException("Failed to get access token from GitHub");
        }

        return (String) response.get("access_token");
    }

    public GitHubUserResponse getUserInfo(String accessToken) {
        WebClient webClient = webClientBuilder.baseUrl("https://api.github.com").build();

        return webClient.get()
                .uri("/user")
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .bodyToMono(GitHubUserResponse.class)
                .block();
    }
}
