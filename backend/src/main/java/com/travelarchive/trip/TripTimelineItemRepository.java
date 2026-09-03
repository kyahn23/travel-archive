package com.travelarchive.trip;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripTimelineItemRepository extends JpaRepository<TripTimelineItem, Long> {

    @Query("""
            select case when count(item.id) > 0 then true else false end
              from TripTimelineItem item
              join item.tripDay day
              where day.trip.id = :tripId
            """)
    boolean existsByTripId(@Param("tripId") Long tripId);

    @Query("""
            select item from TripTimelineItem item
            join fetch item.tripDay day
            join fetch day.trip trip
            where trip.id = :tripId
            order by day.dayNo asc,
                     case when item.itemTime is null then 1 else 0 end asc,
                     item.itemTime asc,
                     item.id asc
            """)
    List<TripTimelineItem> findTimelineByTripId(@Param("tripId") Long tripId);

    @Query("""
            select item from TripTimelineItem item
            join fetch item.tripDay day
            join fetch day.trip trip
            where item.id = :id and trip.user.id = :userId
            """)
    Optional<TripTimelineItem> findOwnedById(@Param("id") Long id, @Param("userId") Long userId);

    @Query("""
            select item from TripTimelineItem item
            join fetch item.tripDay day
            where day.trip.id = :tripId
            """)
    List<TripTimelineItem> findAllByTripId(@Param("tripId") Long tripId);

    long deleteByTripDayIdIn(List<Long> tripDayIds);
}
