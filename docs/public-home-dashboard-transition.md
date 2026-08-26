# 공개 홈과 로그인 대시보드 분리 전환 계획

> **기능 계획/기록 문서**: 현재 구현 완료나 배포 준비 상태를 뜻하지 않는다. 운영 상태는 `docs/README.md`를 따른다.

작성일: 2026-05-18

## 목적

현재 프로젝트는 모든 주요 화면이 로그인 이후의 개인 데이터 화면으로 동작한다. 앞으로는 다음 구조로 역할을 분리한다.

```txt
/              비로그인 접근 가능 공개 홈. 앱 소개와 샘플 데이터 기반 미리보기.
/dashboard     로그인 필요. 기존 홈 디자인에 실제 사용자 데이터 적용.
/trips         로그인 필요.
/bucket        로그인 필요.
/stats         로그인 필요.
/profile       로그인 필요.
/login
/signup
```

핵심 방향은 `/`와 `/dashboard`의 시각적 구조를 크게 다르게 만들지 않는 것이다. `/`는 같은 디자인 언어와 화면 구성을 사용하되 샘플 데이터와 가입/로그인 유도 액션을 제공하고, `/dashboard`는 같은 UI에 실제 사용자 API 데이터를 연결한다.

## 결론 요약

이 변경은 백엔드보다 프론트엔드 라우팅, 인증 처리, 홈 화면 분리가 중심이다.

- 백엔드는 현 단계에서 공개 데이터 API를 새로 열 필요가 없다.
- 공개 홈 `/`은 서버 API를 호출하지 않는 정적/로컬 샘플 데이터 기반으로 구현하는 것이 안전하다.
- 기존 `frontend/src/app/(main)/page.tsx`는 현재 URL `/`에 매핑되어 있으므로 `/dashboard`로 이동해야 한다.
- 루트 `/`에서 `AuthProvider`의 `/auth/me` 확인이 401 리다이렉트를 발생시키지 않도록 API 클라이언트 또는 인증 초기화 방식을 수정해야 한다.
- 로그인/회원가입 성공 후 이동지는 `/`가 아니라 `/dashboard`가 되어야 한다.

## 현재 구현 분석

### 프론트엔드 라우팅

현재 Next.js App Router 구조에서는 route group 이름이 URL에 포함되지 않는다.

```txt
frontend/src/app/(main)/page.tsx              -> /
frontend/src/app/(main)/trips/page.tsx        -> /trips
frontend/src/app/(main)/bucket/page.tsx       -> /bucket
frontend/src/app/(main)/stats/page.tsx        -> /stats
frontend/src/app/(main)/profile/page.tsx      -> /profile
frontend/src/app/(auth)/login/page.tsx        -> /login
frontend/src/app/(auth)/signup/page.tsx       -> /signup
```

따라서 공개 홈을 `frontend/src/app/page.tsx`로 추가하려면 먼저 기존 `frontend/src/app/(main)/page.tsx`를 `/dashboard` 경로로 옮겨야 한다. 기존 파일을 그대로 두고 `src/app/page.tsx`를 추가하면 같은 `/` 경로가 충돌한다.

### 현재 홈 화면

현재 홈은 `frontend/src/app/(main)/page.tsx`에 구현되어 있다.

역할:

- `useRequireAuth()`로 로그인 필수 처리
- `/maps/world`, `/maps/domestic`, `/maps/regions/{mapKey}` 호출
- `/statistics/summary` 호출
- 지도, 통계 카드, 지도 탭, 상태 범례 렌더링
- 지도에서 여행 클릭 시 `/trips/{tripId}` 이동
- `+ 새 여행` 버튼 클릭 시 `/trips` 이동
- 통계 카드 클릭 시 `/stats` 이동

이 화면은 공개 소개 페이지라기보다 사용자 개인 데이터 대시보드에 가깝다. 공개 홈에서 같은 디자인을 유지하려면 API 호출 부분과 UI 렌더링 부분을 분리하는 것이 좋다.

### 인증 처리

관련 파일:

