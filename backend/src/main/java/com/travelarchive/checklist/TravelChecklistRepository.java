package com.travelarchive.checklist;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TravelChecklistRepository extends JpaRepository<TravelChecklist, Long> {
    Optional<TravelChecklist> findByTripId(Long tripId);

    List<TravelChecklist> findAllByTripId(Long tripId);

    long deleteByTripId(Long tripId);
}
