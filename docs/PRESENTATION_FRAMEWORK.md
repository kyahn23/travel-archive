# Travel Archive 프레임워크 구성 발표 자료 (10분 버전)

> **발표 시간**: 8-10분  
> **슬라이드 수**: 10장  
> **목표**: PRD 기반 프레임워크 구성의 핵심 기술 결정과 근거를 빠르게 설명

---

## 슬라이드 1: 서비스 한 줄 소개 (30초)

**"가고 싶은 곳 → 준비 중인 여행 → 다녀온 기록을 하나의 지도와 타임라인으로 관리하는 개인 여행 아카이브 PWA"**

| 단계 | 기능 |
|---|---|
| **여행 전** | 버킷리스트 저장 → 예정 여행 전환 → 준비 체크리스트 |
| **여행 후** | 날짜별 타임라인, 사진, 장소 핀 기록 |
| **회고** | 세계지Map/국내지Map 대시보드, 통계 차트 |

---

## 슬라이드 2: 기술 스택과 선정 이유 (1분)

### 백엔드

| 기술 | 선정 이유 |
|---|---|
| **Spring Boot 4.0.6 + Java 25** | REST API, 보안, JPA, Flyway 기반 풀스택 포트폴리오에 적합 |
| **JPA** | 사용자·여행·타임라인·체크리스트 관계 모델을 객체로 표현 |
| **Flyway** | DB 스키마와 seed 데이터를 코드로 버전 관리 |
| **PostgreSQL 16 / H2** | 관계형 집계 쿼리(지Map/통계)에 안정적. H2는 빠른 로컬 개발용 |
| **JWT httpOnly Cookie** | XSS 방어 + 토큰 탈취 위험 감소 + 자동 인증 전달 |

### 프론트엔드

| 기술 | 선정 이유 |
|---|---|
| **Next.js 16 App Router** | SSR/CSR 혼합, API 프록시/빌드/라우팅 편의 |
| **React 19 + TypeScript** | 컴포넌트 기반 UI + API/상태 타입 안정성 |
| **Tailwind CSS + shadcn/ui** | 디자인 토큰 기반 빠른 UI + 기본 컴포넌트 일관성 |
| **react-simple-maps** | SVG 세계/국내 색칠 지Map 대시보드 |
| **Leaflet** | 여행 상세 장소 핀 지Map |
| **Recharts** | 통계 차트 |

---

## 슬라이드 3: 전체 아키텍처 (1분)

```
[Browser / PWA]
    |
    | Next.js App Router (Rewrites: /api/* → 백엔드)
    v
[Frontend] ──credentials: include──→ [Backend: Spring Boot]
                                          |
                                          v
                                     [PostgreSQL 16]
                                          |
                                          v
                              [Local Storage: uploads/]
```

**핵심 흐름**
- 프론트 `/api/*` 요청 → Next.js rewrites → 백엔드 `localhost:8080`
- JWT는 httpOnly 쿠키로 저장, 모든 API 요청에 자동 포함
- 파일은 로컬 저장 (추후 S3 호환 스토리지로 교체 가능한 인터페이스 설계)

---

## 슬라이드 4: 백엔드 구조 - 도메인 기반 패키지 (1분)

```
backend/src/main/java/com/travelarchive/
├── auth/          # 회원가입, 로그인, JWT, refresh token
├── bucket/        # 버킷리스트와 여행 전환
├── checklist/     # 체크리스트, 템플릿, 항목
├── map/           # 세계/국내 지Map 집계
├── stats/         # 통계 집계
├── storage/       # 로컬 파일 저장 추상화 (StorageService 인터페이스)
├── trip/          # 여행, 날짜, 타임라인, 사진
└── user/          # 사용자 엔티티/저장소
```

### 왜 도메인 기반인가?
- **응집도**: Controller-Service-Repository-Entity가 한 폴더에 모임
- **확장성**: 새 도메인(예: 가계부) 추가 시 기존 구조 침해 없이 추가
- **가독성**: `trip/`만 보면 여행 관련 모든 코드 파악 가능

---

## 슬라이드 5: 프론트엔드 구조 - App Router + 기능 기반 (1분)

