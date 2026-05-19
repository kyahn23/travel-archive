package com.travelarchive.trip;

import com.travelarchive.bucket.BucketPlace;
import com.travelarchive.common.entity.BaseEntity;
import com.travelarchive.common.enums.TravelScope;
import com.travelarchive.common.enums.TripStatus;
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
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "trips")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Trip extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bucket_place_id")
    private BucketPlace bucketPlace;

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

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TripStatus status = TripStatus.PLANNED;

    @Column(name = "travel_type", length = 80)
    private String travelType;

    @Column(length = 120)
    private String companion;

    @Column(columnDefinition = "TEXT")
    private String summary;

    public Trip(User user, String title, TravelScope travelScope, Country country, DomesticRegion domesticRegion,
                String cityName, LocalDate startDate, LocalDate endDate, String travelType, String companion,
                String summary) {
        this.user = user;
        update(title, travelScope, country, domesticRegion, cityName, startDate, endDate, travelType, companion, summary);
    }

    public Trip(User user, BucketPlace bucketPlace, String title, TravelScope travelScope, Country country,
                DomesticRegion domesticRegion, String cityName, LocalDate startDate, LocalDate endDate,
                String travelType, String companion, String summary) {
        this(user, title, travelScope, country, domesticRegion, cityName, startDate, endDate, travelType, companion, summary);
        this.bucketPlace = bucketPlace;
    }

    public void update(String title, TravelScope travelScope, Country country, DomesticRegion domesticRegion,
                       String cityName, LocalDate startDate, LocalDate endDate, String travelType, String companion,
                       String summary) {
        this.title = title;
        this.travelScope = travelScope;
        this.country = country;
        this.domesticRegion = domesticRegion;
        this.cityName = cityName;
        this.startDate = startDate;
        this.endDate = endDate;
        this.travelType = travelType;
        this.companion = companion;
        this.summary = summary;
    }

    public void changeStatus(TripStatus status) {
        this.status = status;
    }
}
