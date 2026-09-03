package com.travelarchive.map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.travelarchive.auth.AuthController;
import com.travelarchive.auth.RefreshTokenRepository;
import com.travelarchive.bucket.BucketPlaceRepository;
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
        "jwt.secret=test-jwt-secret-for-map-controller-test-1234567890"
})
class MapControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BucketPlaceRepository bucketPlaceRepository;

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
        jdbcTemplate.execute("truncate table users restart identity cascade");
        jdbcTemplate.update("delete from travel_checklist_items");
        jdbcTemplate.update("delete from travel_checklists");
        tripDayRepository.deleteAll();
        tripRepository.deleteAll();
        bucketPlaceRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void aggregatesWorldAndDomesticMapsWithStatusPriorityAndOwnership() throws Exception {
        Cookie traveler = signup("map-owner@example.com");
        Cookie other = signup("map-other@example.com");
        String japanId = countryId("JP");
        String usaId = countryId("US");
        String franceId = countryId("FR");
        String seoulId = domesticRegionId("KR-11");
        String busanId = domesticRegionId("KR-26");
        String jejuId = domesticRegionId("KR-49");

        complete(createInternationalTrip(traveler, "일본 완료", japanId, "2026-05-01", "2026-05-03"), traveler);
        createInternationalTrip(traveler, "일본 계획", japanId, "2026-06-01", "2026-06-02");
        createInternationalBucket(traveler, "일본 버킷", japanId);
        createInternationalTrip(traveler, "미국 계획", usaId, "2026-07-01", "2026-07-03");
        createInternationalBucket(traveler, "프랑스 버킷", franceId);
        Long onHoldBucketId = createInternationalBucket(traveler, "보류 버킷", countryId("IT"));
        holdBucket(onHoldBucketId, traveler);
        complete(createInternationalTrip(other, "타인 일본", japanId, "2026-08-01", "2026-08-02"), other);

        complete(createDomesticTrip(traveler, "서울 완료", seoulId, "2026-05-10", "2026-05-11"), traveler);
        createDomesticTrip(traveler, "부산 계획", busanId, "2026-06-10", "2026-06-11");
        createDomesticBucket(traveler, "부산 버킷", busanId);
        createDomesticBucket(traveler, "제주 버킷", jejuId);

        mockMvc.perform(get("/api/maps/world").cookie(traveler))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].mapKey").value("392"))
                .andExpect(jsonPath("$.data[0].countryCode").value("JP"))
                .andExpect(jsonPath("$.data[0].nameKo").value("일본"))
                .andExpect(jsonPath("$.data[0].status").value("COMPLETED"))
                .andExpect(jsonPath("$.data[1].mapKey").value("840"))
                .andExpect(jsonPath("$.data[1].status").value("PLANNED"))
                .andExpect(jsonPath("$.data[2].mapKey").value("250"))
                .andExpect(jsonPath("$.data[2].status").value("BUCKET"))
                .andExpect(jsonPath("$.data.length()").value(3));

        mockMvc.perform(get("/api/maps/domestic").cookie(traveler))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].mapKey").value("KR-11"))
                .andExpect(jsonPath("$.data[0].regionCode").value("KR-11"))
                .andExpect(jsonPath("$.data[0].status").value("COMPLETED"))
                .andExpect(jsonPath("$.data[1].mapKey").value("KR-26"))
                .andExpect(jsonPath("$.data[1].status").value("PLANNED"))
                .andExpect(jsonPath("$.data[2].mapKey").value("KR-49"))
                .andExpect(jsonPath("$.data[2].status").value("BUCKET"))
                .andExpect(jsonPath("$.data.length()").value(3));
    }

    @Test
    void returnsRegionDetailCountsAndTripsForMapKey() throws Exception {
        Cookie traveler = signup("map-detail@example.com");
        String seoulId = domesticRegionId("KR-11");

        complete(createDomesticTrip(traveler, "서울 완료", seoulId, "2026-05-01", "2026-05-02"), traveler);
        createDomesticTrip(traveler, "서울 계획", seoulId, "2026-06-01", "2026-06-03");
        createDomesticBucket(traveler, "서울 버킷", seoulId);
        Long hiddenBucketId = createDomesticBucket(traveler, "서울 보류", seoulId);
        holdBucket(hiddenBucketId, traveler);

        mockMvc.perform(get("/api/maps/regions/KR-11").cookie(traveler))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mapKey").value("KR-11"))
                .andExpect(jsonPath("$.data.name").value("서울특별시"))
                .andExpect(jsonPath("$.data.completedCount").value(1))
                .andExpect(jsonPath("$.data.plannedCount").value(1))
                .andExpect(jsonPath("$.data.bucketCount").value(1))
                .andExpect(jsonPath("$.data.trips[0].title").value("서울 계획"))
                .andExpect(jsonPath("$.data.trips[0].status").value("PLANNED"))
                .andExpect(jsonPath("$.data.trips[1].title").value("서울 완료"))
                .andExpect(jsonPath("$.data.trips[1].status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.trips.length()").value(2));

        mockMvc.perform(get("/api/maps/regions/UNKNOWN").cookie(traveler))
                .andExpect(status().isNotFound());
    }

    @Test
    void requiresAuthenticationForMapEndpoints() throws Exception {
        mockMvc.perform(get("/api/maps/world"))
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

    private Long createInternationalTrip(Cookie traveler, String title, String countryId, String startDate, String endDate) throws Exception {
        return idFrom(mockMvc.perform(post("/api/trips")
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"%s","travel_scope":"INTERNATIONAL","country_id":"%s","city_name":"도시","start_date":"%s","end_date":"%s"}
                                """.formatted(title, countryId, startDate, endDate)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());
    }

    private Long createDomesticTrip(Cookie traveler, String title, String domesticRegionId, String startDate, String endDate) throws Exception {
        return idFrom(mockMvc.perform(post("/api/trips")
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"%s","travel_scope":"DOMESTIC","domestic_region_id":"%s","city_name":"서울","start_date":"%s","end_date":"%s"}
                                """.formatted(title, domesticRegionId, startDate, endDate)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());
    }

    private Long createInternationalBucket(Cookie traveler, String title, String countryId) throws Exception {
        return idFrom(mockMvc.perform(post("/api/buckets")
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"%s","travel_scope":"INTERNATIONAL","country_id":"%s","city_name":"도시","priority":3}
                                """.formatted(title, countryId)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());
    }

    private Long createDomesticBucket(Cookie traveler, String title, String domesticRegionId) throws Exception {
        return idFrom(mockMvc.perform(post("/api/buckets")
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"%s","travel_scope":"DOMESTIC","domestic_region_id":"%s","city_name":"서울","priority":3}
                                """.formatted(title, domesticRegionId)))
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

    private void holdBucket(Long bucketId, Cookie traveler) throws Exception {
        mockMvc.perform(patch("/api/buckets/{id}", bucketId)
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ON_HOLD\"}"))
                .andExpect(status().isOk());
    }

    private Long idFrom(String body) {
        return JsonPath.parse(body).read("$.data.id", Long.class);
    }

    private String domesticRegionId(String code) {
        return jdbcTemplate.queryForObject("select code from domestic_regions where code = ?", String.class, code);
    }

    private String countryId(String codeAlpha2) {
        return jdbcTemplate.queryForObject("select code_alpha2 from countries where code_alpha2 = ?", String.class, codeAlpha2);
    }
}
