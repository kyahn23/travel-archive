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
        "spring.jpa.hibernate.ddl-auto=create"
})
class SchemaMigrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void jpaCreatesCoreTables() {
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
    }

    private Integer tableCount(String tableName) {
        return jdbcTemplate.queryForObject(
                "select count(*) from information_schema.tables where table_schema = 'public' and table_name = ?",
                Integer.class,
                tableName
        );
    }
}
