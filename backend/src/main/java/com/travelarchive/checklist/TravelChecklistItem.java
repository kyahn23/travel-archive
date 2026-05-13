package com.travelarchive.checklist;

import com.travelarchive.common.enums.ChecklistItemStatus;
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
import java.time.LocalDateTime;

@Entity
@Table(name = "travel_checklist_items")
public class TravelChecklistItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "checklist_id", nullable = false)
    private TravelChecklist checklist;

    @Column(nullable = false, length = 80)
    private String category;

    @Column(nullable = false, length = 300)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChecklistItemStatus status = ChecklistItemStatus.TODO;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false)
    private LocalDateTime updatedAt;

    protected TravelChecklistItem() {
    }

    public TravelChecklistItem(TravelChecklist checklist, String category, String content, Integer sortOrder, LocalDate dueDate) {
        this.checklist = checklist;
        this.category = category;
        this.content = content;
        this.sortOrder = sortOrder;
        this.dueDate = dueDate;
        this.status = ChecklistItemStatus.TODO;
    }

    public TravelChecklistItem(TravelChecklist checklist, String category, String content, Integer sortOrder) {
        this(checklist, category, content, sortOrder, null);
    }

    public void toggleStatus() {
        this.status = this.status == ChecklistItemStatus.DONE ? ChecklistItemStatus.TODO : ChecklistItemStatus.DONE;
    }

    public Long getId() {
        return id;
    }

    public TravelChecklist getChecklist() {
        return checklist;
    }

    public String getCategory() {
        return category;
    }

    public String getContent() {
        return content;
    }

    public ChecklistItemStatus getStatus() {
        return status;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
