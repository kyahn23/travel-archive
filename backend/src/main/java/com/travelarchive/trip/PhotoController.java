package com.travelarchive.trip;

import com.travelarchive.common.enums.PhotoOwnerType;
import com.travelarchive.common.dto.ApiResponse;
import com.travelarchive.storage.StorageContext;
import com.travelarchive.storage.StorageService;
import com.travelarchive.storage.StoredFile;
import com.travelarchive.storage.TransactionalFileCleanup;
import com.travelarchive.trip.dto.TimelineItemResponse;
import com.travelarchive.user.User;
import com.travelarchive.user.UserRepository;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class PhotoController {
    private static final long MAX_TIMELINE_PHOTOS = 3;

    private final StorageService storageService;
    private final TransactionalFileCleanup fileCleanup;
    private final UserRepository userRepository;
    private final TripRepository tripRepository;
    private final TripTimelineItemRepository timelineItemRepository;
    private final TripPhotoRepository photoRepository;

    public PhotoController(StorageService storageService, TransactionalFileCleanup fileCleanup,
                           UserRepository userRepository, TripRepository tripRepository,
                           TripTimelineItemRepository timelineItemRepository, TripPhotoRepository photoRepository) {
        this.storageService = storageService;
        this.fileCleanup = fileCleanup;
        this.userRepository = userRepository;
        this.tripRepository = tripRepository;
        this.timelineItemRepository = timelineItemRepository;
        this.photoRepository = photoRepository;
    }

    @PostMapping(value = "/trips/{tripId}/cover-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<ApiResponse<TimelineItemResponse.PhotoResponse>> uploadCoverImage(Authentication authentication,
                                                                                             @PathVariable Long tripId,
                                                                                             @RequestParam("file") MultipartFile file) {
        User user = currentUser(authentication);
        Trip trip = tripRepository.findByIdAndUserId(tripId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));
        if (photoRepository.countByTripIdAndOwnerType(trip.getId(), PhotoOwnerType.TRIP_COVER) >= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trip can have at most 1 cover image");
        }
        StoredFile storedFile = storageService.store(file, new StorageContext(user.getId(), trip.getId()));
        fileCleanup.registerRollbackDelete(storedFile.storageKey());
        TripPhoto photo = photoRepository.saveAndFlush(new TripPhoto(trip, null, PhotoOwnerType.TRIP_COVER,
                storedFile.storageKey(), null, storedFile.originalFileName(), storedFile.contentType(),
                storedFile.fileSize(), null, 0));
        return ResponseEntity.status(201).body(new ApiResponse<>(TimelineItemResponse.PhotoResponse.from(photo), "Success"));
    }

    @PostMapping(value = "/timeline-items/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<ApiResponse<TimelineItemResponse.PhotoResponse>> uploadTimelinePhoto(Authentication authentication,
                                                                                                @PathVariable Long id,
                                                                                                @RequestParam("file") MultipartFile file) {
        User user = currentUser(authentication);
        TripTimelineItem item = timelineItemRepository.findOwnedById(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Timeline item not found"));
        long currentCount = photoRepository.countByTimelineItemIdAndOwnerType(item.getId(), PhotoOwnerType.TIMELINE_ITEM);
        if (currentCount >= MAX_TIMELINE_PHOTOS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Timeline item can have at most 3 photos");
        }
        Trip trip = item.getTripDay().getTrip();
        StoredFile storedFile = storageService.store(file, new StorageContext(user.getId(), trip.getId()));
        fileCleanup.registerRollbackDelete(storedFile.storageKey());
        TripPhoto photo = photoRepository.saveAndFlush(new TripPhoto(trip, item, PhotoOwnerType.TIMELINE_ITEM,
                storedFile.storageKey(), null, storedFile.originalFileName(), storedFile.contentType(),
                storedFile.fileSize(), null, (int) currentCount));
        return ResponseEntity.status(201).body(new ApiResponse<>(TimelineItemResponse.PhotoResponse.from(photo), "Success"));
    }

    @GetMapping("/trips/{tripId}/cover-image")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<TimelineItemResponse.PhotoResponse>> getCoverImage(Authentication authentication,
                                                                                          @PathVariable Long tripId) {
        User user = currentUser(authentication);
        Trip trip = tripRepository.findByIdAndUserId(tripId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));
        TripPhoto photo = photoRepository.findAllByTripIdAndOwnerTypeOrderBySortOrderAscIdAsc(tripId, PhotoOwnerType.TRIP_COVER)
                .stream()
                .findFirst()
                .orElse(null);
        if (photo == null) {
            return ResponseEntity.ok(new ApiResponse<>(null, "No cover image"));
        }
        return ResponseEntity.ok(new ApiResponse<>(TimelineItemResponse.PhotoResponse.from(photo), "Success"));
    }

    @GetMapping("/files/{photoId}")
    @Transactional(readOnly = true)
    public ResponseEntity<Resource> serveFile(Authentication authentication, @PathVariable Long photoId) {
        User user = currentUser(authentication);
        TripPhoto photo = photoRepository.findOwnedById(photoId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found"));
        Resource resource = storageService.open(photo.getStorageKey());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.getContentType()))
                .contentLength(photo.getFileSize())
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(photo.getOriginalFileName())
                        .build()
                        .toString())
                .body(resource);
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
