package com.project.hiveSpace.services;

import com.project.hiveSpace.exceptions.AiServiceException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.List;

@Service
public class NvidiaAIService {

    private final RestClient restClient;

    @Value("${nvidia.api.key}")
    private String apiKey;

    public NvidiaAIService(@Value("${nvidia.api.url}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    public String chatCompletion(String systemPrompt, String userPrompt, String model) {
        try {
            AiRequest request = new AiRequest(
                    model,
                    List.of(
                            new AiMessage("system", systemPrompt),
                            new AiMessage("user", userPrompt)
                    ),
                    1000,
                    0.5
            );

            AiResponse response = restClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(AiResponse.class);

            if (response == null || response.choices() == null || response.choices().isEmpty()) {
                throw new AiServiceException("Invalid response format received from Nvidia NIM API.");
            }

            return response.choices().get(0).message().content();
        } catch (Exception e) {
            throw new AiServiceException("Failed to call Nvidia NIM API: " + e.getMessage(), e);
        }
    }

    // Request/Response representation (Records)
    public record AiMessage(String role, String content) {}

    public record AiRequest(
            String model,
            List<AiMessage> messages,
            int max_tokens,
            double temperature
    ) {}

    public record AiChoice(AiMessage message) {}

    public record AiResponse(List<AiChoice> choices) {}
}
