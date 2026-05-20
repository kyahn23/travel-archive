# Travel Archive 개발자 핸드북

> 이 문서는 Travel Archive 프로젝트의 **PRD + 디자인 시스템 + UI 브리프 + 구현 코드 + 배포 운영 지식**을 하나로 묶은 단일 기준 문서다.  
> 신규 개발자는 이 문서만 읽어도 “무엇을 왜 만들고, 어떤 화면과 API로, 어떤 코드 파일에서 구현하는지”를 파악할 수 있어야 한다.

---

## 0. 문서 사용법

### 0.1 기준 문서

| 구분 | 파일 | 역할 |
|---|---|---|
| 최종 PRD | `docs/travel_archive_prd.md` | MVP 범위, 사용자 흐름, 데이터/API 초안, 완료 기준 |
| 디자인 시스템 | `docs/design-system.md` | 색상, 타이포그래피, 카드/버튼/지도/차트/반응형 규칙 |
| UI 브리프 | `docs/ui_brief.md` | 모바일 우선 UX, 하단 탭, 바텀시트/드로어, 화면 흐름 |
| 참조 PRD | `travel_archive_prd_reference.md` | 초기 기획, 한 달 구현 계획, 리스크 평가 |
| 코드 | `backend/`, `frontend/` | 실제 구현 기준 |

### 0.2 핵심 원칙

1. **MVP는 모바일 우선 PWA**다. 웹은 같은 디자인 시스템을 넓은 화면으로 확장한다.
2. **여행 흐름은 버킷 → 예정 → 체크리스트 → 완료 → 타임라인/사진/지도 → 통계**로 이어진다.
3. **지도 역할은 3개로 분리**한다: 세계지도/국내지도는 색칠 대시보드, 상세지도는 장소 핀.
4. **상태 색상은 지도·배지·차트에서 같은 의미**를 가져야 한다.
5. **사용자별 데이터 접근 제어는 서버에서 보장**한다.
6. **MVP 제외 기능은 UI에서 과하게 암시하지 않는다**: AI 추천, 공유, 동선 라인, 외부 장소 검색, 시/군/구 색칠 등.

---

## 1. 서비스 개요

### 1.1 서비스 정의

Travel Archive는 사용자가 **가고 싶은 여행지, 준비 중인 여행, 다녀온 여행**을 하나의 지도와 타임라인으로 관리하는 개인 여행 기록 PWA다.

```txt
가고 싶은 곳을 저장한다
↓
실제 예정 여행으로 전환한다
↓
출발 전 체크리스트를 관리한다
↓
다녀온 뒤 사진·메모·타임라인·장소 핀을 기록한다
↓
세계지도·국내지도·통계로 여행 이력을 회고한다
```

### 1.2 핵심 컨셉

| 축 | 기능 | 사용자 가치 |
|---|---|---|
| 여행 전 | 버킷리스트, 예정 여행, 체크리스트 | 흩어진 계획을 한곳에 정리 |
| 여행 중/후 | 날짜별 타임라인, 사진, 메모, 장소 핀 | 기록을 시간과 장소로 재구성 |
| 회고 | 세계지도, 국내지도, 통계 | 내가 어디를 얼마나 다녔는지 시각화 |

### 1.3 대상 사용자

- 여행지를 저장하지만 실제 계획과 기록이 흩어지는 개인 여행자
- 여행별 준비물 체크리스트를 관리하고 싶은 사용자
- 다녀온 여행을 사진, 장소, 날짜별 메모로 정리하고 싶은 사용자
- 방문 국가와 국내 지역을 지도와 통계로 보고 싶은 사용자

### 1.4 사용자 여정

```txt
[회원가입/로그인]
  -> [홈 대시보드에서 전체 현황 확인]
  -> [버킷리스트에 가고 싶은 곳 등록]
  -> [버킷리스트를 예정 여행으로 전환]
  -> [여행 상세의 체크리스트 탭에서 준비]
  -> [여행 완료 처리]
  -> [타임라인 항목 + 사진 + 위도/경도 입력]
  -> [상세 Leaflet 지도에서 장소 핀 확인]
  -> [홈 세계/국내 지도에서 지역 상태 확인]
  -> [통계 페이지에서 여행 횟수/일수/지역 랭킹 확인]
```

### 1.5 MVP 포함 범위

| 영역 | 포함 기능 |
|---|---|
| 인증 | 이메일/비밀번호 회원가입, 로그인, JWT, httpOnly 쿠키 |
| 여행 | CRUD, `PLANNED`/`COMPLETED`/`CANCELLED`, 국내/해외 구분 |
| 버킷 | CRUD, 버킷 → 예정 여행 전환 |
| 체크리스트 | 기본 템플릿 자동 생성, 항목 추가/삭제/체크, 진행률 |
| 타임라인 | 여행 날짜, 날짜별 항목, 시간/장소/좌표/비용/카테고리 |
| 사진 | 대표 이미지, 타임라인 사진, 로컬 파일 저장 |
| 지도 | 세계지도, 국내 시/도 지도, 상세 Leaflet 핀 지도 |
| 통계 | 요약, 월별 빈도, 지역 랭킹 |
| UI | 모바일 우선 반응형, 하단 탭, 웹 사이드바 |

### 1.6 MVP 제외 범위

- OAuth 로그인
- 외부 장소 검색 API
- 동행자 초대
- SNS 공유/공개 링크
- AI 여행 추천
- OCR 영수증 인식
- 실시간 위치 추적
- 시/군/구 단위 지도 색칠
- 여행 동선 라인
- 이미지 썸네일 자동 생성
- PWA 오프라인/푸시 알림 고도화

---

## 2. 기술 스택과 아키텍처

### 2.1 전체 시스템 아키텍처

```txt
Browser / PWA
  |
  | Next.js App Router, React, Tailwind, shadcn-style UI
  v
Frontend: frontend/
  - /api/* 요청은 Next.js rewrites로 백엔드 프록시
  - credentials: include로 httpOnly 쿠키 전달
  |
  v
Backend: Spring Boot 4.0.6
  - Spring Security + JWT filter
  - REST Controller -> Service -> Repository -> JPA Entity
  |
  v
Database: PostgreSQL 16
  - JPA `ddl-auto`로 스키마 관리 (`dev`: `update`, `prod`: `validate`)
  - `SeedDataLoader`로 참조 데이터 자동 삽입
  - users, trips, bucket_places, checklist, timeline, photos, map reference
  |
  v
Local Storage
  - backend/storage/uploads/{userId}/{tripId}/
```

### 2.2 기술 선정 이유

| 기술 | 이유 |
|---|---|
| Spring Boot 4.0.6 | REST API, 보안, JPA 기반 풀스택 포트폴리오에 적합 |
| Java 25 | Spring Boot 4.x 런타임, Virtual Threads, 최신 문법 활용 가능 |
| JPA | 사용자·여행·타임라인·체크리스트 관계 모델을 객체로 표현 |
| JPA ddl-auto | 개발 환경에서 스키마 자동 관리 (운영: validate) |
| PostgreSQL | 관계형 데이터와 집계 쿼리에 안정적 |
| H2 | 빠른 로컬 dev/test profile |
| JWT httpOnly Cookie | SPA/PWA에서 토큰 탈취 위험을 줄이고 자동 인증 전달 |
| Next.js 16.2.6 | App Router, SSR/CSR 혼합, 프록시/빌드/라우팅 편의 |
| React 19.2.6 | 컴포넌트 기반 UI |
| TypeScript | API 타입, 상태 타입, enum-like union으로 안정성 확보 |
| Tailwind CSS | 디자인 토큰 기반 빠른 UI 구현 |
| shadcn/ui 스타일 | Button/Card/Input/Badge/Tabs 등 기본 컴포넌트 일관성 |
| @vnedyalk0v/react19-simple-maps | 세계/국내 색칠 지도 SVG 대시보드 (react-simple-maps React 19 호환 포크) |
| Leaflet | 여행 상세 장소 핀 지도 |
| Recharts | 통계 차트 |

### 2.3 프로젝트 구조

