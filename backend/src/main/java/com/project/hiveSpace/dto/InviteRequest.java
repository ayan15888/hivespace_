package com.project.hiveSpace.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InviteRequest {
    private UUID teamId;
    private String recipientUsername;
}
