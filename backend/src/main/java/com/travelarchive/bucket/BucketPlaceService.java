package com.travelarchive.bucket;

import com.travelarchive.bucket.dto.BucketPlaceRequest;
import com.travelarchive.bucket.dto.BucketPlaceResponse;
import com.travelarchive.checklist.TravelChecklist;
import com.travelarchive.checklist.TravelChecklistItem;
import com.travelarchive.checklist.TravelChecklistTemplate;
import com.travelarchive.checklist.TravelChecklistTemplateItem;
import com.travelarchive.common.enums.BucketStatus;
import com.travelarchive.common.enums.TravelScope;
import com.travelarchive.map.Country;
import com.travelarchive.map.DomesticRegion;
import com.travelarchive.trip.Trip;
import com.travelarchive.trip.TripDay;
import com.travelarchive.trip.TripDayRepository;
import com.travelarchive.trip.TripRepository;
import com.travelarchive.trip.dto.TripResponse;
import com.travelarchive.user.User;
import com.travelarchive.user.UserRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BucketPlaceService {
    private final BucketPlaceRepository bucketPlaceRepository;
    private final TripRepository tripRepository;
    private final TripDayRepository tripDayRepository;
    private final UserRepository userRepository;
    private final EntityManager entityManager;

    public BucketPlaceService(BucketPlaceRepository bucketPlaceRepository, TripRepository tripRepository,
                              TripDayRepository tripDayRepository, UserRepository userRepository,
                              EntityManager entityManager) {
        this.bucketPlaceRepository = bucketPlaceRepository;
        this.tripRepository = tripRepository;
        this.tripDayRepository = tripDayRepository;
        this.userRepository = userRepository;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public List<BucketPlaceResponse> list(String email) {
        User user = currentUser(email);
        return bucketPlaceRepository.findAllByUserIdOrderByPriorityAscIdDesc(user.getId()).stream()
                .map(BucketPlaceResponse::from)
                .toList();
    }

    @Transactional
    public BucketPlaceResponse create(String email, BucketPlaceRequest request) {
        User user = currentUser(email);
        BucketFields fields = validateCreate(request);
        BucketPlace bucketPlace = bucketPlaceRepository.save(new BucketPlace(user, fields.title(), fields.travelScope(),
                fields.country(), fields.domesticRegion(), fields.cityName(), fields.reason(), fields.expectedBudget(),
                fields.desiredSeason(), fields.companion(), fields.priority(), fields.status(), fields.referenceUrl(), fields.memo()));
        return BucketPlaceResponse.from(bucketPlace);
    }

    @Transactional(readOnly = true)
    public BucketPlaceResponse get(String email, Long id) {
        User user = currentUser(email);
        return BucketPlaceResponse.from(findOwnedBucket(id, user.getId()));
    }

    @Transactional
    public BucketPlaceResponse update(String email, Long id, BucketPlaceRequest request) {
        User user = currentUser(email);
        BucketPlace bucketPlace = findOwnedBucket(id, user.getId());
        BucketFields fields = mergeAndValidate(bucketPlace, request);
        bucketPlace.update(fields.title(), fields.travelScope(), fields.country(), fields.domesticRegion(), fields.cityName(),
                fields.reason(), fields.expectedBudget(), fields.desiredSeason(), fields.companion(), fields.priority(),
                fields.status(), fields.referenceUrl(), fields.memo());
        return BucketPlaceResponse.from(bucketPlace);
    }

    @Transactional
    public void delete(String email, Long id) {
        User user = currentUser(email);
        bucketPlaceRepository.delete(findOwnedBucket(id, user.getId()));
    }

    @Transactional
    public TripResponse convertToTrip(String email, Long id, BucketPlaceRequest request) {
        User user = currentUser(email);
        BucketPlace bucketPlace = findOwnedBucket(id, user.getId());
        if (bucketPlace.getStatus() == BucketStatus.VISITED || bucketPlace.getStatus() == BucketStatus.ON_HOLD) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "VISITED and ON_HOLD buckets cannot be converted");
        }
        if (request.startDate() == null || request.endDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startDate and endDate are required");
        }
        if (request.endDate().isBefore(request.startDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endDate must be on or after startDate");
        }

        Trip trip = tripRepository.save(new Trip(user, bucketPlace, bucketPlace.getTitle(), bucketPlace.getTravelScope(),
                bucketPlace.getCountry(), bucketPlace.getDomesticRegion(), bucketPlace.getCityName(), request.startDate(),
                request.endDate(), null, bucketPlace.getCompanion(), bucketPlace.getReason()));
        generateTripDays(trip);
        cloneChecklistTemplates(trip, bucketPlace.getTravelScope());
        bucketPlace.changeStatus(request.status() == BucketStatus.BOOKED ? BucketStatus.BOOKED : BucketStatus.PLANNING);
        return TripResponse.from(trip, tripDayRepository.findAllByTripIdOrderByDayNo(trip.getId()));
    }

    private User currentUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private BucketPlace findOwnedBucket(Long id, Long userId) {
        return bucketPlaceRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Bucket place not found"));
    }

    private BucketFields validateCreate(BucketPlaceRequest request) {
        if (isBlank(request.title()) || request.travelScope() == null || isBlank(request.cityName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title, travelScope and cityName are required");
        }
        return validateFields(request.title(), request.travelScope(), request.countryId(), request.domesticRegionId(),
                request.cityName(), request.reason(), request.expectedBudget(), request.desiredSeason(), request.priority(),
                request.status() == null ? BucketStatus.WANT_TO_GO : request.status(), request.companion(), request.referenceUrl(), request.memo());
    }

    private BucketFields mergeAndValidate(BucketPlace bucketPlace, BucketPlaceRequest request) {
        TravelScope scope = request.travelScope() == null ? bucketPlace.getTravelScope() : request.travelScope();
        Long countryId = request.countryId() == null && scope == bucketPlace.getTravelScope() && bucketPlace.getCountry() != null
                ? bucketPlace.getCountry().getId() : request.countryId();
        Long domesticRegionId = request.domesticRegionId() == null && scope == bucketPlace.getTravelScope() && bucketPlace.getDomesticRegion() != null
                ? bucketPlace.getDomesticRegion().getId() : request.domesticRegionId();
        return validateFields(
                request.title() == null ? bucketPlace.getTitle() : request.title(),
                scope,
                countryId,
                domesticRegionId,
                request.cityName() == null ? bucketPlace.getCityName() : request.cityName(),
                request.reason() == null ? bucketPlace.getReason() : request.reason(),
                request.expectedBudget() == null ? bucketPlace.getExpectedBudget() : request.expectedBudget(),
                request.desiredSeason() == null ? bucketPlace.getDesiredSeason() : request.desiredSeason(),
                request.priority() == null ? bucketPlace.getPriority() : request.priority(),
                request.status() == null ? bucketPlace.getStatus() : request.status(),
                request.companion() == null ? bucketPlace.getCompanion() : request.companion(),
                request.referenceUrl() == null ? bucketPlace.getReferenceUrl() : request.referenceUrl(),
                request.memo() == null ? bucketPlace.getMemo() : request.memo()
        );
    }

    private BucketFields validateFields(String title, TravelScope travelScope, Long countryId, Long domesticRegionId,
                                        String cityName, String reason, BigDecimal expectedBudget, String desiredSeason,
                                        Integer priority, BucketStatus status, String companion, String referenceUrl, String memo) {
        if (isBlank(title)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required");
        }
        if (priority == null || priority < 1 || priority > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "priority must be between 1 and 5");
        }
        Country country = null;
        DomesticRegion domesticRegion = null;
        if (travelScope == TravelScope.INTERNATIONAL) {
            if (countryId == null || domesticRegionId != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "International buckets require countryId only");
            }
            country = entityManager.getReference(Country.class, countryId);
        } else if (travelScope == TravelScope.DOMESTIC) {
            if (domesticRegionId == null || countryId != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Domestic buckets require domesticRegionId only");
            }
            domesticRegion = entityManager.getReference(DomesticRegion.class, domesticRegionId);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "travelScope is required");
        }
        return new BucketFields(title, travelScope, country, domesticRegion, cityName, reason, expectedBudget,
                desiredSeason, priority, status, companion, referenceUrl, memo);
    }

    private void generateTripDays(Trip trip) {
        long days = ChronoUnit.DAYS.between(trip.getStartDate(), trip.getEndDate()) + 1;
        for (int i = 0; i < days; i++) {
            int dayNo = i + 1;
            tripDayRepository.save(new TripDay(trip, dayNo, trip.getStartDate().plusDays(i), "Day " + dayNo, null));
        }
    }

    private void cloneChecklistTemplates(Trip trip, TravelScope travelScope) {
        List<TravelChecklistTemplate> templates = entityManager.createQuery("""
                        select template from TravelChecklistTemplate template
                        where template.travelScope = :travelScope and template.active = true
                        order by template.displayOrder asc, template.id asc
                        """, TravelChecklistTemplate.class)
                .setParameter("travelScope", travelScope)
                .getResultList();
        for (TravelChecklistTemplate template : templates) {
            TravelChecklist checklist = new TravelChecklist(trip, template.getTitle());
            entityManager.persist(checklist);
            List<TravelChecklistTemplateItem> templateItems = entityManager.createQuery("""
                            select item from TravelChecklistTemplateItem item
                            where item.template.id = :templateId
                            order by item.sortOrder asc, item.id asc
                            """, TravelChecklistTemplateItem.class)
                    .setParameter("templateId", template.getId())
                    .getResultList();
            for (TravelChecklistTemplateItem templateItem : templateItems) {
                entityManager.persist(new TravelChecklistItem(checklist, templateItem.getCategory(),
                        templateItem.getContent(), templateItem.getSortOrder(), null));
            }
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record BucketFields(String title, TravelScope travelScope, Country country, DomesticRegion domesticRegion,
                                String cityName, String reason, BigDecimal expectedBudget, String desiredSeason,
                                Integer priority, BucketStatus status, String companion, String referenceUrl, String memo) {
    }
}
