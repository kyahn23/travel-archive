package com.travelarchive.trip.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.travelarchive.common.enums.TimelineCategory;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TimelineItemRequest(
        @Size(max = 160) String title,
        @JsonAlias("place_name") @Size(max = 160) String placeName,
        @Size(max = 300) String address,
        @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
        @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,
        @JsonAlias("visited_at") LocalDateTime visitedAt,
        TimelineCategory category,
        @Size(max = 4000) String memo
) {
}