- `frontend/src/lib/auth/context.tsx`
- `frontend/src/lib/auth/hooks.ts`
- `frontend/src/lib/api/client.ts`
- `frontend/src/lib/auth/providers.tsx`
- `frontend/src/app/layout.tsx`

현재 흐름:

1. `RootLayout`이 모든 페이지를 `Providers`로 감싼다.
2. `AuthProvider`는 앱 시작 시 `/auth/me`를 호출한다.
3. `api.request()`는 401을 받으면 `/login`, `/signup`이 아닌 모든 경로에서 `window.location.href = "/login"`을 실행한다.
4. 보호 페이지들은 `useRequireAuth()`를 호출하고, 인증 정보가 없으면 `/login`으로 보낸다.

문제:

- 공개 홈 `/`에서도 `AuthProvider`의 `/auth/me` 호출은 실행된다.
- 비로그인 사용자의 `/auth/me` 응답은 401이다.
- 현재 `ApiClient`는 `/`에서 발생한 401도 `/login`으로 리다이렉트한다.
- 이 상태에서는 `/`를 공개 홈으로 만들어도 비로그인 사용자가 계속 `/login`으로 튕길 수 있다.

따라서 공개 홈 전환의 선행 작업은 `AuthProvider`가 인증 확인 실패를 "정상적인 비로그인 상태"로 처리하도록 만드는 것이다.

### 보호 페이지

현재 `useRequireAuth()`를 직접 사용하는 페이지:

- `frontend/src/app/(main)/page.tsx`
- `frontend/src/app/(main)/trips/page.tsx`
- `frontend/src/app/(main)/trips/[tripId]/page.tsx`
- `frontend/src/app/(main)/bucket/page.tsx`
- `frontend/src/app/(main)/stats/page.tsx`
- `frontend/src/app/(main)/profile/page.tsx`

`/dashboard` 전환 후에도 실제 기능 화면은 계속 이 훅을 사용해야 한다. 공개 홈 `/`에는 이 훅을 사용하면 안 된다.

### 레이아웃과 내비게이션

관련 파일:

- `frontend/src/app/(main)/layout.tsx`
- `frontend/src/components/layout/sidebar.tsx`
- `frontend/src/components/layout/bottom-nav.tsx`

현재 `MainLayout`은 `/(main)` 아래 화면 전체에 사이드바와 하단 내비게이션을 붙인다. 현재 홈이 `/`이기 때문에 사이드바/하단 탭의 홈 링크도 `/`로 설정되어 있다.

전환 후에는 다음 중 하나를 선택해야 한다.

1. 공개 홈 `/`은 별도 공개 레이아웃을 사용하고, 로그인 후 앱 내비게이션의 홈 링크는 `/dashboard`로 변경한다.
2. 공개 홈도 현재 디자인 시안처럼 사이드바/하단 탭 형태를 유지하되, 공개 전용 내비게이션 컴포넌트를 따로 둔다.

권장안은 1번이다. 다만 사용자가 말한 "디자인은 같되 소개용 페이지"를 살리려면 공개 홈의 콘텐츠 레이아웃은 `/dashboard`와 공유하고, 내비게이션은 공개/보호 영역별로 다르게 두는 편이 안전하다.

### 로그인/회원가입 성공 후 이동

관련 파일:

- `frontend/src/app/(auth)/login/page.tsx`
- `frontend/src/app/(auth)/signup/page.tsx`

현재 성공 후 이동지는 `router.replace("/")`다. 전환 후에는 `router.replace("/dashboard")`로 바꾸는 것이 기본이다.

추가로, 나중에 보호 페이지 접근 중 로그인으로 이동한 경우 원래 가려던 페이지로 돌아가려면 `?redirect=/trips` 같은 redirect 파라미터를 도입할 수 있다. MVP 전환에서는 필수는 아니다.

## 백엔드 분석

관련 파일:

- `backend/src/main/java/com/travelarchive/config/SecurityConfig.java`
- `backend/src/main/java/com/travelarchive/auth/AuthController.java`
- `backend/src/main/java/com/travelarchive/map/MapController.java`
- `backend/src/main/java/com/travelarchive/stats/StatsController.java`
- `backend/src/main/java/com/travelarchive/map/MapService.java`
- `backend/src/main/java/com/travelarchive/stats/StatsService.java`

