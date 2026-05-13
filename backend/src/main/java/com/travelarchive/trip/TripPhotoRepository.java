package com.travelarchive.trip;

import com.travelarchive.common.enums.PhotoOwnerType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripPhotoRepository extends JpaRepository<TripPhoto, Long> {
    long countByTimelineItemIdAndOwnerType(Long timelineItemId, PhotoOwnerType ownerType);

    long countByTripIdAndOwnerType(Long tripId, PhotoOwnerType ownerType);

    List<TripPhoto> findAllByTimelineItemIdAndOwnerTypeOrderBySortOrderAscIdAsc(Long timelineItemId, PhotoOwnerType ownerType);

    List<TripPhoto> findAllByTripIdAndOwnerTypeOrderBySortOrderAscIdAsc(Long tripId, PhotoOwnerType ownerType);

    List<TripPhoto> findAllByTripIdInAndOwnerTypeOrderByTripIdAscSortOrderAscIdAsc(List<Long> tripIds, PhotoOwnerType ownerType);

    List<TripPhoto> findAllByTimelineItemIdInAndOwnerTypeOrderByTimelineItemIdAscSortOrderAscIdAsc(List<Long> timelineItemIds, PhotoOwnerType ownerType);

    @Query("""
            select photo from TripPhoto photo
            join fetch photo.trip trip
            where photo.id = :id and trip.user.id = :userId
            """)
    Optional<TripPhoto> findOwnedById(@Param("id") Long id, @Param("userId") Long userId);
}
