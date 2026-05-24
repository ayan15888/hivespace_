package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.UserResponse;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.repository.UserRepository;
import com.project.hiveSpace.security.JwtService;
import com.project.hiveSpace.utils.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.project.hiveSpace.repository.TenantMemberRepository;
import com.project.hiveSpace.repository.TenantRepository;
import com.project.hiveSpace.models.Tenant;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String[] COLOR_PALETTE = {
        "red", "orange", "amber", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"
    };

    private String getRandomColor() {
        int index = new java.util.Random().nextInt(COLOR_PALETTE.length);
        return COLOR_PALETTE[index];
    }

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final TenantMemberRepository tenantMemberRepository;
    private final TenantRepository tenantRepository;

    public UserResponse register(String email, String username, String password) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = User.builder()
                .email(email)
                .username(username)
                .password(passwordEncoder.encode(password))
                .active(true)
                .avatarColor(getRandomColor())
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
                    .avatarColor(getRandomColor())
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

<<<<<<< HEAD
    public String refreshToken(User user) {
        return jwtService.generateToken(user);
    }
=======
    @Transactional
    public UserResponse switchTenant(User currentUser, UUID tenantId) {
        boolean isMember = tenantMemberRepository.findByTenantIdAndUserId(tenantId, currentUser.getId()).isPresent();
        if (!isMember) {
            throw new SecurityException("Access denied: You are not a member of this organization");
        }

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found"));

        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setTenant(tenant);
        userRepository.save(user);

        String newJwt = jwtService.generateToken(user);
        return userMapper.toResponse(user, newJwt);
    }

>>>>>>> 5dd753f5e0a3ba669500d2c80679c3ae3fd0ae3f
}