현재 보안 설정:

```java
.requestMatchers("/api/auth/signup", "/api/auth/login", "/api/auth/refresh", "/api/auth/logout").permitAll()
.anyRequest().authenticated()
```

현재 공개 API:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

현재 보호 API:

- `GET /api/auth/me`
- `/api/maps/**`
- `/api/statistics/**`
- `/api/trips/**`
- `/api/buckets/**`
- 체크리스트, 타임라인, 사진 파일 관련 API

`MapService`와 `StatsService`는 모두 `authentication.getName()`을 기반으로 현재 사용자 데이터를 조회한다. 공개 홈에 이 API를 그대로 열면 사용자별 데이터 경계가 무너질 수 있다.

권장안:

- 백엔드 보안 정책은 유지한다.
- 공개 홈은 프론트엔드 로컬 샘플 데이터로 구성한다.
- 공개 소개용 수치, 여행 카드, 지도 색칠 데이터는 `frontend/src/lib/home/demo-data.ts` 같은 파일에 둔다.
- 공개 데이터가 운영 중 자주 바뀌어야 하는 요구가 생기기 전까지는 `/api/public/**` 같은 공개 API를 만들지 않는다.

## 수정 범위

### 필수 프론트엔드 수정

#### 1. 라우트 재배치

수정 대상:

- `frontend/src/app/(main)/page.tsx`
- 새 파일: `frontend/src/app/(main)/dashboard/page.tsx`
- 새 파일: `frontend/src/app/page.tsx`

작업:

- 기존 홈 대시보드를 `/(main)/dashboard/page.tsx`로 이동한다.
- 기존 `/(main)/page.tsx`는 제거하거나, 공개 홈으로 쓰지 않는다.
- 공개 홈은 `src/app/page.tsx`에 새로 만든다.

주의:

- `/(main)/page.tsx`와 `/app/page.tsx`는 둘 다 `/`를 의미하므로 동시에 둘 수 없다.

#### 2. 홈 UI와 데이터 로직 분리

권장 신규 구조:

```txt
frontend/src/components/home/HomeOverview.tsx
frontend/src/components/home/HomeFeatureStrip.tsx
frontend/src/components/home/HomeTripCard.tsx
frontend/src/components/home/HomeChecklistPreview.tsx
frontend/src/lib/home/demo-data.ts
```

역할:

- `HomeOverview.tsx`: 공개 홈과 대시보드가 공유하는 화면 프레젠테이션 컴포넌트
- `demo-data.ts`: 공개 홈 샘플 지도/통계/여행/체크리스트 데이터
- `/app/page.tsx`: 샘플 데이터를 주입하는 공개 홈 컨테이너
- `/app/(main)/dashboard/page.tsx`: 실제 API 데이터를 주입하는 대시보드 컨테이너

이렇게 나누면 `/`와 `/dashboard`의 디자인 일관성을 유지하면서도 인증/API 책임을 분리할 수 있다.

#### 3. 인증 초기화의 401 리다이렉트 제어

수정 대상:

- `frontend/src/lib/api/client.ts`
- `frontend/src/lib/auth/context.tsx`
- `frontend/src/lib/api/client.test.ts`

현재 문제:

- `/auth/me`가 401이면 공개 홈에서도 `/login`으로 이동할 수 있다.

권장 수정 방향:

- `ApiClient.request()`에 `redirectOnUnauthorized` 옵션을 추가한다.
- 기본값은 기존처럼 `true`로 유지한다.
- `AuthProvider`의 초기 `/auth/me` 호출에는 `redirectOnUnauthorized: false`를 사용한다.

예상 정책:

```txt
AuthProvider의 /auth/me 401:
  user = null
  loading = false
  redirect 없음

보호 페이지의 일반 API 401:
  /login으로 redirect
```

대안:

- `/auth/me`만 예외 처리한다.
- 공개 경로 allowlist(`/`, `/login`, `/signup`)에서는 401 자동 리다이렉트를 하지 않는다.
- `AuthProvider`에서 `api`를 쓰지 않고 raw `fetch`로 `/auth/me`를 호출한다.

