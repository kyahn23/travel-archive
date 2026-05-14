package com.travelarchive.trip;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.travelarchive.auth.AuthController;
import com.travelarchive.auth.RefreshTokenRepository;
import com.travelarchive.user.UserRepository;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=create",
        "jwt.secret=test-jwt-secret-for-trip-controller-test-1234567890"
})
class TripControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private TripDayRepository tripDayRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanDatabase() {
        tripDayRepository.deleteAll();
        tripRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void createsListsGetsUpdatesAndDeletesOwnedTripsWithGeneratedDays() throws Exception {
        Cookie traveler = signup("traveler@example.com");
        Long domesticRegionId = domesticRegionId("KR-11");

        Long tripId = idFrom(createDomesticTrip(traveler, "서울 여행", domesticRegionId, "2026-05-01", "2026-05-03")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("서울 여행"))
                .andExpect(jsonPath("$.data.status").value("PLANNED"))
                .andExpect(jsonPath("$.data.tripDays.length()").value(3))
                .andExpect(jsonPath("$.data.tripDays[0].dayNo").value(1))
                .andExpect(jsonPath("$.data.tripDays[2].travelDate").value("2026-05-03"))
                .andReturn()
                .getResponse()
                .getContentAsString());

        assertThat(tripDayRepository.countByTripId(tripId)).isEqualTo(3);

        mockMvc.perform(get("/api/trips").cookie(traveler))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(tripId))
                .andExpect(jsonPath("$.data[0].tripDays.length()").value(3));

        mockMvc.perform(get("/api/trips/{id}", tripId).cookie(traveler))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(tripId));

        mockMvc.perform(patch("/api/trips/{id}", tripId)
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"서울 짧은 여행","start_date":"2026-05-02","end_date":"2026-05-03"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("서울 짧은 여행"))
                .andExpect(jsonPath("$.data.tripDays.length()").value(2))
                .andExpect(jsonPath("$.data.tripDays[0].travelDate").value("2026-05-02"));
        assertThat(tripDayRepository.countByTripId(tripId)).isEqualTo(2);

        mockMvc.perform(delete("/api/trips/{id}", tripId).cookie(traveler))
                .andExpect(status().isOk());
        assertThat(tripRepository.findById(tripId)).isEmpty();
    }

    @Test
    void enforcesOwnershipAndValidStatusTransitions() throws Exception {
        Cookie owner = signup("owner@example.com");
        Cookie other = signup("other@example.com");
        Long countryId = countryId("JP");

        Long tripId = idFrom(createInternationalTrip(owner, countryId)
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());

        mockMvc.perform(get("/api/trips/{id}", tripId).cookie(other))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/trips/{id}/status", tripId)
                        .cookie(owner)
                        .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"COMPLETED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));

        mockMvc.perform(patch("/api/trips/{id}/status", tripId)
                        .cookie(owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CANCELLED\"}"))
                .andExpect(status().isBadRequest());

        Long cancellableTripId = idFrom(createInternationalTrip(owner, countryId)
                .andReturn()
                .getResponse()
                .getContentAsString());

        mockMvc.perform(patch("/api/trips/{id}/status", cancellableTripId)
                        .cookie(owner)
                        .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"CANCELLED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));

        mockMvc.perform(patch("/api/trips/{id}/status", cancellableTripId)
                        .cookie(owner)
                        .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"PLANNED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PLANNED"));
    }

    @Test
    void rejectsInvalidDatesAndScopeReferences() throws Exception {
        Cookie traveler = signup("invalid@example.com");
        Long domesticRegionId = domesticRegionId("KR-11");

        createDomesticTrip(traveler, "역전 여행", domesticRegionId, "2026-05-03", "2026-05-01")
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/trips")
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"잘못된 해외","travel_scope":"INTERNATIONAL","domestic_region_id":1,"start_date":"2026-05-01","end_date":"2026-05-02"}
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/trips")
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"도시 누락","travel_scope":"DOMESTIC","domestic_region_id":%d,"start_date":"2026-05-01","end_date":"2026-05-02"}
                                """.formatted(domesticRegionId)))
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

    private Long idFrom(String body) {
        return JsonPath.parse(body).read("$.data.id", Long.class);
    }

    private org.springframework.test.web.servlet.ResultActions createDomesticTrip(Cookie traveler, String title,
                                                                                 Long domesticRegionId,
                                                                                 String startDate,
                                                                                 String endDate) throws Exception {
        return mockMvc.perform(post("/api/trips")
                .cookie(traveler)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"title":"%s","travel_scope":"DOMESTIC","domestic_region_id":%d,"city_name":"서울","start_date":"%s","end_date":"%s","travel_type":"휴식","companion":"친구","summary":"요약"}
                        """.formatted(title, domesticRegionId, startDate, endDate)));
    }

    private org.springframework.test.web.servlet.ResultActions createInternationalTrip(Cookie traveler, Long countryId) throws Exception {
        return mockMvc.perform(post("/api/trips")
                .cookie(traveler)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"title":"일본 여행","travel_scope":"INTERNATIONAL","country_id":%d,"city_name":"도쿄","start_date":"2026-06-01","end_date":"2026-06-01"}
                        """.formatted(countryId)));
    }

    private Long domesticRegionId(String code) {
        return jdbcTemplate.queryForObject("select id from domestic_regions where code = ?", Long.class, code);
    }

    private Long countryId(String codeAlpha2) {
        return jdbcTemplate.queryForObject("select id from countries where code_alpha2 = ?", Long.class, codeAlpha2);
    }
}
