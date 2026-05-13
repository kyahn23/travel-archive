package com.travelarchive;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:travel_archive_test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.enabled=true"
})
class SchemaMigrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void flywayCreatesCoreTablesWithoutCitiesTable() {
        assertThat(tableCount("users")).isOne();
        assertThat(tableCount("countries")).isOne();
        assertThat(tableCount("domestic_regions")).isOne();
        assertThat(tableCount("trips")).isOne();
        assertThat(tableCount("trip_days")).isOne();
        assertThat(tableCount("trip_timeline_items")).isOne();
        assertThat(tableCount("trip_photos")).isOne();
        assertThat(tableCount("bucket_places")).isOne();
        assertThat(tableCount("travel_checklists")).isOne();
        assertThat(tableCount("travel_checklist_items")).isOne();
        assertThat(tableCount("refresh_tokens")).isOne();
        assertThat(tableCount("cities")).isZero();
    }

    @Test
    void flywaySeedsReferenceDataAndChecklistTemplates() {
        assertThat(rowCount("countries")).isEqualTo(20);
        assertThat(rowCount("domestic_regions")).isEqualTo(17);
        assertThat(rowCount("travel_checklist_templates")).isEqualTo(2);
        assertThat(rowCount("travel_checklist_template_items")).isEqualTo(24);

        assertThat(valueCount("domestic_regions", "code", "KR-11")).isOne();
        assertThat(valueCount("domestic_regions", "code", "KR-49")).isOne();
        assertThat(valueCount("countries", "code_alpha2", "JP")).isOne();
        assertThat(valueCount("countries", "map_key", "840")).isOne();
    }

    private Integer tableCount(String tableName) {
        return jdbcTemplate.queryForObject(
                "select count(*) from information_schema.tables where upper(table_schema) = 'PUBLIC' and upper(table_name) = upper(?)",
                Integer.class,
                tableName
        );
    }

    private Integer rowCount(String tableName) {
        return jdbcTemplate.queryForObject("select count(*) from " + tableName, Integer.class);
    }

    private Integer valueCount(String tableName, String columnName, String value) {
        return jdbcTemplate.queryForObject(
                "select count(*) from " + tableName + " where " + columnName + " = ?",
                Integer.class,
                value
        );
    }
}
