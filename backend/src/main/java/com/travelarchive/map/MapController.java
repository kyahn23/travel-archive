package com.travelarchive.map;

import com.travelarchive.common.dto.ApiResponse;
import com.travelarchive.map.dto.MapRegionResponse;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/maps")
public class MapController {
    private final MapService mapService;

    public MapController(MapService mapService) {
        this.mapService = mapService;
    }

    @GetMapping("/world")
    public ApiResponse<List<MapRegionResponse.WorldRegion>> world(Authentication authentication) {
        return new ApiResponse<>(mapService.world(authentication.getName()), "Success");
    }

    @GetMapping("/domestic")
    public ApiResponse<List<MapRegionResponse.DomesticRegion>> domestic(Authentication authentication) {
        return new ApiResponse<>(mapService.domestic(authentication.getName()), "Success");
    }

    @GetMapping("/regions/{mapKey}")
    public ApiResponse<MapRegionResponse.RegionDetail> region(Authentication authentication, @PathVariable String mapKey) {
        return new ApiResponse<>(mapService.region(authentication.getName(), mapKey), "Success");
    }
}
