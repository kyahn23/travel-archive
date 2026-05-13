package com.travelarchive.trip.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.travelarchive.common.enums.TimelineCategory;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TimelineItemRequest(
        String title,
        @JsonAlias("place_name") String placeName,
        String address,
        BigDecimal latitude,
        BigDecimal longitude,
        @JsonAlias("visited_at") LocalDateTime visitedAt,
        TimelineCategory category,
        String memo,
        PhotoRequest photo
) {
    public record PhotoRequest(
            @JsonAlias("storage_key") String storageKey,
            @JsonAlias("file_url") String fileUrl,
            @JsonAlias("original_file_name") String originalFileName,
            @JsonAlias("content_type") String contentType,
            @JsonAlias("file_size") Long fileSize,
            String caption
    ) {
    }
}
