package com.travelarchive.checklist;

import com.travelarchive.common.entity.BaseEntity;
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
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "travel_checklists")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TravelChecklist extends BaseEntity {
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

    public TravelChecklist(Trip trip, String title) {
        this.trip = trip;
        this.title = title;
        this.progressRate = 0;
    }

    public void updateProgress(long doneCount, long totalCount) {
        this.progressRate = totalCount == 0 ? 0 : (int) Math.round(doneCount * 100.0 / totalCount);
    }
}
