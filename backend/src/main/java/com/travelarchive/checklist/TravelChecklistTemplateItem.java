package com.travelarchive.checklist;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "travel_checklist_template_items")
public class TravelChecklistTemplateItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_id", nullable = false)
    private TravelChecklistTemplate template;

    @Column(nullable = false, length = 80)
    private String category;

    @Column(nullable = false, length = 300)
    private String content;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    protected TravelChecklistTemplateItem() {
    }

    public Long getId() {
        return id;
    }

    public TravelChecklistTemplate getTemplate() {
        return template;
    }

    public String getCategory() {
        return category;
    }

    public String getContent() {
        return content;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }
}
