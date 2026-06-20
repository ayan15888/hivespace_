package com.project.hiveSpace.services;

import com.project.hiveSpace.repository.DocumentChunkRepository;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.concurrent.*;

@Service
public class DocumentEmbeddingService {

    private final NvidiaAIService nvidiaAIService;
    private final RedisService redisService;
    private final DocumentChunkRepository documentChunkRepository;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);

    public DocumentEmbeddingService(
            NvidiaAIService nvidiaAIService,
            RedisService redisService,
            DocumentChunkRepository documentChunkRepository) {
        this.nvidiaAIService = nvidiaAIService;
        this.redisService = redisService;
        this.documentChunkRepository = documentChunkRepository;
    }

    /**
     * Debounces and triggers document chunking and embedding asynchronously.
     */
    public void triggerEmbeddingAsync(UUID documentId, String textContent, UUID projectId) {
        if (textContent == null || textContent.isBlank()) {
            return;
        }

        // 1. Generate unique request timestamp
        long timestamp = System.currentTimeMillis();
        String tsStr = String.valueOf(timestamp);

        // 2. Set this timestamp in Upstash Redis as the latest request
        String pendingKey = "embed-pending:" + documentId;
        redisService.setValue(pendingKey, tsStr);

        // 3. Schedule the check after 3 seconds (debounce period)
        scheduler.schedule(() -> {
            try {
                // Read the latest pending timestamp from Redis
                String currentTs = redisService.getValue(pendingKey);
                if (tsStr.equals(currentTs)) {
                    // This is the latest request! Proceed with embedding
                    processEmbedding(documentId, textContent, projectId);
                }
            } catch (Exception e) {
                System.err.println("Error in debounced embedding task for document " + documentId + ": " + e.getMessage());
            }
        }, 3, TimeUnit.SECONDS);
    }

    private void processEmbedding(UUID documentId, String textContent, UUID projectId) {
        String lockKey = "embed-lock:" + documentId;
        String workerId = UUID.randomUUID().toString();

        // Acquire a 30-second lock via SET NX EX 30
        boolean acquired = redisService.acquireLock(lockKey, workerId, 30);
        if (!acquired) {
            System.out.println("Could not acquire embedding lock for document: " + documentId);
            return;
        }

        try {
            // Chunk the text content
            List<String> chunks = chunkText(textContent, 450, 50);
            if (chunks.isEmpty()) {
                documentChunkRepository.deleteAllByDocumentId(documentId);
                return;
            }

            // Generate embeddings
            List<float[]> embeddings = new ArrayList<>();
            for (String chunk : chunks) {
                float[] embedding = nvidiaAIService.getEmbedding(chunk, "passage");
                embeddings.add(embedding);
            }

            // Save to DB (delete old and insert new chunks)
            documentChunkRepository.deleteAllByDocumentId(documentId);

            for (int i = 0; i < chunks.size(); i++) {
                UUID chunkId = UUID.randomUUID();
                String content = chunks.get(i);
                float[] emb = embeddings.get(i);
                String embStr = formatVector(emb);

                documentChunkRepository.insertChunkWithEmbedding(
                        chunkId,
                        documentId,
                        projectId,
                        i,
                        content,
                        embStr
                );
            }
            System.out.println("Successfully re-chunked and embedded document: " + documentId + " into " + chunks.size() + " chunks.");
        } catch (Exception e) {
            System.err.println("Failed processing embeddings for document " + documentId + ": " + e.getMessage());
        } finally {
            // Release lock
            redisService.releaseLock(lockKey);
        }
    }

    /**
     * Splits text into chunks of roughly target size with defined overlap using word count.
     */
    public List<String> chunkText(String text, int chunkSize, int overlap) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        String[] words = text.split("\\s+");
        List<String> chunks = new ArrayList<>();
        int i = 0;
        while (i < words.length) {
            int end = Math.min(i + chunkSize, words.length);
            String[] slice = Arrays.copyOfRange(words, i, end);
            chunks.add(String.join(" ", slice));
            if (end == words.length) {
                break;
            }
            i += (chunkSize - overlap);
        }
        return chunks;
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
