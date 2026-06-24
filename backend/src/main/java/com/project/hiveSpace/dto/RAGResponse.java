package com.project.hiveSpace.dto;

import java.util.List;

public record RAGResponse(
    String answer,
    List<FusedCandidate> citations
) {}