```txt
travel-archive/
├── backend/
│   ├── src/main/java/com/travelarchive/
│   │   ├── auth/          # 회원가입, 로그인, JWT, refresh token
│   │   ├── bucket/        # 버킷리스트와 여행 전환
│   │   ├── checklist/     # 체크리스트, 템플릿, 항목
│   │   ├── common/        # ApiResponse, enum, BaseEntity
│   │   │   └── entity/
│   │   ├── config/        # SecurityConfig, JpaConfig
│   │   ├── map/           # 세계/국내 지도 집계
│   │   ├── stats/         # 통계 집계
│   │   ├── storage/       # 로컬 파일 저장 추상화
│   │   ├── trip/          # 여행, 날짜, 타임라인, 사진
│   │   └── user/          # 사용자 엔티티/저장소
│   └── src/main/java/com/travelarchive/common/config/
│       └── SeedDataLoader.java  # 앱 기동 시 참조 데이터 자동 삽입
├── frontend/
│   ├── src/app/(auth)/    # 로그인/회원가입
│   ├── src/app/(main)/    # 홈, 여행, 버킷, 통계, 프로필
│   ├── src/components/    # layout/ui/maps/trips/bucket/checklist/timeline/photos
│   ├── src/lib/api/       # fetch client
│   ├── src/lib/auth/      # auth context/hooks
│   ├── src/styles/        # design tokens
│   └── src/types/         # travel.ts 공통 타입
├── docs/
│   ├── design/
│   ├── design-system.md
│   ├── travel_archive_prd.md
│   ├── ui_brief.md
│   └── DEVELOPER_HANDBOOK.md
└── docker-compose.yml
```

### 2.4 개발 환경 설정

#### 2.4.1 필수 도구

| 도구 | 버전 | 용도 |
|---|---|---|
| Java | 17+ | 백엔드 실행 |
| Node.js | 18+ | 프론트엔드 실행 |
| Docker | 최신 | PostgreSQL 컨테이너 |
| PostgreSQL | 14+/16 권장 | 기본 DB |

#### 2.4.2 PostgreSQL 실행

```bash
docker compose up -d
```

기본값:

| 항목 | 값 |
|---|---|
| Host | `localhost` |
| Port | `5432` (`POSTGRES_PORT`로 변경 가능) |
| DB | `travel_archive` |
| User | `travel_archive` |
| Password | `travel_archive` |

#### 2.4.3 백엔드 실행

```bash
cd backend
export JWT_SECRET="your-32-char-secret-key-here-change-me"
./gradlew bootRun
```

H2 개발 profile:

```bash
./gradlew bootRun --args='--spring.profiles.active=dev'
```

#### 2.4.4 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

#### 2.4.5 데모 계정

| 항목 | 값 |
|---|---|
| 이메일 | `demo@example.com` |
| 비밀번호 | `password` |

---

## 3. 디자인 시스템

### 3.1 디자인 철학

Travel Archive의 최종 디자인 컨셉은 **따뜻한 여행 기록장 기반의 모바일 우선 PWA**다. 지도와 통계가 있는 기능형 앱이지만, 차갑고 복잡한 대시보드가 아니라 개인 여행 다이어리처럼 보여야 한다.

핵심 키워드:

- warm diary
- photo-first cards
- cream/off-white surface
- coral primary action
- teal completed state
- lavender bucket memory
- one-hand mobile operation
- bottom tabs and bottom sheets

### 3.2 컬러 시스템

#### 3.2.1 토큰 의미

| 토큰 | 의미 | 구현 예 |
|---|---|---|
| `Background` | 앱 전체 크림/오프화이트 배경 | `cream.50`, `#FFFDF8` |
| `Surface` | 카드 배경 | 흰색 또는 크림톤 |
| `SurfaceMuted` | 보조 카드/입력 영역 | `sand.50`, `cream.100` |
| `TextPrimary` | 제목/주요 텍스트 | 진한 브라운 블랙/다크 그레이 |
| `TextSecondary` | 날짜/설명 | 중간 그레이 브라운 |
| `TextMuted` | 라벨/비활성 | 낮은 대비 그레이 |
| `Border` | 카드 경계 | 옅은 베이지 그레이 |

#### 3.2.2 실제 구현 토큰

`frontend/src/styles/tokens.ts` 기준:

| 색상 | 값 |
|---|---|
| cream.50 | `#FFFDF8` |
| cream.100 | `#FFF8EC` |
| coral.500 | `#FF6B54` |
| teal.500 | `#14B8A6` |
| sand.400 | `#C9C3A5` |

PRD/디자인 문서의 대표 색상은 `PrimaryCoral #FF6B6B`, `PrimaryTeal #4ECDC4`로 제시되었고, 현재 구현은 Tailwind 확장 토큰에서 약간 조정된 `#FF6B54`, `#14B8A6` 계열을 사용한다. 새 컴포넌트는 기존 구현 토큰과 시각 의미를 우선한다.

#### 3.2.3 상태 색상

| 상태 | 의미 | 색상 계열 | UI 표현 |
|---|---|---|---|
| `COMPLETED` | 방문 완료 | Teal/Green | 지도 색칠, 완료 배지, 통계 강조 |
| `PLANNED` | 예정 여행 | Coral/Amber | D-day, 예정 배지, CTA |
| `BUCKET` | 버킷리스트 | Lavender/Purple | 버킷 지도 상태, 버킷 카드 |
| `CANCELLED` | 취소 | Gray | 취소 배지, 지도/통계 제외 |
| `ON_HOLD` | 보류 | Gray/Muted Amber | 지도 색칠 제외 |

중요: 색상만으로 상태를 전달하지 않는다. 항상 텍스트 라벨을 함께 제공한다.

### 3.3 타이포그래피 시스템

| 계층 | 크기 | 구현 토큰 예 |
|---|---|---|
| 페이지 제목 | 24-28px | `title-lg`, `display` |
| 섹션 제목 | 18-20px | `title` |
| 카드 제목 | 16-18px | `body-lg`, `title` |
| 본문 | 14-16px | `body` |
| 보조 설명 | 12-13px | `caption` |
| 배지/칩 | 11-13px | `micro`, `caption` |
| 통계 숫자 | 24-32px | `title-lg`, `display` |

규칙:

- 모바일 제목은 최대 2줄 허용.
- 카드의 긴 여행명/지역명은 1~2줄 말줄임.
- 숫자 지표는 라벨보다 강하게.
- 웹에서도 글자 계층은 유지하고 레이아웃 폭으로 밀도를 조절.

### 3.4 스페이싱과 레이아웃

| 항목 | 기준 |
|---|---|
| 화면 좌우 패딩 | 16px |
| 카드 간격 | 12-16px |
| 섹션 간격 | 24-32px |
| 리스트 아이템 최소 높이 | 56px |
| 터치 타깃 | 44px 이상 |
| 하단 탭 clearance | 80px 이상 |
| 모바일 지도 최소 높이 | 300-400px |

### 3.5 컴포넌트 라이브러리

프로젝트는 shadcn/ui 스타일의 기본 컴포넌트를 직접 보유한다.

| 컴포넌트 | 파일 | 용도 |
|---|---|---|
| Button | `frontend/src/components/ui/button.tsx` | CTA, 보조 액션 |
| Card | `frontend/src/components/ui/card.tsx` | 화면 기본 정보 단위 |
| Input | `frontend/src/components/ui/input.tsx` | 폼 입력 |
| Badge | `frontend/src/components/ui/badge.tsx` | 상태/범위/카테고리 |
| Tabs | `frontend/src/components/ui/tabs.tsx` | 여행 상세 내부 탭 |
| PageHeader | `frontend/src/components/layout/page-header.tsx` | 화면 제목/설명/액션 |
| EmptyState | `frontend/src/components/layout/empty-state.tsx` | 빈 데이터 CTA |
| BottomNav | `frontend/src/components/layout/bottom-nav.tsx` | 모바일 하단 탭 |
| Sidebar | `frontend/src/components/layout/sidebar.tsx` | 웹 사이드바 |

### 3.6 반응형 전략

| 화면 폭 | 전략 |
|---|---|
| 0-767px | 모바일 기준, 1컬럼, 하단 탭, 바텀시트, FAB |
| 768-1199px | 태블릿, 일부 2컬럼, 카드 최대폭 제한 |
| 1200px+ | 웹, 좌측 사이드바, 카드 그리드, 지도+드로어 가능 |

### 3.7 디자인 목업 자산

