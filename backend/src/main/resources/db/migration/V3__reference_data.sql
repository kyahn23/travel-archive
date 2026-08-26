-- V3__reference_data.sql
-- Idempotent reference data (countries / domestic_regions / checklist templates)
-- keyed on natural keys. ON CONFLICT DO UPDATE only updates stable metadata,
-- never the natural key or display_order. Preflight in V2 already guards
-- against duplicates before this runs.

SET search_path TO public;

INSERT INTO countries (code_alpha2, map_key, name_ko, name_en, continent, display_order) VALUES
    ('KR','410','대한민국','Korea','Asia',1),
    ('JP','392','일본','Japan','Asia',2),
    ('US','840','미국','United States','North America',3),
    ('FR','250','프랑스','France','Europe',4),
    ('IT','380','이탈리아','Italy','Europe',5),
    ('ES','724','스페인','Spain','Europe',6),
    ('GB','826','영국','United Kingdom','Europe',7),
    ('DE','276','독일','Germany','Europe',8),
    ('TH','764','태국','Thailand','Asia',9),
    ('VN','704','베트남','Vietnam','Asia',10),
    ('SG','702','싱가포르','Singapore','Asia',11),
    ('TW','158','대만','Taiwan','Asia',12),
    ('CN','156','중국','China','Asia',13),
    ('AU','036','호주','Australia','Oceania',14),
    ('CA','124','캐나다','Canada','North America',15),
    ('NZ','554','뉴질랜드','New Zealand','Oceania',16),
    ('CH','756','스위스','Switzerland','Europe',17),
    ('AT','040','오스트리아','Austria','Europe',18),
    ('CZ','203','체코','Czech Republic','Europe',19),
    ('TR','792','튀르키예','Turkey','Asia',20)
ON CONFLICT (code_alpha2) DO UPDATE
   SET map_key        = EXCLUDED.map_key,
       name_ko        = EXCLUDED.name_ko,
       name_en        = EXCLUDED.name_en,
       continent      = EXCLUDED.continent,
       display_order  = EXCLUDED.display_order;

INSERT INTO domestic_regions (code, map_key, name_ko, name_en, region_type, display_order) VALUES
    ('KR-11','KR-11','서울특별시','Seoul','SIDO',1),
    ('KR-26','KR-26','부산광역시','Busan','SIDO',2),
    ('KR-27','KR-27','대구광역시','Daegu','SIDO',3),
    ('KR-28','KR-28','인천광역시','Incheon','SIDO',4),
    ('KR-29','KR-29','광주광역시','Gwangju','SIDO',5),
    ('KR-30','KR-30','대전광역시','Daejeon','SIDO',6),
    ('KR-31','KR-31','울산광역시','Ulsan','SIDO',7),
    ('KR-36','KR-36','세종특별자치시','Sejong','SIDO',8),
    ('KR-41','KR-41','경기도','Gyeonggi','SIDO',9),
    ('KR-42','KR-42','강원특별자치도','Gangwon','SIDO',10),
    ('KR-43','KR-43','충청북도','Chungbuk','SIDO',11),
    ('KR-44','KR-44','충청남도','Chungnam','SIDO',12),
    ('KR-45','KR-45','전북특별자치도','Jeonbuk','SIDO',13),
    ('KR-46','KR-46','전라남도','Jeonnam','SIDO',14),
    ('KR-47','KR-47','경상북도','Gyeongbuk','SIDO',15),
    ('KR-48','KR-48','경상남도','Gyeongnam','SIDO',16),
    ('KR-49','KR-49','제주특별자치도','Jeju','SIDO',17)
ON CONFLICT (code) DO UPDATE
   SET map_key        = EXCLUDED.map_key,
       name_ko        = EXCLUDED.name_ko,
       name_en        = EXCLUDED.name_en,
       region_type    = EXCLUDED.region_type,
       display_order  = EXCLUDED.display_order;

-- Checklist templates (canonical natural key: travel_scope + title).
INSERT INTO travel_checklist_templates (travel_scope, title, display_order, active)
SELECT v.travel_scope, v.title, v.display_order, v.active
  FROM (VALUES
    ('DOMESTIC'::varchar,     '국내 여행 기본 준비물',     1, TRUE),
    ('INTERNATIONAL'::varchar,'해외 여행 기본 준비물',    2, TRUE)
  ) AS v(travel_scope, title, display_order, active)
ON CONFLICT (travel_scope, title) DO UPDATE
   SET display_order = EXCLUDED.display_order,
       active        = EXCLUDED.active;

-- Checklist template items (canonical natural key: template_id + sort_order).
INSERT INTO travel_checklist_template_items (template_id, category, content, sort_order)
SELECT t.id, v.category, v.content, v.sort_order
  FROM (VALUES
    ('국내 여행 기본 준비물','교통','교통편 예약 확인',1),
    ('국내 여행 기본 준비물','숙소','숙소 예약 확인',2),
    ('국내 여행 기본 준비물','짐','여행 가방 준비',3),
    ('국내 여행 기본 준비물','의류','날씨에 맞는 옷 준비',4),
    ('국내 여행 기본 준비물','전자기기','충전기 및 보조배터리',5),
    ('국내 여행 기본 준비물','서류','신분증 및 예약증',6),
    ('국내 여행 기본 준비물','건강','상비약 준비',7),
    ('국내 여행 기본 준비물','현지준비','지역 정보 확인',8),
    ('국내 여행 기본 준비물','식사','맛집 리스트업',9),
    ('국내 여행 기본 준비물','긴급','비상연락망 확인',10),
    ('국내 여행 기본 준비물','재정','현금 및 카드 준비',11),
    ('국내 여행 기본 준비물','기타','기타 필요 물품 확인',12),
    ('해외 여행 기본 준비물','서류','여권 및 비자 확인',1),
    ('해외 여행 기본 준비물','교통','항공권 예약 확인',2),
    ('해외 여행 기본 준비물','숙소','숙소 예약 확인',3),
    ('해외 여행 기본 준비물','짐','여행 가방 준비',4),
    ('해외 여행 기본 준비물','의류','날씨에 맞는 옷 준비',5),
    ('해외 여행 기본 준비물','전자기기','충전기 및 어댑터',6),
    ('해외 여행 기본 준비물','건강','상비약 및 백신 확인',7),
    ('해외 여행 기본 준비물','재정','외화 및 카드 준비',8),
    ('해외 여행 기본 준비물','통신','로밍 및 와이파이',9),
    ('해외 여행 기본 준비물','현지준비','현지 문화 및 언어',10),
    ('해외 여행 기본 준비물','긴급','비상연락망 및 보험',11),
    ('해외 여행 기본 준비물','기타','기타 필요 물품 확인',12)
  ) AS v(template_title, category, content, sort_order)
  JOIN travel_checklist_templates t
    ON t.title = v.template_title
ON CONFLICT (template_id, sort_order) DO UPDATE
   SET category = EXCLUDED.category,
       content  = EXCLUDED.content;
