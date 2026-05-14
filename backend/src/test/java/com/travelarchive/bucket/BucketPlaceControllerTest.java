package com.travelarchive.bucket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.travelarchive.auth.AuthController;
import com.travelarchive.auth.RefreshTokenRepository;
import com.travelarchive.common.enums.BucketStatus;
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
        "jwt.secret=test-jwt-secret-for-bucket-controller-test-1234567890"
})
class BucketPlaceControllerTest {
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
        jdbcTemplate.update("delete from travel_checklist_items");
        jdbcTemplate.update("delete from travel_checklists");
        tripDayRepository.deleteAll();
        tripRepository.deleteAll();
        bucketPlaceRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void createsListsGetsUpdatesAndDeletesOwnedBuckets() throws Exception {
        Cookie traveler = signup("bucket-owner@example.com");
        Long domesticRegionId = domesticRegionId("KR-11");

        Long bucketId = idFrom(createDomesticBucket(traveler, "서울 가기", domesticRegionId)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("서울 가기"))
                .andExpect(jsonPath("$.data.companion").value("친구"))
                .andExpect(jsonPath("$.data.status").value("WANT_TO_GO"))
                .andExpect(jsonPath("$.data.priority").value(2))
                .andReturn()
                .getResponse()
                .getContentAsString());

        mockMvc.perform(get("/api/buckets").cookie(traveler))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(bucketId));

        mockMvc.perform(get("/api/buckets/{id}", bucketId).cookie(traveler))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cityName").value("서울"));

        mockMvc.perform(patch("/api/buckets/{id}", bucketId)
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"서울 꼭 가기","priority":1,"status":"ON_HOLD","companion":"가족","memo":"나중에"}
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("서울 꼭 가기"))
                .andExpect(jsonPath("$.data.companion").value("가족"))
                .andExpect(jsonPath("$.data.priority").value(1))
                .andExpect(jsonPath("$.data.status").value("ON_HOLD"));

        mockMvc.perform(delete("/api/buckets/{id}", bucketId).cookie(traveler))
                .andExpect(status().isOk());
        assertThat(bucketPlaceRepository.findById(bucketId)).isEmpty();
    }

    @Test
    void enforcesOwnershipAndScopeValidation() throws Exception {
        Cookie owner = signup("bucket-owner2@example.com");
        Cookie other = signup("bucket-other@example.com");
        Long countryId = countryId("JP");

        Long bucketId = idFrom(createInternationalBucket(owner, countryId)
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString());

        mockMvc.perform(get("/api/buckets/{id}", bucketId).cookie(other))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/buckets")
                        .cookie(owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"잘못된 버킷","travel_scope":"DOMESTIC","country_id":1}
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/buckets")
                        .cookie(owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"도시 누락","travel_scope":"INTERNATIONAL","country_id":%d}
                                """.formatted(countryId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void convertsBucketToPlannedTripWithGeneratedDaysAndChecklistTemplateItems() throws Exception {
        Cookie traveler = signup("bucket-convert@example.com");
        Long countryId = countryId("JP");

        Long bucketId = idFrom(createInternationalBucket(traveler, countryId)
                .andReturn()
                .getResponse()
                .getContentAsString());

        Long tripId = idFrom(mockMvc.perform(post("/api/buckets/{id}/convert-to-trip", bucketId)
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"start_date":"2026-07-01","end_date":"2026-07-03","status":"BOOKED"}
                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("일본 가기"))
                .andExpect(jsonPath("$.data.companion").value("친구"))
                .andExpect(jsonPath("$.data.travelScope").value("INTERNATIONAL"))
                .andExpect(jsonPath("$.data.status").value("PLANNED"))
                .andExpect(jsonPath("$.data.tripDays.length()").value(3))
                .andReturn()
                .getResponse()
                .getContentAsString());

        assertThat(tripDayRepository.countByTripId(tripId)).isEqualTo(3);
        assertThat(jdbcTemplate.queryForObject("select bucket_place_id from trips where id = ?", Long.class, tripId)).isEqualTo(bucketId);
        assertThat(bucketPlaceRepository.findById(bucketId).orElseThrow().getStatus()).isEqualTo(BucketStatus.BOOKED);
        assertThat(jdbcTemplate.queryForObject("select count(*) from travel_checklists where trip_id = ?", Long.class, tripId)).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("""
                select count(*) from travel_checklist_items item
                join travel_checklists checklist on checklist.id = item.checklist_id
                where checklist.trip_id = ?
                """, Long.class, tripId)).isEqualTo(12);
    }

    @Test
    void blocksVisitedAndOnHoldBucketConversion() throws Exception {
        Cookie traveler = signup("bucket-block@example.com");
        Long domesticRegionId = domesticRegionId("KR-11");
        Long bucketId = idFrom(createDomesticBucket(traveler, "보류 여행", domesticRegionId)
                .andReturn()
                .getResponse()
                .getContentAsString());

        mockMvc.perform(patch("/api/buckets/{id}", bucketId)
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ON_HOLD\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/buckets/{id}/convert-to-trip", bucketId)
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"start_date":"2026-07-01","end_date":"2026-07-02"}
                                """))
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

    private org.springframework.test.web.servlet.ResultActions createDomesticBucket(Cookie traveler, String title,
                                                                                    Long domesticRegionId) throws Exception {
        return mockMvc.perform(post("/api/buckets")
                .cookie(traveler)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"title":"%s","travel_scope":"DOMESTIC","domestic_region_id":%d,"city_name":"서울","reason":"맛집","expected_budget":150000,"desired_season":"봄","companion":"친구","priority":2,"reference_url":"https://example.com","memo":"메모"}
                        """.formatted(title, domesticRegionId)));
    }

    private org.springframework.test.web.servlet.ResultActions createInternationalBucket(Cookie traveler, Long countryId) throws Exception {
        return mockMvc.perform(post("/api/buckets")
                .cookie(traveler)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"title":"일본 가기","travel_scope":"INTERNATIONAL","country_id":%d,"city_name":"도쿄","reason":"벚꽃","companion":"친구","priority":3}
                        """.formatted(countryId)));
    }

    private Long domesticRegionId(String code) {
        return jdbcTemplate.queryForObject("select id from domestic_regions where code = ?", Long.class, code);
    }

    private Long countryId(String codeAlpha2) {
        return jdbcTemplate.queryForObject("select id from countries where code_alpha2 = ?", Long.class, codeAlpha2);
    }
}
