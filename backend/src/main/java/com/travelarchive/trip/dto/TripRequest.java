package com.travelarchive.trip.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.travelarchive.common.enums.TravelScope;
import com.travelarchive.common.enums.TripStatus;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record TripRequest(
        @Size(max = 160) String title,
        @JsonAlias("travel_scope") TravelScope travelScope,
        @JsonAlias("country_id") @Size(max = 2) String countryId,
        @JsonAlias("domestic_region_id") @Size(max = 10) String domesticRegionId,
        @JsonAlias("city_name") @Size(max = 120) String cityName,
        @JsonAlias("start_date") LocalDate startDate,
        @JsonAlias("end_date") LocalDate endDate,
        @JsonAlias("travel_type") @Size(max = 80) String travelType,
        @Size(max = 120) String companion,
        @Size(max = 4000) String summary,
        TripStatus status
) {
}
