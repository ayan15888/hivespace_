package com.project.hiveSpace.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentContentRequest {

    private String content;       // ProseMirror JSON string from Tiptap
    private String textContent;   // plain text extracted for search
}
