package com.travelarchive.trip;

import com.travelarchive.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "trip_days")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TripDay extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Column(name = "day_no", nullable = false)
    private Integer dayNo;

    @Column(name = "travel_date", nullable = false)
    private LocalDate travelDate;

    @Column(length = 160)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String memo;

    public TripDay(Trip trip, Integer dayNo, LocalDate travelDate, String title, String memo) {
        this.trip = trip;
        this.dayNo = dayNo;
        this.travelDate = travelDate;
        this.title = title;
        this.memo = memo;
    }
}
