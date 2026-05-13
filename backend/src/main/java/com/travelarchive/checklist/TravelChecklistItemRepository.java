package com.travelarchive.checklist;

import com.travelarchive.common.enums.ChecklistItemStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TravelChecklistItemRepository extends JpaRepository<TravelChecklistItem, Long> {
    List<TravelChecklistItem> findAllByChecklistIdOrderBySortOrderAscIdAsc(Long checklistId);

    long countByChecklistId(Long checklistId);

    long countByChecklistIdAndStatus(Long checklistId, ChecklistItemStatus status);
}
