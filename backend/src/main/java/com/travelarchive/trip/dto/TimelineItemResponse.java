package com.travelarchive.trip.dto;

import com.travelarchive.common.enums.TimelineCategory;
import com.travelarchive.trip.TripDay;
import com.travelarchive.trip.TripPhoto;
import com.travelarchive.trip.TripTimelineItem;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public record TimelineItemResponse(
        Long id,
        Long tripDayId,
        Integer tripDay,
        LocalDate travelDate,
        LocalDateTime visitedAt,
        String title,
        String placeName,
        String address,
        BigDecimal latitude,
        BigDecimal longitude,
        TimelineCategory category,
        String memo,
        List<PhotoResponse> photos
) {
    public static TimelineItemResponse from(TripTimelineItem item, List<TripPhoto> photos) {
        TripDay day = item.getTripDay();
        LocalTime time = item.getItemTime();
        return new TimelineItemResponse(
                item.getId(),
                day.getId(),
                day.getDayNo(),
                day.getTravelDate(),
                time == null ? null : LocalDateTime.of(day.getTravelDate(), time),
                item.getTitle(),
                item.getPlaceName(),
                item.getAddress(),
                item.getLatitude(),
                item.getLongitude(),
                item.getCategory(),
                item.getMemo(),
                photos.stream().map(PhotoResponse::from).toList()
        );
    }

    public record DayGroup(Long tripDayId, Integer tripDay, LocalDate travelDate, List<TimelineItemResponse> items) {
        public static DayGroup from(TripDay day, List<TimelineItemResponse> items) {
            return new DayGroup(day.getId(), day.getDayNo(), day.getTravelDate(), items);
        }
    }

    public record PhotoResponse(Long id, String storageKey, String fileUrl, String originalFileName,
                                String contentType, Long fileSize, String caption, Integer sortOrder) {
        public static PhotoResponse from(TripPhoto photo) {
            return new PhotoResponse(photo.getId(), photo.getStorageKey(), photo.getFileUrl(), photo.getOriginalFileName(),
                    photo.getContentType(), photo.getFileSize(), photo.getCaption(), photo.getSortOrder());
        }
    }
}
