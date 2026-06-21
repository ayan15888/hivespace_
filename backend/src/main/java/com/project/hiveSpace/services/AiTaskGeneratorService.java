package com.project.hiveSpace.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.hiveSpace.exceptions.NotFoundException;
import com.project.hiveSpace.models.Project;
import com.project.hiveSpace.repository.ProjectRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AiTaskGeneratorService {

    private final ProjectRepository projectRepository;
    private final NvidiaAIService nvidiaAIService;

    @Value("${nvidia.model.default}")
    private String defaultChatModel;

    @Data
    public static class GeneratedTaskSuggestion {
        private String title;
        private String description;
        private String priority;
        private Integer points;
    }

    @Transactional(readOnly = true)
    public List<GeneratedTaskSuggestion> generateTasksFromBrief(UUID projectId, String brief) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project not found"));

        if (brief == null || brief.trim().isEmpty()) {
            return Collections.emptyList();
        }

        String systemPrompt = "You are an AI sprint planning assistant for hiveSpace. Your job is to analyze a raw product brief, specifications, or meeting notes, and decompose them into a structured list of discrete, actionable, individual tasks.\n\n" +
                "GUIDELINES:\n" +
                "1. Each task must have a clear, concise title.\n" +
                "2. The description must list specific technical requirements or checklists for that task derived from the brief.\n" +
                "3. Set task priority as one of: URGENT, HIGH, MEDIUM, LOW.\n" +
                "4. Estimate story points (complexity points) between 1 and 8 (default: 1).\n" +
                "5. Do NOT include Markdown block fences (e.g. ```json). Your response must be ONLY a valid raw JSON array containing task objects.\n\n" +
                "JSON FORMAT SPECIFICATION:\n" +
                "[\n" +
                "  {\n" +
                "    \"title\": \"Short, clear title\",\n" +
                "    \"description\": \"Actionable checklist or requirements description\",\n" +
                "    \"priority\": \"HIGH/MEDIUM/LOW/URGENT\",\n" +
                "    \"points\": 3\n" +
                "  }\n" +
                "]";

        try {
            String response = nvidiaAIService.chatCompletion(systemPrompt, brief, defaultChatModel, 3000, 0.2);
            response = response.trim();
            
            // Clean markdown code blocks if AI wrapped them
            if (response.startsWith("```")) {
                int firstNewline = response.indexOf('\n');
                if (firstNewline != -1) {
                    response = response.substring(firstNewline).trim();
                }
                if (response.endsWith("```")) {
                    response = response.substring(0, response.length() - 3).trim();
                }
            }

            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(response, new TypeReference<List<GeneratedTaskSuggestion>>() {});

        } catch (Exception e) {
            e.printStackTrace();
            return Collections.emptyList();
        }
    }
}
