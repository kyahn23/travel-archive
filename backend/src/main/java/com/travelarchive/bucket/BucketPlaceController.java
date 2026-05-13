package com.travelarchive.bucket;

import com.travelarchive.bucket.dto.BucketPlaceRequest;
import com.travelarchive.bucket.dto.BucketPlaceResponse;
import com.travelarchive.common.dto.ApiResponse;
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
@RequestMapping("/api/buckets")
public class BucketPlaceController {
    private final BucketPlaceService bucketPlaceService;

    public BucketPlaceController(BucketPlaceService bucketPlaceService) {
        this.bucketPlaceService = bucketPlaceService;
    }

    @GetMapping
    public ApiResponse<List<BucketPlaceResponse>> list(Authentication authentication) {
        return new ApiResponse<>(bucketPlaceService.list(authentication.getName()), "Success");
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BucketPlaceResponse>> create(Authentication authentication, @RequestBody BucketPlaceRequest request) {
        return ResponseEntity.status(201).body(new ApiResponse<>(bucketPlaceService.create(authentication.getName(), request), "Success"));
    }

    @GetMapping("/{id}")
    public ApiResponse<BucketPlaceResponse> get(Authentication authentication, @PathVariable Long id) {
        return new ApiResponse<>(bucketPlaceService.get(authentication.getName(), id), "Success");
    }

    @PatchMapping("/{id}")
    public ApiResponse<BucketPlaceResponse> update(Authentication authentication, @PathVariable Long id, @RequestBody BucketPlaceRequest request) {
        return new ApiResponse<>(bucketPlaceService.update(authentication.getName(), id, request), "Success");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(Authentication authentication, @PathVariable Long id) {
        bucketPlaceService.delete(authentication.getName(), id);
        return new ApiResponse<>(null, "Success");
    }

    @PostMapping("/{id}/convert-to-trip")
    public ResponseEntity<ApiResponse<TripResponse>> convertToTrip(Authentication authentication, @PathVariable Long id,
                                                                    @RequestBody BucketPlaceRequest request) {
        return ResponseEntity.status(201).body(new ApiResponse<>(bucketPlaceService.convertToTrip(authentication.getName(), id, request), "Success"));
    }
}