권장안은 명시적 옵션 추가다. 테스트하기 쉽고 나중에 다른 공개 페이지가 생겨도 의도가 분명하다.

#### 4. 보호 경로 유지

수정 대상:

- `frontend/src/lib/auth/hooks.ts`
- `frontend/src/app/(main)/dashboard/page.tsx`
- `frontend/src/app/(main)/trips/page.tsx`
- `frontend/src/app/(main)/trips/[tripId]/page.tsx`
- `frontend/src/app/(main)/bucket/page.tsx`
- `frontend/src/app/(main)/stats/page.tsx`
- `frontend/src/app/(main)/profile/page.tsx`

작업:

- `/dashboard`는 `useRequireAuth()`를 유지한다.
- `/trips`, `/bucket`, `/stats`, `/profile`, `/trips/[tripId]`도 기존처럼 보호한다.
- 공개 홈 `/`에는 `useRequireAuth()`를 사용하지 않는다.

선택 개선:

- `useRequireAuth({ redirectTo: "/login" })` 형태로 확장할 수 있다.
- 보호 경로 접근 후 로그인 성공 시 원래 경로로 돌아가는 redirect 파라미터를 추가할 수 있다.

#### 5. 로그인/회원가입 성공 경로 변경

수정 대상:

- `frontend/src/app/(auth)/login/page.tsx`
- `frontend/src/app/(auth)/signup/page.tsx`

작업:

- `router.replace("/")`를 `router.replace("/dashboard")`로 변경한다.

추가 선택 사항:

- `/login?redirect=/trips/1` 처리
- 이미 로그인한 사용자가 `/login`, `/signup`에 접근하면 `/dashboard`로 보내기

#### 6. 내비게이션 링크 변경

수정 대상:

- `frontend/src/components/layout/sidebar.tsx`
- `frontend/src/components/layout/bottom-nav.tsx`

작업:

- 로그인 후 앱 내비게이션의 홈 링크를 `/`에서 `/dashboard`로 변경한다.
- 활성 상태 판단도 `/dashboard` 기준으로 변경한다.

공개 홈에서 같은 내비게이션을 보여줄 경우:

- 공개 전용 내비게이션 컴포넌트를 별도로 둔다.
- 기능 메뉴 클릭 시 `/login` 또는 `/signup`으로 유도한다.
- 보호 앱 내비게이션 컴포넌트를 공개 페이지에 그대로 재사용하지 않는다.

#### 7. 공개 홈 상호작용 정책

수정 대상:

- `frontend/src/app/page.tsx`
- 홈 프레젠테이션 컴포넌트

권장 정책:

- `시작하기`: `/signup`
- `로그인`: `/login`
- 샘플 여행 카드 클릭: `/login` 또는 `/signup`
- 샘플 지도 상세의 여행 클릭: `/login` 또는 `/signup`
- `전체 보기`, `새 여행`, `전체 체크리스트 보기`: `/login` 또는 `/signup`
- 로그인한 사용자가 `/`에 접근한 경우:
  - 자동으로 `/dashboard`로 보낼지
  - 공개 홈을 보여주되 CTA만 `내 아카이브 보기`로 바꿀지 결정 필요

권장안:

- 첫 구현에서는 로그인 사용자도 `/`를 볼 수 있게 두고, CTA만 `/dashboard`로 연결한다.
- 로그인 성공 후에는 항상 `/dashboard`로 보낸다.

이 방식은 공개 홈의 SEO/소개 역할을 유지하면서도 로그인 후 진입 흐름은 명확하게 만든다.

### 선택 프론트엔드 수정

#### 공개 홈 디자인 완성도

현재 구현된 홈은 PRD 디자인 시안의 모든 블록을 완전히 포함하지는 않는다. 디자인 시안처럼 공개 홈과 대시보드를 맞추려면 다음 블록을 정리해야 한다.

