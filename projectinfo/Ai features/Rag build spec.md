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

### Stage 2 — Hybrid Search Service

Build a service that, given a `project_id` and a query string, returns the
top ~30-50 candidate chunks combining two search methods:

1. **Vector search** — embed the query via `EMBEDDING_MODEL`, run a pgvector
   cosine similarity query against `document_chunks` filtered by
   `project_id`, take top N
2. **Keyword search (BM25-style)** — use Postgres full-text search
   (`tsvector`/`tsquery` with `ts_rank`) against the same table, filtered by
   `project_id`, take top N

Merge the two result sets. Use a simple, transparent merge strategy:
normalize each method's scores to 0-1 range, combine with a weighted sum
(default 60% vector / 40% keyword, make this configurable), and deduplicate
chunks that appear in both lists by keeping the higher combined score.

Do not over-engineer the score fusion — a basic reciprocal-rank-fusion or
weighted-sum approach is sufficient for v1, not a research-grade
implementation.

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
- Add a `TODO` comment wherever per-user/per-workspace rate limiting should
  eventually be added via Upstash Redis — do not implement it now
- Build and confirm each stage works before moving to the next; do not write
  all seven stages in one pass without checkpoints

---

## SQL — Run Manually in Supabase (for reference, agent should not execute)

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Document chunks table: stores chunked content + embeddings + keyword search vector
CREATE TABLE document_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  content       TEXT NOT NULL,
  embedding     vector(4096),     -- adjust dimension to match nv-embedcode-7b-v1 output
  content_tsv   tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at    TIMESTAMP NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP NOT NULL DEFAULT now(),

  UNIQUE (document_id, chunk_index)
);

-- Vector similarity search index
CREATE INDEX idx_document_chunks_embedding
  ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Keyword/full-text search index (powers the BM25-style hybrid search leg)
CREATE INDEX idx_document_chunks_content_tsv
  ON document_chunks
  USING GIN (content_tsv);

-- Project scoping index — every query filters by project_id first
CREATE INDEX idx_document_chunks_project
  ON document_chunks (project_id);

-- Document scoping index — used when re-chunking/replacing a document's chunks
CREATE INDEX idx_document_chunks_document
  ON document_chunks (document_id);

-- Keep updated_at fresh on edit (reuses your existing trigger function if present)
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