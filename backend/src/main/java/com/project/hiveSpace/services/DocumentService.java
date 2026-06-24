package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.*;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import com.project.hiveSpace.security.RbacService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.hiveSpace.exceptions.ForbiddenException;
import com.project.hiveSpace.exceptions.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentContentRepository documentContentRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final DocumentLinkRepository documentLinkRepository;
    private final ProjectRepository projectRepository;
    private final WorkspaceRepository workspaceRepository;
    private final RbacService rbacService;
    private final ObjectMapper objectMapper;
    private final DocumentEmbeddingService documentEmbeddingService;

    // ==================== CREATE ====================

    @Transactional
    public DocumentResponse createDocument(UUID projectId, DocumentRequest request, User creator) {
        rbacService.verifyResourceBelongsToTenant(projectId, ResourceType.PROJECT);
        if (!rbacService.canCreateDocument(projectId)) {
            throw new ForbiddenException("Access denied: You do not have permission to create documents in this project");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project not found"));

        Document parent = null;
        if (request.getParentId() != null) {
            parent = documentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new NotFoundException("Parent document not found"));
            // Parent must be in the same project
            if (!parent.getProject().getId().equals(projectId)) {
                throw new ForbiddenException("Parent document does not belong to this project");
            }
        }

        Document document = Document.builder()
                .title(request.getTitle())
                .icon(request.getIcon())
                .workspace(project.getWorkspace())
                .project(project)
                .parent(parent)
                .createdBy(creator)
                .isPublished(false)
                .build();

        Document saved = documentRepository.save(document);

        // Create empty document_content row
        DocumentContent content = DocumentContent.builder()
                .documentId(saved.getId())
                .document(saved)
                .content(null)
                .textContent(null)
                .version(1)
                .updatedAt(new Date())
                .build();
        documentContentRepository.save(content);

        return mapToResponse(saved);
    }

    // ==================== LIST BY PROJECT ====================

    @Transactional(readOnly = true)
    public List<DocumentResponse> getDocumentsByProject(UUID projectId) {
        rbacService.verifyResourceBelongsToTenant(projectId, ResourceType.PROJECT);
        if (!rbacService.canViewProject(projectId)) {
            throw new ForbiddenException("Access denied: You do not have permission to view documents in this project");
        }

        return documentRepository.findAllByProjectIdAndParentIdIsNullOrderByUpdatedAtDesc(projectId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<DocumentResponse> getAllDocumentsByProject(UUID projectId) {
        rbacService.verifyResourceBelongsToTenant(projectId, ResourceType.PROJECT);
        if (!rbacService.canViewProject(projectId)) {
            throw new ForbiddenException("Access denied: You do not have permission to view documents in this project");
        }

        List<Document> docs = documentRepository.findAllByProjectIdOrderByUpdatedAtDesc(projectId);

        // Sync links for all docs to catch up any existing links written before parser update
        for (Document doc : docs) {
            documentContentRepository.findById(doc.getId()).ifPresent(content -> {
                updateDocumentLinks(doc, content.getContent());
            });
        }

        return docs.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ==================== GET SINGLE DOC WITH CONTENT ====================

    @Transactional(readOnly = true)
    public DocumentContentResponse getDocumentWithContent(UUID documentId) {
        rbacService.verifyResourceBelongsToTenant(documentId, ResourceType.DOCUMENT);
        if (!rbacService.canViewDocument(documentId)) {
            throw new ForbiddenException("Access denied: You do not have permission to view this document");
        }

        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new NotFoundException("Document not found"));

        DocumentContent content = documentContentRepository.findById(documentId)
                .orElse(null);

        DocumentContentResponse.DocumentContentResponseBuilder builder = DocumentContentResponse.builder()
                .documentId(doc.getId())
                .title(doc.getTitle())
                .icon(doc.getIcon())
                .isPublished(doc.getIsPublished())
                .projectId(doc.getProject().getId())
                .updatedAt(doc.getUpdatedAt());

        if (doc.getCreatedBy() != null) {
            builder.createdById(doc.getCreatedBy().getId())
                    .createdByName(doc.getCreatedBy().getFullName());
        }

        if (content != null) {
            builder.content(content.getContent())
                    .textContent(content.getTextContent())
                    .version(content.getVersion());
        }

        List<UUID> linkedDocIds = documentLinkRepository.findAllBySourceDocId(doc.getId())
                .stream()
                .map(link -> link.getTargetDoc().getId())
                .collect(Collectors.toList());
        builder.linkedDocIds(linkedDocIds);

        return builder.build();
    }

    // ==================== UPDATE METADATA ====================

    @Transactional
    public DocumentResponse updateDocument(UUID documentId, DocumentRequest request, User actor) {
        rbacService.verifyResourceBelongsToTenant(documentId, ResourceType.DOCUMENT);
        if (!rbacService.canEditDocument(documentId)) {
            throw new ForbiddenException("Access denied: You do not have permission to edit this document");
        }

        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new NotFoundException("Document not found"));

        doc.setTitle(request.getTitle());
        doc.setIcon(request.getIcon());

        // Only reparent when parentId is explicitly provided — omitting it must not promote sub-pages to root
        if (request.getParentId() != null) {
            Document parent = documentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new NotFoundException("Parent document not found"));
            if (!parent.getProject().getId().equals(doc.getProject().getId())) {
                throw new ForbiddenException("Parent document does not belong to the same project");
            }
            // Prevent self-referencing
            if (parent.getId().equals(documentId)) {
                throw new IllegalArgumentException("A document cannot be its own parent");
            }
            doc.setParent(parent);
        }

        Document saved = documentRepository.save(doc);
        return mapToResponse(saved);
    }

    // ==================== SAVE CONTENT ====================

    @Transactional
    public DocumentContentResponse saveContent(UUID documentId, DocumentContentRequest request, User actor) {
        rbacService.verifyResourceBelongsToTenant(documentId, ResourceType.DOCUMENT);
        if (!rbacService.canEditDocument(documentId)) {
            throw new ForbiddenException("Access denied: You do not have permission to edit this document");
        }

        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new NotFoundException("Document not found"));

        DocumentContent content = documentContentRepository.findById(documentId)
                .orElseGet(() -> DocumentContent.builder()
                        .documentId(documentId)
                        .document(doc)
                        .version(0)
                        .updatedAt(new Date())
                        .build());

        // Save a version snapshot of the current content before overwriting (if content exists)
        if (content.getContent() != null) {
            DocumentVersion version = DocumentVersion.builder()
                    .document(doc)
                    .content(content.getContent())
                    .savedBy(actor)
                    .createdAt(new Date())
                    .build();
            documentVersionRepository.save(version);
        }

        // Update content — column is JSONB; must be valid JSON (ProseMirror document from Tiptap)
        if (request.getContent() != null && !request.getContent().isBlank()) {
            try {
                objectMapper.readTree(request.getContent());
            } catch (Exception e) {
                throw new IllegalArgumentException(
                        "Document content must be valid JSON (ProseMirror format), not HTML");
            }
        }

        content.setContent(request.getContent());
        content.setTextContent(request.getTextContent());
        content.setVersion(content.getVersion() + 1);
        content.setUpdatedAt(new Date());
        documentContentRepository.save(content);

        // Touch the parent document's updatedAt
        doc.setUpdatedAt(new Date());
        documentRepository.save(doc);

        updateDocumentLinks(doc, request.getContent());

        List<UUID> linkedDocIds = documentLinkRepository.findAllBySourceDocId(doc.getId())
                .stream()
                .map(link -> link.getTargetDoc().getId())
                .collect(Collectors.toList());

        // Trigger chunking and embedding asynchronously (RAG Stage 1)
        documentEmbeddingService.triggerEmbeddingAsync(doc.getId(), request.getTextContent(), doc.getProject().getId());

        return DocumentContentResponse.builder()
                .documentId(doc.getId())
                .title(doc.getTitle())
                .icon(doc.getIcon())
                .content(content.getContent())
                .textContent(content.getTextContent())
                .version(content.getVersion())
                .isPublished(doc.getIsPublished())
                .projectId(doc.getProject().getId())
                .createdById(doc.getCreatedBy() != null ? doc.getCreatedBy().getId() : null)
                .createdByName(doc.getCreatedBy() != null ? doc.getCreatedBy().getFullName() : null)
                .updatedAt(content.getUpdatedAt())
                .linkedDocIds(linkedDocIds)
                .build();
    }

    // ==================== DELETE ====================

    @Transactional
    public void deleteDocument(UUID documentId) {
        rbacService.verifyResourceBelongsToTenant(documentId, ResourceType.DOCUMENT);
        if (!rbacService.canDeleteDocument(documentId)) {
            throw new ForbiddenException("Access denied: You do not have permission to delete this document");
        }

        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new NotFoundException("Document not found"));

        documentRepository.delete(doc);
    }

    // ==================== PUBLISH / UNPUBLISH ====================

    @Transactional
    public DocumentResponse publishDocument(UUID documentId, User actor) {
        rbacService.verifyResourceBelongsToTenant(documentId, ResourceType.DOCUMENT);
        if (!rbacService.canPublishDocument(documentId)) {
            throw new ForbiddenException("Access denied: Only workspace admins and project leads can publish documents");
        }

        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new NotFoundException("Document not found"));

        doc.setIsPublished(true);
        Document saved = documentRepository.save(doc);
        return mapToResponse(saved);
    }

    @Transactional
    public DocumentResponse unpublishDocument(UUID documentId, User actor) {
        rbacService.verifyResourceBelongsToTenant(documentId, ResourceType.DOCUMENT);
        if (!rbacService.canPublishDocument(documentId)) {
            throw new ForbiddenException("Access denied: Only workspace admins and project leads can unpublish documents");
        }

        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new NotFoundException("Document not found"));

        doc.setIsPublished(false);
        Document saved = documentRepository.save(doc);
        return mapToResponse(saved);
    }

    // ==================== VERSION HISTORY ====================

    @Transactional(readOnly = true)
    public List<DocumentVersionResponse> getVersionHistory(UUID documentId) {
        rbacService.verifyResourceBelongsToTenant(documentId, ResourceType.DOCUMENT);
        if (!rbacService.canViewDocument(documentId)) {
            throw new ForbiddenException("Access denied: You do not have permission to view this document's history");
        }

        documentRepository.findById(documentId)
                .orElseThrow(() -> new NotFoundException("Document not found"));

        return documentVersionRepository.findAllByDocumentIdOrderByCreatedAtDesc(documentId)
                .stream()
                .map(this::mapVersionToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DocumentVersionResponse getVersion(UUID documentId, UUID versionId) {
        rbacService.verifyResourceBelongsToTenant(documentId, ResourceType.DOCUMENT);
        if (!rbacService.canViewDocument(documentId)) {
            throw new ForbiddenException("Access denied: You do not have permission to view this document's history");
        }

        DocumentVersion version = documentVersionRepository.findById(versionId)
                .orElseThrow(() -> new NotFoundException("Version not found"));

        if (!version.getDocument().getId().equals(documentId)) {
            throw new NotFoundException("Version does not belong to this document");
        }

        return mapVersionToResponse(version);
    }

    // ==================== CHILD DOCUMENTS ====================

    @Transactional(readOnly = true)
    public List<DocumentResponse> getChildDocuments(UUID documentId) {
        rbacService.verifyResourceBelongsToTenant(documentId, ResourceType.DOCUMENT);
        if (!rbacService.canViewDocument(documentId)) {
            throw new ForbiddenException("Access denied: You do not have permission to view this document");
        }

        documentRepository.findById(documentId)
                .orElseThrow(() -> new NotFoundException("Document not found"));

        return documentRepository.findAllByParentId(documentId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ==================== MAPPERS ====================

    private DocumentResponse mapToResponse(Document doc) {
        int childCount = documentRepository.findAllByParentId(doc.getId()).size();
        long versionCount = documentVersionRepository.countByDocumentId(doc.getId());

        List<UUID> linkedDocIds = documentLinkRepository.findAllBySourceDocId(doc.getId())
                .stream()
                .map(link -> link.getTargetDoc().getId())
                .collect(Collectors.toList());

        DocumentResponse.DocumentResponseBuilder builder = DocumentResponse.builder()
                .id(doc.getId())
                .title(doc.getTitle())
                .icon(doc.getIcon())
                .projectId(doc.getProject() != null ? doc.getProject().getId() : null)
                .workspaceId(doc.getWorkspace().getId())
                .parentId(doc.getParent() != null ? doc.getParent().getId() : null)
                .isPublished(doc.getIsPublished())
                .childCount(childCount)
                .versionCount((int) versionCount)
                .createdAt(doc.getCreatedAt())
                .updatedAt(doc.getUpdatedAt())
                .linkedDocIds(linkedDocIds);

        if (doc.getCreatedBy() != null) {
            builder.createdById(doc.getCreatedBy().getId())
                    .createdByName(doc.getCreatedBy().getFullName())
                    .createdByAvatar(doc.getCreatedBy().getAvatarUrl())
                    .createdByAvatarColor(doc.getCreatedBy().getAvatarColor());
        }

        return builder.build();
    }

    private DocumentVersionResponse mapVersionToResponse(DocumentVersion version) {
        DocumentVersionResponse.DocumentVersionResponseBuilder builder = DocumentVersionResponse.builder()
                .id(version.getId())
                .documentId(version.getDocument().getId())
                .content(version.getContent())
                .createdAt(version.getCreatedAt());

        if (version.getSavedBy() != null) {
            builder.savedById(version.getSavedBy().getId())
                    .savedByName(version.getSavedBy().getFullName());
        }

        return builder.build();
    }

    private void updateDocumentLinks(Document sourceDoc, String contentJson) {
        if (contentJson == null || contentJson.isBlank()) {
            List<DocumentLink> existing = documentLinkRepository.findAllBySourceDocId(sourceDoc.getId());
            documentLinkRepository.deleteAll(existing);
            return;
        }

        // 1. Find all href attributes in JSON
        java.util.Set<String> hrefs = new java.util.HashSet<>();
        java.util.regex.Pattern hrefPattern = java.util.regex.Pattern.compile(
            "\"href\"\\s*:\\s*\"([^\"]+)\""
        );
        java.util.regex.Matcher hrefMatcher = hrefPattern.matcher(contentJson);
        while (hrefMatcher.find()) {
            hrefs.add(hrefMatcher.group(1).trim());
        }

        // 2. Resolve target document UUIDs
        java.util.Set<UUID> targetIds = new java.util.HashSet<>();
        
        // Find all documents in the project for title/relative matching
        List<Document> projectDocs = documentRepository.findAllByProjectIdOrderByUpdatedAtDesc(sourceDoc.getProject().getId());

        // Regex for UUID extraction
        java.util.regex.Pattern uuidPattern = java.util.regex.Pattern.compile(
            "([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})"
        );

        for (String href : hrefs) {
            // Case A: UUID match in URL
            java.util.regex.Matcher uuidMatcher = uuidPattern.matcher(href);
            if (uuidMatcher.find()) {
                try {
                    targetIds.add(UUID.fromString(uuidMatcher.group(1)));
                    continue;
                } catch (IllegalArgumentException e) {
                    // Ignore
                }
            }

            // Case B: Title match in project (case-insensitive)
            String cleanHref = href.toLowerCase().replaceAll("^/+", "").trim();
            for (Document doc : projectDocs) {
                if (doc.getId().equals(sourceDoc.getId())) continue;
                String cleanTitle = doc.getTitle().toLowerCase().trim();
                
                if (cleanHref.equals(cleanTitle) || 
                    cleanHref.endsWith("/" + cleanTitle) || 
                    cleanHref.equals("dashboard/docs/" + cleanTitle) ||
                    cleanTitle.equals(cleanHref)) {
                    targetIds.add(doc.getId());
                    break;
                }
            }
        }

        targetIds.remove(sourceDoc.getId());

        // 3. Sync database table
        List<DocumentLink> existingLinks = documentLinkRepository.findAllBySourceDocId(sourceDoc.getId());
        java.util.Set<UUID> existingTargetIds = existingLinks.stream()
            .map(link -> link.getTargetDoc().getId())
            .collect(Collectors.toSet());

        List<DocumentLink> toDelete = existingLinks.stream()
            .filter(link -> !targetIds.contains(link.getTargetDoc().getId()))
            .collect(Collectors.toList());
        documentLinkRepository.deleteAll(toDelete);

        for (UUID targetId : targetIds) {
            if (!existingTargetIds.contains(targetId)) {
                documentRepository.findById(targetId).ifPresent(targetDoc -> {
                    DocumentLink newLink = DocumentLink.builder()
                        .sourceDoc(sourceDoc)
                        .targetDoc(targetDoc)
                        .createdAt(new Date())
                        .build();
                    documentLinkRepository.save(newLink);
                });
            }
        }
    }
}
