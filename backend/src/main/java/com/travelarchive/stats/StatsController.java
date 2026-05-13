package com.travelarchive.stats;

import com.travelarchive.common.dto.ApiResponse;
import com.travelarchive.stats.dto.StatsResponse;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/statistics")
public class StatsController {
    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping("/summary")
    public ApiResponse<StatsResponse.Summary> summary(Authentication authentication) {
        return new ApiResponse<>(statsService.summary(authentication.getName()), "Success");
    }

    @GetMapping("/monthly")
    public ApiResponse<List<StatsResponse.MonthlyCount>> monthly(Authentication authentication) {
        return new ApiResponse<>(statsService.monthly(authentication.getName()), "Success");
    }

    @GetMapping("/top-regions")
    public ApiResponse<List<StatsResponse.TopRegion>> topRegions(Authentication authentication, @RequestParam(required = false) Integer limit) {
        return new ApiResponse<>(statsService.topRegions(authentication.getName(), limit), "Success");
    }
}