| 파일 | 역할 | 구현 기준 |
|---|---|---|
| `docs/design/concept_mobile.png` | 초기 모바일 컨셉 | 최종 기준 아님, 분위기 참고 |
| `docs/design/concept_web.png` | 초기 웹 컨셉 | 최종 기준 아님, 포트폴리오 대시보드 참고 |
| `docs/design/mobile_home.png` | 모바일 홈 | 지도 토글, 지도 카드, 요약 지표, 하단 탭 기준 |
| `docs/design/mobile_home_bottomsheet.png` | 모바일 지도 선택 | 국가/지역 선택 바텀시트 기준 |
| `docs/design/mobile_bucket.png` | 모바일 버킷 | 사진 카드, 필터, 전환 CTA 기준 |
| `docs/design/mobile_statics.png` | 모바일 통계 | 2열 지표, 세로 차트, 랭킹 카드 기준 |
| `docs/design/mobile_mypage.png` | 모바일 마이 | 프로필 카드, 설정 리스트, 로그아웃 기준 |
| `docs/design/mobile_travel.png` | 모바일 여행 | 여행 목록/카드/FAB 기준 |
| `docs/design/web_home.png` | 웹 홈 | 사이드바, 넓은 지도, 카드 그리드 기준 |
| `docs/design/web_home_drawer.png` | 웹 지도 상세 | 우측 드로어/패널 기준 |
| `docs/design/web_bucket.png` | 웹 버킷 | 카드 그리드와 전환 흐름 기준 |
| `docs/design/web_statics.png` | 웹 통계 | 2컬럼 차트/랭킹 기준 |
| `docs/design/web_mypage.png` | 웹 마이 | 넓은 설정 카드 기준 |
| `docs/design/web_travel.png` | 웹 여행 | 목록/요약/필터 그리드 기준 |

주의: 최종 시안은 여행 상세의 타임라인/Leaflet 지도/사진 탭 표현이 약하다. 구현 시 PRD와 이 핸드북의 여행 상세 명세를 우선한다.

---

## 4. 화면 명세(Screen Specifications)

### 4.1 공통 화면 구조

```txt
로그인 전: /(auth)/layout.tsx
  - /login
  - /signup

공개 홈: /
  - 비로그인 접근 가능
  - 샘플 데이터 기반 미리보기
  - 가입/로그인 CTA

로그인 후: /(main)/layout.tsx
  - 모바일: BottomNav
  - 웹: Sidebar
  - 공통: 인증 요구 hook, safe-area, content padding
  - /dashboard (홈 대시보드)
  - /trips, /bucket, /stats, /profile
```

### 4.2 홈 대시보드

| 항목 | 내용 |
|---|---|
| 목적 | 전체 여행 현황을 지도와 핵심 숫자로 보여준다 |
| 목업 | `mobile_home.png`, `mobile_home_bottomsheet.png`, `web_home.png`, `web_home_drawer.png` |
| 구현 파일 | `frontend/src/app/page.tsx` (공개 홈), `frontend/src/app/(main)/dashboard/page.tsx` (로그인 후 대시보드) |
| 주요 컴포넌트 | `WorldMap`, `KoreaMap`, `PageHeader`, `Card`, `Badge`, 지도 범례 |
| API | `GET /api/maps/world`, `GET /api/maps/domestic`, `GET /api/maps/regions/{mapKey}`, `GET /api/statistics/summary` |
| 상태 | `mapView`, `worldData`, `domesticData`, `statsSummary`, `loading`, `error` |

#### 4.2.1 사용자 흐름

```txt
홈 진입
-> 기본 세계지도 표시
-> 세계/국내 토글 변경
-> 지도 지역 클릭
-> 관련 여행/버킷 상세 확인
-> 여행 상세 또는 통계 페이지로 이동
```

#### 4.2.2 컴포넌트 구성

- 상단 `PageHeader`: 서비스명, 설명, 새 여행 CTA
- 요약 지표 카드: 완료 여행, 계획 중, 여행 일수, 방문 국가/지역
- `MapModeToggle`: 세계 지도/국내 지도
- `WorldMap` 또는 `KoreaMap`: `@vnedyalk0v/react19-simple-maps` 기반
- 지도 범례: 완료/계획/버킷/미방문
- 지도 선택 상세: 모바일 바텀시트, 웹 드로어가 이상적이며 현재 구현은 지도 컴포넌트 내부 선택 정보 중심

#### 4.2.3 데이터 요구사항

| 데이터 | 출처 | 필드 |
|---|---|---|
| 세계지도 상태 | `/api/maps/world` | `mapKey`, `countryCode`, `nameKo`, `status` |
| 국내지도 상태 | `/api/maps/domestic` | `mapKey`, `regionCode`, `nameKo`, `status` |
| 지역 상세 | `/api/maps/regions/{mapKey}` | 완료/예정/버킷 수, 관련 trips |
| 통계 요약 | `/api/statistics/summary` | 완료 여행, 예정 여행, 여행 일수, 방문 국가/지역 |

#### 4.2.4 반응형 동작

- 모바일: 한 번에 하나의 지도만 표시, 토글로 전환.
- 웹: 기본은 동일 토글 구조. 여유가 있으면 두 지도 병렬 카드 가능.
- 지도는 SSR 이슈를 피하기 위해 `dynamic(..., { ssr: false })` 사용.

### 4.3 여행 목록

| 항목 | 내용 |
|---|---|
| 목적 | 예정/완료/취소 여행을 탐색하고 새 여행 생성 |
| 목업 | `mobile_travel.png`, `web_travel.png` |
| 구현 파일 | `frontend/src/app/(main)/trips/page.tsx` |
| 주요 컴포넌트 | `TripCard`, `PageHeader`, `EmptyState`, 생성 폼 |
| API | `GET /api/trips`, `POST /api/trips` |
| 상태 | `trips`, `filter`, `showCreate`, 생성 폼 상태 |

#### 4.3.1 필터

| 필터 | 의미 |
|---|---|
| ALL | 전체 |
| PLANNED | 예정/계획 중 |
| COMPLETED | 완료 |
| CANCELLED | 취소 |

#### 4.3.2 카드 표시 정보

- 대표 이미지 또는 fallback
- 여행명
- 국내/해외 구분
- 국가/국내 지역
- 도시
- 기간
- 상태 배지
- 여행 일수
- 예정 여행의 체크리스트 진행률

#### 4.3.3 반응형 동작

- 모바일: 단일 컬럼 카드 리스트, 추가 액션은 상단 버튼 또는 FAB.
- 웹: 검색/정렬/추가 버튼과 카드 그리드 확장 가능.

### 4.4 여행 상세

| 항목 | 내용 |
|---|---|
| 목적 | 하나의 여행에 대한 준비·기록·장소·사진 통합 관리 |
| 목업 | `mobile_travel.png`, `web_travel.png` + PRD 보완 필요 |
| 구현 파일 | `frontend/src/app/(main)/trips/[tripId]/page.tsx` |
| 주요 컴포넌트 | `TripDetail`, `ChecklistView`, `TimelineView`, `PhotoGallery`, `LeafletMap`, `Tabs` |
| API | 여행 상세, 상태 변경, 체크리스트, 타임라인, 사진, 파일 조회 |
| 상태 | `trip`, `activeTab`, 타임라인/체크리스트/사진 로딩 상태 |

#### 4.4.1 탭 구조

| 탭 | 목적 | 구현 컴포넌트 |
|---|---|---|
| 개요 | 기본 정보, 상태, 요약, 대표 이미지 | `TripDetail`, `CoverImageSection` |
| 타임라인 | 날짜별 항목 작성/수정/삭제 | `TimelineView`, `TimelineForm`, `TimelineItem` |
| 체크리스트 | 준비물 진행률과 항목 관리 | `ChecklistView`, `ChecklistItem` |
| 지도 | 위도/경도 있는 타임라인 항목을 Leaflet 마커로 표시 | `LeafletMap`, `MapMarker` |
| 사진 | 대표/타임라인 사진 목록 | `PhotoGallery`, `PhotoUploader` |

#### 4.4.2 상태 전환

```txt
PLANNED -> COMPLETED
PLANNED -> CANCELLED
CANCELLED -> PLANNED (현재 구현에서 복구 버튼 제공)
```

서버는 사용자 소유권과 상태 전환 규칙을 검증해야 한다. PRD 기준 완료 조건은 여행 기간과 최소 1개 이상 `trip_day`다.

