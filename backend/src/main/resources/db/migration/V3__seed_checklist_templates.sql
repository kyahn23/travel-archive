INSERT INTO travel_checklist_templates (travel_scope, title, display_order, active) VALUES
('DOMESTIC', '국내 여행 기본 준비물', 1, TRUE),
('INTERNATIONAL', '해외 여행 기본 준비물', 2, TRUE);

INSERT INTO travel_checklist_template_items (template_id, category, content, sort_order)
SELECT id, '교통', '교통편 예약 확인', 1 FROM travel_checklist_templates WHERE travel_scope = 'DOMESTIC'
UNION ALL SELECT id, '숙소', '숙소 예약 확인', 2 FROM travel_checklist_templates WHERE travel_scope = 'DOMESTIC'
UNION ALL SELECT id, '서류', '신분증 준비', 3 FROM travel_checklist_templates WHERE travel_scope = 'DOMESTIC'
UNION ALL SELECT id, '결제', '카드 및 현금 준비', 4 FROM travel_checklist_templates WHERE travel_scope = 'DOMESTIC'
UNION ALL SELECT id, '전자기기', '휴대폰 충전기 준비', 5 FROM travel_checklist_templates WHERE travel_scope = 'DOMESTIC'
UNION ALL SELECT id, '전자기기', '보조배터리 충전', 6 FROM travel_checklist_templates WHERE travel_scope = 'DOMESTIC'
UNION ALL SELECT id, '의류', '날씨에 맞는 옷 준비', 7 FROM travel_checklist_templates WHERE travel_scope = 'DOMESTIC'
UNION ALL SELECT id, '세면도구', '개인 세면도구 준비', 8 FROM travel_checklist_templates WHERE travel_scope = 'DOMESTIC'
UNION ALL SELECT id, '건강', '상비약 준비', 9 FROM travel_checklist_templates WHERE travel_scope = 'DOMESTIC'
UNION ALL SELECT id, '일정', '방문 장소 영업시간 확인', 10 FROM travel_checklist_templates WHERE travel_scope = 'DOMESTIC'
UNION ALL SELECT id, '짐', '우산 또는 우비 준비', 11 FROM travel_checklist_templates WHERE travel_scope = 'DOMESTIC'
UNION ALL SELECT id, '기타', '쓰레기봉투 또는 지퍼백 준비', 12 FROM travel_checklist_templates WHERE travel_scope = 'DOMESTIC';

INSERT INTO travel_checklist_template_items (template_id, category, content, sort_order)
SELECT id, '서류', '여권 유효기간 확인', 1 FROM travel_checklist_templates WHERE travel_scope = 'INTERNATIONAL'
UNION ALL SELECT id, '서류', '비자 또는 입국 요건 확인', 2 FROM travel_checklist_templates WHERE travel_scope = 'INTERNATIONAL'
UNION ALL SELECT id, '항공', '항공권 예약 확인', 3 FROM travel_checklist_templates WHERE travel_scope = 'INTERNATIONAL'
UNION ALL SELECT id, '숙소', '숙소 예약 바우처 저장', 4 FROM travel_checklist_templates WHERE travel_scope = 'INTERNATIONAL'
UNION ALL SELECT id, '보험', '여행자보험 가입', 5 FROM travel_checklist_templates WHERE travel_scope = 'INTERNATIONAL'
UNION ALL SELECT id, '통신', '로밍 또는 eSIM 준비', 6 FROM travel_checklist_templates WHERE travel_scope = 'INTERNATIONAL'
UNION ALL SELECT id, '환전', '현지 통화와 결제 카드 준비', 7 FROM travel_checklist_templates WHERE travel_scope = 'INTERNATIONAL'
UNION ALL SELECT id, '전자기기', '멀티 어댑터 준비', 8 FROM travel_checklist_templates WHERE travel_scope = 'INTERNATIONAL'
UNION ALL SELECT id, '전자기기', '보조배터리 기내 반입 기준 확인', 9 FROM travel_checklist_templates WHERE travel_scope = 'INTERNATIONAL'
UNION ALL SELECT id, '건강', '상비약 및 영문 처방전 준비', 10 FROM travel_checklist_templates WHERE travel_scope = 'INTERNATIONAL'
UNION ALL SELECT id, '일정', '현지 교통패스 확인', 11 FROM travel_checklist_templates WHERE travel_scope = 'INTERNATIONAL'
UNION ALL SELECT id, '안전', '대사관 연락처 저장', 12 FROM travel_checklist_templates WHERE travel_scope = 'INTERNATIONAL';
