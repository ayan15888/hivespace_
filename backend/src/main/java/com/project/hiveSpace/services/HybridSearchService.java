package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.FusedCandidate;
import com.project.hiveSpace.dto.SearchCandidate;
import com.project.hiveSpace.repository.DocumentChunkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
@RequiredArgsConstructor
public class HybridSearchService {

    private final NvidiaAIService nvidiaAIService;
    private final DocumentChunkRepository documentChunkRepository;

    /**
     * Executes hybrid search using Vector + Keyword FTS and merges results via Reciprocal Rank Fusion (RRF).
     */
    public List<FusedCandidate> performHybridSearch(UUID projectId, String query, int limit) {
        if (query == null || query.isBlank()) {
            return List.of();
        }

        // 1. Vector Search leg (query embedding input type = "query")
        float[] queryEmbedding = nvidiaAIService.getEmbedding(query, "query");
        String embeddingStr = formatVector(queryEmbedding);
        List<SearchCandidate> vectorResults = documentChunkRepository.searchVector(projectId, embeddingStr, limit);

        // 2. Keyword Search leg
        List<SearchCandidate> keywordResults = documentChunkRepository.searchKeyword(projectId, query, limit);

        // 3. Fused merging using RRF
        Map<UUID, FusedCandidate> fusedMap = new LinkedHashMap<>();
        int k = 60;

        // Score vector results
        for (int rank = 0; rank < vectorResults.size(); rank++) {
            SearchCandidate candidate = vectorResults.get(rank);
            double score = 1.0 / (k + (rank + 1));
            fusedMap.put(candidate.getId(), new FusedCandidate(
                    candidate.getId(),
                    candidate.getDocumentId(),
                    candidate.getProjectId(),
                    candidate.getChunkIndex(),
                    candidate.getContent(),
                    candidate.getDocumentTitle(),
                    score
            ));
        }

        // Score keyword results and fuse
        for (int rank = 0; rank < keywordResults.size(); rank++) {
            SearchCandidate candidate = keywordResults.get(rank);
            double score = 1.0 / (k + (rank + 1));
            if (fusedMap.containsKey(candidate.getId())) {
                FusedCandidate existing = fusedMap.get(candidate.getId());
                existing.setRrfScore(existing.getRrfScore() + score);
            } else {
                fusedMap.put(candidate.getId(), new FusedCandidate(
                        candidate.getId(),
                        candidate.getDocumentId(),
                        candidate.getProjectId(),
                        candidate.getChunkIndex(),
                        candidate.getContent(),
                        candidate.getDocumentTitle(),
                        score
                ));
            }
        }

        // Convert, sort and return top results
        List<FusedCandidate> result = new ArrayList<>(fusedMap.values());
        result.sort((a, b) -> Double.compare(b.getRrfScore(), a.getRrfScore()));

        if (result.size() > limit) {
            return result.subList(0, limit);
        }
        return result;
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
