package com.project.hiveSpace.models;

import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class DocumentLinkId implements Serializable {
    private UUID sourceDoc;
    private UUID targetDoc;
}
