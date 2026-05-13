package com.travelarchive.checklist;

import com.travelarchive.trip.Trip;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "travel_checklists")
public class TravelChecklist {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(name = "progress_rate", nullable = false)
    private Integer progressRate = 0;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false)
    private LocalDateTime updatedAt;

    protected TravelChecklist() {
    }

    public TravelChecklist(Trip trip, String title) {
        this.trip = trip;
        this.title = title;
        this.progressRate = 0;
    }

    public void updateProgress(long doneCount, long totalCount) {
        this.progressRate = totalCount == 0 ? 0 : (int) Math.round(doneCount * 100.0 / totalCount);
    }

    public Long getId() {
        return id;
    }

    public Trip getTrip() {
        return trip;
    }

    public String getTitle() {
        return title;
    }

    public Integer getProgressRate() {
        return progressRate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
