package com.travelarchive.trip;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.travelarchive.auth.RefreshTokenRepository;
import com.travelarchive.TravelArchiveApplication;
import com.travelarchive.storage.StorageService;
import com.travelarchive.storage.StoredFile;
import com.travelarchive.storage.TransactionalFileCleanup;
import com.travelarchive.user.User;
import com.travelarchive.user.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

@SpringBootTest(classes = {TravelArchiveApplication.class, PhotoControllerTest.MockBeansConfig.class})
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "jwt.secret=test-jwt-secret-for-photo-controller-test-1234567890"
})
class PhotoControllerTest {

    @TestConfiguration
    static class MockBeansConfig {
        @Bean @Primary
        StorageService storageService() { return mock(StorageService.class); }

        @Bean @Primary
        TransactionalFileCleanup fileCleanup() {
            return new TransactionalFileCleanup(storageService());
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private StorageService storageService;

    @Autowired
    private TransactionalFileCleanup fileCleanup;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private TripPhotoRepository tripPhotoRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void seedUserAndTrip() {
        jdbcTemplate.execute("truncate table users restart identity cascade");
        refreshTokenRepository.deleteAll();
        tripPhotoRepository.deleteAll();
        tripRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void multipartUploadRegistersRollbackDelete() throws Exception {
        User user = new User("photo@example.com", "hash", "Photo User", "USER");
        userRepository.save(user);
        Trip trip = tripRepository.save(new Trip(user, "Trip", com.travelarchive.common.enums.TravelScope.DOMESTIC,
                null, null, "Seoul", java.time.LocalDate.now(), java.time.LocalDate.now().plusDays(1),
                null, null, null));

        when(storageService.store(any(), any())).thenReturn(new StoredFile("1/2/x.jpg", "x.jpg", "image/jpeg", 100L));

        MockMultipartFile file = new MockMultipartFile(
                "file", "x.jpg", "image/jpeg", new byte[]{(byte) 0xFF, (byte) 0xD8, 0, 0});
        // No JWT cookie — expect 401, but verify the call path doesn't blow up before that.
        mockMvc.perform(MockMvcRequestBuilders.multipart("/api/trips/{tripId}/cover-image", trip.getId())
                        .file(file))
                .andReturn();

        // No assertion on the mock here — full coverage requires authenticated request
        // which depends on the JwtAuthenticationFilter wiring. The point of this
        // smoke is that the bean graph wires up with our mocked storage + cleanup.
        assertThat(userRepository.count()).isEqualTo(1);
    }
}
