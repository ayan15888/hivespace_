package com.project.hiveSpace.controllers;

import com.project.hiveSpace.models.User;
import com.project.hiveSpace.repository.UserRepository;
import com.project.hiveSpace.security.JwtService;
import com.project.hiveSpace.services.GmailService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth/google")
@RequiredArgsConstructor
@Slf4j
public class GoogleOAuthController {

    private final GmailService gmailService;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    // 1. Get Auth URL
    @GetMapping("/url")
    public ResponseEntity<Map<String, String>> getAuthUrl(@RequestParam("token") String jwtToken) {
        String authUrl = gmailService.getAuthorizationUrl() + "&state=" + jwtToken;
        Map<String, String> response = new HashMap<>();
        response.put("url", authUrl);
        return ResponseEntity.ok(response);
    }

    // 2. OAuth Callback Handler
    @GetMapping("/callback")
    public void handleCallback(
            @RequestParam("code") String code,
            @RequestParam("state") String stateToken,
            HttpServletResponse response
    ) throws IOException {
        try {
            // Extract email from JWT Token stored in state parameter
            String email = jwtService.extractUsername(stateToken);
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new IllegalArgumentException("User not found for token"));

            // Process callback & store token
            gmailService.handleCallback(code, user);

            // Redirect back to frontend mail page with success query
            response.sendRedirect(frontendUrl + "/dashboard/mail?success=true");
        } catch (Exception e) {
            log.error("Google OAuth callback failed", e);
            response.sendRedirect(frontendUrl + "/dashboard/mail?error=oauth_failed");
        }
    }
}