#### 4.4.3 지도 탭 규칙

- Leaflet만 사용한다.
- 색칠 지도 금지.
- 타임라인 항목의 `latitude`, `longitude`가 있는 경우에만 마커 표시.
- 마커 클릭 시 시간, 제목, 장소명, 메모, 사진 요약을 보여주는 것이 목표.
- 동선 라인, 지도에서 장소 직접 추가, 외부 장소 검색은 제외.

### 4.5 버킷리스트

| 항목 | 내용 |
|---|---|
| 목적 | 가고 싶은 여행지를 저장하고 예정 여행으로 전환 |
| 목업 | `mobile_bucket.png`, `web_bucket.png` |
| 구현 파일 | `frontend/src/app/(main)/bucket/page.tsx` |
| 주요 컴포넌트 | `BucketCard`, `BucketForm`, `ConvertTripForm` |
| API | `GET/POST/PATCH/DELETE /api/buckets`, `POST /api/buckets/{id}/convert-to-trip` |
| 상태 | `buckets`, `showCreate`, `convertingBucket`, `loading`, `error` |

#### 4.5.1 카드 정보

- 여행지명
- 국내/해외
- 국가 또는 국내 지역
- 도시명
- 상태 배지
- 우선순위
- 희망 시기
- 예상 예산
- 태그/메모/이유
- `예정 여행으로 전환` CTA

#### 4.5.2 전환 규칙

전환 시 생성되는 여행:

| 필드 | 값 |
|---|---|
| title | 버킷 제목 또는 전환 폼 입력값 |
| travel_scope | 버킷 값 복사 |
| country/domestic_region | 버킷 값 복사 |
| city_name | 버킷 값 복사 |
| start_date/end_date | 전환 폼 입력 |
| status | `PLANNED` |
| checklist | 기본 템플릿 자동 생성 |

전환 완료 후 생성된 여행 상세로 이동한다.

### 4.6 체크리스트

| 항목 | 내용 |
|---|---|
| 목적 | 예정 여행 준비 상태 확인과 완료 체크 |
| 구현 파일 | `frontend/src/components/checklist/ChecklistView.tsx`, `ChecklistItem.tsx` |
| 백엔드 | `ChecklistController`, `ChecklistService` |
| API | `GET /api/trips/{tripId}/checklists`, `POST /api/trips/{tripId}/checklists`, `POST /api/checklists/{checklistId}/items`, `PATCH /api/checklist-items/{id}`, `DELETE /api/checklist-items/{id}` |

#### 4.6.1 기본 카테고리

- 예약
- 서류
- 짐
- 전자기기
- 건강/상비약
- 현지 준비

#### 4.6.2 템플릿

공통:

- 숙소 예약 확인
- 이동 수단 확인
- 날씨 확인
- 보조배터리
- 충전기
- 상비약
- 세면도구

해외 추가:

- 여권 확인
- 항공권 확인
- 여행자보험 확인
- 환전
- eSIM 또는 로밍 준비
- 여권 사본 준비
- 현지 교통패스 확인
- 콘센트 어댑터 확인

국내 추가:

- 숙소 체크인 시간 확인
- 차량 이동 여부 확인
- 렌터카 또는 대중교통 확인
- 지역 날씨 확인

### 4.7 통계

| 항목 | 내용 |
|---|---|
| 목적 | 여행 기록을 숫자와 차트로 회고 |
| 목업 | `mobile_statics.png`, `web_statics.png` |
| 구현 파일 | `frontend/src/app/(main)/stats/page.tsx` |
| 주요 컴포넌트 | `Card`, `Badge`, `ResponsiveContainer`, `BarChart`, `RankList` 형태 |
| API | `GET /api/statistics/summary`, `/monthly`, `/top-regions` |

#### 4.7.1 MVP 지표

| 지표 | 구현 상태 |
|---|---|
| 완료 여행 수 | summary |
| 예정 여행 수 | summary |
| 총 여행 일수 | summary |
| 방문 국가 수 | summary |
| 방문 국내 지역 수 | summary |
| 월별 여행 빈도 | monthly bar chart |
| 인기 국내/해외 지역 | top-regions |

#### 4.7.2 후순위

- 연도별 상세 필터
- 국가별 방문 횟수 전용 차트
- 국내 지역별 방문 횟수 전용 차트
- 여행 유형 비율
- 비용 통계

### 4.8 프로필/설정

| 항목 | 내용 |
|---|---|
| 목적 | 계정 정보와 앱 정보를 확인하고 로그아웃 |
| 목업 | `mobile_mypage.png`, `web_mypage.png` |
| 구현 파일 | `frontend/src/app/(main)/profile/page.tsx` |
| 주요 컴포넌트 | `Profile card`, `App info card`, `Logout button` |
| API | `GET /api/auth/me`, `POST /api/auth/logout` |

MVP에서는 복잡한 설정을 만들지 않는다. 향후 PWA 설치 안내, 데이터 내보내기, 지도 기본 표시 설정을 추가할 수 있다.

### 4.9 로그인/회원가입

| 항목 | 내용 |
|---|---|
| 목적 | 이메일/비밀번호 기반 인증 |
| 구현 파일 | `frontend/src/app/(auth)/login/page.tsx`, `signup/page.tsx` |
| 백엔드 | `AuthController`, `AuthService`, `JwtAuthenticationFilter`, `SecurityConfig` |
| API | `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/auth/me` |

인증 성공 시 서버는 `access_token`, `refresh_token`을 httpOnly 쿠키로 설정한다. 프론트엔드는 토큰 문자열을 직접 저장하지 않는다.

---

## 5. 기능 흐름 명세(Feature Flows)

### 5.1 회원가입/로그인 흐름

```txt
회원가입 폼 입력
-> POST /api/auth/signup
-> User 생성 + BCrypt password_hash 저장
-> Access/Refresh JWT 발급
-> Set-Cookie(access_token, refresh_token)
-> /dashboard 이동
```

```txt
로그인 폼 입력
-> POST /api/auth/login
-> 비밀번호 검증
-> RefreshToken 저장
-> httpOnly 쿠키 설정
-> /api/auth/me로 현재 사용자 확인
```

보안 규칙:

- JWT secret은 최소 32자 이상.
- access token: 15분.
- refresh token: 7일.
- refresh cookie path는 `/api/auth`.
- prod profile 또는 `cookie.secure=true`에서 Secure cookie 사용.

### 5.2 버킷리스트 등록 → 예정 여행 전환

```txt
버킷 탭
-> 새 버킷
-> 여행지명/범위/국가 또는 지역/도시 입력
-> POST /api/buckets
-> 목록 반영
-> BucketCard의 전환 CTA
-> 시작일/종료일 입력
-> POST /api/buckets/{id}/convert-to-trip
-> Trip(PLANNED) 생성
-> 기본 체크리스트 생성
-> /trips/{tripId} 이동
```

### 5.3 여행 생성 → 체크리스트 자동 생성

```txt
여행 목록
-> 새 여행 만들기
-> POST /api/trips
-> Trip 생성
-> TripService가 날짜 범위 기반 trip_days 생성
-> ChecklistService가 travel_scope 기반 템플릿 적용
-> 여행 상세 이동
```

### 5.4 여행 완료 처리 → 타임라인 작성

```txt
여행 상세
-> 상태 변경 버튼
-> PATCH /api/trips/{id}/status { status: "COMPLETED" }
-> 타임라인 탭
-> 날짜 선택
-> 타임라인 항목 추가
-> 시간/제목/장소/좌표/비용/카테고리 입력
-> POST /api/trips/{tripId}/timeline-items
```

### 5.5 사진 업로드 흐름

대표 이미지:

```txt
여행 상세 개요
-> 파일 선택
-> 클라이언트에서 JPEG/PNG/WebP, 5MB 제한 검증
-> POST multipart /api/trips/{tripId}/cover-image
-> LocalFileStorageService 저장
-> trip_photos(owner_type=TRIP_COVER) 저장
-> GET /api/files/{photoId}로 표시
```

타임라인 사진:

```txt
타임라인 항목
-> 사진 추가
-> POST /api/timeline-items/{id}/photos
-> trip_photos(owner_type=TIMELINE_ITEM, timeline_item_id) 저장
```

### 5.6 지도 상호작용

대시보드 지도:

