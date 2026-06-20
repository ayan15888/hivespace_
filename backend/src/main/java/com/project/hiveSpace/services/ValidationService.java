package com.project.hiveSpace.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ValidationService {

    private final NvidiaAIService nvidiaAIService;

    @Value("${nvidia.model.validation}")
    private String validationModel;

    public ValidationService(NvidiaAIService nvidiaAIService) {
        this.nvidiaAIService = nvidiaAIService;
    }

    /**
     * Moderates text content using NVIDIA Nemotron Content Safety model.
     * Returns true if safe, false if flagged as unsafe.
     */
    public boolean isSafe(String text) {
        if (text == null || text.isBlank()) {
            return true;
        }

        try {
            String systemPrompt = "You are a content safety classifier. Your job is to classify if the following text is safe or unsafe (containing toxicity, hate speech, harassment, self-harm, or dangerous content). Respond with exactly one word: 'safe' or 'unsafe'.";
            String userPrompt = "[Text to classify]: " + text;

            String response = nvidiaAIService.chatCompletion(systemPrompt, userPrompt, validationModel, 10, 0.1).trim();

            return !response.toLowerCase().contains("unsafe");
        } catch (Exception e) {
            System.err.println("Content validation call failed, defaulting to safe: " + e.getMessage());
            // Fail open to avoid blocking valid queries due to validation API issues
            return true;
        }
    }
}
