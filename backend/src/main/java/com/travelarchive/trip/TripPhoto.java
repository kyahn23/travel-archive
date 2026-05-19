package com.travelarchive.trip;

import com.travelarchive.common.entity.BaseEntity;
import com.travelarchive.common.enums.PhotoOwnerType;
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
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "trip_photos")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TripPhoto extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "timeline_item_id")
    private TripTimelineItem timelineItem;

    @Enumerated(EnumType.STRING)
    @Column(name = "owner_type", nullable = false, length = 20)
    private PhotoOwnerType ownerType;

    @Column(name = "storage_key", nullable = false, length = 500)
    private String storageKey;

    @Column(name = "file_url", length = 500)
    private String fileUrl;

    @Column(name = "original_file_name", nullable = false)
    private String originalFileName;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(length = 500)
    private String caption;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    public TripPhoto(Trip trip, TripTimelineItem timelineItem, PhotoOwnerType ownerType, String storageKey,
                     String fileUrl, String originalFileName, String contentType, Long fileSize, String caption,
                     Integer sortOrder) {
        this.trip = trip;
        this.timelineItem = timelineItem;
        this.ownerType = ownerType;
        this.storageKey = storageKey;
        this.fileUrl = fileUrl;
        this.originalFileName = originalFileName;
        this.contentType = contentType;
        this.fileSize = fileSize;
        this.caption = caption;
        this.sortOrder = sortOrder == null ? 0 : sortOrder;
    }
}
