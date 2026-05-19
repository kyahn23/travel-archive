package com.travelarchive.trip;

import com.travelarchive.common.entity.BaseEntity;
import com.travelarchive.common.enums.TimelineCategory;
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
import java.time.LocalTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "trip_timeline_items")
@SuppressWarnings("unused")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TripTimelineItem extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_day_id", nullable = false)
    private TripDay tripDay;

    @Column(name = "item_time")
    private LocalTime itemTime;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Column(name = "place_name", length = 160)
    private String placeName;

    @Column(length = 300)
    private String address;

    private BigDecimal latitude;
    private BigDecimal longitude;
    @SuppressWarnings("unused")
    private BigDecimal cost;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TimelineCategory category;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    public TripTimelineItem(TripDay tripDay, LocalTime itemTime, String title, String memo, String placeName,
                            String address, BigDecimal latitude, BigDecimal longitude, TimelineCategory category,
                            Integer sortOrder) {
        this.tripDay = tripDay;
        update(tripDay, itemTime, title, memo, placeName, address, latitude, longitude, category, sortOrder);
    }

    public void update(TripDay tripDay, LocalTime itemTime, String title, String memo, String placeName,
                       String address, BigDecimal latitude, BigDecimal longitude, TimelineCategory category,
                       Integer sortOrder) {
        this.tripDay = tripDay;
        this.itemTime = itemTime;
        this.title = title;
        this.memo = memo;
        this.placeName = placeName;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.category = category;
        this.sortOrder = sortOrder == null ? 0 : sortOrder;
    }
}