- 인사말/헤드라인 영역
- 세계/국내 지도 토글
- 지도 카드
- 방문 지역/총 여행 횟수/총 여행 일수 카드
- 다가오는 여행 카드
- 다가오는 체크리스트 카드
- 최근 여행 카드 리스트
- 기능 요약 스트립
- 데스크톱 사이드바 또는 공개용 헤더
- 모바일 하단 내비게이션 또는 공개용 CTA 바

현재 코드 기준으로 이미 있는 것:

- 지도 토글
- 지도 렌더링
- 기본 통계 카드
- 지도 상세 시트
- 사이드바/하단 내비게이션

추가 또는 보강이 필요한 것:

- 다가오는 여행 카드
- 다가오는 체크리스트 미리보기
- 최근 여행 이미지 카드
- 기능 요약 스트립
- 샘플 데이터와 실제 데이터 간 공통 모델

#### 홈 데이터 집계 API 추가 여부

대시보드에서 디자인 시안 수준의 데이터를 한 번에 보여주려면 현재 API만으로는 여러 엔드포인트를 조합해야 한다.

현재 대시보드에 필요한 데이터 후보:

- 지도: `/api/maps/world`, `/api/maps/domestic`, `/api/maps/regions/{mapKey}`
- 통계: `/api/statistics/summary`
- 최근 여행: `/api/trips`
- 다가오는 여행: `/api/trips`에서 `PLANNED` 필터링 또는 별도 API
- 체크리스트: 특정 여행의 `/api/trips/{tripId}/checklists`

MVP에서는 프론트에서 기존 API를 조합해도 된다. 다만 대시보드가 복잡해지면 후속으로 `GET /api/dashboard` 같은 집계 API를 검토할 수 있다.

## 백엔드 수정 범위

### 필수 수정 없음

공개 홈을 프론트 로컬 샘플 데이터로 구현한다면 백엔드는 수정하지 않아도 된다.

유지해야 할 기준:

- `/api/maps/**`는 로그인 필요
- `/api/statistics/**`는 로그인 필요
- `/api/trips/**`는 로그인 필요
- `/api/buckets/**`는 로그인 필요
- `/api/auth/me`는 로그인 필요

### 선택 수정

다음 요구가 생기면 백엔드 변경을 고려한다.

- 공개 홈의 샘플 데이터를 관리자나 서버에서 관리해야 한다.
- 공개 홈에 전체 서비스 통계 같은 비개인 데이터를 보여주고 싶다.
- 대시보드 데이터를 한 번에 내려주는 집계 API가 필요하다.

그 경우 후보:

```txt
GET /api/public/home-preview     공개 샘플/소개 데이터
GET /api/dashboard               로그인 사용자 대시보드 집계 데이터
```

단, 공개 API를 만들 때는 사용자 개인 데이터가 섞이지 않도록 서비스 계층을 명확히 분리해야 한다.

## 테스트 수정 범위

### 프론트엔드 테스트

수정 또는 추가 대상:

- `frontend/src/lib/api/client.test.ts`
- 공개 홈 페이지 테스트 신규 추가
- 대시보드 페이지 테스트 신규 추가 또는 기존 홈 테스트 작성
- 로그인/회원가입 리다이렉트 테스트

필수 검증:

- `/auth/me` 401은 `AuthProvider`에서 리다이렉트를 발생시키지 않는다.
- 일반 보호 API 401은 기존처럼 `/login`으로 리다이렉트한다.
- 공개 홈은 비로그인 상태에서도 렌더링된다.
- 공개 홈은 보호 API를 호출하지 않는다.
- 로그인 성공 후 `/dashboard`로 이동한다.
- 회원가입 성공 후 `/dashboard`로 이동한다.
- 앱 내비게이션의 홈 링크가 `/dashboard`를 가리킨다.

현재 `client.test.ts`에는 "401이면 로그인으로 리다이렉트" 검증이 있다. 옵션 기반 정책을 도입하면 다음 케이스가 추가되어야 한다.

```txt
redirectOnUnauthorized: true  -> /login 리다이렉트
redirectOnUnauthorized: false -> ApiError만 throw, 리다이렉트 없음
```

### 백엔드 테스트

백엔드를 수정하지 않는다면 기존 테스트는 그대로 유지한다.

