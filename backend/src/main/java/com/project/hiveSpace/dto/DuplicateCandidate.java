package com.project.hiveSpace.dto;

import java.util.UUID;

public interface DuplicateCandidate {
    UUID getId();
    String getTitle();
    String getStatus();
    String getAssigneeName();
    Double getDistance();
}
