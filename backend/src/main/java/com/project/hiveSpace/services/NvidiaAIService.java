package com.project.hiveSpace.services;

import com.project.hiveSpace.exceptions.AiServiceException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import java.util.List;

@Service
public class NvidiaAIService {

    private final RestClient restClient;
    private final WebClient webClient;

    @Value("${nvidia.api.key}")
    private String apiKey;

    public NvidiaAIService(@Value("${nvidia.api.url}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    public String chatCompletion(String systemPrompt, String userPrompt, String model) {
        return chatCompletion(systemPrompt, userPrompt, model, 1000, 0.5);
    }

    public String chatCompletion(String systemPrompt, String userPrompt, String model, int maxTokens, double temperature) {
        try {
            AiRequest request = new AiRequest(
                    model,
                    List.of(
                            new AiMessage("system", systemPrompt),
                            new AiMessage("user", userPrompt)
                    ),
                    maxTokens,
                    temperature,
                    false
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

    public Flux<String> streamChatCompletion(String systemPrompt, String userPrompt, String model) {
        try {
            AiRequest request = new AiRequest(
                    model,
                    List.of(
                            new AiMessage("system", systemPrompt),
                            new AiMessage("user", userPrompt)
                    ),
                    1000,
                    0.5,
                    true
            );

            return webClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(request)
                    .accept(MediaType.TEXT_EVENT_STREAM)
                    .retrieve()
                    .bodyToFlux(String.class)
                    .filter(line -> !line.trim().isEmpty() && !line.contains("[DONE]"))
                    .map(line -> {
                        try {
                            String data = line;
                            if (data.startsWith("data:")) {
                                data = data.substring(5).trim();
                            }
                            com.fasterxml.jackson.databind.JsonNode node = 
                                new com.fasterxml.jackson.databind.ObjectMapper().readTree(data);
                            com.fasterxml.jackson.databind.JsonNode choices = node.get("choices");
                            if (choices != null && choices.isArray() && !choices.isEmpty()) {
                                com.fasterxml.jackson.databind.JsonNode delta = choices.get(0).get("delta");
                                if (delta != null && delta.has("content")) {
                                    return delta.get("content").asText();
                                }
                            }
                        } catch (Exception e) {
                            // ignore
                        }
                        return "";
                    })
                    .filter(text -> !text.isEmpty());
        } catch (Exception e) {
            return Flux.error(new AiServiceException("Failed to initiate Nvidia streaming: " + e.getMessage(), e));
        }
    }

    // Request/Response representation (Records)
    public record AiMessage(String role, String content) {}

    public record AiRequest(
            String model,
            List<AiMessage> messages,
            int max_tokens,
            double temperature,
            Boolean stream
    ) {}

    public record AiChoice(AiMessage message) {}

    public record AiResponse(List<AiChoice> choices) {}
}
