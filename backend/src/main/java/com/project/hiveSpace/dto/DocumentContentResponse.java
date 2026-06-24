package com.project.hiveSpace.dto;

import lombok.*;

import java.util.Date;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentContentResponse {

    private UUID documentId;
    private String title;
    private String icon;
    private String content;       // ProseMirror JSON
    private String textContent;   // plain text
    private Integer version;
    private Boolean isPublished;
    private UUID projectId;
    private UUID createdById;
    private String createdByName;
    private Date updatedAt;
    private List<UUID> linkedDocIds;
}

