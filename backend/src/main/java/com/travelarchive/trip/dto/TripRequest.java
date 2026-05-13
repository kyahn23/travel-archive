package com.travelarchive.trip.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.travelarchive.common.enums.TravelScope;
import com.travelarchive.common.enums.TripStatus;
import java.time.LocalDate;

public record TripRequest(
        String title,
        @JsonAlias("travel_scope") TravelScope travelScope,
        @JsonAlias("country_id") Long countryId,
        @JsonAlias("domestic_region_id") Long domesticRegionId,
        @JsonAlias("city_name") String cityName,
        @JsonAlias("start_date") LocalDate startDate,
        @JsonAlias("end_date") LocalDate endDate,
        @JsonAlias("travel_type") String travelType,
        String companion,
        String summary,
        TripStatus status
) {
}
