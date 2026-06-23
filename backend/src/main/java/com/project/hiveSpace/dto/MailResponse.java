package com.project.hiveSpace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MailResponse {
    private String id;
    private boolean unread;
    private String sender;
    private String email;
    private String subject;
    private String preview;
    private String body;
    private String time;
    private String initials;
    private String color;
}
