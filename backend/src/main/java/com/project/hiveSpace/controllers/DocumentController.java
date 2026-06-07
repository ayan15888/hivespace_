package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.*;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.services.DocumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    // ==================== CREATE ====================

    @PostMapping("/api/projects/{projectId}/documents")
    public ResponseEntity<DocumentResponse> createDocument(
            @PathVariable UUID projectId,
            @Valid @RequestBody DocumentRequest request,
            @AuthenticationPrincipal User creator) {
        return ResponseEntity.ok(documentService.createDocument(projectId, request, creator));
    }

    // ==================== LIST BY PROJECT ====================

    @GetMapping("/api/projects/{projectId}/documents")
    public ResponseEntity<List<DocumentResponse>> getDocumentsByProject(
            @PathVariable UUID projectId) {
        return ResponseEntity.ok(documentService.getDocumentsByProject(projectId));
    }

    // ==================== GET SINGLE DOC WITH CONTENT ====================

    @GetMapping("/api/documents/{documentId}")
    public ResponseEntity<DocumentContentResponse> getDocument(
            @PathVariable UUID documentId) {
        return ResponseEntity.ok(documentService.getDocumentWithContent(documentId));
    }

    // ==================== UPDATE METADATA ====================

    @PutMapping("/api/documents/{documentId}")
    public ResponseEntity<DocumentResponse> updateDocument(
            @PathVariable UUID documentId,
            @Valid @RequestBody DocumentRequest request,
            @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(documentService.updateDocument(documentId, request, actor));
    }

    // ==================== SAVE CONTENT ====================

    @PutMapping("/api/documents/{documentId}/content")
    public ResponseEntity<DocumentContentResponse> saveContent(
            @PathVariable UUID documentId,
            @RequestBody DocumentContentRequest request,
            @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(documentService.saveContent(documentId, request, actor));
    }

    // ==================== DELETE ====================

    @DeleteMapping("/api/documents/{documentId}")
    public ResponseEntity<Void> deleteDocument(@PathVariable UUID documentId) {
        documentService.deleteDocument(documentId);
        return ResponseEntity.noContent().build();
    }

    // ==================== PUBLISH / UNPUBLISH ====================

    @PatchMapping("/api/documents/{documentId}/publish")
    public ResponseEntity<DocumentResponse> publishDocument(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(documentService.publishDocument(documentId, actor));
    }

    @PatchMapping("/api/documents/{documentId}/unpublish")
    public ResponseEntity<DocumentResponse> unpublishDocument(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(documentService.unpublishDocument(documentId, actor));
    }

    // ==================== VERSION HISTORY ====================

    @GetMapping("/api/documents/{documentId}/versions")
    public ResponseEntity<List<DocumentVersionResponse>> getVersionHistory(
            @PathVariable UUID documentId) {
        return ResponseEntity.ok(documentService.getVersionHistory(documentId));
    }

    @GetMapping("/api/documents/{documentId}/versions/{versionId}")
    public ResponseEntity<DocumentVersionResponse> getVersion(
            @PathVariable UUID documentId,
            @PathVariable UUID versionId) {
        return ResponseEntity.ok(documentService.getVersion(documentId, versionId));
    }

    // ==================== CHILD DOCUMENTS ====================

    @GetMapping("/api/documents/{documentId}/children")
    public ResponseEntity<List<DocumentResponse>> getChildDocuments(
            @PathVariable UUID documentId) {
        return ResponseEntity.ok(documentService.getChildDocuments(documentId));
    }
}
