package com.travelarchive.auth;

import com.travelarchive.auth.dto.LoginRequest;
import com.travelarchive.auth.dto.SignupRequest;
import com.travelarchive.user.User;
import com.travelarchive.user.UserRepository;
import java.time.LocalDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional
    public IssuedTokens signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }
        User user = userRepository.save(new User(request.email(), passwordEncoder.encode(request.password()), request.nickname(), "USER"));
        return issueTokens(user);
    }

    @Transactional
    public IssuedTokens login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }
        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public User currentUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    @Transactional
    public IssuedTokens refresh(String refreshToken) {
        jwtTokenProvider.validateRefreshToken(refreshToken);
        String tokenHash = jwtTokenProvider.hash(refreshToken);
        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));
        if (!storedToken.isActive(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Expired refresh token");
        }
        String accessToken = jwtTokenProvider.createAccessToken(storedToken.getUser());
        return new IssuedTokens(accessToken, refreshToken);
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        refreshTokenRepository.findByTokenHash(jwtTokenProvider.hash(refreshToken))
                .ifPresent(token -> token.revoke(LocalDateTime.now()));
    }

    private IssuedTokens issueTokens(User user) {
        String accessToken = jwtTokenProvider.createAccessToken(user);
        String refreshToken = jwtTokenProvider.createRefreshToken(user);
        refreshTokenRepository.deleteByUser(user);
        refreshTokenRepository.flush();
        refreshTokenRepository.save(new RefreshToken(user, jwtTokenProvider.hash(refreshToken), LocalDateTime.now().plus(JwtTokenProvider.REFRESH_TOKEN_TTL)));
        return new IssuedTokens(accessToken, refreshToken);
    }

    public record IssuedTokens(String accessToken, String refreshToken) {
    }
}
