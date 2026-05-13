package com.travelarchive.trip;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TripDayRepository extends JpaRepository<TripDay, Long> {
    List<TripDay> findAllByTripIdOrderByDayNo(Long tripId);

    List<TripDay> findAllByTripIdInOrderByTripIdAscDayNoAsc(List<Long> tripIds);

    long countByTripId(Long tripId);

    void deleteByTripId(Long tripId);
}
