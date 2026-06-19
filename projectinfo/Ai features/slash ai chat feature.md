You are working on Hivespace, a Spring Boot + PostgreSQL (Supabase) team collaboration 
platform. Chat, task management, and docs modules are already built and working — do 
not modify them except where explicitly stated below.

GOAL: Implement the `/ai` slash command feature for the chat module — NO new database 
tables, NO RAG, NO embeddings in this task. Just AI responses based on recent channel 
messages. RAG/document context will be added in a separate task later — do not build 
anything related to document_chunks, embeddings, or vector search in this task.

ENVIRONMENT VARIABLES (already set, use these exact names):
- NVIDIA_API_KEY
- DEFAULT_CHAT_MODEL = meta/llama-3.3-70b-instruct
- FAST_MODEL = meta/llama-3.1-8b-instruct
- EMBEDDING_MODEL = nvidia/nv-embedcode-7b-v1   (NOT used in this task, ignore for now)

NVIDIA NIM API:
- Base URL: https://integrate.api.nvidia.com/v1
- OpenAI-compatible chat completions endpoint: POST /chat/completions
- Auth header: Authorization: Bearer {NVIDIA_API_KEY}

EXISTING SCHEMA TO REUSE (do not modify):
- messages (id, channel_id, sender_id, content, type, parent_id, created_at, deleted_at, ...)
- channels (id, project_id, type, ...)
- users (id, full_name, username, ...)

BUILD THE FOLLOWING, STEP BY STEP. Confirm each step compiles before moving to the next.

─────────────────────────────────────────
STEP 1 — NvidiaAIService
─────────────────────────────────────────
Create a Spring Boot @Service class `NvidiaAIService`.

Method: 
  String chatCompletion(String systemPrompt, String userPrompt, String model)

- Builds a request body matching OpenAI chat completion format:
  {
    "model": model,
    "messages": [
      { "role": "system", "content": systemPrompt },
      { "role": "user", "content": userPrompt }
    ],
    "max_tokens": 1000,
    "temperature": 0.5
  }
- Uses Spring's RestClient to POST to NVIDIA NIM
- Reads NVIDIA_API_KEY and model values from application.properties / env, 
  do not hardcode
- Parses the response and returns just the assistant's reply text
- Wrap the call in try/catch — on failure, throw a custom unchecked exception 
  AiServiceException with a clear message, do not let raw HTTP exceptions propagate

─────────────────────────────────────────
STEP 2 — SlashCommandService
─────────────────────────────────────────
Create a Spring Boot @Service class `SlashCommandService`.

Method:
  String handleAiCommand(UUID channelId, UUID requestingUserId, String userInput)

Parse userInput (the text after "/ai ") into one of three intents:

1. "summarize" or "summarize this channel" 
   → fetch the last 50 messages in the channel (reuse the existing message 
     repository/query, ordered by created_at DESC, excluding deleted messages, 
     then reverse to chronological order)
   → build a system prompt instructing the model to produce a concise summary 
     of the conversation
   → call NvidiaAIService.chatCompletion() using DEFAULT_CHAT_MODEL

2. "ask <question>" (anything after "ask ")
   → fetch the last 20 messages in the channel as context
   → build a system prompt instructing the model to answer the question using 
     only the provided conversation context, and to clearly say "I don't have 
     enough context to answer that" if the conversation doesn't contain the answer
   → call NvidiaAIService.chatCompletion() using DEFAULT_CHAT_MODEL

3. "draft a reply to <person>" (anything after "draft a reply to ")
   → resolve <person> to a user in the channel by matching full_name or username 
     (case-insensitive partial match against channel members)
   → fetch the last 15 messages in the channel as context
   → build a system prompt instructing the model to draft a short, appropriate 
     reply continuing the conversation, matching the tone of the existing messages
   → call NvidiaAIService.chatCompletion() using DEFAULT_CHAT_MODEL
   → if no matching person is found in the channel, return a clear message 
     saying so instead of calling the AI

If userInput doesn't match any of these three patterns, return a short help message 
listing the three valid commands instead of calling the AI.

Format message-history context consistently across all three cases as:
  "{sender_full_name}: {content}"
one per line, joined by newlines.

─────────────────────────────────────────
STEP 3 — REST Controller
─────────────────────────────────────────
Add a new endpoint (new controller class AiCommandController, or add to existing 
ChatController if one exists — check the codebase first and follow its existing 
pattern/conventions):

  POST /api/channels/{channelId}/ai-command

Request body: { "input": "string" }   // e.g. "summarize" or "ask why did we pick REST"

- Validate the requesting user is a member of the channel (reuse existing 
  membership check logic if it exists, do not write a new one from scratch)
- Call SlashCommandService.handleAiCommand(channelId, currentUserId, request.input)
- Save the AI's response as a new row in the messages table:
    - content = the AI response text
    - type = 'AI'
    - channel_id = channelId
    - sender_id = null (or a designated system/AI user if one already exists 
      in the codebase — check first, do not create a new user record for this)
    - parent_id = null
- Broadcast this new message through whatever existing mechanism is used to 
  push new chat messages to connected clients (STOMP topic, etc.) — reuse the 
  exact same method/service the normal message-send flow already uses, do not 
  create a parallel broadcast path
- Return the created message as JSON response

─────────────────────────────────────────
ERROR HANDLING
─────────────────────────────────────────
- If NvidiaAIService throws AiServiceException, catch it in the controller and 
  return a clean message to the user: "AI is temporarily unavailable, please try 
  again in a moment." Do not save this as a chat message — return it as a 
  direct API error response (e.g. 503) instead.
- Add a TODO comment in the controller where per-user rate limiting should 
  eventually be added via Upstash Redis — do not implement it now, just mark 
  the spot clearly.

─────────────────────────────────────────
CONSTRAINTS
─────────────────────────────────────────
- Do NOT create any new database tables or columns
- Do NOT implement embeddings, vector search, or anything RAG-related
- Do NOT modify existing message-send, channel, or auth logic — only call into it
- Before writing code, look at the existing message repository, channel 
  membership check, and WebSocket broadcast logic so you reuse them correctly 
  instead of duplicating logic
- Ask me before touching any file outside of: new service classes, new 
  controller (or controller you're extending), and application.properties/env 
  config additions

Build and confirm Step 1 first, show me the code, then proceed to Step 2 only 
after I confirm.