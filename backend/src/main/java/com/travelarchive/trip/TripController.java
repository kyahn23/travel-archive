package com.travelarchive.trip;

import com.travelarchive.common.dto.ApiResponse;
import com.travelarchive.trip.dto.TripRequest;
import com.travelarchive.trip.dto.TripResponse;
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
@RequestMapping("/api/trips")
public class TripController {
    private final TripService tripService;

    public TripController(TripService tripService) {
        this.tripService = tripService;
    }

    @GetMapping
    public ApiResponse<List<TripResponse>> list(Authentication authentication) {
        return new ApiResponse<>(tripService.list(authentication.getName()), "Success");
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TripResponse>> create(Authentication authentication, @RequestBody TripRequest request) {
        return ResponseEntity.status(201).body(new ApiResponse<>(tripService.create(authentication.getName(), request), "Success"));
    }

    @GetMapping("/{id}")
    public ApiResponse<TripResponse> get(Authentication authentication, @PathVariable Long id) {
        return new ApiResponse<>(tripService.get(authentication.getName(), id), "Success");
    }

    @PatchMapping("/{id}")
    public ApiResponse<TripResponse> update(Authentication authentication, @PathVariable Long id, @RequestBody TripRequest request) {
        return new ApiResponse<>(tripService.update(authentication.getName(), id, request), "Success");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(Authentication authentication, @PathVariable Long id) {
        tripService.delete(authentication.getName(), id);
        return new ApiResponse<>(null, "Success");
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<TripResponse> changeStatus(Authentication authentication, @PathVariable Long id, @RequestBody TripRequest request) {
        return new ApiResponse<>(tripService.changeStatus(authentication.getName(), id, request), "Success");
    }
}
