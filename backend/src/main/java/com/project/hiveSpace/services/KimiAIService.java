package com.project.hiveSpace.services;

import com.project.hiveSpace.exceptions.AiServiceException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

/**
 * KimiAIService integrates with the Moonshot AI (Kimi) API using an
 * OpenAI-compatible chat completions endpoint.
 *
 * The service is primarily used for structured JSON extraction tasks
 * (e.g. parsing natural-language task descriptions into TaskRequest DTOs)
 * using Kimi's native json_object response format.
 */
@Service
public class KimiAIService {

    private final RestClient restClient;

    @Value("${kimi.api.key}")
    private String apiKey;

    @Value("${kimi.model.default}")
    private String modelName;

    public KimiAIService(@Value("${kimi.api.url}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    /**
     * Calls Kimi with JSON mode enabled.
     * The model is instructed to return a strict JSON object.
     *
     * @param systemPrompt The system-level context and schema instructions
     * @param userPrompt   The raw user input to parse
     * @return A raw JSON string containing the parsed task properties
     */
    public String getJsonCompletion(String systemPrompt, String userPrompt) {
        try {
            KimiRequest request = new KimiRequest(
                    modelName,
                    List.of(
                            new KimiMessage("system", systemPrompt),
                            new KimiMessage("user", userPrompt)
                    ),
                    2000,
                    0.1, // Low temperature is critical for reliable structured JSON output
                    new KimiResponseFormat("json_object") // Enable Kimi's native JSON mode
            );

            KimiResponse response = restClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(KimiResponse.class);

            if (response == null || response.choices() == null || response.choices().isEmpty()) {
                throw new AiServiceException("Invalid response format received from Kimi API.");
            }

            return response.choices().get(0).message().content();
        } catch (AiServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new AiServiceException("Failed to call Kimi API: " + e.getMessage(), e);
        }
    }

    // ── Internal DTOs ─────────────────────────────────────────────────────────

    public record KimiMessage(String role, String content) {}

    public record KimiResponseFormat(String type) {}

    public record KimiRequest(
            String model,
            List<KimiMessage> messages,
            int max_tokens,
            double temperature,
            KimiResponseFormat response_format
    ) {}

    public record KimiChoice(KimiMessage message) {}

    public record KimiResponse(List<KimiChoice> choices) {}
}
