package com.travelarchive.checklist;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TravelChecklistRepository extends JpaRepository<TravelChecklist, Long> {
    Optional<TravelChecklist> findByTripId(Long tripId);
}
