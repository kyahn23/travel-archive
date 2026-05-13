package com.travelarchive.trip;

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

@Entity
@Table(name = "trip_days")
public class TripDay {
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

    protected TripDay() {
    }

    public TripDay(Trip trip, Integer dayNo, LocalDate travelDate, String title, String memo) {
        this.trip = trip;
        this.dayNo = dayNo;
        this.travelDate = travelDate;
        this.title = title;
        this.memo = memo;
    }

    public Long getId() {
        return id;
    }

    public Trip getTrip() {
        return trip;
    }

    public Integer getDayNo() {
        return dayNo;
    }

    public LocalDate getTravelDate() {
        return travelDate;
    }

    public String getTitle() {
        return title;
    }

    public String getMemo() {
        return memo;
    }
}
