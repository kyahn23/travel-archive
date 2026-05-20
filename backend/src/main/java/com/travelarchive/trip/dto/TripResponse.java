package com.travelarchive.trip.dto;

import com.travelarchive.common.enums.TravelScope;
import com.travelarchive.common.enums.TripStatus;
import com.travelarchive.trip.Trip;
import com.travelarchive.trip.TripDay;
import java.time.LocalDate;
import java.util.List;

public record TripResponse(
        Long id,
        String title,
        TravelScope travelScope,
        String countryId,
        String domesticRegionId,
        String cityName,
        LocalDate startDate,
        LocalDate endDate,
        TripStatus status,
        String travelType,
        String companion,
        String summary,
        List<TripDayResponse> tripDays,
        Long coverPhotoId
) {
    public static TripResponse from(Trip trip, List<TripDay> tripDays) {
        return new TripResponse(
                trip.getId(),
                trip.getTitle(),
                trip.getTravelScope(),
                trip.getCountry() == null ? null : trip.getCountry().getCodeAlpha2(),
                trip.getDomesticRegion() == null ? null : trip.getDomesticRegion().getCode(),
                trip.getCityName(),
                trip.getStartDate(),
                trip.getEndDate(),
                trip.getStatus(),
                trip.getTravelType(),
                trip.getCompanion(),
                trip.getSummary(),
                tripDays.stream().map(TripDayResponse::from).toList(),
                null
        );
    }

    public static TripResponse from(Trip trip, List<TripDay> tripDays, Long coverPhotoId) {
        return new TripResponse(
                trip.getId(),
                trip.getTitle(),
                trip.getTravelScope(),
                trip.getCountry() == null ? null : trip.getCountry().getCodeAlpha2(),
                trip.getDomesticRegion() == null ? null : trip.getDomesticRegion().getCode(),
                trip.getCityName(),
                trip.getStartDate(),
                trip.getEndDate(),
                trip.getStatus(),
                trip.getTravelType(),
                trip.getCompanion(),
                trip.getSummary(),
                tripDays.stream().map(TripDayResponse::from).toList(),
                coverPhotoId
        );
    }

    public record TripDayResponse(Long id, Integer dayNo, LocalDate travelDate, String title, String memo) {
        static TripDayResponse from(TripDay tripDay) {
            return new TripDayResponse(tripDay.getId(), tripDay.getDayNo(), tripDay.getTravelDate(), tripDay.getTitle(), tripDay.getMemo());
        }
    }
}
