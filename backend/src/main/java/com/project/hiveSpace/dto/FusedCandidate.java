package com.project.hiveSpace.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
public class FusedCandidate {
    private UUID id;
    private UUID documentId;
    private UUID projectId;
    private Integer chunkIndex;
    private String content;
    private String documentTitle;
    private double rrfScore;
}
