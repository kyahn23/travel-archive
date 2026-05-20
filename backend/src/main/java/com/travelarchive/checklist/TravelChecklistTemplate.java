package com.travelarchive.checklist;

import com.travelarchive.common.enums.TravelScope;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "travel_checklist_templates")
public class TravelChecklistTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "travel_scope", nullable = false, length = 20)
    private TravelScope travelScope;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    @Column(nullable = false)
    private Boolean active = true;

    public TravelChecklistTemplate(TravelScope travelScope, String title, Integer displayOrder, Boolean active) {
        this.travelScope = travelScope;
        this.title = title;
        this.displayOrder = displayOrder;
        this.active = active;
    }

    protected TravelChecklistTemplate() {
    }

    public Long getId() {
        return id;
    }

    public TravelScope getTravelScope() {
        return travelScope;
    }

    public String getTitle() {
        return title;
    }

    public Integer getDisplayOrder() {
        return displayOrder;
    }

    public Boolean getActive() {
        return active;
    }
}
