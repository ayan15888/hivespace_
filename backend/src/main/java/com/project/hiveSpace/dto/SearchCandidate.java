package com.project.hiveSpace.dto;

import java.util.UUID;

public interface SearchCandidate {
    UUID getId();
    UUID getDocumentId();
    UUID getProjectId();
    Integer getChunkIndex();
    String getContent();
    String getDocumentTitle();
}
