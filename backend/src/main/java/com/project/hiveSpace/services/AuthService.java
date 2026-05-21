package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.UserResponse;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.repository.UserRepository;
import com.project.hiveSpace.security.JwtService;
import com.project.hiveSpace.utils.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public UserResponse register(String email, String username, String password) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = User.builder()
                .email(email)
                .username(username)
                .password(passwordEncoder.encode(password))
                .active(true)
                .createdAt(new java.util.Date())
                .updatedAt(new java.util.Date())
                .build();

        userRepository.save(user);
        String jwtToken = jwtService.generateToken(user);
        return userMapper.toResponse(user, jwtToken);
    }

    public UserResponse login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        if (!user.getActive()) {
            throw new IllegalArgumentException("User is inactive");
        }

        String jwtToken = jwtService.generateToken(user);
        return userMapper.toResponse(user, jwtToken);
    }

    public UserResponse loginWithGithub(String email, String username, Long githubId, String avatarUrl) {
        User user = userRepository.findByGithubId(githubId).orElse(null);

        if (user == null) {
            user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                user.setGithubId(githubId);
                user.setAvatarUrl(avatarUrl);
                userRepository.save(user);
            }
        }

        if (user == null) {
            user = User.builder()
                    .email(email)
                    .username(username)
                    .githubId(githubId)
                    .avatarUrl(avatarUrl)
                    .password(passwordEncoder.encode("GITHUB_OAUTH_USER_" + UUID.randomUUID()))
                    .active(true)
                    .createdAt(new java.util.Date())
                    .updatedAt(new java.util.Date())
                    .build();
            userRepository.save(user);
        }

        String jwtToken = jwtService.generateToken(user);
        return userMapper.toResponse(user, jwtToken);
    }

    public UserResponse updateProfile(User user, String fullName, String jobTitle, String bio, String avatarUrl) {
        user.setFullName(fullName);
        user.setJobTitle(jobTitle);
        user.setBio(bio);
        if (avatarUrl != null) {
            user.setAvatarUrl(avatarUrl);
        }
        userRepository.save(user);
        return userMapper.toResponse(user, null);
    }

}