```txt
홈 지도 렌더링
-> /api/maps/world 또는 /api/maps/domestic
-> 상태 우선순위 COMPLETED > PLANNED > BUCKET
-> 지역 클릭
-> /api/maps/regions/{mapKey}
-> 완료/예정/버킷 목록 표시
```

상세 지도:

```txt
여행 상세 지도 탭
-> /api/trips/{tripId}/timeline
-> 위도/경도 있는 항목 필터링
-> Leaflet marker 생성
-> marker popup/bottom sheet로 항목 요약
```

---

## 6. 데이터 모델

### 6.1 ERD

```txt
users 1:N trips
users 1:N bucket_places
users 1:N refresh_tokens

bucket_places 1:N trips (선택적 원본 연결)

countries 1:N trips
countries 1:N bucket_places
domestic_regions 1:N trips
domestic_regions 1:N bucket_places

trips 1:N trip_days
trip_days 1:N trip_timeline_items
trips 1:N trip_photos
trip_timeline_items 1:N trip_photos

trips 1:N travel_checklists
travel_checklists 1:N travel_checklist_items

travel_checklist_templates 1:N travel_checklist_template_items
```

### 6.2 주요 테이블

#### 6.2.1 `users`

| 필드 | 설명 |
|---|---|
| `id` | PK |
| `email` | 로그인 ID, unique |
| `password_hash` | BCrypt hash |
| `nickname` | 표시 이름 |
| `role` | USER/ADMIN |
| `created_at`, `updated_at` | 감사 필드 (BaseEntity 자동 관리) |

#### 6.2.2 `trips`

| 필드 | 설명 |
|---|---|
| `id` | PK |
| `user_id` | 소유자 |
| `bucket_place_id` | 전환 원본 optional |
| `title` | 여행명 |
| `travel_scope` | `DOMESTIC`/`INTERNATIONAL` |
| `country_id` | 해외 여행 국가 |
| `domestic_region_id` | 국내 시/도 |
| `city_name` | 도시명 |
| `start_date`, `end_date` | 여행 기간 |
| `status` | `PLANNED`/`COMPLETED`/`CANCELLED` |
| `travel_type` | 여행 유형 |
| `companion` | 동행자 |
| `summary` | 메모/요약 |
| `created_at`, `updated_at` | 감사 필드 (BaseEntity 자동 관리) |

제약:

- `end_date >= start_date`
- 국내면 `domestic_region_id` 필수, `country_id` null
- 해외면 `country_id` 필수, `domestic_region_id` null

#### 6.2.3 `bucket_places`

| 필드 | 설명 |
|---|---|
| `title` | 버킷 장소명 |
| `travel_scope` | 국내/해외 |
| `country_id` / `domestic_region_id` | 범위별 참조 |
| `city_name` | 도시/지역명 |
| `reason` | 가고 싶은 이유 |
| `expected_budget` | 예상 예산 |
| `desired_season` | 희망 시기 |
| `priority` | 1~5 |
| `status` | `WANT_TO_GO`, `PLANNING`, `BOOKED`, `VISITED`, `ON_HOLD` |
| `reference_url` | 참고 링크 |
| `memo` | 메모 |
| `companion` | V5 추가 |
| `created_at`, `updated_at` | 감사 필드 (BaseEntity 자동 관리) |

#### 6.2.4 `trip_days`

- `trip_id`, `day_no`, `travel_date`, `title`, `memo`
- `created_at`, `updated_at` (BaseEntity 자동 관리)
- 여행 생성 시 날짜 범위 기준으로 자동 생성한다.

#### 6.2.5 `trip_timeline_items`

- `item_time`, `title`, `memo`, `place_name`, `address`
- `latitude`, `longitude`: 상세 Leaflet 지도 마커
- `cost`, `category`, `sort_order`
- `created_at`, `updated_at` (BaseEntity 자동 관리)
- 좌표 범위 check 제약 포함

#### 6.2.6 `trip_photos`

- `owner_type`: `TRIP_COVER` 또는 `TIMELINE_ITEM`
- `storage_key`, `file_url`, `original_file_name`, `content_type`, `file_size`
- `created_at`, `updated_at` (BaseEntity 자동 관리)
- 대표 사진은 `timeline_item_id` null, 타임라인 사진은 not null

#### 6.2.7 `travel_checklists`, `travel_checklist_items`

- 체크리스트는 여행에 종속.
- `travel_checklists`: `trip_id`, `title`, `progress_rate`, `created_at`, `updated_at` (BaseEntity 자동 관리)
- `travel_checklist_items`: `checklist_id`, `category`, `content`, `status`, `sort_order`, `due_date`, `created_at`, `updated_at` (BaseEntity 자동 관리)
- 진행률은 완료 항목 수 / 전체 항목 수로 계산한다.

#### 6.2.8 `refresh_tokens`

- `user_id`, `token_hash`, `expires_at`, `revoked_at`
- `created_at` (BaseEntity 자동 관리)
- 로그인 시 생성, 만료/로그아웃 시 폐기

#### 6.2.9 `countries`, `domestic_regions`

- 지도와 폼의 참조 데이터.
- `map_key`는 @vnedyalk0v/react19-simple-maps 지오메트리와 매핑.
- 국내 MVP는 `SIDO` 단위만 사용.

### 6.3 데이터베이스 스키마 관리

현재 프로젝트는 JPA `ddl-auto`를 사용하여 스키마를 관리합니다.

| 프로필 | `ddl-auto` | 설명 |
|---|---|---|
| dev (로컬) | `update` | 엔티티 변경 시 스키마 자동 갱신 |
| 기본 (운영) | `validate` | 엔티티와 DB 스키마 일치 여부만 검증 |

참조 데이터(국가, 국내 지역, 체크리스트 템플릿)는 `SeedDataLoader`(`CommandLineRunner`)가 애플리케이션 기동 시 자동으로 삽입됩니다. 테이블이 비어있을 때만 실행되므로 중복 삽입되지 않습니다.

> **참고**: 현재 Flyway 마이그레이션은 도입되어 있지 않습니다. 향후 스키마 변경 이력을 버전 관리하고 싶다면 Flyway 도입을 검토하세요.

### 6.4 샘플 데이터 구조

데모 계정은 다음을 포함해야 한다.

- 완료 국내 여행 2건: 부산, 서울
- 완료 해외 여행 2건: 오사카, 방콕
- 예정 해외 여행 1건: 파리
- 버킷리스트 3건: 제주도, 방콕/치앙마이, 스위스 알프스
- 좌표 포함 타임라인 15개 이상
- 체크리스트 10개 이상
- 데모 사진 메타데이터

---

## 7. API 명세

### 7.1 공통 응답

백엔드는 모든 일반 JSON 응답을 `ApiResponse<T>`로 감싼다.

```java
public record ApiResponse<T>(T data, String message) {}
```

프론트 타입:

```ts
export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
}
```

예시:

```json
{
  "data": {
    "id": 1,
    "title": "부산 여행"
  },
  "message": "Success"
}
```

### 7.2 인증 API

| Method | Path | 설명 | 구현 |
|---|---|---|---|
| POST | `/api/auth/signup` | 회원가입 | `AuthController.signup` |
| POST | `/api/auth/login` | 로그인 | `AuthController.login` |
| POST | `/api/auth/refresh` | access token 재발급 | `AuthController.refresh` |
| POST | `/api/auth/logout` | refresh 폐기, 쿠키 삭제 | `AuthController.logout` |
| GET | `/api/auth/me` | 현재 사용자 | `AuthController.me` |

### 7.3 여행 API

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/trips` | 여행 목록 |
| POST | `/api/trips` | 여행 생성 |
| GET | `/api/trips/{id}` | 여행 상세 |
| PATCH | `/api/trips/{id}` | 여행 수정 |
| DELETE | `/api/trips/{id}` | 여행 삭제 |
| PATCH | `/api/trips/{id}/status` | 상태 변경 |
| POST | `/api/trips/{tripId}/cover-image` | 대표 이미지 업로드 |

요청 예시:

```json
{
  "title": "파리 여행",
  "travelScope": "INTERNATIONAL",
  "countryId": 4,
  "cityName": "Paris",
  "startDate": "2025-09-20",
  "endDate": "2025-09-27",
  "status": "PLANNED"
}
```

### 7.4 버킷리스트 API

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/buckets` | 목록 |
| POST | `/api/buckets` | 생성 |
| GET | `/api/buckets/{id}` | 상세 |
| PATCH | `/api/buckets/{id}` | 수정 |
| DELETE | `/api/buckets/{id}` | 삭제 |
| POST | `/api/buckets/{id}/convert-to-trip` | 예정 여행 전환 |

