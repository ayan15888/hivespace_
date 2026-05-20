package com.project.hiveSpace.utils;

import com.project.hiveSpace.dto.UserResponse;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.repository.TenantRepository;
import com.project.hiveSpace.repository.TenantMemberRepository;
import com.project.hiveSpace.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UserMapper {

    private final TenantRepository tenantRepository;
    private final TenantMemberRepository tenantMemberRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    public UserResponse toResponse(User user, String token) {
        boolean hasTenants = (user.getTenant() != null) || 
                           (tenantRepository.countByOwnerEmail(user.getEmail()) > 0) || 
                           (workspaceMemberRepository.existsByUserId(user.getId())) ||
                           (tenantMemberRepository.existsByUserId(user.getId()));

        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                null,
                token,
                hasTenants,
                user.getAvatarUrl(),
                user.getFullName(),
                user.getJobTitle(),
                user.getBio()
        );
    }
}
