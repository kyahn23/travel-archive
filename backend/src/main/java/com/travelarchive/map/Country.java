package com.travelarchive.map;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "countries")
public class Country {
    @Id
    @Column(name = "code_alpha2", nullable = false, length = 2)
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

    public Country(String codeAlpha2, String mapKey, String nameKo, String nameEn, String continent, Integer displayOrder) {
        this.codeAlpha2 = codeAlpha2;
        this.mapKey = mapKey;
        this.nameKo = nameKo;
        this.nameEn = nameEn;
        this.continent = continent;
        this.displayOrder = displayOrder;
    }

    protected Country() {
    }

    public String getCodeAlpha2() {
        return codeAlpha2;
    }

    public String getMapKey() {
        return mapKey;
    }

    public String getNameKo() {
        return nameKo;
    }

    public String getNameEn() {
        return nameEn;
    }

    public String getContinent() {
        return continent;
    }

    public Integer getDisplayOrder() {
        return displayOrder;
    }
}
