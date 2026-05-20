package com.travelarchive.checklist;

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
        "jwt.secret=test-jwt-secret-for-checklist-controller-test-1234567890"
})
class ChecklistControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TravelChecklistItemRepository itemRepository;

    @Autowired
    private TravelChecklistRepository checklistRepository;

    @Autowired
    private TripDayRepository tripDayRepository;

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanDatabase() {
        itemRepository.deleteAll();
        checklistRepository.deleteAll();
        tripDayRepository.deleteAll();
        tripRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void createsChecklistFromTripScopeTemplateAndReturnsExistingChecklist() throws Exception {
        Cookie traveler = signup("checklist-owner@example.com");
        Long tripId = createDomesticTrip(traveler);

        MvcResult created = mockMvc.perform(post("/api/trips/{tripId}/checklists", tripId).cookie(traveler))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.tripId").value(tripId))
                .andExpect(jsonPath("$.data.title").value("국내 여행 기본 준비물"))
                .andExpect(jsonPath("$.data.progressRate").value(0))
                .andExpect(jsonPath("$.data.items.length()").value(12))
                .andExpect(jsonPath("$.data.items[0].category").value("교통"))
                .andExpect(jsonPath("$.data.items[0].content").value("교통편 예약 확인"))
                .andExpect(jsonPath("$.data.items[0].status").value("TODO"))
                .andReturn();

        Long checklistId = JsonPath.parse(created.getResponse().getContentAsString()).read("$.data.id", Long.class);
        assertThat(checklistRepository.count()).isOne();
        assertThat(itemRepository.count()).isEqualTo(12);

        mockMvc.perform(get("/api/trips/{tripId}/checklists", tripId).cookie(traveler))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(checklistId))
                .andExpect(jsonPath("$.data.items.length()").value(12));
        assertThat(checklistRepository.count()).isOne();
        assertThat(itemRepository.count()).isEqualTo(12);
    }

    @Test
    void togglesItemsDeletesItemsAndRecalculatesProgress() throws Exception {
        Cookie traveler = signup("toggle-owner@example.com");
        Long tripId = createDomesticTrip(traveler);

        String body = mockMvc.perform(get("/api/trips/{tripId}/checklists", tripId).cookie(traveler))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        Long itemId = JsonPath.parse(body).read("$.data.items[0].id", Long.class);

        mockMvc.perform(patch("/api/checklist-items/{id}", itemId).cookie(traveler))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.progressRate").value(8))
                .andExpect(jsonPath("$.data.items[0].status").value("DONE"));

        mockMvc.perform(patch("/api/checklist-items/{id}", itemId).cookie(traveler))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.progressRate").value(0))
                .andExpect(jsonPath("$.data.items[0].status").value("TODO"));

        mockMvc.perform(patch("/api/checklist-items/{id}", itemId).cookie(traveler))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.progressRate").value(8));

        mockMvc.perform(delete("/api/checklist-items/{id}", itemId).cookie(traveler))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/trips/{tripId}/checklists", tripId).cookie(traveler))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.progressRate").value(0))
                .andExpect(jsonPath("$.data.items.length()").value(11));
    }

    @Test
    void enforcesTripAndChecklistItemOwnership() throws Exception {
        Cookie owner = signup("checklist-real-owner@example.com");
        Cookie other = signup("checklist-other@example.com");
        Long tripId = createDomesticTrip(owner);

        String body = mockMvc.perform(get("/api/trips/{tripId}/checklists", tripId).cookie(owner))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        Long itemId = JsonPath.parse(body).read("$.data.items[0].id", Long.class);

        mockMvc.perform(get("/api/trips/{tripId}/checklists", tripId).cookie(other))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/trips/{tripId}/checklists", tripId).cookie(other))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/checklist-items/{id}", itemId).cookie(other))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/checklist-items/{id}", itemId).cookie(other))
                .andExpect(status().isForbidden());
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

    private Long createDomesticTrip(Cookie traveler) throws Exception {
        String domesticRegionId = jdbcTemplate.queryForObject("select code from domestic_regions where code = ?", String.class, "KR-11");
        String body = mockMvc.perform(post("/api/trips")
                        .cookie(traveler)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"서울 여행","travel_scope":"DOMESTIC","domestic_region_id":"%s","city_name":"서울","start_date":"2026-05-01","end_date":"2026-05-03"}
                                """.formatted(domesticRegionId)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return JsonPath.parse(body).read("$.data.id", Long.class);
    }
}