특히 다음 테스트의 의미는 유지되어야 한다.

- `MapControllerTest.requiresAuthenticationForMapEndpoints`
- `StatsControllerTest.requiresAuthenticationForStatistics`
- `AuthControllerTest.signupIssuesHttpOnlyCookiesAndMeReturnsCurrentUser`

공개 API를 새로 만들지 않는 한, 백엔드 인증 테스트를 완화하면 안 된다.

## 구현 순서 제안

### 1단계: 라우팅과 인증 안전장치

1. `/(main)/page.tsx`를 `/(main)/dashboard/page.tsx`로 이동한다.
2. 로그인/회원가입 성공 후 이동지를 `/dashboard`로 바꾼다.
3. 사이드바/하단 내비게이션의 홈 링크를 `/dashboard`로 바꾼다.
4. `AuthProvider`의 `/auth/me` 401이 공개 페이지 리다이렉트를 발생시키지 않게 한다.
5. 빈 공개 홈 `src/app/page.tsx`를 만든다.

이 단계의 목표는 URL 구조와 인증 흐름을 먼저 안정화하는 것이다.

### 2단계: 홈 화면 공통 컴포넌트화

1. 기존 대시보드의 UI 렌더링을 `HomeOverview` 같은 컴포넌트로 추출한다.
2. `DashboardPage`는 API 호출과 인증만 담당하게 한다.
3. `PublicHomePage`는 샘플 데이터만 주입하게 한다.
4. 클릭 액션을 props로 주입해 공개/로그인 모드의 이동 경로를 다르게 처리한다.

### 3단계: 공개 홈 콘텐츠 보강

1. PRD와 디자인 시안 기준으로 공개 홈 샘플 데이터 구성
2. 제품 소개 문구 정리
3. 가입/로그인 CTA 배치
4. 공개 홈의 클릭 액션이 보호 페이지로 직접 들어가지 않도록 처리

### 4단계: 검증과 테스트

1. 프론트 단위 테스트 갱신
2. 백엔드 테스트 회귀 확인
3. 모바일/데스크톱 레이아웃 확인
4. 비로그인 `/`, `/dashboard`, `/trips` 접근 흐름 확인
5. 로그인 후 `/dashboard`와 보호 기능 접근 확인

## 수용 기준

전환 완료 기준:

- 비로그인 사용자가 `/`에 접근하면 공개 홈이 보인다.
- 비로그인 사용자가 `/dashboard`에 접근하면 `/login`으로 이동한다.
- 비로그인 사용자가 `/trips`, `/bucket`, `/stats`, `/profile`에 접근하면 `/login`으로 이동한다.
- 로그인 성공 후 `/dashboard`로 이동한다.
- 회원가입 성공 후 `/dashboard`로 이동한다.
- 로그인 후 앱 내비게이션의 홈 메뉴는 `/dashboard`로 이동한다.
- 공개 홈은 사용자 개인 API를 호출하지 않는다.
- `/api/maps/**`, `/api/statistics/**`, `/api/trips/**`, `/api/buckets/**`는 계속 인증이 필요하다.
- 공개 홈과 대시보드는 같은 디자인 시스템과 주요 레이아웃을 공유한다.
- 공개 홈의 모든 기능성 액션은 로그인 또는 회원가입으로 자연스럽게 이어진다.

## 결정이 필요한 사항

### 로그인 사용자의 `/` 접근 처리

선택지:

1. `/` 접근 시 자동으로 `/dashboard` 리다이렉트
2. `/`는 계속 공개 홈으로 보여주고 CTA만 `내 아카이브 보기`로 변경

권장:

- 2번. 공개 홈의 소개/브랜딩 역할을 유지하면서도 로그인 사용자는 명확한 CTA로 `/dashboard`에 갈 수 있다.

### 공개 홈의 내비게이션 형태

선택지:

1. 공개 홈은 별도 공개 헤더만 사용
2. 디자인 시안처럼 사이드바/하단 탭 형태를 유지하되 공개 전용으로 구현

권장:

