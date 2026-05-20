package com.travelarchive.bucket.dto;

import com.travelarchive.bucket.BucketPlace;
import com.travelarchive.common.enums.BucketStatus;
import com.travelarchive.common.enums.TravelScope;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record BucketPlaceResponse(
        Long id,
        String title,
        TravelScope travelScope,
        String countryId,
        String domesticRegionId,
        String cityName,
        String reason,
        BigDecimal expectedBudget,
        String desiredSeason,
        String companion,
        Integer priority,
        BucketStatus status,
        String referenceUrl,
        String memo,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static BucketPlaceResponse from(BucketPlace bucketPlace) {
        return new BucketPlaceResponse(
                bucketPlace.getId(),
                bucketPlace.getTitle(),
                bucketPlace.getTravelScope(),
                bucketPlace.getCountry() == null ? null : bucketPlace.getCountry().getCodeAlpha2(),
                bucketPlace.getDomesticRegion() == null ? null : bucketPlace.getDomesticRegion().getCode(),
                bucketPlace.getCityName(),
                bucketPlace.getReason(),
                bucketPlace.getExpectedBudget(),
                bucketPlace.getDesiredSeason(),
                bucketPlace.getCompanion(),
                bucketPlace.getPriority(),
                bucketPlace.getStatus(),
                bucketPlace.getReferenceUrl(),
                bucketPlace.getMemo(),
                bucketPlace.getCreatedAt(),
                bucketPlace.getUpdatedAt()
        );
    }
}
