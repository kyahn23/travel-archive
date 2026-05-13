package com.travelarchive.trip;

import com.travelarchive.common.enums.PhotoOwnerType;
import com.travelarchive.common.enums.TravelScope;
import com.travelarchive.common.enums.TripStatus;
import com.travelarchive.map.Country;
import com.travelarchive.map.DomesticRegion;
import com.travelarchive.trip.dto.TripRequest;
import com.travelarchive.trip.dto.TripResponse;
import com.travelarchive.user.User;
import com.travelarchive.user.UserRepository;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TripService {
    private final TripRepository tripRepository;
    private final TripDayRepository tripDayRepository;
    private final TripPhotoRepository tripPhotoRepository;
    private final UserRepository userRepository;
    private final EntityManager entityManager;

    public TripService(TripRepository tripRepository, TripDayRepository tripDayRepository,
                       TripPhotoRepository tripPhotoRepository, UserRepository userRepository, EntityManager entityManager) {
        this.tripRepository = tripRepository;
        this.tripDayRepository = tripDayRepository;
        this.tripPhotoRepository = tripPhotoRepository;
        this.userRepository = userRepository;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public List<TripResponse> list(String email) {
        User user = currentUser(email);
        List<Trip> trips = tripRepository.findAllByUserIdOrderByStartDateDescIdDesc(user.getId());
        List<Long> tripIds = trips.stream().map(Trip::getId).toList();
        Map<Long, List<TripDay>> daysByTripId = tripIds.isEmpty() ? Map.of() : tripDayRepository
                .findAllByTripIdInOrderByTripIdAscDayNoAsc(tripIds)
                .stream()
                .collect(Collectors.groupingBy(day -> day.getTrip().getId()));
        Map<Long, Long> coverPhotoIdsByTripId = tripIds.isEmpty() ? Map.of() : tripPhotoRepository
                .findAllByTripIdInAndOwnerTypeOrderByTripIdAscSortOrderAscIdAsc(tripIds, PhotoOwnerType.TRIP_COVER)
                .stream()
                .collect(Collectors.toMap(photo -> photo.getTrip().getId(), TripPhoto::getId, (first, ignored) -> first));
        return trips.stream()
                .map(trip -> TripResponse.from(trip, daysByTripId.getOrDefault(trip.getId(), List.of()), coverPhotoIdsByTripId.get(trip.getId())))
                .toList();
    }

    @Transactional
    public TripResponse create(String email, TripRequest request) {
        User user = currentUser(email);
        TripFields fields = validateCreate(request);
        Trip trip = tripRepository.save(new Trip(user, fields.title(), fields.travelScope(), fields.country(),
                fields.domesticRegion(), fields.cityName(), fields.startDate(), fields.endDate(), fields.travelType(),
                fields.companion(), fields.summary()));
        generateTripDays(trip);
        return response(trip);
    }

    @Transactional(readOnly = true)
    public TripResponse get(String email, Long id) {
        User user = currentUser(email);
        return response(findOwnedTrip(id, user.getId()));
    }

    @Transactional
    public TripResponse update(String email, Long id, TripRequest request) {
        User user = currentUser(email);
        Trip trip = findOwnedTrip(id, user.getId());
        TripFields fields = mergeAndValidate(trip, request);
        boolean datesChanged = !trip.getStartDate().equals(fields.startDate()) || !trip.getEndDate().equals(fields.endDate());
        trip.update(fields.title(), fields.travelScope(), fields.country(), fields.domesticRegion(), fields.cityName(),
                fields.startDate(), fields.endDate(), fields.travelType(), fields.companion(), fields.summary());
        if (datesChanged) {
            tripDayRepository.deleteByTripId(trip.getId());
            tripDayRepository.flush();
            generateTripDays(trip);
        }
        return response(trip);
    }

    @Transactional
    public void delete(String email, Long id) {
        User user = currentUser(email);
        tripRepository.delete(findOwnedTrip(id, user.getId()));
    }

    @Transactional
    public TripResponse changeStatus(String email, Long id, TripRequest request) {
        if (request.status() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status is required");
        }
        User user = currentUser(email);
        Trip trip = findOwnedTrip(id, user.getId());
        validateTransition(trip, request.status());
        trip.changeStatus(request.status());
        return response(trip);
    }

    private User currentUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private Trip findOwnedTrip(Long id, Long userId) {
        return tripRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Trip not found"));
    }

    private TripResponse response(Trip trip) {
        var coverPhotos = tripPhotoRepository.findAllByTripIdAndOwnerTypeOrderBySortOrderAscIdAsc(trip.getId(), PhotoOwnerType.TRIP_COVER);
        Long coverPhotoId = coverPhotos.isEmpty() ? null : coverPhotos.get(0).getId();
        return TripResponse.from(trip, tripDayRepository.findAllByTripIdOrderByDayNo(trip.getId()), coverPhotoId);
    }

    private TripFields validateCreate(TripRequest request) {
        if (isBlank(request.title()) || request.travelScope() == null || isBlank(request.cityName())
                || request.startDate() == null || request.endDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title, travelScope, cityName, startDate and endDate are required");
        }
        return validateFields(request.title(), request.travelScope(), request.countryId(), request.domesticRegionId(),
                request.cityName(), request.startDate(), request.endDate(), request.travelType(), request.companion(), request.summary());
    }

    private TripFields mergeAndValidate(Trip trip, TripRequest request) {
        TravelScope scope = request.travelScope() == null ? trip.getTravelScope() : request.travelScope();
        Long countryId = request.countryId() == null && scope == trip.getTravelScope() && trip.getCountry() != null
                ? trip.getCountry().getId() : request.countryId();
        Long domesticRegionId = request.domesticRegionId() == null && scope == trip.getTravelScope() && trip.getDomesticRegion() != null
                ? trip.getDomesticRegion().getId() : request.domesticRegionId();
        return validateFields(
                request.title() == null ? trip.getTitle() : request.title(),
                scope,
                countryId,
                domesticRegionId,
                request.cityName() == null ? trip.getCityName() : request.cityName(),
                request.startDate() == null ? trip.getStartDate() : request.startDate(),
                request.endDate() == null ? trip.getEndDate() : request.endDate(),
                request.travelType() == null ? trip.getTravelType() : request.travelType(),
                request.companion() == null ? trip.getCompanion() : request.companion(),
                request.summary() == null ? trip.getSummary() : request.summary()
        );
    }

    private TripFields validateFields(String title, TravelScope travelScope, Long countryId, Long domesticRegionId,
                                      String cityName, LocalDate startDate, LocalDate endDate, String travelType,
                                      String companion, String summary) {
        if (isBlank(title)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required");
        }
        if (endDate.isBefore(startDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endDate must be on or after startDate");
        }
        Country country = null;
        DomesticRegion domesticRegion = null;
        if (travelScope == TravelScope.INTERNATIONAL) {
            if (countryId == null || domesticRegionId != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "International trips require countryId only");
            }
            country = entityManager.getReference(Country.class, countryId);
        } else if (travelScope == TravelScope.DOMESTIC) {
            if (domesticRegionId == null || countryId != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Domestic trips require domesticRegionId only");
            }
            domesticRegion = entityManager.getReference(DomesticRegion.class, domesticRegionId);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "travelScope is required");
        }
        return new TripFields(title, travelScope, country, domesticRegion, cityName, startDate, endDate,
                travelType, companion, summary);
    }

    private void generateTripDays(Trip trip) {
        long days = ChronoUnit.DAYS.between(trip.getStartDate(), trip.getEndDate()) + 1;
        for (int i = 0; i < days; i++) {
            int dayNo = i + 1;
            tripDayRepository.save(new TripDay(trip, dayNo, trip.getStartDate().plusDays(i), "Day " + dayNo, null));
        }
    }

    private void validateTransition(Trip trip, TripStatus nextStatus) {
        if (nextStatus == TripStatus.COMPLETED && tripDayRepository.countByTripId(trip.getId()) < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "COMPLETED requires at least one trip day");
        }
        TripStatus current = trip.getStatus();
        boolean allowed = (current == TripStatus.PLANNED && (nextStatus == TripStatus.COMPLETED || nextStatus == TripStatus.CANCELLED))
                || (current == TripStatus.CANCELLED && nextStatus == TripStatus.PLANNED);
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid trip status transition");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record TripFields(String title, TravelScope travelScope, Country country, DomesticRegion domesticRegion,
                              String cityName, LocalDate startDate, LocalDate endDate, String travelType,
                              String companion, String summary) {
    }
}
