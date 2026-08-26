package com.travelarchive.trip;

import com.travelarchive.common.dto.ApiResponse;
import com.travelarchive.trip.dto.TimelineItemRequest;
import com.travelarchive.trip.dto.TimelineItemResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class TimelineController {
    private final TimelineService timelineService;

    public TimelineController(TimelineService timelineService) {
        this.timelineService = timelineService;
    }

    @GetMapping("/trips/{tripId}/timeline")
    public ApiResponse<List<TimelineItemResponse.DayGroup>> list(Authentication authentication, @PathVariable Long tripId) {
        return new ApiResponse<>(timelineService.list(authentication.getName(), tripId), "Success");
    }

    @PostMapping("/trips/{tripId}/timeline-items")
    public ResponseEntity<ApiResponse<TimelineItemResponse>> create(Authentication authentication, @PathVariable Long tripId,
                                                                    @Valid @RequestBody TimelineItemRequest request) {
        return ResponseEntity.status(201).body(new ApiResponse<>(timelineService.create(authentication.getName(), tripId, request), "Success"));
    }

    @PatchMapping("/timeline-items/{id}")
    public ApiResponse<TimelineItemResponse> update(Authentication authentication, @PathVariable Long id,
                                                    @Valid @RequestBody TimelineItemRequest request) {
        return new ApiResponse<>(timelineService.update(authentication.getName(), id, request), "Success");
    }

    @DeleteMapping("/timeline-items/{id}")
    public ApiResponse<Void> delete(Authentication authentication, @PathVariable Long id) {
        timelineService.delete(authentication.getName(), id);
        return new ApiResponse<>(null, "Success");
    }
}
