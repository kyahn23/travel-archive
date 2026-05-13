package com.travelarchive.map;

import com.travelarchive.common.enums.TravelScope;
import com.travelarchive.common.enums.TripStatus;
import com.travelarchive.map.dto.MapRegionResponse;
import com.travelarchive.user.User;
import com.travelarchive.user.UserRepository;
import jakarta.persistence.EntityManager;
import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MapService {
    private final UserRepository userRepository;
    private final EntityManager entityManager;

    public MapService(UserRepository userRepository, EntityManager entityManager) {
        this.userRepository = userRepository;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<MapRegionResponse.WorldRegion> world(String email) {
        Long userId = currentUser(email).getId();
        List<Object[]> rows = entityManager.createNativeQuery("""
                        select c.map_key, c.code_alpha2, c.name_ko,
                               case min(region_status.priority)
                                   when 1 then 'COMPLETED'
                                   when 2 then 'PLANNED'
                                   else 'BUCKET'
                               end as status
                        from (
                            select country_id as region_id,
                                   case when status = 'COMPLETED' then 1 else 2 end as priority
                            from trips
                            where user_id = :userId
                              and travel_scope = 'INTERNATIONAL'
                              and status in ('COMPLETED', 'PLANNED')
                            union all
                            select country_id as region_id, 3 as priority
                            from bucket_places
                            where user_id = :userId
                              and travel_scope = 'INTERNATIONAL'
                              and status <> 'ON_HOLD'
                        ) region_status
                        join countries c on c.id = region_status.region_id
                        group by c.id, c.map_key, c.code_alpha2, c.name_ko, c.display_order
                        order by c.display_order, c.name_ko
                        """)
                .setParameter("userId", userId)
                .getResultList();
        return rows.stream()
                .map(row -> new MapRegionResponse.WorldRegion((String) row[0], (String) row[1], (String) row[2], (String) row[3]))
                .toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<MapRegionResponse.DomesticRegion> domestic(String email) {
        Long userId = currentUser(email).getId();
        List<Object[]> rows = entityManager.createNativeQuery("""
                        select r.map_key, r.code, r.name_ko,
                               case min(region_status.priority)
                                   when 1 then 'COMPLETED'
                                   when 2 then 'PLANNED'
                                   else 'BUCKET'
                               end as status
                        from (
                            select domestic_region_id as region_id,
                                   case when status = 'COMPLETED' then 1 else 2 end as priority
                            from trips
                            where user_id = :userId
                              and travel_scope = 'DOMESTIC'
                              and status in ('COMPLETED', 'PLANNED')
                            union all
                            select domestic_region_id as region_id, 3 as priority
                            from bucket_places
                            where user_id = :userId
                              and travel_scope = 'DOMESTIC'
                              and status <> 'ON_HOLD'
                        ) region_status
                        join domestic_regions r on r.id = region_status.region_id
                        group by r.id, r.map_key, r.code, r.name_ko, r.display_order
                        order by r.display_order, r.name_ko
                        """)
                .setParameter("userId", userId)
                .getResultList();
        return rows.stream()
                .map(row -> new MapRegionResponse.DomesticRegion((String) row[0], (String) row[1], (String) row[2], (String) row[3]))
                .toList();
    }

    @Transactional(readOnly = true)
    public MapRegionResponse.RegionDetail region(String email, String mapKey) {
        Long userId = currentUser(email).getId();
        RegionMetadata region = findRegion(mapKey);
        return new MapRegionResponse.RegionDetail(
                region.mapKey(),
                region.name(),
                countTrips(userId, region, TripStatus.COMPLETED),
                countTrips(userId, region, TripStatus.PLANNED),
                countBuckets(userId, region),
                trips(userId, region)
        );
    }

    private User currentUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    @SuppressWarnings("unchecked")
    private RegionMetadata findRegion(String mapKey) {
        List<Object[]> countries = entityManager.createNativeQuery("""
                        select id, map_key, name_ko
                        from countries
                        where map_key = :mapKey
                        """)
                .setParameter("mapKey", mapKey)
                .getResultList();
        if (!countries.isEmpty()) {
            Object[] row = countries.get(0);
            return new RegionMetadata(((Number) row[0]).longValue(), (String) row[1], (String) row[2], TravelScope.INTERNATIONAL);
        }

        List<Object[]> domesticRegions = entityManager.createNativeQuery("""
                        select id, map_key, name_ko
                        from domestic_regions
                        where map_key = :mapKey
                        """)
                .setParameter("mapKey", mapKey)
                .getResultList();
        if (!domesticRegions.isEmpty()) {
            Object[] row = domesticRegions.get(0);
            return new RegionMetadata(((Number) row[0]).longValue(), (String) row[1], (String) row[2], TravelScope.DOMESTIC);
        }

        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Map region not found");
    }

    private long countTrips(Long userId, RegionMetadata region, TripStatus status) {
        String regionColumn = region.scope() == TravelScope.INTERNATIONAL ? "country_id" : "domestic_region_id";
        return ((Number) entityManager.createNativeQuery("""
                        select count(*)
                        from trips
                        where user_id = :userId
                          and travel_scope = :scope
                          and %s = :regionId
                          and status = :status
                        """.formatted(regionColumn))
                .setParameter("userId", userId)
                .setParameter("scope", region.scope().name())
                .setParameter("regionId", region.id())
                .setParameter("status", status.name())
                .getSingleResult()).longValue();
    }

    private long countBuckets(Long userId, RegionMetadata region) {
        String regionColumn = region.scope() == TravelScope.INTERNATIONAL ? "country_id" : "domestic_region_id";
        return ((Number) entityManager.createNativeQuery("""
                        select count(*)
                        from bucket_places
                        where user_id = :userId
                          and travel_scope = :scope
                          and %s = :regionId
                          and status <> 'ON_HOLD'
                        """.formatted(regionColumn))
                .setParameter("userId", userId)
                .setParameter("scope", region.scope().name())
                .setParameter("regionId", region.id())
                .getSingleResult()).longValue();
    }

    @SuppressWarnings("unchecked")
    private List<MapRegionResponse.TripSummary> trips(Long userId, RegionMetadata region) {
        String regionColumn = region.scope() == TravelScope.INTERNATIONAL ? "country_id" : "domestic_region_id";
        List<Object[]> rows = entityManager.createNativeQuery("""
                        select id, title, travel_scope, start_date, end_date, status, city_name
                        from trips
                        where user_id = :userId
                          and travel_scope = :scope
                          and %s = :regionId
                          and status in ('COMPLETED', 'PLANNED')
                        order by start_date desc, id desc
                        """.formatted(regionColumn))
                .setParameter("userId", userId)
                .setParameter("scope", region.scope().name())
                .setParameter("regionId", region.id())
                .getResultList();
        return rows.stream()
                .map(row -> new MapRegionResponse.TripSummary(
                        ((Number) row[0]).longValue(),
                        (String) row[1],
                        TravelScope.valueOf((String) row[2]),
                        toLocalDate(row[3]),
                        toLocalDate(row[4]),
                        TripStatus.valueOf((String) row[5]),
                        (String) row[6]
                ))
                .toList();
    }

    private LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        return ((Date) value).toLocalDate();
    }

    private record RegionMetadata(Long id, String mapKey, String name, TravelScope scope) {
    }
}
