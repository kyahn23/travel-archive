package com.travelarchive.map;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "domestic_regions")
public class DomesticRegion {
    @Id
    @Column(nullable = false, length = 10)
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

    public DomesticRegion(String code, String mapKey, String nameKo, String nameEn, String regionType, Integer displayOrder) {
        this.code = code;
        this.mapKey = mapKey;
        this.nameKo = nameKo;
        this.nameEn = nameEn;
        this.regionType = regionType;
        this.displayOrder = displayOrder;
    }

    protected DomesticRegion() {
    }

    public String getCode() {
        return code;
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

    public String getRegionType() {
        return regionType;
    }

    public Integer getDisplayOrder() {
        return displayOrder;
    }
}
