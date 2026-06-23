package com.project.hiveSpace.repository;

import com.project.hiveSpace.models.User;
import com.project.hiveSpace.models.UserOauthCredential;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserOauthCredentialRepository extends JpaRepository<UserOauthCredential, UUID> {
    Optional<UserOauthCredential> findByUserAndProvider(User user, String provider);
    Optional<UserOauthCredential> findByUserIdAndProvider(UUID userId, String provider);
    Optional<UserOauthCredential> findByUserEmailAndProvider(String email, String provider);
}
