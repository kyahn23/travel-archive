package com.travelarchive.bucket.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.travelarchive.common.enums.BucketStatus;
import com.travelarchive.common.enums.TravelScope;
import java.math.BigDecimal;
import java.time.LocalDate;

public record BucketPlaceRequest(
        String title,
        @JsonAlias("travel_scope") TravelScope travelScope,
        @JsonAlias("country_id") String countryId,
        @JsonAlias("domestic_region_id") String domesticRegionId,
        @JsonAlias("city_name") String cityName,
        String reason,
        @JsonAlias("expected_budget") BigDecimal expectedBudget,
        @JsonAlias("desired_season") String desiredSeason,
        String companion,
        Integer priority,
        BucketStatus status,
        @JsonAlias("reference_url") String referenceUrl,
        String memo,
        @JsonAlias("start_date") LocalDate startDate,
        @JsonAlias("end_date") LocalDate endDate
) {
}
