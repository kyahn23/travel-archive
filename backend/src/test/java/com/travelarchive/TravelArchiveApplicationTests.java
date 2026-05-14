package com.travelarchive;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=create",
        "jwt.secret=test-jwt-secret-for-context-loads-test-1234567890"
})
class TravelArchiveApplicationTests {

    @Test
    void contextLoads() {
    }
}
