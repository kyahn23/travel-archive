package com.travelarchive.common.config;

import com.travelarchive.checklist.TravelChecklistTemplate;
import com.travelarchive.checklist.TravelChecklistTemplateItem;
import com.travelarchive.common.enums.TravelScope;
import com.travelarchive.map.Country;
import com.travelarchive.map.DomesticRegion;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class SeedDataLoader implements CommandLineRunner {

    private final EntityManager entityManager;

    public SeedDataLoader(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (isEmpty("countries")) {
            seedCountries();
        }
        if (isEmpty("domestic_regions")) {
            seedDomesticRegions();
        }
        if (isEmpty("travel_checklist_templates")) {
            seedChecklistTemplates();
        }
    }

    private boolean isEmpty(String table) {
        Long count = ((Number) entityManager.createNativeQuery("select count(*) from " + table)
                .getSingleResult()).longValue();
        return count == 0;
    }

    private void seedCountries() {
        List<Country> countries = List.of(
                new Country("KR", "410", "대한민국", "Korea", "Asia", 1),
                new Country("JP", "392", "일본", "Japan", "Asia", 2),
                new Country("US", "840", "미국", "United States", "North America", 3),
                new Country("FR", "250", "프랑스", "France", "Europe", 4),
                new Country("IT", "380", "이탈리아", "Italy", "Europe", 5),
                new Country("ES", "724", "스페인", "Spain", "Europe", 6),
                new Country("GB", "826", "영국", "United Kingdom", "Europe", 7),
                new Country("DE", "276", "독일", "Germany", "Europe", 8),
                new Country("TH", "764", "태국", "Thailand", "Asia", 9),
                new Country("VN", "704", "베트남", "Vietnam", "Asia", 10),
                new Country("SG", "702", "싱가포르", "Singapore", "Asia", 11),
                new Country("TW", "158", "대만", "Taiwan", "Asia", 12),
                new Country("CN", "156", "중국", "China", "Asia", 13),
                new Country("AU", "036", "호주", "Australia", "Oceania", 14),
                new Country("CA", "124", "캐나다", "Canada", "North America", 15),
                new Country("NZ", "554", "뉴질랜드", "New Zealand", "Oceania", 16),
                new Country("CH", "756", "스위스", "Switzerland", "Europe", 17),
                new Country("AT", "040", "오스트리아", "Austria", "Europe", 18),
                new Country("CZ", "203", "체코", "Czech Republic", "Europe", 19),
                new Country("TR", "792", "튀르키예", "Turkey", "Asia", 20)
        );
        countries.forEach(entityManager::persist);
    }

    private void seedDomesticRegions() {
        List<DomesticRegion> regions = List.of(
                new DomesticRegion("KR-11", "KR-11", "서울특별시", "Seoul", "SIDO", 1),
                new DomesticRegion("KR-26", "KR-26", "부산광역시", "Busan", "SIDO", 2),
                new DomesticRegion("KR-27", "KR-27", "대구광역시", "Daegu", "SIDO", 3),
                new DomesticRegion("KR-28", "KR-28", "인천광역시", "Incheon", "SIDO", 4),
                new DomesticRegion("KR-29", "KR-29", "광주광역시", "Gwangju", "SIDO", 5),
                new DomesticRegion("KR-30", "KR-30", "대전광역시", "Daejeon", "SIDO", 6),
                new DomesticRegion("KR-31", "KR-31", "울산광역시", "Ulsan", "SIDO", 7),
                new DomesticRegion("KR-36", "KR-36", "세종특별자치시", "Sejong", "SIDO", 8),
                new DomesticRegion("KR-41", "KR-41", "경기도", "Gyeonggi", "SIDO", 9),
                new DomesticRegion("KR-42", "KR-42", "강원특별자치도", "Gangwon", "SIDO", 10),
                new DomesticRegion("KR-43", "KR-43", "충청북도", "Chungbuk", "SIDO", 11),
                new DomesticRegion("KR-44", "KR-44", "충청남도", "Chungnam", "SIDO", 12),
                new DomesticRegion("KR-45", "KR-45", "전북특별자치도", "Jeonbuk", "SIDO", 13),
                new DomesticRegion("KR-46", "KR-46", "전라남도", "Jeonnam", "SIDO", 14),
                new DomesticRegion("KR-47", "KR-47", "경상북도", "Gyeongbuk", "SIDO", 15),
                new DomesticRegion("KR-48", "KR-48", "경상남도", "Gyeongnam", "SIDO", 16),
                new DomesticRegion("KR-49", "KR-49", "제주특별자치도", "Jeju", "SIDO", 17)
        );
        regions.forEach(entityManager::persist);
    }

    private void seedChecklistTemplates() {
        TravelChecklistTemplate domesticTemplate = new TravelChecklistTemplate(
                TravelScope.DOMESTIC, "국내 여행 기본 준비물", 1, true);
        entityManager.persist(domesticTemplate);

        List<TravelChecklistTemplateItem> domesticItems = List.of(
                new TravelChecklistTemplateItem(domesticTemplate, "교통", "교통편 예약 확인", 1),
                new TravelChecklistTemplateItem(domesticTemplate, "숙소", "숙소 예약 확인", 2),
                new TravelChecklistTemplateItem(domesticTemplate, "짐", "여행 가방 준비", 3),
                new TravelChecklistTemplateItem(domesticTemplate, "의류", "날씨에 맞는 옷 준비", 4),
                new TravelChecklistTemplateItem(domesticTemplate, "전자기기", "충전기 및 보조배터리", 5),
                new TravelChecklistTemplateItem(domesticTemplate, "서류", "신분증 및 예약증", 6),
                new TravelChecklistTemplateItem(domesticTemplate, "건강", "상비약 준비", 7),
                new TravelChecklistTemplateItem(domesticTemplate, "현지준비", "지역 정보 확인", 8),
                new TravelChecklistTemplateItem(domesticTemplate, "식사", "맛집 리스트업", 9),
                new TravelChecklistTemplateItem(domesticTemplate, "긴급", "비상연락망 확인", 10),
                new TravelChecklistTemplateItem(domesticTemplate, "재정", "현금 및 카드 준비", 11),
                new TravelChecklistTemplateItem(domesticTemplate, "기타", "기타 필요 물품 확인", 12)
        );
        domesticItems.forEach(entityManager::persist);

        TravelChecklistTemplate internationalTemplate = new TravelChecklistTemplate(
                TravelScope.INTERNATIONAL, "해외 여행 기본 준비물", 2, true);
        entityManager.persist(internationalTemplate);

        List<TravelChecklistTemplateItem> internationalItems = List.of(
                new TravelChecklistTemplateItem(internationalTemplate, "서류", "여권 및 비자 확인", 1),
                new TravelChecklistTemplateItem(internationalTemplate, "교통", "항공권 예약 확인", 2),
                new TravelChecklistTemplateItem(internationalTemplate, "숙소", "숙소 예약 확인", 3),
                new TravelChecklistTemplateItem(internationalTemplate, "짐", "여행 가방 준비", 4),
                new TravelChecklistTemplateItem(internationalTemplate, "의류", "날씨에 맞는 옷 준비", 5),
                new TravelChecklistTemplateItem(internationalTemplate, "전자기기", "충전기 및 어댑터", 6),
                new TravelChecklistTemplateItem(internationalTemplate, "건강", "상비약 및 백신 확인", 7),
                new TravelChecklistTemplateItem(internationalTemplate, "재정", "외화 및 카드 준비", 8),
                new TravelChecklistTemplateItem(internationalTemplate, "통신", "로밍 및 와이파이", 9),
                new TravelChecklistTemplateItem(internationalTemplate, "현지준비", "현지 문화 및 언어", 10),
                new TravelChecklistTemplateItem(internationalTemplate, "긴급", "비상연락망 및 보험", 11),
                new TravelChecklistTemplateItem(internationalTemplate, "기타", "기타 필요 물품 확인", 12)
        );
        internationalItems.forEach(entityManager::persist);
    }
}
