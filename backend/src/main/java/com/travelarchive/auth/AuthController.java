package com.travelarchive.auth;

import com.travelarchive.auth.AuthService.IssuedTokens;
import com.travelarchive.auth.dto.LoginRequest;
import com.travelarchive.auth.dto.SignupRequest;
import com.travelarchive.auth.dto.TokenResponse;
import com.travelarchive.auth.dto.UserResponse;
import com.travelarchive.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    public static final String ACCESS_TOKEN_COOKIE = "access_token";
    public static final String REFRESH_TOKEN_COOKIE = "refresh_token";

    private final AuthService authService;
    private final Environment environment;
    private final boolean cookieSecure;

    public AuthController(AuthService authService, Environment environment,
                          @Value("${cookie.secure:false}") boolean cookieSecure) {
        this.authService = authService;
        this.environment = environment;
        this.cookieSecure = cookieSecure;
    }

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<TokenResponse>> signup(@Valid @RequestBody SignupRequest request) {
        return tokenResponse(authService.signup(request));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<TokenResponse>> login(@Valid @RequestBody LoginRequest request) {
        return tokenResponse(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(HttpServletRequest request) {
        String refreshToken = JwtAuthenticationFilter.cookieValue(request, REFRESH_TOKEN_COOKIE);
        if (refreshToken == null) {
            return ResponseEntity.status(401).build();
        }
        IssuedTokens tokens = authService.refresh(refreshToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, accessCookie(tokens.accessToken()).toString())
                .body(new ApiResponse<>(new TokenResponse("Bearer", JwtTokenProvider.ACCESS_TOKEN_TTL.toSeconds()), "Success"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest request) {
        authService.logout(JwtAuthenticationFilter.cookieValue(request, REFRESH_TOKEN_COOKIE));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearCookie(ACCESS_TOKEN_COOKIE).toString())
                .header(HttpHeaders.SET_COOKIE, clearCookie(REFRESH_TOKEN_COOKIE).toString())
                .body(new ApiResponse<>(null, "Success"));
    }

    @GetMapping("/me")
    public ApiResponse<UserResponse> me(Authentication authentication) {
        return new ApiResponse<>(UserResponse.from(authService.currentUser(authentication.getName())), "Success");
    }

    private ResponseEntity<ApiResponse<TokenResponse>> tokenResponse(IssuedTokens tokens) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, accessCookie(tokens.accessToken()).toString())
                .header(HttpHeaders.SET_COOKIE, refreshCookie(tokens.refreshToken()).toString())
                .body(new ApiResponse<>(new TokenResponse("Bearer", JwtTokenProvider.ACCESS_TOKEN_TTL.toSeconds()), "Success"));
    }

    private ResponseCookie accessCookie(String value) {
        return ResponseCookie.from(ACCESS_TOKEN_COOKIE, value)
                .httpOnly(true)
                .secure(secureCookies())
                .sameSite("Strict")
                .path("/")
                .maxAge(JwtTokenProvider.ACCESS_TOKEN_TTL)
                .build();
    }

    private ResponseCookie refreshCookie(String value) {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, value)
                .httpOnly(true)
                .secure(secureCookies())
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(JwtTokenProvider.REFRESH_TOKEN_TTL)
                .build();
    }

    private ResponseCookie clearCookie(String name) {
        return ResponseCookie.from(name, "")
                .httpOnly(true)
                .secure(secureCookies())
                .sameSite("Strict")
                .path(REFRESH_TOKEN_COOKIE.equals(name) ? "/api/auth" : "/")
                .maxAge(0)
                .build();
    }

    private boolean secureCookies() {
        if (cookieSecure) {
            return true;
        }
        for (String profile : environment.getActiveProfiles()) {
            if ("prod".equalsIgnoreCase(profile) || "production".equalsIgnoreCase(profile)) {
                return true;
            }
        }
        return false;
    }
}
