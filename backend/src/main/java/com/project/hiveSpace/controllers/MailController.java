package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.MailResponse;
import com.project.hiveSpace.dto.SendMailRequest;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.models.UserOauthCredential;
import com.project.hiveSpace.repository.UserOauthCredentialRepository;
import com.project.hiveSpace.services.GmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/mail")
@RequiredArgsConstructor
@Slf4j
public class MailController {

    private final GmailService gmailService;
    private final UserOauthCredentialRepository oauthRepository;

    // 1. Get Connection Status
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus(@AuthenticationPrincipal User user) {
        Optional<UserOauthCredential> credential = oauthRepository.findByUserAndProvider(user, "GOOGLE");
        Map<String, Object> response = new HashMap<>();
        if (credential.isPresent()) {
            response.put("connected", true);
            response.put("email", credential.get().getEmail());
        } else {
            response.put("connected", false);
        }
        return ResponseEntity.ok(response);
    }

    // 2. Get Inbox
    @GetMapping("/inbox")
    public ResponseEntity<List<MailResponse>> getInbox(@AuthenticationPrincipal User user) {
        try {
            List<MailResponse> inbox = gmailService.fetchInbox(user);
            return ResponseEntity.ok(inbox);
        } catch (Exception e) {
            log.error("Failed to fetch inbox for user: {}", user.getEmail(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // 3. Send/Reply Email
    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendMail(
            @AuthenticationPrincipal User user,
            @RequestBody SendMailRequest request
    ) {
        Map<String, Object> response = new HashMap<>();
        try {
            gmailService.sendEmail(user, request);
            response.put("success", true);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to send mail for user: {}", user.getEmail(), e);
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // 4. Disconnect Gmail
    @PostMapping("/disconnect")
    public ResponseEntity<Map<String, Object>> disconnect(@AuthenticationPrincipal User user) {
        gmailService.disconnect(user);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        return ResponseEntity.ok(response);
    }
}
