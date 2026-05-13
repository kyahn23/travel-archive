package com.travelarchive.checklist;

import com.travelarchive.common.enums.ChecklistItemStatus;
import com.travelarchive.common.enums.TravelScope;
import com.travelarchive.trip.Trip;
import com.travelarchive.trip.TripRepository;
import com.travelarchive.user.User;
import com.travelarchive.user.UserRepository;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ChecklistService {
    private final TravelChecklistRepository checklistRepository;
    private final TravelChecklistItemRepository itemRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final EntityManager entityManager;

    public ChecklistService(TravelChecklistRepository checklistRepository,
                            TravelChecklistItemRepository itemRepository,
                            TripRepository tripRepository,
                            UserRepository userRepository,
                            EntityManager entityManager) {
        this.checklistRepository = checklistRepository;
        this.itemRepository = itemRepository;
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
        this.entityManager = entityManager;
    }

    @Transactional
    public ChecklistResponse getOrCreate(String email, Long tripId) {
        User user = currentUser(email);
        Trip trip = findOwnedTrip(tripId, user.getId());
        TravelChecklist checklist = checklistRepository.findByTripId(trip.getId())
                .orElseGet(() -> createFromTemplate(trip));
        return response(checklist);
    }

    @Transactional
    public ChecklistResponse create(String email, Long tripId) {
        User user = currentUser(email);
        Trip trip = findOwnedTrip(tripId, user.getId());
        TravelChecklist checklist = checklistRepository.findByTripId(trip.getId())
                .orElseGet(() -> createFromTemplate(trip));
        return response(checklist);
    }

    @Transactional
    public ChecklistResponse toggleItem(String email, Long itemId) {
        User user = currentUser(email);
        TravelChecklistItem item = findOwnedItem(itemId, user.getId());
        item.toggleStatus();
        recalculateProgress(item.getChecklist());
        return response(item.getChecklist());
    }

    @Transactional
    public void deleteItem(String email, Long itemId) {
        User user = currentUser(email);
        TravelChecklistItem item = findOwnedItem(itemId, user.getId());
        TravelChecklist checklist = item.getChecklist();
        itemRepository.delete(item);
        itemRepository.flush();
        recalculateProgress(checklist);
    }

    @Transactional
    public ChecklistItemResponse createCustomItem(String email, Long checklistId, String content, String category) {
        User user = currentUser(email);
        TravelChecklist checklist = checklistRepository.findById(checklistId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Checklist not found"));
        if (!checklist.getTrip().getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Checklist not found");
        }
        if (content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content is required");
        }
        String safeCategory = (category == null || category.isBlank()) ? "ETC" : category;
        long maxSortOrder = itemRepository.findAllByChecklistIdOrderBySortOrderAscIdAsc(checklistId)
                .stream()
                .mapToLong(TravelChecklistItem::getSortOrder)
                .max()
                .orElse(0);
        TravelChecklistItem item = itemRepository.save(new TravelChecklistItem(checklist, safeCategory, content.trim(), (int) (maxSortOrder + 1)));
        recalculateProgress(checklist);
        return ChecklistItemResponse.from(item);
    }

    private TravelChecklist createFromTemplate(Trip trip) {
        TravelChecklistTemplate template = activeTemplate(trip.getTravelScope());
        TravelChecklist checklist = checklistRepository.save(new TravelChecklist(trip, template.getTitle()));
        templateItems(template.getId()).forEach(templateItem -> itemRepository.save(new TravelChecklistItem(
                checklist,
                templateItem.getCategory(),
                templateItem.getContent(),
                templateItem.getSortOrder()
        )));
        recalculateProgress(checklist);
        return checklist;
    }

    private TravelChecklistTemplate activeTemplate(TravelScope travelScope) {
        return entityManager.createQuery("""
                        select t from TravelChecklistTemplate t
                        where t.travelScope = :travelScope and t.active = true
                        order by t.displayOrder asc, t.id asc
                        """, TravelChecklistTemplate.class)
                .setParameter("travelScope", travelScope)
                .setMaxResults(1)
                .getResultStream()
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Checklist template not found"));
    }

    private List<TravelChecklistTemplateItem> templateItems(Long templateId) {
        return entityManager.createQuery("""
                        select i from TravelChecklistTemplateItem i
                        where i.template.id = :templateId
                        order by i.sortOrder asc, i.id asc
                        """, TravelChecklistTemplateItem.class)
                .setParameter("templateId", templateId)
                .getResultList();
    }

    private User currentUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private Trip findOwnedTrip(Long tripId, Long userId) {
        return tripRepository.findByIdAndUserId(tripId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Trip not found"));
    }

    private TravelChecklistItem findOwnedItem(Long itemId, Long userId) {
        TravelChecklistItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Checklist item not found"));
        if (!item.getChecklist().getTrip().getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Checklist item not found");
        }
        return item;
    }

    private void recalculateProgress(TravelChecklist checklist) {
        long totalCount = itemRepository.countByChecklistId(checklist.getId());
        long doneCount = itemRepository.countByChecklistIdAndStatus(checklist.getId(), ChecklistItemStatus.DONE);
        checklist.updateProgress(doneCount, totalCount);
    }

    private ChecklistResponse response(TravelChecklist checklist) {
        List<TravelChecklistItem> items = itemRepository.findAllByChecklistIdOrderBySortOrderAscIdAsc(checklist.getId());
        return ChecklistResponse.from(checklist, items);
    }

    public record ChecklistResponse(Long id, Long tripId, String title, Integer progressRate,
                                    List<ChecklistItemResponse> items) {
        static ChecklistResponse from(TravelChecklist checklist, List<TravelChecklistItem> items) {
            return new ChecklistResponse(
                    checklist.getId(),
                    checklist.getTrip().getId(),
                    checklist.getTitle(),
                    checklist.getProgressRate(),
                    items.stream().map(ChecklistItemResponse::from).toList()
            );
        }
    }

    public record ChecklistItemResponse(Long id, String category, String content, ChecklistItemStatus status,
                                        Integer sortOrder, LocalDate dueDate) {
        static ChecklistItemResponse from(TravelChecklistItem item) {
            return new ChecklistItemResponse(item.getId(), item.getCategory(), item.getContent(), item.getStatus(),
                    item.getSortOrder(), item.getDueDate());
        }
    }
}
