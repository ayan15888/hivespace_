package com.project.hiveSpace.controllers;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class DocumentWebSocketHandler extends BinaryWebSocketHandler {

    // Maps documentId -> Set of active WebSocketSessions
    private final Map<String, Set<WebSocketSession>> documentSessions = new ConcurrentHashMap<>();
    
    // Maps sessionId -> documentId
    private final Map<String, String> sessionDocumentMap = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String documentId = getDocumentId(session);
        if (documentId == null) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        documentSessions.computeIfAbsent(documentId, k -> ConcurrentHashMap.newKeySet()).add(session);
        sessionDocumentMap.put(session.getId(), documentId);
        log.info("WebSocket connected: Session {} joined document {}", session.getId(), documentId);
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        String documentId = sessionDocumentMap.get(session.getId());
        if (documentId == null) return;

        Set<WebSocketSession> sessions = documentSessions.get(documentId);
        if (sessions == null) return;

        // Broadcast to all OTHER sessions in the same document room
        for (WebSocketSession s : sessions) {
            if (s.isOpen() && !s.getId().equals(session.getId())) {
                try {
                    s.sendMessage(message);
                } catch (IOException e) {
                    log.error("Failed to send message to session {}", s.getId(), e);
                }
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String documentId = sessionDocumentMap.remove(session.getId());
        if (documentId != null) {
            Set<WebSocketSession> sessions = documentSessions.get(documentId);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    documentSessions.remove(documentId);
                }
            }
            log.info("WebSocket disconnected: Session {} left document {}", session.getId(), documentId);
        }
    }

    private String getDocumentId(WebSocketSession session) {
        // Expected URL: /api/ws/documents/{documentId}
        String path = session.getUri() != null ? session.getUri().getPath() : null;
        if (path != null && path.contains("/api/ws/documents/")) {
            return path.substring(path.lastIndexOf("/") + 1);
        }
        return null;
    }
}
