package com.travelarchive.map.dto;

import com.travelarchive.common.enums.TravelScope;
import com.travelarchive.common.enums.TripStatus;
import java.time.LocalDate;
import java.util.List;

public final class MapRegionResponse {
    private MapRegionResponse() {
    }

    public record WorldRegion(String mapKey, String countryCode, String nameKo, String status) {
    }

    public record DomesticRegion(String mapKey, String regionCode, String nameKo, String status) {
    }

    public record RegionDetail(
            String mapKey,
            String name,
            long completedCount,
            long plannedCount,
            long bucketCount,
            List<TripSummary> trips
    ) {
    }

    public record TripSummary(
            Long id,
            String title,
            TravelScope travelScope,
            LocalDate startDate,
            LocalDate endDate,
            TripStatus status,
            String cityName
    ) {
    }
}