- 데스크톱은 간단한 공개 헤더 또는 공개 사이드바 중 디자인 우선순위에 맞춰 선택한다.
- 보호 앱의 `Sidebar`, `BottomNav`는 `/dashboard` 이하 전용으로 두는 것이 안전하다.

### 샘플 데이터의 위치

선택지:

1. 프론트 코드 상수
2. JSON 파일
3. 백엔드 공개 API

권장:

- 초기에는 프론트 코드 상수 또는 JSON 파일.
- 운영 중 수정 빈도가 높아질 때만 공개 API를 검토한다.

## 파일별 체크리스트

| 파일 | 현재 역할 | 수정 필요성 | 수정 방향 |
| --- | --- | --- | --- |
| `frontend/src/app/(main)/page.tsx` | 현재 `/` 홈 대시보드 | 필수 | `/dashboard`로 이동 |
| `frontend/src/app/(main)/dashboard/page.tsx` | 없음 | 필수 | 기존 홈 대시보드 컨테이너로 생성 |
| `frontend/src/app/page.tsx` | 없음 | 필수 | 공개 홈 컨테이너로 생성 |
| `frontend/src/lib/api/client.ts` | API 401 자동 리다이렉트 | 필수 | 401 리다이렉트 제어 옵션 추가 |
| `frontend/src/lib/auth/context.tsx` | 앱 시작 시 `/auth/me` 호출 | 필수 | `/auth/me` 실패를 비로그인 상태로 처리 |
| `frontend/src/lib/auth/hooks.ts` | 보호 페이지 리다이렉트 | 유지 | `/dashboard`와 기능 페이지에서 계속 사용 |
| `frontend/src/app/(auth)/login/page.tsx` | 로그인 폼 | 필수 | 성공 후 `/dashboard` 이동 |
| `frontend/src/app/(auth)/signup/page.tsx` | 회원가입 폼 | 필수 | 성공 후 `/dashboard` 이동 |
| `frontend/src/components/layout/sidebar.tsx` | 보호 앱 데스크톱 내비 | 필수 | 홈 링크 `/dashboard`로 변경 |
| `frontend/src/components/layout/bottom-nav.tsx` | 보호 앱 모바일 내비 | 필수 | 홈 링크 `/dashboard`로 변경 |
| `frontend/src/components/maps/WorldMap.tsx` | 지도 렌더링 | 선택 | 공개 샘플 데이터와 재사용 가능 |
| `frontend/src/components/maps/KoreaMap.tsx` | 국내 지도 렌더링 | 선택 | 공개 샘플 데이터와 재사용 가능 |
| `frontend/src/components/maps/MapDetailSheet.tsx` | 지도 상세 패널 | 선택 | 공개 모드 클릭 액션 검토 |
| `backend/src/main/java/com/travelarchive/config/SecurityConfig.java` | API 인증 정책 | 유지 | 공개 API를 만들지 않는 한 변경 없음 |
| `backend/src/main/java/com/travelarchive/map/MapController.java` | 사용자 지도 API | 유지 | 계속 인증 필요 |
| `backend/src/main/java/com/travelarchive/stats/StatsController.java` | 사용자 통계 API | 유지 | 계속 인증 필요 |
| `frontend/src/lib/api/client.test.ts` | API 클라이언트 테스트 | 필수 | 401 리다이렉트 옵션 테스트 추가 |
| `backend/src/test/java/com/travelarchive/map/MapControllerTest.java` | 지도 인증 테스트 | 유지 | 인증 필요 테스트 유지 |
| `backend/src/test/java/com/travelarchive/stats/StatsControllerTest.java` | 통계 인증 테스트 | 유지 | 인증 필요 테스트 유지 |

## 비범위

이번 전환 계획에 포함하지 않는 항목:

- OAuth 로그인
- 공개 공유 페이지
- 공개 여행 상세 페이지
- 백엔드 공개 지도/통계 API
- SEO용 상세 랜딩 페이지 다수
- 운영 관리자용 샘플 데이터 관리 기능

이 항목들은 `/` 공개 홈과 `/dashboard` 사용자 대시보드 분리가 완료된 뒤 별도 요구사항으로 다루는 것이 좋다.
