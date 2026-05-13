package com.travelarchive.auth;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.travelarchive.user.User;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {
    public static final Duration ACCESS_TOKEN_TTL = Duration.ofMinutes(15);
    public static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(7);
    private static final String DEFAULT_SECRET = "travel-archive-local-development-secret-change-me";

    private final ObjectMapper objectMapper;
    private final String secret;
    private final Environment environment;

    public JwtTokenProvider(ObjectMapper objectMapper,
                            @Value("${jwt.secret:${JWT_SECRET:travel-archive-local-development-secret-change-me}}") String secret,
                            Environment environment) {
        this.objectMapper = objectMapper;
        this.secret = secret;
        this.environment = environment;
    }

    @PostConstruct
    void validateSecret() {
        if (secret.length() < 32) {
            throw new IllegalStateException("jwt.secret must be at least 32 characters");
        }
        if (DEFAULT_SECRET.equals(secret) && !isLocalProfile()) {
            throw new IllegalStateException("JWT_SECRET must be explicitly configured for non-local environments");
        }
    }

    private boolean isLocalProfile() {
        for (String profile : environment.getActiveProfiles()) {
            if ("local".equalsIgnoreCase(profile) || "dev".equalsIgnoreCase(profile) || "test".equalsIgnoreCase(profile)) {
                return true;
            }
        }
        return false;
    }

    public String createAccessToken(User user) {
        Instant now = Instant.now();
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("sub", user.getEmail());
        claims.put("uid", user.getId());
        claims.put("role", user.getRole());
        claims.put("iat", now.getEpochSecond());
        claims.put("exp", now.plus(ACCESS_TOKEN_TTL).getEpochSecond());
        return sign(claims);
    }

    public String createRefreshToken(User user) {
        Instant now = Instant.now();
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("sub", user.getEmail());
        claims.put("uid", user.getId());
        claims.put("typ", "refresh");
        claims.put("iat", now.getEpochSecond());
        claims.put("exp", now.plus(REFRESH_TOKEN_TTL).getEpochSecond());
        return sign(claims);
    }

    public String subject(String token) {
        return claims(token).get("sub").toString();
    }

    public void validateRefreshToken(String token) {
        Object type = claims(token).get("typ");
        if (!"refresh".equals(type)) {
            throw new IllegalArgumentException("Invalid refresh token");
        }
    }

    public String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception ex) {
            throw new IllegalStateException("Could not hash token", ex);
        }
    }

    private String sign(Map<String, Object> claims) {
        try {
            String header = base64Url(objectMapper.writeValueAsBytes(Map.of("alg", "HS256", "typ", "JWT")));
            String payload = base64Url(objectMapper.writeValueAsBytes(claims));
            String unsigned = header + "." + payload;
            return unsigned + "." + signature(unsigned);
        } catch (Exception ex) {
            throw new IllegalStateException("Could not create token", ex);
        }
    }

    private Map<String, Object> claims(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3 || !MessageDigest.isEqual(signature(parts[0] + "." + parts[1]).getBytes(StandardCharsets.UTF_8), parts[2].getBytes(StandardCharsets.UTF_8))) {
                throw new IllegalArgumentException("Invalid token signature");
            }
            Map<String, Object> claims = objectMapper.readValue(Base64.getUrlDecoder().decode(parts[1]), new TypeReference<>() {
            });
            long exp = ((Number) claims.get("exp")).longValue();
            if (Instant.now().getEpochSecond() >= exp) {
                throw new IllegalArgumentException("Expired token");
            }
            return claims;
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid token", ex);
        }
    }

    private String signature(String unsigned) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return base64Url(mac.doFinal(unsigned.getBytes(StandardCharsets.UTF_8)));
    }

    private String base64Url(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
