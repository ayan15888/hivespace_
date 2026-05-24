package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.GitHubAuthRequest;
import com.project.hiveSpace.dto.LoginRequest;
import com.project.hiveSpace.dto.RegisterRequest;
import com.project.hiveSpace.dto.SwitchTenantRequest;
import com.project.hiveSpace.dto.UpdateProfileRequest;
import com.project.hiveSpace.dto.UserResponse;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.services.AuthService;
import com.project.hiveSpace.services.GitHubService;
import com.project.hiveSpace.utils.UserMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final GitHubService gitHubService;
    private final UserMapper userMapper;

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req.getEmail(), req.getUsername(), req.getPassword()));
    }

    @PostMapping("/login")
    public ResponseEntity<UserResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req.getEmail(), req.getPassword()));
    }

    @PostMapping("/github")
    public ResponseEntity<UserResponse> githubLogin(@Valid @RequestBody GitHubAuthRequest req) {
        String accessToken = gitHubService.getAccessToken(req.getCode());
        var githubUser = gitHubService.getUserInfo(accessToken);
        return ResponseEntity.ok(authService.loginWithGithub(
                githubUser.getEmail(),
                githubUser.getLogin(),
                githubUser.getId(),
                githubUser.getAvatarUrl()
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(userMapper.toResponse(user, null));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserResponse> updateProfile(
            @AuthenticationPrincipal User user,
            @RequestBody UpdateProfileRequest req
    ) {
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(authService.updateProfile(
                user,
                req.getFullName(),
                req.getJobTitle(),
                req.getBio(),
                req.getAvatarUrl()
        ));
    }
}
