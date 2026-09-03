package com.travelarchive.trip;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.travelarchive.auth.AuthController;
import com.travelarchive.auth.RefreshTokenRepository;
import com.travelarchive.user.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "jwt.secret=test-jwt-secret-for-timeline-controller-test-1234567890"
})
class TimelineControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private TripDayRepository tripDayRepository;

    @Autowired
    private TripTimelineItemRepository timelineItemRepository;

    @Autowired
    private TripPhotoRepository photoRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.execute("truncate table users restart identity cascade");
        photoRepository.deleteAll();
        timelineItemRepository.deleteAll();
        tripDayRepository.deleteAll();
        tripRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void createsListsUpdatesDeletesTimelineItemsWithCoordinatesAndOrdering() throws Exception {
        Cookie traveler = signup("timeline@example.com");
        Long tripId = createTrip(traveler, "2026-05-01", "2026-05-02");

        Long laterId = idFrom(createItem(traveler, tripId, "점심", "2026-05-01T13:00:00", "FOOD")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("점심"))
                .andExpect(jsonPath("$.data.latitude").value(37.5665))
                .andExpect(jsonPath("$.data.longitude").value(126.9780))
                .andReturn().getResponse().getContentAsString());
        Long earlierId = idFrom(createItem(traveler, tripId, "아침 산책", "2026-05-01T09:00:00", "PLACE")
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());
        Long dayTwoId = idFrom(createItem(traveler, tripId, "둘째날", "2026-05-02T08:30:00", "ACTIVITY")
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());

        mockMvc.perform(get("/api/trips/{tripId}/timeline", tripId).cookie(traveler))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].tripDay").value(1))
                .andExpect(jsonPath("$.data[0].items[0].id").value(earlierId))
                .andExpect(jsonPath("$.data[0].items[1].id").value(laterId))
                .andExpect(jsonPath("$.data[1].tripDay").value(2))
                .andExpect(jsonPath("$.data[1].items[0].id").value(dayTwoId));

        mockMvc.perform(patch("/api/timeline-items/{id}", earlierId)
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"아침 카페","visited_at":"2026-05-02T10:00:00","category":"FOOD","latitude":null,"longitude":null}
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("아침 카페"))
                .andExpect(jsonPath("$.data.tripDay").value(2))
                .andExpect(jsonPath("$.data.visitedAt").value("2026-05-02T10:00:00"));

        mockMvc.perform(delete("/api/timeline-items/{id}", laterId).cookie(traveler))
                .andExpect(status().isOk());
        assertThat(timelineItemRepository.findById(laterId)).isEmpty();
    }

    @Test
    void addsPhotoMetadataAndEnforcesLimits() throws Exception {
        Cookie traveler = signup("photos@example.com");
        Long tripId = createTrip(traveler, "2026-05-01", "2026-05-01");
        Long itemId = idFrom(createItem(traveler, tripId, "사진 장소", "2026-05-01T11:00:00", "PLACE")
                .andReturn().getResponse().getContentAsString());

        addPhoto(traveler, itemId, 0, 1024L).andExpect(status().isUnsupportedMediaType());

        for (int i = 1; i <= 3; i++) {
            uploadPhoto(traveler, itemId, i)
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.originalFileName").value("photo-%d.jpg".formatted(i)));
        }

        uploadPhoto(traveler, itemId, 4).andExpect(status().isBadRequest());
        addPhoto(traveler, itemId, 5, 5L * 1024 * 1024 + 1).andExpect(status().isUnsupportedMediaType());

        mockMvc.perform(get("/api/trips/{tripId}/timeline", tripId).cookie(traveler))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].items[0].photos.length()").value(3));
    }

    @Test
    void enforcesOwnershipAndTripDateRange() throws Exception {
        Cookie owner = signup("timeline-owner@example.com");
        Cookie other = signup("timeline-other@example.com");
        Long tripId = createTrip(owner, "2026-05-01", "2026-05-01");
        Long itemId = idFrom(createItem(owner, tripId, "내 일정", "2026-05-01T09:00:00", "MEMO")
                .andReturn().getResponse().getContentAsString());

        mockMvc.perform(get("/api/trips/{tripId}/timeline", tripId).cookie(other))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/timeline-items/{id}", itemId)
                        .cookie(other)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"침범\"}"))
                .andExpect(status().isForbidden());
        createItem(owner, tripId, "범위 밖", "2026-05-02T09:00:00", "PLACE")
                .andExpect(status().isBadRequest());
    }

    private Cookie signup(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\",\"nickname\":\"여행자\"}"))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(result.getResponse().getCookie(AuthController.ACCESS_TOKEN_COOKIE)).isNotNull();
        return result.getResponse().getCookie(AuthController.ACCESS_TOKEN_COOKIE);
    }

    private Long createTrip(Cookie traveler, String startDate, String endDate) throws Exception {
        String domesticRegionId = jdbcTemplate.queryForObject("select code from domestic_regions where code = ?", String.class, "KR-11");
        return idFrom(mockMvc.perform(post("/api/trips")
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"서울 여행","travel_scope":"DOMESTIC","domestic_region_id":"%s","city_name":"서울","start_date":"%s","end_date":"%s"}
                                """.formatted(domesticRegionId, startDate, endDate)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());
    }

    private org.springframework.test.web.servlet.ResultActions createItem(Cookie traveler, Long tripId, String title,
                                                                          String visitedAt, String category) throws Exception {
        return mockMvc.perform(post("/api/trips/{tripId}/timeline-items", tripId)
                .cookie(traveler)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"title":"%s","place_name":"광화문","address":"서울","latitude":37.5665,"longitude":126.9780,"visited_at":"%s","category":"%s","memo":"메모"}
                        """.formatted(title, visitedAt, category)));
    }

    private org.springframework.test.web.servlet.ResultActions addPhoto(Cookie traveler, Long itemId, int index,
                                                                        Long fileSize) throws Exception {
        return mockMvc.perform(post("/api/timeline-items/{id}/photos", itemId)
                .cookie(traveler)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"storage_key":"timeline/%d.jpg","file_url":"https://cdn.example.com/%d.jpg","original_file_name":"photo-%d.jpg","content_type":"image/jpeg","file_size":%d,"caption":"사진"}
                        """.formatted(index, index, index, fileSize)));
    }

    private org.springframework.test.web.servlet.ResultActions uploadPhoto(Cookie traveler, Long itemId, int index) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "photo-%d.jpg".formatted(index), "image/jpeg", jpegBytes());
        return mockMvc.perform(multipart("/api/timeline-items/{id}/photos", itemId)
                .file(file)
                .cookie(traveler));
    }

    private byte[] jpegBytes() {
        return new byte[]{(byte) 0xFF, (byte) 0xD8, 0x01, 0x02};
    }

    private Long idFrom(String body) {
        return JsonPath.parse(body).read("$.data.id", Long.class);
    }
}
