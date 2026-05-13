package com.travelarchive.auth;

import java.util.Optional;
import com.travelarchive.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    void deleteByUser(User user);
}
