package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.DuplicateCandidate;
import com.project.hiveSpace.models.Task;
import com.project.hiveSpace.repository.TaskEmbeddingRepository;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.concurrent.*;

@Service
public class AiDuplicateDetectorService {

    private final NvidiaAIService nvidiaAIService;
    private final TaskEmbeddingRepository taskEmbeddingRepository;
    private final ExecutorService executor = Executors.newFixedThreadPool(2);

    public AiDuplicateDetectorService(
            NvidiaAIService nvidiaAIService,
            TaskEmbeddingRepository taskEmbeddingRepository) {
        this.nvidiaAIService = nvidiaAIService;
        this.taskEmbeddingRepository = taskEmbeddingRepository;
    }

    /**
     * Update task embedding in the background.
     */
    public void updateTaskEmbeddingAsync(Task task) {
        if (task == null || task.getId() == null || task.getProject() == null) {
            return;
        }
        executor.submit(() -> {
            try {
                String textToEmbed = task.getTitle();
                if (task.getDescription() != null && !task.getDescription().isBlank()) {
                    textToEmbed += "\n" + task.getDescription();
                }

                float[] embedding = nvidiaAIService.getEmbedding(textToEmbed, "passage");
                String embStr = formatVector(embedding);

                taskEmbeddingRepository.insertOrUpdateEmbedding(
                        UUID.randomUUID(),
                        task.getId(),
                        task.getProject().getId(),
                        embStr
                );
            } catch (Exception e) {
                System.err.println("Failed to update embedding for task " + task.getId() + ": " + e.getMessage());
            }
        });
    }

    /**
     * Delete task embedding.
     */
    public void deleteTaskEmbedding(UUID taskId) {
        try {
            taskEmbeddingRepository.deleteByTaskId(taskId);
        } catch (Exception e) {
            System.err.println("Failed to delete embedding for task " + taskId + ": " + e.getMessage());
        }
    }

    /**
     * Detect duplicate tasks.
     */
    public List<DuplicateCandidate> detectDuplicates(UUID projectId, String title, String description) {
        if (title == null || title.isBlank()) {
            return List.of();
        }

        String textToEmbed = title;
        if (description != null && !description.isBlank()) {
            textToEmbed += "\n" + description;
        }

        try {
            float[] queryEmbedding = nvidiaAIService.getEmbedding(textToEmbed, "query");
            String queryEmbStr = formatVector(queryEmbedding);

            List<DuplicateCandidate> candidates = taskEmbeddingRepository.searchSimilarTasks(projectId, queryEmbStr, 5);

            // Filter by similarity. Since cosine distance is: 1 - cosine_similarity,
            // distance of 0 means identical, 1 means orthogonal, 2 means opposite.
            // A threshold of 0.35 distance is roughly 65% similarity.
            return candidates.stream()
                    .filter(c -> c.getDistance() != null && c.getDistance() < 0.35)
                    .toList();
        } catch (Exception e) {
            System.err.println("Failed duplicate detection: " + e.getMessage());
            return List.of();
        }
    }

    private String formatVector(float[] vector) {
        StringBuilder sb = new StringBuilder();
        sb.append("[");
        for (int i = 0; i < vector.length; i++) {
            sb.append(vector[i]);
            if (i < vector.length - 1) {
                sb.append(",");
            }
        }
        sb.append("]");
        return sb.toString();
    }
}
