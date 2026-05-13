-- Demo user
INSERT INTO users (id, email, password_hash, nickname, role, created_at, updated_at) VALUES
(1, 'demo@example.com', '$2b$10$VtPSNU/Z3AJ4928171JC..8pckGd/6NcM8hwi1c5h7yG4mipXMArO', 'Demo Traveler', 'USER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Completed domestic trip: Busan
INSERT INTO trips (id, user_id, title, travel_scope, domestic_region_id, city_name, start_date, end_date, status, travel_type, companion, summary, created_at, updated_at) VALUES
(1, 1, '부산 봄 여행', 'DOMESTIC', 2, '부산', '2024-03-15', '2024-03-17', 'COMPLETED', '힐링', '친구 2명', '해울대와 감천문화마을을 다녀온 2박 3일 부산 여행', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Completed international trip: Osaka
INSERT INTO trips (id, user_id, title, travel_scope, country_id, city_name, start_date, end_date, status, travel_type, companion, summary, created_at, updated_at) VALUES
(2, 1, '오사카 먹방 여행', 'INTERNATIONAL', 2, '오사카', '2024-05-10', '2024-05-14', 'COMPLETED', '먹방', '연인', '도톤보리, 오사카성, 유니버설스튜디오를 방문한 오사카 여행', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Planned international trip: Paris
INSERT INTO trips (id, user_id, title, travel_scope, country_id, city_name, start_date, end_date, status, travel_type, companion, summary, created_at, updated_at) VALUES
(3, 1, '파리 가을 여행', 'INTERNATIONAL', 4, '파리', '2025-09-20', '2025-09-27', 'PLANNED', '문화', '혼자', '루브르 박물관과 에펠탑을 둘러볼 예정인 파리 여행', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Completed domestic trip: Seoul
INSERT INTO trips (id, user_id, title, travel_scope, domestic_region_id, city_name, start_date, end_date, status, travel_type, companion, summary, created_at, updated_at) VALUES
(4, 1, '서울 문화 탐방', 'DOMESTIC', 1, '서울', '2024-01-10', '2024-01-12', 'COMPLETED', '문화', '가족', '고궁과 북촌, 한강 야경을 돌아본 2박 3일 서울 여행', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Completed international trip: Bangkok
INSERT INTO trips (id, user_id, title, travel_scope, country_id, city_name, start_date, end_date, status, travel_type, companion, summary, created_at, updated_at) VALUES
(5, 1, '방콕 휴양 여행', 'INTERNATIONAL', 9, '방콕', '2024-08-05', '2024-08-10', 'COMPLETED', '휴양', '친구 1명', '사원과 루프탑, 수상시장을 여유롭게 즐긴 방콕 여행', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Trip days for Busan trip (3 days)
INSERT INTO trip_days (id, trip_id, day_no, travel_date, title, memo) VALUES
(1, 1, 1, '2024-03-15', '부산 도착 & 해울대', '부산역 도착 후 해울대 항해'),
(2, 1, 2, '2024-03-16', '감천문화마을 탐방', '감천문화마을과 자갈치시장 방문'),
(3, 1, 3, '2024-03-17', '부산 귀가', '아침 산책 후 서울 복귀');

-- Trip days for Osaka trip (5 days)
INSERT INTO trip_days (id, trip_id, day_no, travel_date, title, memo) VALUES
(4, 2, 1, '2024-05-10', '오사카 도착', '간사이 공항 입국 후 도톤보리 저녁'),
(5, 2, 2, '2024-05-11', '오사카성 & 난바', '오사카성 공원과 난바 쇼핑'),
(6, 2, 3, '2024-05-12', '유니버설스튜디오', 'USJ 하루 종일'),
(7, 2, 4, '2024-05-13', '교토 당일치기', '기요미즈데라와 아라시야마'),
(8, 2, 5, '2024-05-14', '귀국', '공항에서 면세점 쇼핑 후 귀국');

-- Trip days for Paris trip (8 days)
INSERT INTO trip_days (id, trip_id, day_no, travel_date, title, memo) VALUES
(9, 3, 1, '2025-09-20', '파리 도착', '샤를드골 공항 입국 후 호텔 체크인'),
(10, 3, 2, '2025-09-21', '에펠탑 & 샹젤리제', '에펠탑 야경과 샹젤리제 거리 산책'),
(11, 3, 3, '2025-09-22', '루브르 박물관', '루브르 박물관 전일 관람'),
(12, 3, 4, '2025-09-23', '몽마르트', '사크레쾨르 대성당과 몽마르트 언덕'),
(13, 3, 5, '2025-09-24', '베르사유', '베르사유 궁전 당일치기'),
(14, 3, 6, '2025-09-25', '마레지구', '마레지구 카페 투어와 쇼핑'),
(15, 3, 7, '2025-09-26', '센느강 크루즈', '센느강 유람선과 마지막 저녁'),
(16, 3, 8, '2025-09-27', '귀국', '공항 이동 및 귀국');

-- Trip days for Seoul trip (3 days)
INSERT INTO trip_days (id, trip_id, day_no, travel_date, title, memo) VALUES
(17, 4, 1, '2024-01-10', '고궁 산책', '경복궁과 서촌 산책'),
(18, 4, 2, '2024-01-11', '북촌과 인사동', '북촌 한옥마을과 인사동 거리'),
(19, 4, 3, '2024-01-12', '한강 야경', '전시 관람 후 한강 야경');

-- Trip days for Bangkok trip (6 days)
INSERT INTO trip_days (id, trip_id, day_no, travel_date, title, memo) VALUES
(20, 5, 1, '2024-08-05', '방콕 도착', '수완나품 공항 도착 후 호텔 체크인'),
(21, 5, 2, '2024-08-06', '왕궁과 사원', '왕궁, 왓포, 왓아룬 방문'),
(22, 5, 3, '2024-08-07', '짜뚜짝과 마사지', '시장 쇼핑과 타이 마사지'),
(23, 5, 4, '2024-08-08', '수상시장', '담넌사두억 수상시장 당일치기'),
(24, 5, 5, '2024-08-09', '루프탑 디너', '호텔 수영장과 루프탑 바'),
(25, 5, 6, '2024-08-10', '귀국', '공항 이동 및 귀국');

-- Timeline items for Busan trip (with lat/lng)
INSERT INTO trip_timeline_items (trip_day_id, item_time, title, memo, place_name, address, latitude, longitude, cost, category, sort_order) VALUES
(1, '14:00', '부산역 도착', 'KTX로 부산역 도착', '부산역', '부산광역시 동구 중앙대로 206', 35.1156, 129.0403, 59800, 'MOVE', 1),
(1, '15:30', '해울대 해수욕장', '봄바다 산책', '해울대 해수욕장', '부산광역시 해울대구 해울대핀로 264', 35.1587, 129.1604, 0, 'PLACE', 2),
(1, '19:00', '해울대 야경 맛집', '조개구이 저녁', '조개구이 거리', '부산광역시 해울대구 구남로', 35.1600, 129.1650, 45000, 'FOOD', 3),
(2, '10:00', '감천문화마을', '색ful한 벽화 마을', '감천문화마을', '부산광역시 사하구 감내2로 203', 35.0974, 129.0106, 0, 'PLACE', 1),
(2, '13:00', '자갈치시장 점심', '활어회와 항아리 순대', '자갈치시장', '부산광역시 중구 자갈치해안로 52', 35.0968, 129.0306, 35000, 'FOOD', 2),
(2, '16:00', '용두산공원', '부산타워 전망대', '용두산공원', '부산광역시 중구 용두산길 37', 35.1007, 129.0328, 8000, 'PLACE', 3),
(3, '09:00', '호텔 체크아웃', '마지막 아침', '호텔', '해울대구', 35.1600, 129.1650, 0, 'MEMO', 1),
(3, '11:30', '부산역 귀국', 'KTX로 서울 복귀', '부산역', '부산광역시 동구 중앙대로 206', 35.1156, 129.0403, 59800, 'MOVE', 2);

-- Timeline items for Osaka trip (with lat/lng)
INSERT INTO trip_timeline_items (trip_day_id, item_time, title, memo, place_name, address, latitude, longitude, cost, category, sort_order) VALUES
(4, '18:00', '간사이 공항 입국', '난카이 전철로 난바 이동', '간사이 국제공항', '오사칸부 센난군 다지리', 34.4358, 135.2444, 930, 'MOVE', 1),
(4, '20:00', '도톤보리 저녁', '타코야키와 오코노미야키', '도톤보리', '오사칸부 오사카시 주오구 도톤보리', 34.6687, 135.5013, 2500, 'FOOD', 2),
(5, '09:00', '오사카성', '천수각 전망대와 성곽 산책', '오사카성', '오사칸부 오사카시 주오구 오사카성 1-1', 34.6873, 135.5262, 600, 'PLACE', 1),
(5, '13:00', '난바 쇼핑', '쇼핑과 라멘 점심', '난바 파크스', '오사칸부 오사카시 난바구 난바나카 2-10-70', 34.6618, 135.5019, 8000, 'ACTIVITY', 2),
(6, '08:00', 'USJ 입장', '슈퍼 닌텐도 월드 예약', '유니버설스튜디오 재팬', '오사칸부 오사카시 고노하나구 사키지마 2-1-33', 34.6654, 135.4323, 8600, 'PLACE', 1),
(6, '12:00', 'USJ 점심', '버터비어와 양념감자', '삼총사 펍', 'USJ 내', 34.6670, 135.4310, 2000, 'FOOD', 2),
(7, '08:30', '교토 이동', '한큐선으로 교토 이동', '교토역', '교토부 교토시 시모교구', 34.9858, 135.7588, 410, 'MOVE', 1),
(7, '10:00', '기요미즈데라', '목조 테라스와 교토 전경', '기요미즈데라', '교토부 교토시 히가시야마구 기요미즈 1-294', 34.9949, 135.7850, 400, 'PLACE', 2),
(7, '15:00', '아라시야마', '대나무숲 산책', '아라시야마', '교토부 교토시 우쿄구 아라시야마', 35.0094, 135.6668, 0, 'PLACE', 3),
(8, '10:00', '공항 이동', '난카이 전철로 공항 이동', '간사이 국제공항', '오사칸부 센난군 다지리', 34.4358, 135.2444, 930, 'MOVE', 1);

-- Timeline items for Seoul trip (with lat/lng)
INSERT INTO trip_timeline_items (trip_day_id, item_time, title, memo, place_name, address, latitude, longitude, cost, category, sort_order) VALUES
(17, '10:00', '경복궁 관람', '근정전과 향원정 산책', '경복궁', '서울특별시 종로구 사직로 161', 37.5796, 126.9770, 3000, 'PLACE', 1),
(17, '13:00', '서촌 점심', '한옥 골목의 작은 식당', '서촌', '서울특별시 종로구 필운대로', 37.5790, 126.9688, 18000, 'FOOD', 2),
(18, '11:00', '북촌 한옥마을', '한옥 골목 사진 산책', '북촌 한옥마을', '서울특별시 종로구 계동길 37', 37.5826, 126.9836, 0, 'PLACE', 1),
(18, '15:00', '인사동 찻집', '전통차와 기념품 쇼핑', '인사동', '서울특별시 종로구 인사동길', 37.5717, 126.9860, 12000, 'ACTIVITY', 2),
(19, '19:30', '반포한강공원 야경', '달빛무지개분수와 산책', '반포한강공원', '서울특별시 서초구 신반포로11길 40', 37.5126, 126.9956, 0, 'PLACE', 1);

-- Timeline items for Bangkok trip (with lat/lng)
INSERT INTO trip_timeline_items (trip_day_id, item_time, title, memo, place_name, address, latitude, longitude, cost, category, sort_order) VALUES
(20, '16:00', '수완나품 공항 도착', '공항철도로 시내 이동', '수완나품 국제공항', '999 Nong Prue, Bang Phli District, Samut Prakan', 13.6900, 100.7501, 45, 'MOVE', 1),
(20, '20:00', '시암 저녁', '팟타이와 망고스티키라이스', '시암 파라곤', '991 Rama I Rd, Pathum Wan, Bangkok', 13.7466, 100.5347, 650, 'FOOD', 2),
(21, '09:30', '방콕 왕궁', '에메랄드 사원과 왕궁 관람', '방콕 왕궁', 'Na Phra Lan Rd, Phra Nakhon, Bangkok', 13.7500, 100.4913, 500, 'PLACE', 1),
(21, '13:30', '왓아룬', '강 건너 새벽사원 방문', '왓아룬', '158 Thanon Wang Doem, Bangkok Yai, Bangkok', 13.7437, 100.4889, 100, 'PLACE', 2),
(22, '11:00', '짜뚜짝 시장', '주말시장 쇼핑과 길거리 음식', '짜뚜짝 시장', 'Kamphaeng Phet 2 Rd, Chatuchak, Bangkok', 13.7998, 100.5500, 1200, 'ACTIVITY', 1),
(24, '19:00', '루프탑 바', '방콕 야경을 보며 마지막 저녁', '스카이 바', '1055 Si Lom Rd, Bang Rak, Bangkok', 13.7212, 100.5167, 2800, 'FOOD', 1);

-- Demo photo metadata. Files are not bundled; file endpoints may return 404 until real uploads exist.
INSERT INTO trip_photos (id, trip_id, timeline_item_id, owner_type, storage_key, file_url, original_file_name, content_type, file_size, caption, sort_order) VALUES
(1, 1, NULL, 'TRIP_COVER', 'demo/1/cover/busan-spring-cover.jpg', '/api/files/1', 'busan-spring-cover.jpg', 'image/jpeg', 245760, '부산 봄 여행 대표 사진', 0),
(2, 1, (SELECT id FROM trip_timeline_items WHERE trip_day_id = 1 AND title = '해울대 해수욕장'), 'TIMELINE_ITEM', 'demo/1/timeline/haeundae-beach.jpg', '/api/files/2', 'haeundae-beach.jpg', 'image/jpeg', 198420, '봄바다 산책', 1),
(3, 1, (SELECT id FROM trip_timeline_items WHERE trip_day_id = 2 AND title = '감천문화마을'), 'TIMELINE_ITEM', 'demo/1/timeline/gamcheon-village.jpg', '/api/files/3', 'gamcheon-village.jpg', 'image/jpeg', 221184, '감천문화마을 골목', 1),
(4, 1, (SELECT id FROM trip_timeline_items WHERE trip_day_id = 2 AND title = '자갈치시장 점심'), 'TIMELINE_ITEM', 'demo/1/timeline/jagalchi-lunch.jpg', '/api/files/4', 'jagalchi-lunch.jpg', 'image/jpeg', 176128, '자갈치시장 점심', 2);

-- Bucket places (2 draft items)
INSERT INTO bucket_places (id, user_id, title, travel_scope, domestic_region_id, city_name, reason, expected_budget, desired_season, priority, status, reference_url, memo, created_at, updated_at) VALUES
(1, 1, '제주도 힐링 여행', 'DOMESTIC', 17, '제주시', '한 달 살기 목표, 오름과 바다', 1500000, '봄/가을', 2, 'WANT_TO_GO', 'https://jeju.go.kr', '제주 한 달 살기를 위한 숙소 알아보기', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO bucket_places (id, user_id, title, travel_scope, country_id, city_name, reason, expected_budget, desired_season, priority, status, reference_url, memo, created_at, updated_at) VALUES
(2, 1, '방콕 & 치앙마이', 'INTERNATIONAL', 9, '방콕/치앙마이', '태국 음식과 사원 투어', 2500000, '겨울', 1, 'WANT_TO_GO', 'https://tourismthailand.org', '비자 없이 90일 체류 가능', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO bucket_places (id, user_id, title, travel_scope, country_id, city_name, reason, expected_budget, desired_season, priority, status, reference_url, memo, created_at, updated_at) VALUES
(3, 1, '스위스 알프스 트레킹', 'INTERNATIONAL', 17, '인터라켄', '융프라우와 알프스 트레킹 코스를 걸어보기', 5200000, '여름', 1, 'WANT_TO_GO', 'https://www.myswitzerland.com', '산악열차 패스와 트레킹 장비 확인', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Checklist for Busan trip
INSERT INTO travel_checklists (id, trip_id, title, progress_rate, created_at, updated_at) VALUES
(1, 1, '부산 여행 준비물', 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO travel_checklist_items (checklist_id, category, content, status, sort_order) VALUES
(1, '교통', 'KTX 예매 완료', 'DONE', 1),
(1, '숙소', '해울대 호텔 예약', 'DONE', 2),
(1, '서류', '신분증 준비', 'TODO', 3),
(1, '결제', '현금 및 카드 준비', 'DONE', 4),
(1, '전자기기', '휴팩폰 충전기', 'TODO', 5),
(1, '의류', '봄 옷 챙기기', 'TODO', 6),
(1, '세멘도구', '개인 세멘도구', 'DONE', 7),
(1, '일정', '맛집 리스트 작성', 'TODO', 8);

-- Checklist for Bangkok trip
INSERT INTO travel_checklists (id, trip_id, title, progress_rate, created_at, updated_at) VALUES
(2, 5, '방콕 여행 준비물', 67, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO travel_checklist_items (id, checklist_id, category, content, status, sort_order) VALUES
(9, 2, '서류', '여권 만료일 확인', 'DONE', 1),
(10, 2, '항공', '왕복 항공권 예약', 'DONE', 2),
(11, 2, '숙소', '시암 근처 호텔 예약', 'DONE', 3),
(12, 2, '결제', '해외 결제 카드 준비', 'DONE', 4),
(13, 2, '건강', '상비약과 모기 기피제 챙기기', 'TODO', 5),
(14, 2, '일정', '수상시장 투어 예약', 'TODO', 6);
