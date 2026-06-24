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
public class DocumentResponse {

    private UUID id;
    private String title;
    private String icon;
    private UUID projectId;
    private UUID workspaceId;
    private UUID parentId;
    private UUID createdById;
    private String createdByName;
    private String createdByAvatar;
    private String createdByAvatarColor;
    private Boolean isPublished;
    private int childCount;
    private int versionCount;
    private Date createdAt;
    private Date updatedAt;
    private List<UUID> linkedDocIds;
}