### 7.5 체크리스트 API

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/trips/{tripId}/checklists` | 조회 또는 생성 |
| POST | `/api/trips/{tripId}/checklists` | 체크리스트 생성 |
| POST | `/api/checklists/{checklistId}/items` | 커스텀 항목 생성 |
| PATCH | `/api/checklist-items/{id}` | 항목 토글 |
| DELETE | `/api/checklist-items/{id}` | 항목 삭제 |

### 7.6 타임라인 API

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/trips/{tripId}/timeline` | 날짜별 타임라인 그룹 |
| POST | `/api/trips/{tripId}/timeline-items` | 항목 생성 |
| PATCH | `/api/timeline-items/{id}` | 항목 수정 |
| DELETE | `/api/timeline-items/{id}` | 항목 삭제 |
| POST | `/api/timeline-items/{id}/photos` | 사진 연결 |

### 7.7 사진/파일 API

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/trips/{tripId}/cover-image` | multipart 대표 이미지 |
| GET | `/api/files/{photoId}` | 파일 조회 |

구현 파일:

- `PhotoController`
- `StorageService`
- `LocalFileStorageService`
- `StoredFile`
- `StorageContext`

### 7.8 지도 API

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/maps/world` | 세계 지도 국가별 상태 |
| GET | `/api/maps/domestic` | 국내 시/도 상태 |
| GET | `/api/maps/regions/{mapKey}` | 지역별 완료/예정/버킷 상세 |

상태 우선순위:

```txt
COMPLETED > PLANNED > BUCKET > NONE
```

제외:

- `CANCELLED` 여행은 지도 색칠 제외.
- `ON_HOLD` 버킷은 지도 색칠 제외.

### 7.9 통계 API

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/statistics/summary` | 완료/예정/일수/방문 국가/지역 |
| GET | `/api/statistics/monthly` | 월별 여행 빈도 |
| GET | `/api/statistics/top-regions?limit=5` | 인기 지역 |

---

## 8. 구현 매핑(Implementation Mapping)

### 8.1 요구사항 → 백엔드 → 프론트엔드 매핑

| PRD 요구사항 | 백엔드 파일 | 프론트엔드 파일 |
|---|---|---|
| 이메일 회원가입 | `auth/AuthController.java`, `auth/AuthService.java`, `user/User.java` | `app/(auth)/signup/page.tsx`, `lib/auth/context.tsx` |
| 로그인/JWT | `auth/JwtTokenProvider.java`, `JwtAuthenticationFilter.java`, `SecurityConfig.java` | `app/(auth)/login/page.tsx`, `lib/api/client.ts`, `lib/auth/hooks.ts` |
| 내 정보 | `AuthController.me`, `UserResponse.java` | `app/(main)/profile/page.tsx` |
| 여행 CRUD | `trip/TripController.java`, `TripService.java`, `TripRepository.java`, `Trip.java` | `app/(main)/trips/page.tsx`, `components/trips/TripCard.tsx`, `components/trips/TripDetail.tsx` |
| 여행 상태 변경 | `TripController.changeStatus`, `TripService.changeStatus`, `TripStatus.java` | `app/(main)/trips/[tripId]/page.tsx`, `types/travel.ts` |
| 국내/해외 구분 | `TravelScope.java`, `Trip.java`, DB check constraints | `types/travel.ts`, 여행/버킷 폼 |
| 버킷 CRUD | `bucket/BucketPlaceController.java`, `BucketPlaceService.java`, `BucketPlace.java` | `app/(main)/bucket/page.tsx`, `BucketCard.tsx`, `BucketForm.tsx` |
| 버킷 → 여행 전환 | `BucketPlaceController.convertToTrip`, `BucketPlaceService.convertToTrip` | `ConvertTripForm.tsx`, `bucket/page.tsx` |
| 체크리스트 자동 생성 | `ChecklistService.java`, `TravelChecklistTemplate.java`, `SeedDataLoader` | `ChecklistView.tsx` |
| 체크리스트 항목 토글 | `ChecklistController.toggleItem`, `TravelChecklistItem.java` | `ChecklistItem.tsx`, `ChecklistView.tsx` |
| 타임라인 CRUD | `TimelineController.java`, `TimelineService.java`, `TripTimelineItem.java` | `TimelineView.tsx`, `TimelineForm.tsx`, `TimelineItem.tsx` |
| 여행 날짜 | `TripDay.java`, `TripDayRepository.java`, `TripService` | `TimelineView.tsx`, 상세 페이지 |
| 대표 이미지 | `PhotoController.java`, `TripPhoto.java`, `LocalFileStorageService.java` | `CoverImageSection` in `[tripId]/page.tsx` |
| 타임라인 사진 | `TimelineController.addPhoto`, `TripPhotoRepository.java` | `PhotoUploader.tsx`, `PhotoGallery.tsx` |
| 세계지도 | `map/MapController.java`, `MapService.java`, `Country.java` | `components/maps/WorldMap.tsx`, `app/(main)/page.tsx` |
| 국내지도 | `DomesticRegion.java`, `MapService.domestic` | `components/maps/KoreaMap.tsx`, `app/(main)/page.tsx` |
| 지역 상세 패널 | `MapController.region`, `MapRegionResponse.java` | `MapDetailSheet.tsx`, 지도 컴포넌트 |
| 상세 Leaflet 지도 | 타임라인 좌표 API | `components/maps/LeafletMap.tsx`, `MapMarker.tsx`, `TripMapView` |
| 통계 요약 | `stats/StatsController.java`, `StatsService.java`, `StatsResponse.java` | `app/(main)/stats/page.tsx`, 홈 요약 카드 |
| 모바일 하단 탭 | - | `components/layout/bottom-nav.tsx`, `app/(main)/layout.tsx` |
| 웹 사이드바 | - | `components/layout/sidebar.tsx`, `app/(main)/layout.tsx` |
| 디자인 토큰 | - | `styles/tokens.ts`, Tailwind classes |
| 공통 엔티티 시간 관리 | `common/entity/BaseEntity.java`, `config/JpaConfig.java` | - |

### 8.2 화면 → API → 타입 매핑

| 화면 | API | TypeScript 타입 |
|---|---|---|
| 홈 | `/maps/world` | `WorldMapRegion` |
| 홈 | `/maps/domestic` | `DomesticMapRegion` |
| 홈/지도 | `/maps/regions/{mapKey}` | `MapRegionDetail` |
| 홈/통계 | `/statistics/summary` | `StatsSummary` |
| 여행 목록 | `/trips` | `Trip[]` |
| 여행 생성 | `/trips` | `CreateTripPayload` |
| 버킷 | `/buckets` | `Bucket[]` |
| 버킷 생성 | `/buckets` | `CreateBucketPayload` |
| 버킷 전환 | `/buckets/{id}/convert-to-trip` | `ConvertToTripPayload` |
| 통계 | `/statistics/monthly` | `MonthlyCount[]` |
| 통계 | `/statistics/top-regions` | `TopRegion[]` |

### 8.3 코드 책임 경계

| 계층 | 책임 | 금지/주의 |
|---|---|---|
| Controller | HTTP route, 인증 principal, 응답 래핑 | 비즈니스 로직 남발 금지 |
| Service | 소유권 검증, 상태 전환, 집계, 생성 규칙 | DTO 변환 누락 주의 |
| Repository | JPA 조회 | 사용자 조건 없는 조회 주의 |
| Entity | DB 매핑 | UI 전용 필드 추가 금지 |
| Frontend Page | 데이터 fetch, 화면 상태, 라우팅 | 거대한 중복 UI 금지 |
| Component | 재사용 UI/상호작용 | API 직접 호출 남발 금지(필요 시 page/container) |
| Type | API 계약 | 백엔드 DTO 변경 시 동기화 |

---

## 9. 개발 가이드라인

### 9.1 백엔드 코딩 컨벤션

1. 패키지는 도메인 기준으로 유지한다: `auth`, `trip`, `bucket`, `checklist`, `map`, `stats`, `storage`.
2. 모든 사용자 데이터 조회는 `authentication.getName()` 기반 email/user로 소유권을 확인한다.
3. API 응답은 `ApiResponse<T>`를 사용한다.
4. 상태값은 enum을 사용하고 문자열 하드코딩을 피한다.
5. 상태 전환/완료 조건/지도 집계 제외 규칙은 서버에서 검증한다.
6. 파일 저장은 `StorageService` 인터페이스 뒤에 둔다.
7. DB 스키마 변경은 JPA 엔티티를 통해 관리하며, `ddl-auto: validate`로 엔티티-DB 일치 여부를 검증한다.

### 9.2 프론트엔드 코딩 컨벤션

1. API 호출은 `lib/api/client.ts`의 `api`를 우선 사용한다.
2. multipart 업로드처럼 특수한 경우만 직접 `fetch`를 사용한다.
3. 인증 필요 페이지는 `useRequireAuth()`를 사용한다.
4. 지도 컴포넌트는 `dynamic(..., { ssr: false })`로 로드한다.
5. 상태 라벨은 `types/travel.ts`의 mapping을 재사용한다.
6. 상태 색상은 디자인 토큰/Tailwind class를 일관되게 사용한다.
7. 모바일 1컬럼을 먼저 완성하고, `md`, `lg` breakpoint로 확장한다.
8. 터치 타깃 44px, 하단 탭 clearance 80px 이상을 지킨다.

### 9.3 Git 브랜치 전략

권장:

```txt
main
  └── develop
        ├── feature/auth
        ├── feature/trips
        ├── feature/bucket-conversion
        ├── feature/maps
        └── feature/stats
