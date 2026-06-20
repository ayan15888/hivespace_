package com.project.hiveSpace.dto;

public record ReactionSummary(
    String emoji,
    long count,
    boolean reactedByMe
) {}
