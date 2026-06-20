# Hivespace — RAG System Build Spec

## Context

Hivespace is a Spring Boot + PostgreSQL (Supabase) team collaboration platform.
Chat, task management, and docs modules are already built and working.
The `/ai` slash command feature (summarize / ask / draft reply, using only chat
history, no RAG) is already built and working — do not modify it except where
explicitly stated below.

This task adds a RAG (Retrieval Augmented Generation) layer on top of the
existing **Docs** module so that project documents become searchable and can
be used as context for AI answers.

The `vector` extension and the `document_chunks` / related tables will be
created manually in Supabase before this task starts — do not generate or run
any `CREATE TABLE` migration for vector tables yourself, assume they already
exist with the schema given below. Confirm the schema matches before writing
any repository code.

---

## Models — already configured in environment

```
DEFAULT_CHAT_MODEL   = meta/llama-3.3-70b-instruct
FAST_MODEL            = meta/llama-3.1-8b-instruct
EMBEDDING_MODEL       = nvidia/nv-embedcode-7b-v1
RERANK_MODEL          = nv-rerank-qa-mistral-4b:1
VALIDATION_MODEL      = nvidia/nemotron-3.5-content-safety
REDESIGN_MODEL        = moonshotai/kimi-k2.6   (temperature 0.1, used for document rewriting/improvement, NOT part of the RAG pipeline)
```

All calls go through NVIDIA NIM, OpenAI-compatible API, base URL
`https://integrate.api.nvidia.com/v1`. Reuse the existing `NvidiaAIService`
class built for the `/ai` command feature — extend it, do not duplicate it.

`REDESIGN_MODEL` is unrelated to RAG and is out of scope for this task. Do not
build the document-rewriting feature here — just be aware the env var exists
so you don't mistake it for a RAG model.

---

## Pipeline to Build

```
User Query
    ↓
Embedding Model
    ↓
Hybrid Search (Vector + Keyword/BM25) — scoped to project_id
    ↓
Top N Results (~30-50)
    ↓
Reranker
    ↓
Top K Results (3-6)
    ↓
Context Builder
    ↓
LLM (DEFAULT_CHAT_MODEL)
    ↓
Guardrails & Validation (VALIDATION_MODEL)
    ↓
Response + Citations
```

No query rewriter stage — go straight from raw user query to embedding.

---

## Stage-by-Stage Build Instructions

Build and confirm each stage compiles/works before moving to the next. Ask
before touching any file outside what's described below.

### Stage 1 — Document Chunking & Embedding Pipeline

- Trigger: whenever a document is created or updated in the existing Docs
  module (hook into the existing save flow, ideally via an `@Async` call
  after save succeeds — do not rewrite the existing save endpoint, just call
  into a new service from it)
- Chunk the document content into ~400-500 token segments with ~50 token
  overlap between consecutive chunks
- For each chunk, call `EMBEDDING_MODEL` via `NvidiaAIService` to generate an
  embedding vector
- Store each chunk + its embedding + its plain text content in the existing
  `document_chunks` table (also populate a `tsvector` column for keyword
  search — see SQL below)
- Also populate the chunk's keyword search column so hybrid search works
  without a separate write path
- If a document is edited, re-chunk and re-embed it — replace old chunks for
  that document rather than appending duplicates

- **Concurrency guard (required, use Upstash Redis):** Document saves can
  fire in rapid succession (autosave, fast edits), and if two embed jobs for
  the same document run concurrently, the delete-then-insert pattern can race
  and leave stale or duplicate chunks. Use Upstash Redis to prevent this:

  1. Before starting an embed job for a document, attempt
     `SET embed-lock:{document_id} <worker-id> NX EX 30`
     (only set if not already present, 30 second expiry as a safety net in
     case a process crashes mid-job)
  2. If the `SET` succeeds, you hold the lock — proceed with the
     delete-old-chunks + chunk + embed + insert-new-chunks flow, then `DEL`
     the lock key when done
  3. If the `SET` fails, another job is already running for this document —
     do not start a second one. Optionally re-trigger after the in-flight job
     completes so the latest content is still captured, but do not run two
     embed pipelines for the same `document_id` concurrently
  4. Additionally, debounce the trigger itself using Redis: on every save
     event, write the document's latest content reference to a short-TTL key
     (e.g. `embed-pending:{document_id}`, TTL ~3 seconds) and only actually
     kick off the embed job when that key expires without being overwritten
     by a newer save. This avoids embedding every keystroke-level autosave
     and only processes the settled final version.

  This does not need to be a full distributed-lock library — a plain
  `SET NX EX` against Upstash Redis is sufficient at this scale.

### Stage 2 — Hybrid Search Service

Build a service that, given a `project_id` and a query string, returns the
top ~30-50 candidate chunks combining two search methods:

1. **Vector search** — embed the query via `EMBEDDING_MODEL`, run a pgvector
   cosine similarity query against `document_chunks` filtered by
   `project_id`, take top N
2. **Keyword search (BM25-style)** — use Postgres full-text search
   (`tsvector`/`tsquery` with `ts_rank`) against the same table, filtered by
   `project_id`, take top N

Merge the two result sets using **Reciprocal Rank Fusion (RRF)**, not raw
score normalization. Vector similarity scores and Postgres `ts_rank` scores
have incompatible distributions (bounded cosine similarity vs unbounded,
scale-dependent text rank), so combining raw scores requires fragile manual
calibration. RRF avoids this entirely by only using each chunk's *rank
position* within each result list, not its raw score.

RRF formula per chunk:

```
rrf_score(chunk) = Σ over each list it appears in:  1 / (k + rank_in_that_list)
```

