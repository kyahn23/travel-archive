package com.travelarchive.checklist;

import com.travelarchive.common.enums.ChecklistItemStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TravelChecklistItemRepository extends JpaRepository<TravelChecklistItem, Long> {
    List<TravelChecklistItem> findAllByChecklistIdOrderBySortOrderAscIdAsc(Long checklistId);

    long countByChecklistId(Long checklistId);

    long countByChecklistIdAndStatus(Long checklistId, ChecklistItemStatus status);

    @Modifying
    @Query("delete from TravelChecklistItem item where item.checklist.id in :checklistIds")
    long deleteByChecklistIdIn(@Param("checklistIds") List<Long> checklistIds);
}
