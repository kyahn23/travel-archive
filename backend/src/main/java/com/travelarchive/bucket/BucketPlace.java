package com.travelarchive.bucket;

import com.travelarchive.common.enums.BucketStatus;
import com.travelarchive.common.enums.TravelScope;
import com.travelarchive.map.Country;
import com.travelarchive.map.DomesticRegion;
import com.travelarchive.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bucket_places")
public class BucketPlace {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 160)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "travel_scope", nullable = false, length = 20)
    private TravelScope travelScope;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "country_id")
    private Country country;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "domestic_region_id")
    private DomesticRegion domesticRegion;

    @Column(name = "city_name", length = 120)
    private String cityName;

    @Column(length = 1000)
    private String reason;

    @Column(name = "expected_budget")
    private BigDecimal expectedBudget;

    @Column(name = "desired_season", length = 60)
    private String desiredSeason;

    @Column(length = 100)
    private String companion;

    @Column(nullable = false)
    private Integer priority = 3;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BucketStatus status = BucketStatus.WANT_TO_GO;

    @Column(name = "reference_url", length = 500)
    private String referenceUrl;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false)
    private LocalDateTime updatedAt;

    protected BucketPlace() {
    }

    public BucketPlace(User user, String title, TravelScope travelScope, Country country, DomesticRegion domesticRegion,
                        String cityName, String reason, BigDecimal expectedBudget, String desiredSeason,
                        String companion, Integer priority, BucketStatus status, String referenceUrl, String memo) {
        this.user = user;
        update(title, travelScope, country, domesticRegion, cityName, reason, expectedBudget, desiredSeason,
                companion, priority, status, referenceUrl, memo);
    }

    public void update(String title, TravelScope travelScope, Country country, DomesticRegion domesticRegion,
                        String cityName, String reason, BigDecimal expectedBudget, String desiredSeason,
                        String companion, Integer priority, BucketStatus status, String referenceUrl, String memo) {
        this.title = title;
        this.travelScope = travelScope;
        this.country = country;
        this.domesticRegion = domesticRegion;
        this.cityName = cityName;
        this.reason = reason;
        this.expectedBudget = expectedBudget;
        this.desiredSeason = desiredSeason;
        this.companion = companion;
        this.priority = priority;
        this.status = status;
        this.referenceUrl = referenceUrl;
        this.memo = memo;
    }

    public void changeStatus(BucketStatus status) {
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getTitle() {
        return title;
    }

    public TravelScope getTravelScope() {
        return travelScope;
    }

    public Country getCountry() {
        return country;
    }

    public DomesticRegion getDomesticRegion() {
        return domesticRegion;
    }

    public String getCityName() {
        return cityName;
    }

    public String getReason() {
        return reason;
    }

    public BigDecimal getExpectedBudget() {
        return expectedBudget;
    }

    public String getDesiredSeason() {
        return desiredSeason;
    }

    public String getCompanion() {
        return companion;
    }

    public Integer getPriority() {
        return priority;
    }

    public BucketStatus getStatus() {
        return status;
    }

    public String getReferenceUrl() {
        return referenceUrl;
    }

    public String getMemo() {
        return memo;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
