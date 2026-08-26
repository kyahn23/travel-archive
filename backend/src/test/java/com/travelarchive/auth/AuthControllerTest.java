package com.travelarchive.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.travelarchive.user.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "jwt.secret=test-jwt-secret-for-auth-controller-test-1234567890"
})
class AuthControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.execute("truncate table users restart identity cascade");
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void signupIssuesHttpOnlyCookiesAndMeReturnsCurrentUser() throws Exception {
        MvcResult signup = mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"traveler@example.com","password":"password123","nickname":"여행자"}
                                """))
                .andExpect(status().isOk())
                .andExpect(cookie().httpOnly(AuthController.ACCESS_TOKEN_COOKIE, true))
                .andExpect(cookie().httpOnly(AuthController.REFRESH_TOKEN_COOKIE, true))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.message").value("Success"))
                .andReturn();

        Cookie accessCookie = signup.getResponse().getCookie(AuthController.ACCESS_TOKEN_COOKIE);
        assertThat(accessCookie).isNotNull();
        assertThat(refreshTokenRepository.count()).isOne();
        assertThat(userRepository.findByEmail("traveler@example.com"))
                .hasValueSatisfying(user -> assertThat(passwordEncoder.matches("password123", user.getPasswordHash())).isTrue());

        mockMvc.perform(get("/api/auth/me").cookie(accessCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("traveler@example.com"))
                .andExpect(jsonPath("$.data.nickname").value("여행자"))
                .andExpect(jsonPath("$.data.role").value("USER"));
    }

    @Test
    void loginRefreshAndLogoutUseRefreshTokenCookie() throws Exception {
        signup("login@example.com", "password123", "로그인");

        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"login@example.com","password":"password123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(cookie().httpOnly(AuthController.ACCESS_TOKEN_COOKIE, true))
                .andExpect(cookie().httpOnly(AuthController.REFRESH_TOKEN_COOKIE, true))
                .andReturn();

        Cookie refreshCookie = login.getResponse().getCookie(AuthController.REFRESH_TOKEN_COOKIE);
        assertThat(refreshCookie).isNotNull();

        mockMvc.perform(post("/api/auth/refresh").cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(cookie().httpOnly(AuthController.ACCESS_TOKEN_COOKIE, true))
                .andExpect(cookie().httpOnly(AuthController.REFRESH_TOKEN_COOKIE, true))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"));

        mockMvc.perform(post("/api/auth/logout").cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Success"))
                .andExpect(cookie().maxAge(AuthController.ACCESS_TOKEN_COOKIE, 0))
                .andExpect(cookie().maxAge(AuthController.REFRESH_TOKEN_COOKIE, 0));

        mockMvc.perform(post("/api/auth/refresh").cookie(refreshCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsInvalidSignupAndDuplicateEmail() throws Exception {
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"not-email","password":"short","nickname":"n"}
                                """))
                .andExpect(status().isBadRequest());

        signup("duplicate@example.com", "password123", "중복");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"duplicate@example.com","password":"password123","nickname":"중복2"}
                                """))
                .andExpect(status().isConflict());
    }

    @Test
    void rejectsLoginWithWrongPassword() throws Exception {
        signup("wrong@example.com", "password123", "실패");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"wrong@example.com","password":"password999"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    private void signup(String email, String password, String nickname) throws Exception {
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\",\"nickname\":\"" + nickname + "\"}"))
                .andExpect(status().isOk())
                .andExpect(header -> assertThat(header.getResponse().getHeaderValues(HttpHeaders.SET_COOKIE)).hasSize(2));
    }
}