```
frontend/src/
├── app/
│   ├── (auth)/        # 로그인/회원가입 (별도 레이아웃)
│   ├── (main)/        # 메인 레이아웃
│   │   ├── page.tsx   # 홈 (지Map + 통계 요약)
│   │   ├── trips/     # 여행 목록 및 상세
│   │   ├── buckets/   # 버킷리스트
│   │   ├── stats/     # 통계 대시보드
│   │   └── profile/   # 프로필
├── components/
│   ├── ui/            # Button, Input, Card, Badge, Tabs
│   ├── layout/        # PageHeader, BottomNav, Sidebar
│   ├── maps/          # WorldMap, KoreaMap, LeafletMap
│   ├── trips/         # TripCard, TripDetail
│   ├── bucket/        # BucketCard
│   ├── checklist/     # ChecklistView
│   ├── timeline/      # TimelineView
│   └── photos/        # PhotoGallery
├── lib/
│   ├── api/client.ts  # fetch 래퍼 (자동 401 → 로그인 리다이렉트)
│   └── auth/          # 인증 context, hooks
└── types/travel.ts    # Trip, Bucket, TimelineItem 등 공통 타입
```

### 왜 App Router인가?
- **레이아웃 중첩**: `(auth)`와 `(main)` 그룹으로 로그인 전후 레이아웃 분리
- **API 프록시**: `next.config.mjs`의 `rewrites`로 CORS 문제 해결
- **SSR 이슈 격리**: 지Map/차트는 `dynamic(..., { ssr: false })`로 클라이언트 전용 로드

---

## 슬라이드 6: 데이터베이스 설계 (1분)

### ERD 핵심

```
users 1:N trips
users 1:N bucket_places
bucket_places 1:N trips (선택적 원본 연결)

trips 1:N trip_days
trip_days 1:N trip_timeline_items
trips 1:N trip_photos
trip_timeline_items 1:N trip_photos

trips 1:N travel_checklists
travel_checklists 1:N travel_checklist_items
```

### 설계 결정

| 결정 | 근거 |
|---|---|
| `users ↔ trips (1:N)` | 사용자별 데이터 격리. 모든 조회에 `user_id` 필수 |
| `bucket_places ↔ trips (1:N, 선택적)` | 버킷→예정 전환 시 원본 보존. 히스토리 추적 |
| `trip_days ↔ trip_timeline_items (1:N)` | 날짜별 타임라인. 여행 기간 자동 생성 |
| `trip_photos.owner_type` (COVER/TIMELINE) | 단일 테이블로 대표 이미지와 타임라인 사진 통합 관리 |
| `countries / domestic_regions` 참조 테이블 | 지Map 색칠용 map_key 매핑. GeoJSON 연동 |
| `domestic_regions.region_type (SIDO/SIGUNGU)` | MVP는 SIDO만, 향후 시/군/구 확장 준비 |

---

## 슬라이드 7: Flyway 마이그레이션 + 인증 설계 (1분)

### Flyway

```
V1__init_schema.sql              # 기본 스키마, 제약, 인덱스
V2__seed_reference_data.sql      # 국가/국내 지역 seed
V3__seed_checklist_templates.sql # 체크리스트 템플릿
V4__demo_seed.sql               # 데모 계정 + 샘플 데이터
V5__add_bucket_companion.sql     # 버킷 확장
```

- 이미 배포된 migration은 수정 불가 → 새 버전만 추가
- Docker PostgreSQL + H2 dev 모두 동일 마이그레이션 적용

### 인증: JWT + httpOnly Cookie

```
로그인 → access_token(15분) + refresh_token(7일) 생성
      → httpOnly 쿠키 설정 (JS 접근 불가)
      → 프론트는 credentials: include로 자동 전달
```

| 방식 | 보안 | 선택 |
|---|---|---|
| localStorage + Bearer | XSS 취약 | ❌ |
| **httpOnly Cookie** | **XSS 방어** | ✅ |
| NextAuth.js | 강력하지만 복잡 | ❌ MVP 범위 외 |

---

## 슬라이드 8: 핵심 기술 결정 1 - 지Map 3종 분리 (1.5분)

### 문제: 하나의 지Map 라이브러리로 모든 지Map을 처리하면 복잡도 폭증

### 해결: 역할 명확 분리

| 지Map 유형 | 라이브러리 | 목적 | 표현 단위 |
|---|---|---|---|
| **세계지Map** | react-simple-maps | 대시보드 색칠 | 국가 단위 |
| **국내지Map** | react-simple-maps | 대시보드 색칠 | 시/도 단위 |
| **상세 지Map** | Leaflet | 장소 탐색 | 실제 장소 핀 |

