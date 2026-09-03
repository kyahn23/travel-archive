package com.travelarchive;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.flyway.enabled=true",
        "spring.flyway.clean-disabled=false"
})
class SchemaMigrationTest {

    private static final List<String> REQUIRED_TABLES = List.of(
            "users",
            "countries",
            "domestic_regions",
            "bucket_places",
            "trips",
            "trip_days",
            "trip_timeline_items",
            "trip_photos",
            "travel_checklists",
            "travel_checklist_items",
            "travel_checklist_templates",
            "travel_checklist_template_items",
            "refresh_tokens"
    );

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void flywayCreatedAllThirteenTables() {
        for (String table : REQUIRED_TABLES) {
            assertThat(tableCount(table))
                    .as("table %s should exist after Flyway V1", table)
                    .isOne();
        }
    }

    @Test
    void flywayHistoryHasV1V2V3Success() {
        List<String> types = jdbcTemplate.queryForList(
                "select type from flyway_schema_history where success = true order by installed_rank",
                String.class);
        assertThat(types).containsOnly("SQL").hasSizeGreaterThanOrEqualTo(3);
    }

    @Test
    void referenceSeedKeysPresent() {
        Integer countries = jdbcTemplate.queryForObject(
                "select count(*) from countries", Integer.class);
        Integer regions = jdbcTemplate.queryForObject(
                "select count(*) from domestic_regions", Integer.class);
        Integer templates = jdbcTemplate.queryForObject(
                "select count(*) from travel_checklist_templates", Integer.class);
        assertThat(countries).isGreaterThan(0);
        assertThat(regions).isGreaterThan(0);
        assertThat(templates).isGreaterThan(0);
    }

    @Test
    void namedTemplateUniqueConstraintsExist() {
        Integer constraintCount = jdbcTemplate.queryForObject(
                "select count(*) from pg_constraint where conname in (?, ?)",
                Integer.class,
                "uq_checklist_template_scope_title",
                "uq_checklist_template_item_order");
        assertThat(constraintCount).isEqualTo(2);
    }

    private Integer tableCount(String tableName) {
        return jdbcTemplate.queryForObject(
                "select count(*) from information_schema.tables where table_schema = 'public' and table_name = ?",
                Integer.class,
                tableName);
    }
}
