Why a separate service is better
Your existing RAGAnswerService is tightly coupled to the channel slash command pattern — it expects document context, returns citations, and is built around the "answer only from context" contract. Modifying it to also handle casual conversation, workspace orchestration, and multi-step actions will turn it into a mess that's hard to maintain. The channel /ai commands and the AI page have fundamentally different jobs.
What the new service should look like
Call it HexAIService or WorkspaceAIService. It owns everything for the /dashboard/ai page and nothing else.
HexAIService
│
├── classifyIntent(message)          
│     → CONVERSATIONAL | RAG_QUERY | ACTION
│
├── handleConversational(message, history)
│     → calls llama-3.3-70b directly, no RAG
│
├── handleRAGQuery(message, history, workspace)
│     → calls HybridSearch + Reranker + LLM
│     → reuses existing HybridSearchService and RerankerService as dependencies
│     → does NOT use RAGAnswerService
│     → has its own system prompt built for conversation not slash commands
│
└── handleAction(intent, workspace, user)
      → GENERATE_TASKS → calls task generation logic
      → RUN_TRIAGE → calls triage logic
      → SPRINT_RETRO → calls retro generation logic
      → FIND_DUPLICATES → calls duplicate detection logic
What it reuses vs owns fresh
It reuses HybridSearchService, RerankerService, ProjectRepository, and the Nvidia API client — these are infrastructure and should stay shared. It does NOT use RAGAnswerService at all. It owns its own prompt builder, its own intent classifier, and its own response formatter.
The intent classifier is the core brain
javaprivate Intent classifyIntent(String message, List<AiMessage> history) {
    String lower = message.toLowerCase();
    
    // Conversational - no workspace data needed
    if (isSmallTalk(lower)) return Intent.CONVERSATIONAL;
    
    // Action intents - needs to execute something
    if (lower.contains("generate tasks") || lower.contains("create tasks")) 
        return Intent.ACTION_GENERATE_TASKS;
    if (lower.contains("triage") || lower.contains("prioritize backlog")) 
        return Intent.ACTION_TRIAGE;
    if (lower.contains("retro") || lower.contains("retrospective")) 
        return Intent.ACTION_RETRO;
    
    // Default - search workspace and answer
    return Intent.RAG_QUERY;
}
For production you can replace this simple keyword classifier with a fast LLM call to llama-3.1-8b-instruct — send the message and ask it to return one of the intent labels as JSON. Cheap and much more accurate.
The system prompt for RAG_QUERY is completely different from the channel one
You are Hex AI, the intelligent assistant for this HiveSpace workspace.
You have access to tasks, documents, channels, and team activity across 
all projects. Answer naturally and conversationally. Use the provided 
context to give accurate, specific answers. If context is sparse, 
answer from general knowledge and say so. Never refuse to engage.
Cite relevant tasks or documents inline when helpful using [Title](url) format.
How AiConversationController changes
It becomes very thin — just HTTP handling and DB persistence. All logic moves to HexAIService:
javaprivate String generateAnswer(Workspace workspace, User user, 
                               String message, List<AiMessage> history) {
    Intent intent = hexAIService.classifyIntent(message, history);
    
    return switch (intent) {
        case CONVERSATIONAL -> 
            hexAIService.handleConversational(message, history);
        case RAG_QUERY -> 
            hexAIService.handleRAGQuery(message, history, workspace, user);
        case ACTION_GENERATE_TASKS -> 
            hexAIService.handleGenerateTasks(message, workspace, user);
        case ACTION_TRIAGE -> 
            hexAIService.handleTriage(message, workspace, user);
        case ACTION_RETRO -> 
            hexAIService.handleRetro(message, workspace, user);
        default -> 
            hexAIService.handleRAGQuery(message, history, workspace, user);
    };
}
Give this prompt to your agent:
"Create a new Spring service class called HexAIService. It should be completely independent from RAGAnswerService. It needs an intent classifier that routes messages to one of three handlers: handleConversational for small talk and greetings calling llama-3.3-70b directly with a friendly workspace assistant system prompt, handleRAGQuery for knowledge questions that runs HybridSearchService and RerankerService across all workspace projects with its own conversation-focused system prompt that never refuses to answer, and handleAction stubs for generate tasks, triage, retro, and find duplicates that return a friendly confirmation message for now. Update AiConversationController to inject HexAIService and replace the current generateRAGAnswer private method call with hexAIService.route(message, history, workspace, user). Do not modify RAGAnswerService or any channel command logic."