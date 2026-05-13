package com.travelarchive.trip;

import com.travelarchive.common.enums.PhotoOwnerType;
import com.travelarchive.trip.dto.TimelineItemRequest;
import com.travelarchive.trip.dto.TimelineItemResponse;
import com.travelarchive.user.User;
import com.travelarchive.user.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TimelineService {
    private static final long MAX_PHOTOS_PER_ITEM = 3;
    private static final long MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

    private final TripRepository tripRepository;
    private final TripDayRepository tripDayRepository;
    private final TripTimelineItemRepository timelineItemRepository;
    private final TripPhotoRepository photoRepository;
    private final UserRepository userRepository;

    public TimelineService(TripRepository tripRepository, TripDayRepository tripDayRepository,
                           TripTimelineItemRepository timelineItemRepository, TripPhotoRepository photoRepository,
                           UserRepository userRepository) {
        this.tripRepository = tripRepository;
        this.tripDayRepository = tripDayRepository;
        this.timelineItemRepository = timelineItemRepository;
        this.photoRepository = photoRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<TimelineItemResponse.DayGroup> list(String email, Long tripId) {
        User user = currentUser(email);
        Trip trip = findOwnedTrip(tripId, user.getId());
        List<TripTimelineItem> items = timelineItemRepository.findTimelineByTripId(trip.getId());
        List<Long> itemIds = items.stream().map(TripTimelineItem::getId).toList();
        Map<Long, List<TripPhoto>> photosByItemId = itemIds.isEmpty() ? Map.of() : photoRepository
                .findAllByTimelineItemIdInAndOwnerTypeOrderByTimelineItemIdAscSortOrderAscIdAsc(itemIds, PhotoOwnerType.TIMELINE_ITEM)
                .stream()
                .collect(Collectors.groupingBy(photo -> photo.getTimelineItem().getId()));
        Map<Long, List<TimelineItemResponse>> itemsByDayId = items.stream()
                .map(item -> TimelineItemResponse.from(item, photosByItemId.getOrDefault(item.getId(), List.of())))
                .collect(Collectors.groupingBy(TimelineItemResponse::tripDayId, java.util.LinkedHashMap::new, Collectors.toList()));
        return tripDayRepository.findAllByTripIdOrderByDayNo(trip.getId()).stream()
                .map(day -> TimelineItemResponse.DayGroup.from(day, itemsByDayId.getOrDefault(day.getId(), List.of())))
                .toList();
    }

    @Transactional
    public TimelineItemResponse create(String email, Long tripId, TimelineItemRequest request) {
        User user = currentUser(email);
        Trip trip = findOwnedTrip(tripId, user.getId());
        TimelineFields fields = validateCreate(trip, request);
        TripTimelineItem item = timelineItemRepository.save(new TripTimelineItem(fields.tripDay(), fields.itemTime(),
                fields.title(), fields.memo(), fields.placeName(), fields.address(), fields.latitude(), fields.longitude(),
                fields.category(), 0));
        return response(item);
    }

    @Transactional
    public TimelineItemResponse update(String email, Long id, TimelineItemRequest request) {
        User user = currentUser(email);
        TripTimelineItem item = findOwnedItem(id, user.getId());
        TimelineFields fields = mergeAndValidate(item, request);
        item.update(fields.tripDay(), fields.itemTime(), fields.title(), fields.memo(), fields.placeName(), fields.address(),
                fields.latitude(), fields.longitude(), fields.category(), item.getSortOrder());
        return response(item);
    }

    @Transactional
    public void delete(String email, Long id) {
        User user = currentUser(email);
        timelineItemRepository.delete(findOwnedItem(id, user.getId()));
    }

    @Transactional
    public TimelineItemResponse.PhotoResponse addPhoto(String email, Long id, TimelineItemRequest.PhotoRequest request) {
        User user = currentUser(email);
        TripTimelineItem item = findOwnedItem(id, user.getId());
        validatePhoto(request);
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use multipart upload for photos");
    }

    private TimelineItemResponse.PhotoResponse persistPhoto(TripTimelineItem item, TimelineItemRequest.PhotoRequest request) {
        long currentCount = photoRepository.countByTimelineItemIdAndOwnerType(item.getId(), PhotoOwnerType.TIMELINE_ITEM);
        if (currentCount >= MAX_PHOTOS_PER_ITEM) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Timeline item can have at most 3 photos");
        }
        TripPhoto photo = photoRepository.save(new TripPhoto(item.getTripDay().getTrip(), item, PhotoOwnerType.TIMELINE_ITEM,
                request.storageKey(), request.fileUrl(), request.originalFileName(), request.contentType(), request.fileSize(),
                request.caption(), (int) currentCount));
        return TimelineItemResponse.PhotoResponse.from(photo);
    }

    private User currentUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private Trip findOwnedTrip(Long tripId, Long userId) {
        return tripRepository.findByIdAndUserId(tripId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Trip not found"));
    }

    private TripTimelineItem findOwnedItem(Long id, Long userId) {
        return timelineItemRepository.findOwnedById(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Timeline item not found"));
    }

    private TimelineItemResponse response(TripTimelineItem item) {
        return TimelineItemResponse.from(item, photos(item.getId()));
    }

    private List<TripPhoto> photos(Long itemId) {
        return photoRepository.findAllByTimelineItemIdAndOwnerTypeOrderBySortOrderAscIdAsc(itemId, PhotoOwnerType.TIMELINE_ITEM);
    }

    private TimelineFields validateCreate(Trip trip, TimelineItemRequest request) {
        if (request == null || isBlank(request.title()) || request.visitedAt() == null || request.category() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title, visitedAt and category are required");
        }
        return validateFields(trip, request.title(), request.placeName(), request.address(), request.latitude(),
                request.longitude(), request.visitedAt().toLocalDate(), request.visitedAt().toLocalTime(), request.category(),
                request.memo());
    }

    private TimelineFields mergeAndValidate(TripTimelineItem item, TimelineItemRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "request body is required");
        }
        Trip trip = item.getTripDay().getTrip();
        LocalDate date = request.visitedAt() == null ? item.getTripDay().getTravelDate() : request.visitedAt().toLocalDate();
        LocalTime time = request.visitedAt() == null ? item.getItemTime() : request.visitedAt().toLocalTime();
        return validateFields(
                trip,
                request.title() == null ? item.getTitle() : request.title(),
                request.placeName() == null ? item.getPlaceName() : request.placeName(),
                request.address() == null ? item.getAddress() : request.address(),
                request.latitude() == null ? item.getLatitude() : request.latitude(),
                request.longitude() == null ? item.getLongitude() : request.longitude(),
                date,
                time,
                request.category() == null ? item.getCategory() : request.category(),
                request.memo() == null ? item.getMemo() : request.memo()
        );
    }

    private TimelineFields validateFields(Trip trip, String title, String placeName, String address, BigDecimal latitude,
                                          BigDecimal longitude, LocalDate travelDate, LocalTime itemTime,
                                          com.travelarchive.common.enums.TimelineCategory category, String memo) {
        if (isBlank(title)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required");
        }
        if (latitude != null && (latitude.compareTo(BigDecimal.valueOf(-90)) < 0 || latitude.compareTo(BigDecimal.valueOf(90)) > 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "latitude must be between -90 and 90");
        }
        if (longitude != null && (longitude.compareTo(BigDecimal.valueOf(-180)) < 0 || longitude.compareTo(BigDecimal.valueOf(180)) > 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "longitude must be between -180 and 180");
        }
        TripDay day = tripDayRepository.findAllByTripIdOrderByDayNo(trip.getId()).stream()
                .filter(candidate -> candidate.getTravelDate().equals(travelDate))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "visitedAt must be within trip dates"));
        return new TimelineFields(day, itemTime, title, memo, placeName, address, latitude, longitude, category);
    }

    private void validatePhoto(TimelineItemRequest.PhotoRequest request) {
        if (request == null || isBlank(request.storageKey()) || isBlank(request.originalFileName())
                || isBlank(request.contentType()) || request.fileSize() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "photo metadata is required");
        }
        if (request.fileSize() <= 0 || request.fileSize() > MAX_PHOTO_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "photo must be 5MB or smaller");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record TimelineFields(TripDay tripDay, LocalTime itemTime, String title, String memo, String placeName,
                                  String address, BigDecimal latitude, BigDecimal longitude,
                                  com.travelarchive.common.enums.TimelineCategory category) {
    }
}