```

커밋 메시지 예:

- `feat(auth): add cookie based jwt login`
- `feat(trips): create trip detail timeline tabs`
- `fix(map): exclude cancelled trips from aggregation`
- `docs: add developer handbook`

### 9.4 테스트 전략

| 영역 | 테스트 |
|---|---|
| Backend unit | Service 상태 전환, 체크리스트 생성, 지도/통계 집계 |
| Backend integration | Auth cookie, CRUD, 사용자 소유권, SeedDataLoader |
| Frontend unit | 타입/컴포넌트 렌더링, API client, 지도 marker 변환 |
| Frontend build | `npm run build` |
| E2E 후보 | 로그인 → 버킷 생성 → 전환 → 체크리스트 → 완료 → 지도/통계 |

현재 확인 가능한 테스트 파일:

- `frontend/src/components/maps/MapMarker.test.ts`
- `frontend/src/app/(main)/stats/page.test.tsx`
- `frontend/src/types/travel.test.ts`
- `frontend/src/lib/api/client.test.ts`

### 9.5 성능 고려사항

- 홈 지도 상세는 상태가 있는 지역만 `/maps/regions/{mapKey}`를 추가 요청한다.
- 지도와 Leaflet은 클라이언트 전용으로 분리해 SSR 오류를 막는다.
- 이미지 카드는 고정 비율/높이를 사용해 CLS를 줄인다.
- 통계/지도 집계 컬럼에는 인덱스를 유지한다.
- 무거운 지도 GeoJSON은 필요 시 lazy import 또는 CDN/static 최적화를 고려한다.

### 9.6 접근성

- 아이콘 버튼은 aria-label 또는 텍스트를 제공한다.
- 배지는 색상과 텍스트를 함께 사용한다.
- 폼 label과 input id를 연결한다.
- 지도 선택 결과는 키보드/스크린리더 접근이 가능한 목록으로도 제공한다.

---

## 10. 문제 해결

### 10.1 자주 발생하는 이슈

| 문제 | 원인 | 해결 |
|---|---|---|
| `docker: command not found` | Docker 미설치/WSL 통합 꺼짐 | Docker Desktop 설치, WSL Integration 활성화 |
| `Bind 0.0.0.0:5432 failed` | 로컬 PostgreSQL 포트 충돌 | `.env`에 `POSTGRES_PORT=5433` |
| DB connection refused | 컨테이너 준비 전 실행 | `docker compose ps`로 healthy 확인 |
| `JWT secret is not configured` | `JWT_SECRET` 없음 | 32자 이상 secret export |
| JPA schema validation failed | 엔티티와 DB 스키마 불일치 | `docker compose down -v` 후 재실행 또는 엔티티-DB 동기화 확인 |
| 프론트 401 루프 | 쿠키 없음/만료 | `/login`, 백엔드 쿠키 path/secure 확인 |
| Leaflet SSR 오류 | 서버 렌더링에서 window 접근 | dynamic import `ssr:false` |
| Lucide `Map` 충돌 | JS `Map` 전역 가림 | `import { Map as MapIcon }` |
| 지도 색상 이상 | 상태 우선순위 불일치 | `COMPLETED > PLANNED > BUCKET` 확인 |
| 업로드 실패 | 파일 타입/크기 제한 | JPEG/PNG/WebP, 5MB 이하 확인 |

### 10.2 디버깅 가이드

백엔드:

```bash
cd backend
./gradlew bootRun
```

로그 확인 포인트:

- Security filter에서 인증 principal이 설정되는지
- Service에서 사용자 email로 User를 찾는지
- JPA lazy loading/transaction 오류
- JPA 엔티티-스키마 동기화 상태

프론트엔드:

```bash
cd frontend
npm run dev
```

확인 포인트:

- Network 탭에서 `/api/*`가 8080으로 프록시되는지
- Request Cookies에 `access_token`이 포함되는지
- 401 시 `ApiClient`가 로그인으로 redirect하는지
- 지도 컴포넌트가 client-only로 로딩되는지

### 10.3 로그 확인

```bash
docker compose logs -f postgres
docker compose ps
```

---

## 11. 배포와 운영

### 11.1 Docker Compose 구성

현재 compose는 PostgreSQL만 제공한다.

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: travel-archive-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: travel_archive
      POSTGRES_USER: travel_archive
      POSTGRES_PASSWORD: travel_archive
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### 11.2 환경별 설정

| 환경 | DB | 쿠키 | 실행 |
|---|---|---|---|
| dev-h2 | H2 memory | insecure local | `./gradlew bootRun --args='--spring.profiles.active=dev'` |
| dev-postgres | Docker PostgreSQL | insecure local | `docker compose up -d`, `./gradlew bootRun` |
| staging | PostgreSQL | secure 권장 | jar/docker 배포 |
| prod | PostgreSQL volume/backup | secure 필수 | reverse proxy + HTTPS |

### 11.3 홈서버 배포 가이드

권장 구성:

```txt
Internet
  -> Router port forwarding 80/443
  -> Reverse Proxy(Nginx/Caddy)
  -> frontend Next.js server :3000
  -> backend Spring Boot :8080
  -> PostgreSQL :5432 (외부 비공개)
```

운영 체크리스트:

1. `JWT_SECRET`을 강한 랜덤 값으로 설정.
2. `cookie.secure=true` 또는 prod profile 사용.
3. HTTPS 적용.
4. PostgreSQL 포트 외부 공개 금지.
5. `backend/storage/uploads` 백업 전략 수립.
6. DB volume 백업 cron 구성.
7. 로그 rotation 설정.

### 11.4 빌드 명령

백엔드:

```bash
cd backend
./gradlew clean bootJar
java -jar build/libs/travel-archive-0.0.1-SNAPSHOT.jar
```

프론트엔드:

```bash
cd frontend
npm install
npm run build
npm start
```

---

## 12. 리스크와 대응

| 리스크 | 대응 |
|---|---|
| 지도 범위 과다 | 대시보드 색칠 지도와 상세 핀 지도만 구현 |
| 지도 라이브러리 2개 | @vnedyalk0v/react19-simple-maps는 홈, Leaflet은 상세로 책임 분리 |
| 국내 행정구역 복잡도 | MVP는 시/도만, DB는 확장 가능하게 유지 |
| 이미지 업로드 부담 | 로컬 저장 우선, StorageService 인터페이스 유지 |
| 기능 과다 | 버킷/여행/체크리스트/지도/통계 집중 |
| 모바일 UI 깨짐 | 1컬럼, safe-area, 44px 터치 타깃, 하단 80px clearance |
| 인증 보안 | httpOnly cookie, sameSite strict, prod secure cookie |

---

## 13. 완료 판정 기준

MVP 완료는 다음 조건을 만족해야 한다.

1. 로그인부터 통계 확인까지 필수 시연 흐름이 끊기지 않는다.
2. 데모 데이터가 충분하다: 완료 국내 2, 완료 해외 2, 예정 1, 버킷 3, 좌표 타임라인 5개 이상, 체크리스트 10개 이상.
3. 인증, 여행 CRUD, 버킷 CRUD, 체크리스트 CRUD, 타임라인 CRUD, 이미지 업로드, 지도 집계, 통계 API가 동작한다.
4. 홈, 여행 목록, 여행 상세, 버킷, 체크리스트, 통계, 프로필, 로그인/회원가입 화면이 제공된다.
5. 백엔드 테스트와 프론트엔드 빌드가 성공한다.
6. PostgreSQL 연동이 확인된다.
7. 모바일과 데스크톱에서 주요 화면 텍스트/UI가 겹치지 않는다.
8. 지도 역할 분리가 유지된다.

필수 시연 흐름:

```txt
로그인
-> 버킷리스트에 가고 싶은 여행지 등록
-> 버킷리스트를 예정 여행으로 전환
-> 여행 준비 체크리스트 확인 및 체크
-> 여행 완료 처리
-> 날짜별 타임라인과 사진 등록
-> Leaflet 지도에서 방문 장소 핀 확인
-> 홈 대시보드에서 세계지도 확인
-> 국내지도 토글로 국내 방문 지역 확인
-> 통계 페이지에서 여행 횟수와 여행 일수 확인
```

---

## 14. 개발 체크리스트

### 14.1 새 기능 추가 시

- [ ] PRD 범위에 포함되는지 확인
- [ ] MVP 제외 기능을 건드리지 않는지 확인
- [ ] 백엔드 소유권 검증 추가
- [ ] DTO와 TypeScript 타입 동기화
- [ ] 모바일 1컬럼 UI 먼저 구현
- [ ] 상태 색상/라벨 일관성 확인
- [ ] 로딩/에러/빈 상태 제공
- [ ] 빌드/테스트 실행

### 14.2 새 화면 추가 시

- [ ] `PageHeader` 사용
- [ ] 모바일 하단 탭 clearance 확보
- [ ] 웹 사이드바와 충돌 없는 layout
- [ ] 주요 액션은 하나의 primary CTA
- [ ] 필터/상세는 모바일 바텀시트 우선
- [ ] 빈 상태에 다음 행동 CTA 제공

### 14.3 새 API 추가 시

- [ ] `ApiResponse<T>` 래핑
- [ ] 인증 필요 여부 명확화
- [ ] `Authentication.getName()` 기반 사용자 제한
- [ ] 예외/404/403 처리
- [ ] 프론트 타입 추가
- [ ] README/API 표 업데이트

---

## 15. 빠른 참조

### 15.1 상태값

```txt
TripStatus: PLANNED, COMPLETED, CANCELLED
BucketStatus: WANT_TO_GO, PLANNING, BOOKED, VISITED, ON_HOLD
TravelScope: DOMESTIC, INTERNATIONAL
MapRegionStatus: COMPLETED, PLANNED, BUCKET, NONE
TimelineCategory: PLACE, FOOD, ACTIVITY, MOVE, MEMO
ChecklistItemStatus: TODO, DONE
PhotoOwnerType: TRIP_COVER, TIMELINE_ITEM
```

### 15.2 주요 URL

```txt
/login
/signup
/          # 공개 홈 (비로그인 미리보기)
/dashboard # 로그인 후 홈 대시보드
/trips
/trips/{tripId}
/bucket
/stats
/profile
```

### 15.3 주요 백엔드 엔드포인트

```txt
/api/auth/*
/api/trips/*
/api/buckets/*
/api/trips/{tripId}/checklists
/api/trips/{tripId}/timeline
/api/maps/world
/api/maps/domestic
/api/statistics/summary
```

### 15.4 가장 중요한 코드 파일 32개

| 순번 | 파일 | 이유 |
|---:|---|---|
| 1 | `backend/src/main/java/com/travelarchive/auth/AuthController.java` | 인증 API 진입점 |
| 2 | `backend/src/main/java/com/travelarchive/auth/AuthService.java` | 회원가입/로그인/refresh 로직 |
| 3 | `backend/src/main/java/com/travelarchive/auth/JwtTokenProvider.java` | JWT 생성/검증 |
| 4 | `backend/src/main/java/com/travelarchive/config/SecurityConfig.java` | 보안 설정 |
| 5 | `backend/src/main/java/com/travelarchive/common/entity/BaseEntity.java` | 공통 엔티티 (자동 시간 관리) |
| 6 | `backend/src/main/java/com/travelarchive/config/JpaConfig.java` | JPA Auditing 설정 |
| 7 | `backend/src/main/java/com/travelarchive/trip/TripController.java` | 여행 API |
| 6 | `backend/src/main/java/com/travelarchive/trip/TripService.java` | 여행 생성/상태/날짜 로직 |
| 8 | `backend/src/main/java/com/travelarchive/bucket/BucketPlaceService.java` | 버킷/전환 로직 |
| 9 | `backend/src/main/java/com/travelarchive/checklist/ChecklistService.java` | 체크리스트 생성/진행률 |
| 10 | `backend/src/main/java/com/travelarchive/trip/TimelineService.java` | 타임라인 로직 |
| 11 | `backend/src/main/java/com/travelarchive/map/MapService.java` | 지도 집계 |
| 12 | `backend/src/main/java/com/travelarchive/stats/StatsService.java` | 통계 집계 |
| 13 | `backend/src/main/java/com/travelarchive/storage/LocalFileStorageService.java` | 로컬 파일 저장 |
| 14 | `backend/src/main/java/com/travelarchive/common/config/SeedDataLoader.java` | 참조 데이터 자동 삽입 |
| 15 | `backend/src/main/resources/application.yml` | DB 및 JPA 설정 |
| 16 | `frontend/src/lib/api/client.ts` | API client |
| 17 | `frontend/src/lib/auth/context.tsx` | 인증 상태 |
| 18 | `frontend/src/lib/auth/hooks.ts` | 인증 guard |
| 19 | `frontend/src/types/travel.ts` | 프론트 API 타입 |
| 20 | `frontend/src/app/page.tsx` | 공개 홈 (비로그인 미리보기) |
| 21 | `frontend/src/app/(main)/dashboard/page.tsx` | 홈 지도 대시보드 (로그인 후) |
| 22 | `frontend/src/app/(main)/trips/page.tsx` | 여행 목록/생성 |
| 23 | `frontend/src/app/(main)/trips/[tripId]/page.tsx` | 여행 상세 |
| 24 | `frontend/src/app/(main)/bucket/page.tsx` | 버킷리스트 |
| 25 | `frontend/src/app/(main)/stats/page.tsx` | 통계 |
| 26 | `frontend/src/app/(main)/profile/page.tsx` | 마이페이지 |
| 27 | `frontend/src/components/maps/WorldMap.tsx` | 세계지도 |
| 28 | `frontend/src/components/maps/KoreaMap.tsx` | 국내지도 |
| 29 | `frontend/src/components/maps/LeafletMap.tsx` | 상세 지도 |
| 30 | `frontend/src/components/checklist/ChecklistView.tsx` | 체크리스트 UI |
| 31 | `frontend/src/components/timeline/TimelineView.tsx` | 타임라인 UI |
| 32 | `frontend/src/styles/tokens.ts` | 디자인 토큰 |

---

## 16. 결론

Travel Archive는 “여행 전 계획”과 “여행 후 기록”을 끊지 않고 연결하는 개인 여행 아카이브다. 개발에서 가장 중요한 것은 기능을 많이 넣는 것이 아니라, 다음 다섯 가지를 일관되게 지키는 것이다.

1. **버킷 → 예정 → 체크리스트 → 완료 → 타임라인/사진 → 지도/통계** 흐름 유지.
2. **세계지도/국내지도/상세지도 책임 분리** 유지.
3. **모바일 우선 PWA 디자인 시스템** 유지.
4. **사용자별 데이터 보안과 서버 검증** 유지.
5. **MVP 범위 통제** 유지.

이 문서를 기준으로 기획 변경, 화면 추가, API 변경, DB 변경, 배포 작업을 수행한다.
