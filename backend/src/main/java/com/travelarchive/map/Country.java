package com.travelarchive.map;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "countries")
public class Country {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code_alpha2", nullable = false, unique = true, length = 2)
    private String codeAlpha2;

    @Column(name = "map_key", nullable = false, unique = true, length = 3)
    private String mapKey;

    @Column(name = "name_ko", nullable = false, length = 100)
    private String nameKo;

    @Column(name = "name_en", nullable = false, length = 120)
    private String nameEn;

    @Column(nullable = false, length = 60)
    private String continent;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    protected Country() {
    }

    public Long getId() {
        return id;
    }
}
