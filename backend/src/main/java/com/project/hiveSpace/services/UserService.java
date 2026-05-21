package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.UserResponse;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.repository.UserRepository;
import com.project.hiveSpace.utils.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public UserResponse getProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return userMapper.toResponse(user, null);
    }

}
