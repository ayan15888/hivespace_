# HiveSpace RAG Architecture & Pipeline Specifications

This document outlines the end-to-end technical implementation of the Retrieval-Augmented Generation (RAG) system running in **HiveSpace**. The architecture utilizes **Spring Boot**, **PostgreSQL (with pgvector & Full-Text Search)**, **Upstash Redis**, and **Nvidia NIM APIs** to deliver fast, contextually grounded answers to developer and team workspace queries.

---

## 1. System Architecture Overview

The HiveSpace RAG pipeline consists of two main lifecycle components:
1. **Offline Ingestion & Syncing (Async)**: Triggered whenever document content is modified. Content is processed, chunked, embedded, and stored in PostgreSQL.
2. **Online Query & Generation (Sync)**: Triggered when a user asks a question in a RAG-enabled chat channel. Executes hybrid search, reranks candidates, constructs prompts with chat history, synthesizes answers via an LLM, and runs post-generation safety checks.

```
+-----------------------------------------------------------------------------------+
|                                 1. INGESTION                                      |
|                                                                                   |
|  Doc Edit -> [DocEmbeddingService] -> Debounce (Redis) -> Lock (Redis)             |
|                    |                                                              |
|                    v                                                              |
|        Text Chunks (450 words)                                                    |
|                    |                                                              |
|                    v (Nvidia API: Passage Embeddings)                             |
|          Nvidia Embedding Model                                                   |
|                    |                                                              |
|                    v                                                              |
|          PostgreSQL (document_chunks table, pgvector 4096 dims)                   |
+-----------------------------------------------------------------------------------+

+-----------------------------------------------------------------------------------+
|                            2. RETRIEVAL & GENERATION                              |
|                                                                                   |
|  User Query -> [HybridSearchService]                                              |
|                    |                                                              |
|                    +---> Sparse Leg: Keyword Search (Postgres FTS GIN index)      |
|                    |                                                              |
|                    +---> Dense Leg: Vector Search (pgvector Cosine Similarity)    |
|                    |                                                              |
|                    v                                                              |
|         Reciprocal Rank Fusion (RRF, k=60)                                        |
|                    |                                                              |
|                    v (Top candidates)                                             |
|         [RerankerService] -> Nvidia NIM Rerank API (Sorts by logit scores)        |
|                    |                                                              |
|                    v (Top K context chunks + Chat history)                        |
|         [RAGAnswerService] -> System Prompts -> LLM Chat Completion               |
|                    |                                                              |
|                    v                                                              |
|         [ValidationService] (isSafe check) -> Verified Answer to User             |
+-----------------------------------------------------------------------------------+
```

---

## 2. Ingestion & Synchronization Pipeline (Asynchronous)

When a document's content is updated, Spring Boot initiates the ingestion process asynchronously to avoid blocking the user session.

