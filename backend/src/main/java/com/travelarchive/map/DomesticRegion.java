package com.travelarchive.map;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "domestic_regions")
public class DomesticRegion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 10)
    private String code;

    @Column(name = "map_key", nullable = false, unique = true, length = 20)
    private String mapKey;

    @Column(name = "name_ko", nullable = false, length = 80)
    private String nameKo;

    @Column(name = "name_en", nullable = false, length = 120)
    private String nameEn;

    @Column(name = "region_type", nullable = false, length = 30)
    private String regionType;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    protected DomesticRegion() {
    }

    public Long getId() {
        return id;
    }
}
