package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.FusedCandidate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
@RequiredArgsConstructor
public class RerankerService {

    private final NvidiaAIService nvidiaAIService;

    /**
     * Reranks the fused candidates using Nvidia Rerank model, sorting them and returning top K.
     */
    public List<FusedCandidate> rerankCandidates(String query, List<FusedCandidate> candidates, int topK) {
        if (candidates == null || candidates.isEmpty()) {
            return List.of();
        }

        try {
            // 1. Extract passage texts
            List<String> passages = candidates.stream()
                    .map(FusedCandidate::getContent)
                    .toList();

            // 2. Call Nvidia Reranking API
            List<NvidiaAIService.RerankResult> rankings = nvidiaAIService.rerank(query, passages);

            // 3. Score the candidates (map them by index)
            List<FusedCandidate> rerankedList = new ArrayList<>();
            for (NvidiaAIService.RerankResult rankResult : rankings) {
                int originalIndex = rankResult.index();
                if (originalIndex >= 0 && originalIndex < candidates.size()) {
                    FusedCandidate candidate = candidates.get(originalIndex);
                    // Use the reranker logit score to update the candidate score
                    candidate.setRrfScore(rankResult.logit());
                    rerankedList.add(candidate);
                }
            }

            // 4. Sort descending by logit score
            rerankedList.sort((a, b) -> Double.compare(b.getRrfScore(), a.getRrfScore()));

            // 5. Trim to topK
            if (rerankedList.size() > topK) {
                return rerankedList.subList(0, topK);
            }
            return rerankedList;
        } catch (Exception e) {
            System.err.println("Reranking failed, falling back to original RRF ranks: " + e.getMessage());
            // Fallback: return the top candidates sorted by their RRF score
            List<FusedCandidate> fallbackList = new ArrayList<>(candidates);
            fallbackList.sort((a, b) -> Double.compare(b.getRrfScore(), a.getRrfScore()));
            if (fallbackList.size() > topK) {
                return fallbackList.subList(0, topK);
            }
            return fallbackList;
        }
    }
}
