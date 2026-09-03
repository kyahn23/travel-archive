package com.travelarchive.bucket.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.travelarchive.common.enums.BucketStatus;
import com.travelarchive.common.enums.TravelScope;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record BucketPlaceRequest(
        @Size(max = 160) String title,
        @JsonAlias("travel_scope") TravelScope travelScope,
        @JsonAlias("country_id") @Size(max = 2) String countryId,
        @JsonAlias("domestic_region_id") @Size(max = 10) String domesticRegionId,
        @JsonAlias("city_name") @Size(max = 120) String cityName,
        @Size(max = 1000) String reason,
        @JsonAlias("expected_budget") @DecimalMin("0.0") BigDecimal expectedBudget,
        @JsonAlias("desired_season") @Size(max = 60) String desiredSeason,
        @Size(max = 100) String companion,
        @Min(1) @Max(5) Integer priority,
        BucketStatus status,
        @JsonAlias("reference_url") @Size(max = 500) String referenceUrl,
        @Size(max = 4000) String memo,
        @JsonAlias("start_date") LocalDate startDate,
        @JsonAlias("end_date") LocalDate endDate
) {
}