### Core Class: `DocumentEmbeddingService.java`
* **File Location**: [DocumentEmbeddingService.java](file:///d:/project/hiveSpace_final/backend/src/main/java/com/project/hiveSpace/services/DocumentEmbeddingService.java)
* **EntryPoint**: `triggerEmbeddingAsync(UUID documentId, String textContent, UUID projectId)`

### Step-by-Step Execution Flow:
1. **Debounce (Redis Service)**:
   * To prevent high database and API overhead from fast, consecutive keystrokes/saves, a 3-second debounce is implemented.
   * A timestamp parameter is pushed to Upstash Redis: key = `embed-pending:<documentId>`.
   * A scheduler waits for `3 seconds`. Upon execution, it reads the key from Redis; if the timestamp matches the initial request, it proceeds. Otherwise, a newer keystroke has preempted the operation, and the thread exits silently.
2. **Distributed Lock**:
   * To prevent parallel chunking operations on the same document across different workers, a distributed lock is acquired: key = `embed-lock:<documentId>`.
   * Executed via Redis `SET NX EX 30` (timeout of 30 seconds). If lock acquisition fails, the service aborts execution.
3. **Status Broadcasting (WebSockets)**:
   * Uses [MessagingBroadcastService.java](file:///d:/project/hiveSpace_final/backend/src/main/java/com/project/hiveSpace/services/MessagingBroadcastService.java) to broadcast status `"SYNCING"` to subscribers listening to the document room.
4. **Text Chunking**:
   * Chunks are generated using `chunkText(textContent, 450, 50)`.
   * The text is split by whitespaces (`\\s+`) into segments of roughly **450 words** with an overlap of **50 words** to preserve semantic continuity across chunk boundaries.
5. **Embedding Generation**:
   * For each chunk, the service calls `nvidiaAIService.getEmbedding(chunk, "passage")`.
   * Requests are sent to the configured Nvidia NIM embeddings endpoint using the model designated under the configuration `nvidia.model.embedding` (generates a `vector(4096)`).
6. **Database Persistence**:
   * A transactional process purges old chunks using `documentChunkRepository.deleteAllByDocumentId(documentId)`.
   * New chunks are inserted into the database. Embeddings are formatted into SQL-compliant arrays (`[val1,val2,...]`) and saved.
7. **Status Cleanup**:
   * The Redis distributed lock is released.
   * A final status of `"READY"` (or `"FAILED"` on error) is broadcasted via WebSockets to update client UI badges.

---

## 3. Retrieval & Hybrid Search

The search process runs in real time when a user queries the knowledge base. It uses a hybrid search strategy to combine the benefits of keyword matching and semantic search.

### Core Class: `HybridSearchService.java`
* **File Location**: [HybridSearchService.java](file:///d:/project/hiveSpace_final/backend/src/main/java/com/project/hiveSpace/services/HybridSearchService.java)
* **EntryPoint**: `performHybridSearch(UUID projectId, String query, int limit)`

### Step-by-Step Search Flow:
1. **Dense Vector Search**:
   * The query is converted into a vector embedding via `nvidiaAIService.getEmbedding(query, "query")` (note the `input_type="query"` configuration, which optimizes embedding representation for query matching).
   * Queries the database via `documentChunkRepository.searchVector(projectId, embeddingStr, limit)` using pgvector's cosine distance operator (`<=>`):
     ```sql
     SELECT id, document_id, project_id, chunk_index, content 
     FROM document_chunks 
     WHERE project_id = :projectId 
     ORDER BY embedding <=> cast(:embeddingStr AS vector) 
     LIMIT :limit
     ```
2. **Sparse Keyword Search**:
   * Executes full-text keyword searches using PostgreSQL FTS via `documentChunkRepository.searchKeyword(projectId, query, limit)`:
     ```sql
     SELECT id, document_id, project_id, chunk_index, content 
     FROM document_chunks 
     WHERE project_id = :projectId AND content_tsv @@ plainto_tsquery('english', :query) 
     LIMIT :limit
     ```
3. **Reciprocal Rank Fusion (RRF)**:
   * Combines both retrieval sources to prevent ranking bias. The score for each document chunk is calculated using:
     $$\text{Score} = \frac{1}{60 + \text{Rank}_{\text{vector}}} + \frac{1}{60 + \text{Rank}_{\text{keyword}}}$$
   * Results are compiled, sorted descending by their RRF score, and trimmed to the specified limit.

---

## 4. Re-ranking Phase

While RRF merges keyword and vector results, it is a heuristic ranking mechanism. To achieve precise, context-aware relevance ordering, HiveSpace applies a re-ranking model.

### Core Class: `RerankerService.java`
* **File Location**: [RerankerService.java](file:///d:/project/hiveSpace_final/backend/src/main/java/com/project/hiveSpace/services/RerankerService.java)
* **EntryPoint**: `rerankCandidates(String query, List<FusedCandidate> candidates, int topK)`

### Step-by-Step Re-ranking Flow:
1. **Extraction**: Extracts the text content (`getContent()`) from the fused candidates returned by the hybrid search.
2. **Nvidia Rerank Call**:
   * Calls `nvidiaAIService.rerank(query, passages)` utilizing the Nvidia Reranking NIM model configured under `nvidia.model.rerank`.
   * Sends the user query and the list of passages in a single API request.
3. **Score Mapping**:
   * Map returned rankings back to the original candidates by index.
   * Updates each candidate's score with its corresponding reranker logit score (`logit()`).
4. **Sort & Trim**:
   * Sorts the candidates descending based on their logit score.
   * Trims the candidates to the requested `topK` value.
   * *Fallback*: If the reranker API call fails, the service falls back gracefully to the original RRF rankings.

---

## 5. Synthesis & LLM Generation

The final generation phase builds the context, combines it with conversation history, and invokes the chat model to construct a response.

### Core Class: `RAGAnswerService.java`
* **File Location**: [RAGAnswerService.java](file:///d:/project/hiveSpace_final/backend/src/main/java/com/project/hiveSpace/services/RAGAnswerService.java)
* **EntryPoint**: `generateAnswer(String question, List<FusedCandidate> chunks, List<Message> channelMessages)`

### Step-by-Step Synthesis Flow:
1. **Document Context Assembly**:
   * Formats the retrieved and reranked chunks into a clean context structure, appending source details for inline citations:
     `[Source: <Document Title>, ID: <Doc ID>, chunk <Index>]\n <Chunk Content>`
2. **Conversation Context Assembly**:
   * Formats recent chat logs from the current channel to give the LLM conversation context:
     `<Sender Name>: <Message Content>`
3. **User Prompt Compilation**:
   * Concatenates the assembled Document Context, Conversation Context, and current Question.
4. **System Prompt Formulation**:
   * Directs the LLM to only answer based on the provided document/chat context.
   * Instructs the LLM to reconcile official documents with live discussion logs (e.g. if the user asks about an outage, report the historical incident details, latency spikes, and solutions mentioned in the chat).
   * Mandates backend layer attribution and inline source citation format (`[Source: <title>]`).
   * Sets strict instructions to return exactly: `"I don't have enough context to answer that."` if the information cannot be found.
5. **NIM Chat Completion Call**:
   * Calls `nvidiaAIService.chatCompletion(...)` with the designated chat model (`nvidia.model.default`). If the primary model fails, the system retries with a fallback default model.
6. **Safety Filtering**:
   * Passes the final output string to `ValidationService.isSafe(answer)`.
   * If flagged as unsafe, the answer is replaced with a safe pre-defined message to prevent data leaks or harmful output.

---

## 6. Database Schema & Configurations

### PostgreSQL Schema
The database stores chunks and vectors in the `document_chunks` table:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  content       TEXT NOT NULL,
  embedding     vector(4096),
  content_tsv   tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at    TIMESTAMP NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP NOT NULL DEFAULT now(),

  UNIQUE (document_id, chunk_index)
);

-- FTS index for sparse retrieval
CREATE INDEX idx_document_chunks_content_tsv ON document_chunks USING GIN (content_tsv);

-- Partition-friendly scanning indexes
CREATE INDEX idx_document_chunks_project ON document_chunks (project_id);
CREATE INDEX idx_document_chunks_document ON document_chunks (document_id);
```

> [!NOTE]
> There are no vector indexes (like HNSW/IVFFlat) on the `embedding` column. The embedding size ($4096$ dimensions) exceeds standard `pgvector` index dimension caps ($2000$). Cosine similarity calculations execute via sequential scan, which is efficient for typical per-project chunk sizes.

### Spring Properties Configuration
RAG models and endpoints are configured via standard application properties:
```properties
nvidia.api.url=https://integrate.api.nvidia.com/v1
nvidia.api.key=nvapi-xxxxxxxxxxxxxxx
nvidia.model.default=meta/llama-3.1-8b-instruct
nvidia.model.embedding=nvidia/nv-embedcode-7b-v1
nvidia.url.rerank=/retrieval/nvidia/reranking
nvidia.model.rerank=nvidia/nv-embedcode-7b-v1
```
