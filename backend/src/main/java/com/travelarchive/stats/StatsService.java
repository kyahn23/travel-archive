package com.travelarchive.stats;

import com.travelarchive.common.enums.TravelScope;
import com.travelarchive.common.enums.TripStatus;
import com.travelarchive.stats.dto.StatsResponse;
import com.travelarchive.user.User;
import com.travelarchive.user.UserRepository;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StatsService {
    private static final int DEFAULT_TOP_REGION_LIMIT = 5;

    private final UserRepository userRepository;
    private final EntityManager entityManager;

    public StatsService(UserRepository userRepository, EntityManager entityManager) {
        this.userRepository = userRepository;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public StatsResponse.Summary summary(String email) {
        Long userId = currentUser(email).getId();
        long completedTrips = countTrips(userId, TripStatus.COMPLETED);
        long plannedTrips = countTrips(userId, TripStatus.PLANNED);
        long travelDays = completedTripDateRanges(userId).stream()
                .mapToLong(range -> ChronoUnit.DAYS.between(range.startDate(), range.endDate()) + 1)
                .sum();
        long visitedCountries = countDistinctCompletedCountries(userId);
        long visitedDomesticRegions = countDistinctCompletedDomesticRegions(userId);

        return new StatsResponse.Summary(completedTrips, plannedTrips, travelDays, visitedCountries, visitedDomesticRegions);
    }

    @Transactional(readOnly = true)
    public List<StatsResponse.MonthlyCount> monthly(String email) {
        Long userId = currentUser(email).getId();
        return entityManager.createQuery("""
                        select year(t.startDate), month(t.startDate), count(t)
                        from Trip t
                        where t.user.id = :userId and t.status = :status
                        group by year(t.startDate), month(t.startDate)
                        order by year(t.startDate), month(t.startDate)
                        """, Object[].class)
                .setParameter("userId", userId)
                .setParameter("status", TripStatus.COMPLETED)
                .getResultStream()
                .map(row -> new StatsResponse.MonthlyCount("%04d-%02d".formatted(((Number) row[0]).intValue(), ((Number) row[1]).intValue()), ((Number) row[2]).longValue()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StatsResponse.TopRegion> topRegions(String email, Integer limit) {
        Long userId = currentUser(email).getId();
        int effectiveLimit = limit == null || limit < 1 ? DEFAULT_TOP_REGION_LIMIT : limit;

        List<StatsResponse.TopRegion> regions = new java.util.ArrayList<>();
        regions.addAll(groupedInternationalRegions(userId));
        regions.addAll(groupedDomesticRegions(userId));

        return regions.stream()
                .sorted(Comparator.comparingLong(StatsResponse.TopRegion::count).reversed()
                        .thenComparing(region -> region.scope().name())
                        .thenComparing(StatsResponse.TopRegion::name))
                .limit(effectiveLimit)
                .toList();
    }

    private User currentUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private long countTrips(Long userId, TripStatus status) {
        return entityManager.createQuery("""
                        select count(t)
                        from Trip t
                        where t.user.id = :userId and t.status = :status
                        """, Long.class)
                .setParameter("userId", userId)
                .setParameter("status", status)
                .getSingleResult();
    }

    private List<DateRange> completedTripDateRanges(Long userId) {
        return entityManager.createQuery("""
                        select t.startDate, t.endDate
                        from Trip t
                        where t.user.id = :userId and t.status = :status
                        """, Object[].class)
                .setParameter("userId", userId)
                .setParameter("status", TripStatus.COMPLETED)
                .getResultStream()
                .map(row -> new DateRange((LocalDate) row[0], (LocalDate) row[1]))
                .toList();
    }

    private long countDistinctCompletedCountries(Long userId) {
        return entityManager.createQuery("""
                        select count(distinct t.country.id)
                        from Trip t
                        where t.user.id = :userId and t.status = :status and t.travelScope = :scope
                        """, Long.class)
                .setParameter("userId", userId)
                .setParameter("status", TripStatus.COMPLETED)
                .setParameter("scope", TravelScope.INTERNATIONAL)
                .getSingleResult();
    }

    private long countDistinctCompletedDomesticRegions(Long userId) {
        return entityManager.createQuery("""
                        select count(distinct t.domesticRegion.id)
                        from Trip t
                        where t.user.id = :userId and t.status = :status and t.travelScope = :scope
                        """, Long.class)
                .setParameter("userId", userId)
                .setParameter("status", TripStatus.COMPLETED)
                .setParameter("scope", TravelScope.DOMESTIC)
                .getSingleResult();
    }

    private List<StatsResponse.TopRegion> groupedInternationalRegions(Long userId) {
        return entityManager.createQuery("""
                        select t.country.nameKo, count(t)
                        from Trip t
                        where t.user.id = :userId and t.status = :status and t.travelScope = :scope
                        group by t.country.id, t.country.nameKo
                        """, Object[].class)
                .setParameter("userId", userId)
                .setParameter("status", TripStatus.COMPLETED)
                .setParameter("scope", TravelScope.INTERNATIONAL)
                .getResultStream()
                .map(row -> new StatsResponse.TopRegion((String) row[0], TravelScope.INTERNATIONAL, ((Number) row[1]).longValue()))
                .toList();
    }

    private List<StatsResponse.TopRegion> groupedDomesticRegions(Long userId) {
        return entityManager.createQuery("""
                        select t.domesticRegion.nameKo, count(t)
                        from Trip t
                        where t.user.id = :userId and t.status = :status and t.travelScope = :scope
                        group by t.domesticRegion.id, t.domesticRegion.nameKo
                        """, Object[].class)
                .setParameter("userId", userId)
                .setParameter("status", TripStatus.COMPLETED)
                .setParameter("scope", TravelScope.DOMESTIC)
                .getResultStream()
                .map(row -> new StatsResponse.TopRegion((String) row[0], TravelScope.DOMESTIC, ((Number) row[1]).longValue()))
                .toList();
    }

    private record DateRange(LocalDate startDate, LocalDate endDate) {
    }
}
