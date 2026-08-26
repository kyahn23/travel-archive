package com.travelarchive.checklist;

import com.travelarchive.checklist.ChecklistService.ChecklistResponse;
import com.travelarchive.common.dto.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
public class ChecklistController {
    private final ChecklistService checklistService;

    public ChecklistController(ChecklistService checklistService) {
        this.checklistService = checklistService;
    }

    @GetMapping("/trips/{tripId}/checklists")
    public ApiResponse<ChecklistResponse> getOrCreate(Authentication authentication, @PathVariable Long tripId) {
        return new ApiResponse<>(checklistService.getOrCreate(authentication.getName(), tripId), "Success");
    }

    @PostMapping("/trips/{tripId}/checklists")
    public ResponseEntity<ApiResponse<ChecklistResponse>> create(Authentication authentication, @PathVariable Long tripId) {
        return ResponseEntity.status(201).body(new ApiResponse<>(checklistService.create(authentication.getName(), tripId), "Success"));
    }

    @PatchMapping("/checklist-items/{id}")
    public ApiResponse<ChecklistResponse> toggleItem(Authentication authentication, @PathVariable Long id) {
        return new ApiResponse<>(checklistService.toggleItem(authentication.getName(), id), "Success");
    }

    @PostMapping("/checklists/{checklistId}/items")
    public ResponseEntity<ApiResponse<ChecklistService.ChecklistItemResponse>> createItem(
            Authentication authentication,
            @PathVariable Long checklistId,
            @Valid @RequestBody CreateItemRequest request) {
        return ResponseEntity.status(201)
                .body(new ApiResponse<>(checklistService.createCustomItem(authentication.getName(), checklistId, request.content(), request.category()), "Success"));
    }

    @DeleteMapping("/checklist-items/{id}")
    public ApiResponse<Void> deleteItem(Authentication authentication, @PathVariable Long id) {
        checklistService.deleteItem(authentication.getName(), id);
        return new ApiResponse<>(null, "Success");
    }

    public record CreateItemRequest(@NotBlank @Size(max = 300) String content,
                                     @NotBlank @Size(max = 80) String category) {
    }
}