Use `k = 60` (standard default, do not invent a different constant). A chunk
that appears in both the vector list and the keyword list sums its two
`1/(k+rank)` contributions. Sort all candidates by final `rrf_score`
descending and take the top ~30-50 to pass to the reranker.

This is intentionally simple — do not build a more elaborate fusion scheme
for v1.

### Stage 3 — Reranker

- Take the merged top ~30-50 candidates from Stage 2
- Call `RERANK_MODEL` with the query + each candidate chunk (or batched,
  depending on what the NVIDIA reranker endpoint supports — check its API
  shape before assuming the same `/chat/completions` format as the chat
  models, rerankers typically use a different endpoint signature)
- Take the top 3-6 results after reranking (make this K value configurable,
  default 5)

### Stage 4 — Context Builder

- Take the final top K chunks
- Format them clearly for the LLM prompt, each chunk tagged with its source
  document name/id so the model can cite it, e.g.:
  ```
  [Source: {document_title}, chunk {chunk_index}]
  {chunk_content}
  ```
- Also include recent channel messages as additional context (reuse the
  existing message-fetching logic already built for the `/ai` command
  feature — do not duplicate it)
- Combine doc context + chat context + the user's question into a single
  prompt for the LLM

### Stage 5 — LLM Answer Generation

- Call `DEFAULT_CHAT_MODEL` via the existing `NvidiaAIService` with the
  context-built prompt
- System prompt should instruct the model to: answer using only the provided
  context, explicitly say when the context doesn't contain the answer rather
  than guessing, and reference which source document supported each part of
  the answer

### Stage 6 — Guardrails & Validation

- Before returning the final answer to the user, pass it through
  `VALIDATION_MODEL` to check for unsafe/toxic content
- If flagged, do not return the raw answer — return a generic safe fallback
  message instead, and log the flagged response server-side for review
- This is a simple pass/fail check on the output, not a conversation — keep
  it to a single validation call per answer

- **Known tradeoff, documented intentionally (do not solve in this task):**
  this adds a second sequential LLM call on the critical path (generation +
  validation), which can roughly double response latency. This is an
  accepted tradeoff for v1 — do not attempt to parallelize, stream around it,
  or remove it to save time. If latency becomes a measured problem after
  real usage (not a guess), the future fix is answer-level caching in
  Upstash Redis: cache the final validated answer keyed by something like
  `rag-answer:{project_id}:{normalized-question-hash}` with a TTL (e.g. 1
  hour), so repeated/similar questions skip both generation and validation
  entirely. Do not build this caching now — just keep Stage 6 sequential and
  simple, and leave a `TODO` comment noting this as the future optimization
  path.

### Stage 7 — Response Assembly with Citations

- Build the final response object containing: the answer text, and a list of
  citations (document id, document title, chunk id/index) for each source
  chunk that was used in Stage 4
- Wire this into the existing `/ai ask` branch of the `SlashCommandService`
  built earlier — when the intent is "ask", call this RAG pipeline instead of
  (or in addition to, your call) the current chat-history-only context, and
  return both the answer and citations
- Reuse the existing message-saving and WebSocket-broadcast logic to post the
  answer back into the channel as a `type=AI` message — do not duplicate that
  logic. Citations can be appended to the message content or stored in a
  metadata field if one already exists on the messages table; check before
  adding anything new

---

## Constraints

- Do not create or alter any database tables — assume `document_chunks` and
  its indexes already exist exactly as given in the SQL below
- Do not build the query rewriter stage
- Do not build the document-rewriting/`REDESIGN_MODEL` feature in this task
- Reuse `NvidiaAIService`, the existing message repository, existing channel
  membership checks, and the existing WebSocket broadcast path — do not
  duplicate any of this logic
- All new external AI calls must have try/catch with a clear fallback error
  message, never let raw HTTP exceptions reach the frontend
- Add a `TODO` comment wherever per-user/per-workspace AI rate limiting
  should eventually be added via Upstash Redis — do not implement that now.
  This is separate from the Stage 1 Redis lock/debounce, which IS required
  and in scope for this task — Upstash Redis is already part of the stack
  and used here specifically to prevent the document-embedding race
  condition described in Stage 1
- Build and confirm each stage works before moving to the next; do not write
  all seven stages in one pass without checkpoints

---

## SQL — Run Manually in Supabase (for reference, agent should not execute)

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

-- No vector index — 4096 dims exceeds pgvector's 2000-dim cap for both
-- ivfflat and hnsw. Cosine similarity queries still work via sequential
-- scan, which is fine at small per-project chunk counts.

CREATE INDEX idx_document_chunks_content_tsv
  ON document_chunks
  USING GIN (content_tsv);

CREATE INDEX idx_document_chunks_project
  ON document_chunks (project_id);

CREATE INDEX idx_document_chunks_document
  ON document_chunks (document_id);

CREATE TRIGGER trigger_document_chunks_updated_at
  BEFORE UPDATE ON document_chunks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

Notes on the SQL:

- `embedding vector(4096)` — confirm the actual output dimension of
  `nv-embedcode-7b-v1` before running this (check NVIDIA's model card), and
  adjust the number accordingly. Getting this wrong means every insert will
  fail.
- `lists = 100` for the ivfflat index is a reasonable starting point for a
  small-to-medium number of chunks; this can be tuned later as data grows.
- `content_tsv` is a generated column, so it stays in sync automatically on
  insert/update — no separate write path needed for keyword search.
- The `UNIQUE (document_id, chunk_index)` constraint makes "replace old
  chunks on edit" straightforward — delete by `document_id` then re-insert,
  or upsert on conflict.