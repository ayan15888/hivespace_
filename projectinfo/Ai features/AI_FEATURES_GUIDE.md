# HiveSpace AI Features Guide

This guide provides a comprehensive overview of the artificial intelligence capabilities integrated into **HiveSpace**, details on how they operate under the hood (Backend APIs & Models), and instructions on where and how users can access and interact with them in the user interface.

---

## Table of Contents
1. [AI Command Center & Project RAG Chat](#1-ai-command-center--project-rag-chat)
2. [Smart Triage (Auto-Triage Agent)](#2-smart-triage-auto-triage-agent)
3. [Sprint Retrospective Generator](#3-sprint-retrospective-generator)
4. [AI Task Generation from Brief (AI Import)](#4-ai-task-generation-from-brief-ai-import)
5. [AI Stale Task Nudger](#5-ai-stale-task-nudger)
6. [Real-time Duplicate Task Detector](#6-real-time-duplicate-task-detector)
7. [AI Document Redesign](#7-ai-document-redesign)
8. [AI Suggested Chat Replies](#8-ai-suggested-chat-replies)

---

## 1. AI Command Center & Project RAG Chat

HiveSpace features a project-wide Retrieval-Augmented Generation (RAG) assistant that has access to live tasks, documents, and chat history.

*   **How it Works (Backend):**
    *   **Endpoint:** `POST /api/channels/{channelId}/ai-command`
    *   **Logic:** It receives user inputs, pulls channel history, referenced tasks, and relevant documents using a vector database embedding lookup, and queries the configured Nvidia AI Service (`meta/llama-3.1-8b-instruct` or fallback models) to respond with relevant context.
*   **Where and How to Use It in the UI:**
    *   **AI Command Center Page:** Navigate to the **AI** section in the main sidebar (`/dashboard/ai`).
        *   **Search Box:** At the top of the page, type any natural language query (e.g., *"Summarize our GraphQL vs REST discussion"* or *"Show me tasks due this week"*).
        *   **Quick Actions:** Six dedicated shortcut buttons allow you to trigger pre-defined workflows instantly (e.g., *"Generate tasks"*, *"Semantic search"*, *"Sprint retrospective"*, *"Smart triage"*, *"Draft document"*).
        *   **Context Snippets:** The side panel displays live workspace statistics (Recent tasks, Live documents, Active channels) so users can see exactly what context the AI is evaluating.
    *   **Inline Chat /AI commands:** Within any active chat channel, type `/ai <your prompt>` or click the AI suggestion autocomplete popup above the compose bar.

---

## 2. Smart Triage (Auto-Triage Agent)

An automated agent that evaluates the backlog for stale priorities, missing attributes, or scheduling conflicts.

*   **How it Works (Backend):**
    *   **Fetch Suggestions:** `GET /api/projects/{projectId}/ai/triage`
    *   **Apply Suggestions:** `POST /api/projects/{projectId}/ai/triage/apply`
    *   **Logic:** The LLM reads all tasks in a project, analyzes due dates against current statuses and priority tags, and suggests updates (e.g., elevating a task from *Medium* to *High* priority because it is due tomorrow).
*   **Where and How to Use It in the UI:**
    *   **Kanban Board Triage Button:** Go to your project Kanban board page (`/dashboard/projects/[id]`). Click the **Smart Triage** button in the header.
    *   **Triage Drawer:** This opens a side drawer displaying a checklist of proposed modifications alongside AI reasoning (e.g., `Priority: Low ➔ High (Due in 12 hours)`).
    *   **Action:** Check or uncheck individual suggestions and click **Apply Selected Changes** to batch-update the board.

---

## 3. Sprint Retrospective Generator

A multi-step agent that synthesizes quantitative and qualitative workspace events into a clean Retrospective summary.

*   **How it Works (Backend):**
    *   **Endpoint:** `POST /api/projects/{projectId}/ai/retro`
    *   **Logic:** Queries all completed tasks in a sprint duration, detects task bottlenecks (e.g., tasks that reverted status using `task_activities`), retrieves key conversation details in public channels, and creates a formatted markdown retro document saved directly in the project's documents table.
*   **Where and How to Use It in the UI:**
    *   **Retro Modal:** Triggered under the Documents or Projects dashboard.
    *   **Action:** Select a target Sprint (or input a custom start and end date range) and click **Generate Sprint Retro**.
    *   **Result:** Once generated, the app automatically redirects you to the newly generated document in the **Docs Editor** (`/dashboard/docs`) where you can edit or share it.

---

## 4. AI Task Generation from Brief (AI Import)

Accelerates sprint planning by decomposing long specification texts, user stories, or meeting notes into a series of actionable tasks.

*   **How it Works (Backend):**
    *   **Endpoint:** `POST /api/projects/{projectId}/ai/generate-tasks`
    *   **Logic:** Parses a text block and structures it into JSON containing task fields: title, description, priority, and estimated story points.
*   **Where and How to Use It in the UI:**
    *   **AI Import Button:** On the Kanban board, next to the standard "Add Task" button, click **AI Import** or **Bulk Create from Brief**.
    *   **Brief Input:** Paste your product specifications or user stories in the modal text area and click **Generate Tasks**.
    *   **Bulk Creation:** Tweak the titles, descriptions, priorities, or point estimates inline, check/uncheck suggestions, and click **Create Tasks** to batch-add them directly to the backlog.

---

## 5. AI Stale Task Nudger

Keeps project progress flowing by highlighting stuck tasks and prompting assignees without manual project manager intervention.

*   **How it Works (Backend):**
    *   **Fetch Stale Tasks:** `GET /api/projects/{projectId}/ai/stale-tasks`
    *   **Trigger Nudge:** `POST /api/tasks/{taskId}/ai/nudge`
    *   **Logic:** Detects tasks left in `IN_PROGRESS` with no recent activity logs. It checks if the assignee has sent messages in chat channels, indicating they are active but perhaps blocked. If triggered, it posts a message to the user prompting for a status update.
*   **Where and How to Use It in the UI:**
    *   **Stale Tasks Widget/Modal:** View flagged tasks in the project dashboard or **Stale Tasks** manager.
    *   **Nudging:** Click the **Nudge Assignee** button next to a stalled task. The assigned user will receive an automated chat notification asking if they are blocked or need assistance.

---

## 6. Real-time Duplicate Task Detector

Prevents backlog clutter by detecting similar tasks before they are submitted.

*   **How it Works (Backend):**
    *   **Endpoint:** `POST /api/projects/{projectId}/tasks/detect-duplicates`
    *   **Logic:** Uses embedding models to check the vector similarity of a task's title and description against the database.
*   **Where and How to Use It in the UI:**
    *   **Create Task Form:** Click **Create Task** on the Kanban Board.
    *   **Inline Warnings:** As you type the title and description, a debounced check runs in the background.
    *   **Alert:** If a highly similar task exists, a warning box dynamically appears below the Title input: `⚠️ Similar task already exists: #104 - Fix OAuth Redirect Loop (Assigned to Sanjay)`. Click the link to view the existing task or ignore if distinct.

---

## 7. AI Document Redesign

Turns simple text or unformatted logs into beautiful, premium layout documents.

*   **How it Works (Backend):**
    *   **Endpoint:** `POST /api/documents/redesign`
    *   **Logic:** Uses an expert technical writer model (e.g., `moonshotai/kimi-k2.6`) to restructure documents. It injects semantic tags, custom inline CSS styled tables with theme-harmonious colors (indigo/violet), gradient borders, highlight widgets, and creates fully-rendered, responsive inline SVG flowcharts/diagrams.
*   **Where and How to Use It in the UI:**
    *   **Wiki/Doc Editor:** Open any document under `/dashboard/docs`.
    *   **Redesign:** In the top header bar, click the **Redesign with AI** button (marked with a Sparkles icon).
    *   **Result:** The editor will load for a few seconds and replace your text with a professionally structured document featuring styled callouts, responsive SVG diagrams, and beautifully formatted tables.

---

## 8. AI Suggested Chat Replies

Provides smart, one-click options to speed up team communication.

*   **How it Works (Backend):**
    *   **Endpoint:** `GET /api/channels/{channelId}/suggested-replies`
    *   **Logic:** Reads the last 5 messages in the active channel and generates 2-3 short, context-appropriate responses in a casual, workplace tone.
*   **Where and How to Use It in the UI:**
    *   **Chat Channels:** Open any channel or direct message under `/dashboard/chat` or `/dashboard/dm`.
    *   **Suggested Chips:** 2-3 interactive reply bubbles (e.g., *"Sure, will do!"*, *"I'm on it"*, or *"Got it, thanks!"*) appear directly above the message compose bar. Click any bubble to instantly send that message.
