package com.project.hiveSpace.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendMailRequest {
    private String to;
    private String subject;
    private String body;
    private String threadId;
}
