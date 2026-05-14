package com.travelarchive.stats;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.travelarchive.auth.AuthController;
import com.travelarchive.auth.RefreshTokenRepository;
import com.travelarchive.trip.TripDayRepository;
import com.travelarchive.trip.TripRepository;
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
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=create",
        "jwt.secret=test-jwt-secret-for-stats-controller-test-1234567890"
})
class StatsControllerTest {
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
    void returnsSummaryMonthlyAndTopRegionsForAuthenticatedUserOnly() throws Exception {
        Cookie traveler = signup("stats@example.com");
        Cookie other = signup("other-stats@example.com");
        Long seoulId = domesticRegionId("KR-11");
        Long busanId = domesticRegionId("KR-26");
        Long japanId = countryId("JP");
        Long usaId = countryId("US");

        complete(createDomesticTrip(traveler, "서울 봄", seoulId, "2026-05-01", "2026-05-03"), traveler);
        complete(createDomesticTrip(traveler, "서울 여름", seoulId, "2026-05-10", "2026-05-10"), traveler);
        complete(createDomesticTrip(traveler, "부산", busanId, "2026-06-01", "2026-06-02"), traveler);
        complete(createInternationalTrip(traveler, "일본", japanId, "2026-06-15", "2026-06-16"), traveler);
        Long plannedTripId = createInternationalTrip(traveler, "미국 계획", usaId, "2026-07-01", "2026-07-05");
        Long cancelledTripId = createDomesticTrip(traveler, "취소", busanId, "2026-07-10", "2026-07-12");
        cancel(cancelledTripId, traveler);
        complete(createInternationalTrip(other, "타인 일본", japanId, "2026-05-01", "2026-05-07"), other);

        assertThat(plannedTripId).isNotNull();

        mockMvc.perform(get("/api/statistics/summary").cookie(traveler))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.completedTrips").value(4))
                .andExpect(jsonPath("$.data.plannedTrips").value(1))
                .andExpect(jsonPath("$.data.travelDays").value(8))
                .andExpect(jsonPath("$.data.visitedCountries").value(1))
                .andExpect(jsonPath("$.data.visitedDomesticRegions").value(2));

        mockMvc.perform(get("/api/statistics/monthly").cookie(traveler))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].month").value("2026-05"))
                .andExpect(jsonPath("$.data[0].count").value(2))
                .andExpect(jsonPath("$.data[1].month").value("2026-06"))
                .andExpect(jsonPath("$.data[1].count").value(2))
                .andExpect(jsonPath("$.data.length()").value(2));

        mockMvc.perform(get("/api/statistics/top-regions?limit=2").cookie(traveler))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("서울특별시"))
                .andExpect(jsonPath("$.data[0].scope").value("DOMESTIC"))
                .andExpect(jsonPath("$.data[0].count").value(2))
                .andExpect(jsonPath("$.data[1].name").value("부산광역시"))
                .andExpect(jsonPath("$.data[1].scope").value("DOMESTIC"))
                .andExpect(jsonPath("$.data[1].count").value(1))
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    void requiresAuthenticationForStatistics() throws Exception {
        mockMvc.perform(get("/api/statistics/summary"))
                .andExpect(status().isUnauthorized());
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

    private Long createDomesticTrip(Cookie traveler, String title, Long domesticRegionId, String startDate, String endDate) throws Exception {
        return idFrom(mockMvc.perform(post("/api/trips")
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"%s","travel_scope":"DOMESTIC","domestic_region_id":%d,"city_name":"서울","start_date":"%s","end_date":"%s"}
                                """.formatted(title, domesticRegionId, startDate, endDate)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());
    }

    private Long createInternationalTrip(Cookie traveler, String title, Long countryId, String startDate, String endDate) throws Exception {
        return idFrom(mockMvc.perform(post("/api/trips")
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"%s","travel_scope":"INTERNATIONAL","country_id":%d,"city_name":"도시","start_date":"%s","end_date":"%s"}
                                """.formatted(title, countryId, startDate, endDate)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());
    }

    private void complete(Long tripId, Cookie traveler) throws Exception {
        mockMvc.perform(patch("/api/trips/{id}/status", tripId)
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\"}"))
                .andExpect(status().isOk());
    }

    private void cancel(Long tripId, Cookie traveler) throws Exception {
        mockMvc.perform(patch("/api/trips/{id}/status", tripId)
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CANCELLED\"}"))
                .andExpect(status().isOk());
    }

    private Long idFrom(String body) {
        return JsonPath.parse(body).read("$.data.id", Long.class);
    }

    private Long domesticRegionId(String code) {
        return jdbcTemplate.queryForObject("select id from domestic_regions where code = ?", Long.class, code);
    }

    private Long countryId(String codeAlpha2) {
        return jdbcTemplate.queryForObject("select id from countries where code_alpha2 = ?", Long.class, codeAlpha2);
    }
}
