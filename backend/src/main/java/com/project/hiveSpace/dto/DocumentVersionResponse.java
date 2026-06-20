package com.project.hiveSpace.dto;

import lombok.*;

import java.util.Date;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentVersionResponse {

    private UUID id;
    private UUID documentId;
    private String content;
    private UUID savedById;
    private String savedByName;
    private Date createdAt;
}
