package com.travelarchive.trip;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TripRepository extends JpaRepository<Trip, Long> {
    List<Trip> findAllByUserIdOrderByStartDateDescIdDesc(Long userId);

    Optional<Trip> findByIdAndUserId(Long id, Long userId);
}
