package com.travelarchive.stats.dto;

import com.travelarchive.common.enums.TravelScope;

public final class StatsResponse {
    private StatsResponse() {
    }

    public record Summary(
            long completedTrips,
            long plannedTrips,
            long travelDays,
            long visitedCountries,
            long visitedDomesticRegions
    ) {
    }

    public record MonthlyCount(String month, long count) {
    }

    public record TopRegion(String name, TravelScope scope, long count) {
    }
}
