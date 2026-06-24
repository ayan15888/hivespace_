package com.project.hiveSpace.dto;

import com.project.hiveSpace.models.MessageType;
import java.util.UUID;

public record SendMessageRequest(
    String content,
    MessageType type,       // default TEXT
    UUID parentId           // nullable — set for thread replies
) {}