### 상태 우선순위
```
COMPLETED > PLANNED > BUCKET > NONE
```

### 왜 2개 라이브러리인가?
- **react-simple-maps**: SVG 기반, 가벼움, GeoJSON 색칠 최적화 → 대시보드용
- **Leaflet**: 오픈스트리트맵 타일, 마커/팝업/줌 인터랙션 → 상세 탐색용
- **분리 효과**: 코드 복잡도 감소, SSR 이슈 격리, 각자 최적화된 도구 사용

---

## 슬라이드 9: 핵심 기술 결정 2 - 모바일 우선 PWA + 파일 저장 추상화 (1.5분)

### 모바일 우선 반응형

| 화면 | 네비게이션 | 레이아웃 |
|---|---|---|
| 모바일 (0-767px) | 하단 탭 | 1컬럼, 바텀시트, FAB |
| 웹 (1200px+) | 좌측 사이드바 | 카드 그리드, 지Map+드로어 |

- **1차 기준**: 모바일 PWA (여행 중/후 기록은 모바일이 자연스러움)
- **safe-area**: 하단 탭 clearance 80px+, 터치 타깃 44px+
- **포트폴리오 차별화**: 데스크탑 중심 포트폴리오 대비 모바일 UX 역량

### 파일 저장 추상화

```java
public interface StorageService {
    StoredFile store(MultipartFile file, StorageContext context);
    Resource load(String storageKey);
}
```

- **현재**: `LocalFileStorageService` — 로컬 저장으로 빠른 MVP 구현
- **확장**: S3 호환 스토리지(AWS S3, MinIO)로 구현체 교체 가능
- **테스트**: MockStorageService로 단위 테스트 용이

---

## 슬라이드 10: 4주 개발 계획과 완료 기준 (1분)

### 개발 우선순위

| 주차 | 주요 작업 | 목표 |
|---|---|---|
| **1주차** | 설계 확정, 프로젝트 생성, 인증, 여행 CRUD, 버킷 CRUD | 기본 구조 완성 |
| **2주차** | 여행 상세, 타임라인, 체크리스트, 상태 변경, 버킷→예정 전환 | 전-후 흐름 완성 |
| **3주차** | 이미지 업로드, 세계/국내 지Map, Leaflet 상세 지Map | 시각적 핵심 화면 |
| **4주차** | 통계, UI 정리, 모바일 최적화, 샘플 데이터, 배포 | 완성도와 시연 안정성 |

### 완료 판정 기준

1. **필수 시연 흐름이 끊기지 않음**
   ```
   로그인 → 버킷 등록 → 예정 여행 전환 → 체크리스트 → 완료 처리
   → 타임라인/사진 → Leaflet 지Map → 홈 세계지Map/국내지Map → 통계
   ```
2. **데모 데이터**: 완료 국내 2, 해외 2, 예정 1, 버킷 3, 타임라인 핀 15개+
3. **빌드/테스트**: 백엔드 테스트, 프론트엔드 빌드, PostgreSQL 연동 확인
4. **UI 안정성**: 모바일/데스크톱 텍스트 겹침 없음

---

## 마무리: 프레임워크 구성의 3대 원칙 (30초)

1. **도메인 중심 구조**
   - 백엔드: `auth/`, `trip/`, `bucket/`, `map/` 등 도메인별 패키지
   - 프론트엔드: `components/maps/`, `components/trips/` 등 기능별 분리
   - **→ 기능 추가 시 기존 코드 침해 없이 확장**

2. **모바일 우선, 웹은 확장**
   - 1차 기준: 모바일 PWA (하단 탭, 바텀시트, 한 손 조작)
   - 2차 확장: 태블릿/웹 반응형
   - **→ 실제 사용 패턴 반영 + 포트폴리오 차별화**

3. **지Map 3종 분리**
   - react-simple-maps: 대시보드 색칠
   - Leaflet: 상세 장소 핀
   - **→ 역할 명확화로 복잡도 감소, 최적화된 라이브러리 사용**

### 한 문장 정리

> **"PRD의 여행 전-후 흐름을 자연스럽게 연결하되, MVP 범위를 지켜 한 달 내에 끊기지 않는 시연 흐름을 만드는 것이 프레임워크 구성의 핵심 목표"**

---

*발표 종료*
