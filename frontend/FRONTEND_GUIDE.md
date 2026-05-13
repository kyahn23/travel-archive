# Travel Archive 프론트엔드 완벽 가이드

> 대상: React/Next.js를 처음 프로젝트 단위로 공부하는 주니어 개발자  
> 목표: Travel Archive 프론트엔드의 실제 파일을 읽으며 PRD 요구사항(지도 대시보드, 여행 기록, 버킷 전환, 타임라인, 체크리스트, 사진, 통계)을 구현 관점에서 이해한다.

---

## Part 1. 프로젝트 시작하기

### 1. Travel Archive가 해결하는 문제
Travel Archive는 개인 여행 기록을 저장하고 지도·통계로 회고하는 앱이다. 프론트엔드는 사용자가 보는 모든 화면과 상호작용을 담당한다. 이 프로젝트의 핵심 화면은 다음과 같다.

1. 홈 대시보드: 세계/국내 지도와 요약 통계
2. 여행 목록: 여행 생성, 상태 필터, 상세 이동
3. 여행 상세: 개요, 타임라인, 체크리스트, 지도, 사진 탭
4. 버킷리스트: 가고 싶은 곳 생성, 여행으로 전환
5. 통계: 월별 차트, 인기 지역, 요약 카드
6. 인증/프로필: 로그인, 회원가입, 로그아웃

### 2. 이 프로젝트에서 React란 무엇인가
React는 UI를 컴포넌트 함수로 쪼개는 라이브러리다. 예를 들어 `TripCard`는 여행 하나를 카드로 보여주는 함수이고, `TripsPage`는 그 카드를 여러 개 렌더링하는 페이지 함수다.

```tsx
export function TripCard({ trip }: TripCardProps) {
  const location = getLocationName(trip);

  return (
    <Link href={`/trips/${trip.id}`}>
      <Card className="transition-shadow hover:shadow-card">
        <CardContent className="p-5">...</CardContent>
      </Card>
    </Link>
  );
}
```

- `TripCard`는 React 컴포넌트다.
- `{ trip }`은 부모가 내려준 props다.
- `return (...)` 안의 JSX가 화면에 보인다.
- `Card`, `CardContent`는 재사용 UI 컴포넌트다.

### 3. 이 프로젝트에서 Next.js란 무엇인가
Next.js는 React 위에 라우팅, 빌드, 서버/클라이언트 컴포넌트 규칙을 얹은 프레임워크다. `src/app/(main)/trips/page.tsx` 파일이 `/trips` 경로가 되고, `src/app/(main)/trips/[tripId]/page.tsx`가 `/trips/123` 같은 동적 경로가 된다.

### 4. App Router 핵심 규칙
이 프로젝트는 Next.js 16.2.6 App Router를 사용한다.

```txt
src/app/layout.tsx                  → 전체 루트 레이아웃
src/app/(auth)/layout.tsx           → 로그인/회원가입 공통 레이아웃
src/app/(auth)/login/page.tsx       → /login
src/app/(main)/layout.tsx           → 인증 후 앱 셸
src/app/(main)/page.tsx             → /
src/app/(main)/trips/page.tsx       → /trips
src/app/(main)/trips/[tripId]/page.tsx → /trips/:tripId
```

괄호 폴더 `(auth)`, `(main)`은 URL에는 나타나지 않는 route group이다. URL 설계와 파일 정리를 분리하기 위한 장치다.

### 5. `"use client"`의 의미
대부분의 페이지/상호작용 컴포넌트 맨 위에 `"use client"`가 있다.

```tsx
"use client";

import { useState, useEffect } from "react";
```

이 선언은 해당 파일이 브라우저에서 실행되는 Client Component임을 뜻한다. `useState`, `useEffect`, 클릭 핸들러, `window`, Leaflet 같은 브라우저 API를 쓰려면 필요하다.

### 6. 개발 실행 흐름
`package.json`의 scripts가 진입점이다.

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- `npm run dev`: 로컬 개발 서버
- `npm run build`: 프로덕션 빌드
- `npm run test`: Vitest 테스트 실행

### 7. 주요 의존성의 역할
`package.json` 기준으로 핵심 라이브러리는 다음과 같다.

| 라이브러리 | 역할 |
|---|---|
| `next` | App Router, 빌드, 라우팅 |
| `react`, `react-dom` | UI 컴포넌트 렌더링 |
| `tailwindcss` | 유틸리티 CSS |
| `class-variance-authority` | 버튼/배지 variant 스타일 구성 |
| `clsx`, `tailwind-merge` | 조건부 className 병합 |
| `lucide-react` | 아이콘 |
| `@vnedyalk0v/react19-simple-maps` | 홈 대시보드 세계/국내 지도 (react-simple-maps React 19 호환 포크) |
| `leaflet`, `react-leaflet` | 여행 상세 위치 지도 (react-leaflet v5는 React 19 지원) |
| `recharts` | 통계 차트 |
| `vitest`, `@testing-library/react` | 테스트 |

---

## Part 2. 설정 파일 완벽 분석

### 8. `next.config.mjs`: API rewrite

```js
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"}/api/:path*`,
      },
    ];
  },
};
```

라인별 해석:

1. `reactStrictMode: true`: 개발 중 잠재 문제를 더 엄격히 드러낸다.
2. `rewrites()`: 프론트에서 `/api/trips`로 요청하면 백엔드 `http://localhost:8080/api/trips`로 프록시한다.
3. `NEXT_PUBLIC_API_BASE_URL`: 배포 환경에서 백엔드 주소를 바꿀 수 있다.

설계 trade-off: 프론트 코드에서는 항상 `/api`만 쓰므로 환경별 백엔드 주소를 숨긴다. 대신 Next 서버가 프록시 역할을 하므로 정적 호스팅만으로는 부족할 수 있다.

### 9. `tsconfig.json`: 엄격한 TypeScript

```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

- `strict: true`: `null`, `undefined`, 암묵적 any 같은 실수를 줄인다.
- `noEmit: true`: 타입 검사용이며 실제 변환은 Next가 담당한다.
- `@/*`: `@/components/ui/button`처럼 절대 경로 import를 가능하게 한다.

### 10. `tailwind.config.ts`: 디자인 시스템의 코드화

```ts
colors: {
  cream: { 50: "#FFFDF8", 100: "#FFF8EC" },
  coral: { 500: "#FF6B54", 600: "#E8523B" },
  teal: { 500: "#14B8A6", 600: "#0D9488" },
  sand: { 50: "#FAFAF5", 400: "#C9C3A5" },
}
```

PRD의 따뜻한 여행 아카이브 톤이 여기서 Tailwind 클래스가 된다.

- `bg-cream-50`: 앱 배경
- `bg-coral-500`: 주요 CTA, 계획 상태
- `bg-teal-500`: 완료 상태, 체크 완료
- `bg-violet-400`: 버킷리스트 상태(일부 컴포넌트에서 직접 사용)

### 11. 타이포그래피 토큰

```ts
fontSize: {
  "display-lg": ["2rem", { lineHeight: "1.2" }],
  "display": ["1.75rem", { lineHeight: "1.25" }],
  "title-lg": ["1.5rem", { lineHeight: "1.3" }],
  "title": ["1.25rem", { lineHeight: "1.4" }],
  "body": ["0.9375rem", { lineHeight: "1.6" }],
  "caption": ["0.8125rem", { lineHeight: "1.5" }],
}
```

실제 사용 예:

- `PageHeader` 제목: `text-display-lg`
- 카드 제목: `text-body-lg`, `text-title`
- 보조 설명: `text-caption`, `text-micro`

### 12. spacing과 mobile-first

```ts
spacing: {
  "touch": "44px",
  "safe-bottom": "env(safe-area-inset-bottom, 0px)",
}
```

- `h-touch`, `min-w-touch`: 모바일 터치 영역을 44px 이상 확보한다.
- `.safe-area-bottom`: iPhone 하단 safe area 대응.

### 13. `globals.css`: CSS 변수와 전역 스타일

```css
:root {
  --background: 40 50% 98%;
  --foreground: 25 20% 14%;
  --primary: 10 100% 66%;
  --secondary: 168 60% 40%;
  --radius: 0.75rem;
}

body {
  @apply bg-cream-50 text-foreground antialiased;
}
```

shadcn/ui의 semantic token(`bg-card`, `text-muted-foreground`)과 브랜드 팔레트(`cream`, `coral`, `teal`)가 함께 쓰인다.

### 14. `components.json`: shadcn/ui 설정

```json
{
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

이 프로젝트의 `ui/button.tsx`, `card.tsx` 등은 shadcn 스타일을 프로젝트 디자인에 맞게 커스터마이즈한 것이다.

### 15. `vitest.config.ts`: 테스트 환경

```ts
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
```

- `jsdom`: 브라우저 DOM을 Node 테스트에서 흉내낸다.
- alias 설정: 앱 코드와 테스트 코드가 같은 `@/` 경로를 사용한다.

### 16. `postcss.config.js`

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Tailwind가 CSS를 생성하고, Autoprefixer가 브라우저 호환 prefix를 붙인다.

---

## Part 3. 타입 시스템과 도메인 모델

### 17. `types/travel.ts`의 역할
이 파일은 백엔드 DTO와 프론트 화면이 공유하는 도메인 언어를 정의한다. `Trip`, `Bucket`, 지도 응답, 통계 응답 타입이 모두 여기에 있다.

### 18. Trip 상태 union

```ts
export type TripStatus = "PLANNED" | "COMPLETED" | "CANCELLED";
export type TravelScope = "DOMESTIC" | "INTERNATIONAL";
```

문자열을 아무거나 받지 않고 정해진 값만 받게 해 오타를 막는다. 예를 들어 `"COMPLETE"`는 컴파일 에러다.

### 19. `Trip` 인터페이스

```ts
export interface Trip {
  id: number;
  title: string;
  travelScope: TravelScope;
  countryId: number | null;
  domesticRegionId: number | null;
  cityName: string | null;
  startDate: string;
  endDate: string;
  status: TripStatus;
  tripDays: TripDay[] | null;
  coverPhotoId: number | null;
}
```

중요한 점:

- `number | null`: 아직 선택되지 않았거나 해당 범위가 아닐 수 있다.
- 날짜는 `string`: 서버 API와 JSON 교환이 쉽다.
- `tripDays`: 상세/타임라인 기능의 기반이다.

### 20. 생성 payload 타입

```ts
export interface CreateTripPayload {
  title: string;
  travelScope: TravelScope;
  countryId?: number | null;
  domesticRegionId?: number | null;
  startDate: string;
  endDate: string;
  status?: TripStatus | null;
}
```

서버로 보낼 때는 전체 `Trip`이 필요하지 않다. `id`, `coverPhotoId`는 서버가 만든다. 그래서 별도 payload 타입을 둔다.

### 21. Bucket 모델

```ts
export type BucketStatus =
  | "WANT_TO_GO"
  | "PLANNING"
  | "BOOKED"
  | "VISITED"
  | "ON_HOLD";

export interface Bucket {
  id: number;
  title: string;
  travelScope: TravelScope;
  reason: string | null;
  expectedBudget: number | null;
  status: BucketStatus;
}
```

PRD의 “버킷리스트를 여행으로 전환” 기능 때문에 `Bucket`과 `Trip`은 일부 필드를 공유한다: 제목, 범위, 국가/국내 지역, 도시명.

### 22. label lookup table

```ts
export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  PLANNED: "계획 중",
  COMPLETED: "완료",
  CANCELLED: "취소",
};
```

`Record<TripStatus, string>`은 모든 상태 키를 강제한다. 새로운 상태가 추가되면 label 누락을 컴파일 단계에서 잡는다.

### 23. 참조 데이터 `COUNTRIES`, `DOMESTIC_REGIONS`

```ts
export const COUNTRIES = [
  { id: 1, code: "KR", nameKo: "대한민국" },
  { id: 2, code: "JP", nameKo: "일본" },
] as const;
```

폼 select와 카드 위치 표시에서 사용된다. `as const`는 값의 타입을 더 좁게 보존한다.

### 24. 지도 타입

```ts
export type MapRegionStatus = "COMPLETED" | "PLANNED" | "BUCKET" | "NONE";

export interface WorldMapRegion {
  mapKey: string;
  countryCode: string;
  nameKo: string;
  status: MapRegionStatus;
}
```

지도 색상과 범례는 이 상태값에 의해 결정된다. `COMPLETED=teal`, `PLANNED=coral`, `BUCKET=violet`, `NONE=sand/gray`.

### 25. 통계 타입

```ts
export interface StatsSummary {
  completedTrips: number;
  plannedTrips: number;
  travelDays: number;
  visitedCountries: number;
  visitedDomesticRegions: number;
}
```

홈 대시보드와 통계 페이지가 같은 summary 타입을 재사용한다.

---

## Part 4. API 클라이언트와 데이터 흐름

### 26. `lib/api/client.ts`의 목적
모든 JSON API 요청을 하나의 wrapper로 통일한다.

```ts
export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
}
```

백엔드는 `{ data, message }` envelope로 응답한다. `T`는 호출할 때 정한다.

### 27. 제네릭 API 호출

```ts
const res = await api.get<Trip[]>("/trips");
setTrips(res.data);
```

- `api.get<Trip[]>`: 응답 `data`가 `Trip[]`라고 TypeScript에 알려준다.
- 그 결과 `res.data.map(trip => trip.title)` 같은 접근이 안전해진다.

### 28. `ApiError`

```ts
export class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`API ${status}: ${body}`);
    this.name = "ApiError";
  }
}
```

로그인/회원가입 폼은 `err instanceof ApiError`로 서버 에러 메시지와 일반 에러를 구분한다.

### 29. fetch wrapper 핵심 코드

```ts
const res = await fetch(url, {
  ...options,
  headers,
  credentials: "include",
});
```

- `credentials: "include"`: httpOnly JWT 쿠키를 자동 전송한다.
- `Content-Type: application/json`: 일반 API는 JSON body를 사용한다.

### 30. 401 처리

```ts
if (res.status === 401) {
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
  throw new ApiError(401, "Unauthorized");
}
```

인증 만료 시 로그인 페이지로 보낸다. auth 페이지에서는 redirect loop를 피한다.

### 31. 204 처리

```ts
if (res.status === 204 || res.headers.get("content-length") === "0") {
  return { data: undefined as unknown as T, message: "Success" };
}
```

삭제 API처럼 본문이 없는 응답도 같은 envelope 형태로 맞춘다.

### 32. mutation 패턴
프로젝트 전반에서 다음 패턴이 반복된다.

1. 폼 상태를 만든다.
2. submit에서 payload를 만든다.
3. `api.post/patch/delete`를 호출한다.
4. 성공하면 local state 갱신 또는 refetch한다.
5. 실패하면 error 상태를 표시한다.

---

## Part 5. 인증 시스템

### 33. `lib/auth/context.tsx`의 역할
앱 전체에서 로그인 사용자와 인증 액션을 공유한다.

```ts
interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => Promise<void>;
}
```

### 34. AuthProvider 초기 로딩

```tsx
useEffect(() => {
  api
    .get<AuthUser>("/auth/me")
    .then((res) => setUser(res.data))
    .catch(() => setUser(null))
    .finally(() => setLoading(false));
}, []);
```

앱 시작 시 `/auth/me`를 호출해 쿠키가 유효한지 확인한다. 이 과정을 끝내기 전에는 보호 페이지가 아무것도 렌더링하지 않는다.

### 35. login/signup 흐름

```ts
const login = useCallback(async (email: string, password: string) => {
  await api.post("/auth/login", { email, password });
  const me = await api.get<AuthUser>("/auth/me");
  setUser(me.data);
}, []);
```

로그인 API는 쿠키를 세팅하고, 이후 `/auth/me`로 실제 사용자 정보를 가져온다.

### 36. `useRequireAuth` 라우트 보호

```ts
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  return { user, loading };
}
```

보호 페이지는 대부분 `const { loading: authLoading } = useRequireAuth();`로 시작한다.

### 37. `providers.tsx`

```tsx
export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
```

현재는 AuthProvider만 있지만, 나중에 theme provider, query provider 등을 추가할 수 있는 확장 지점이다.

---

## Part 6. 레이아웃과 라우팅

### 38. 루트 레이아웃 `src/app/layout.tsx`

```tsx
export const metadata: Metadata = {
  title: "Travel Archive",
  description: "Personal travel archive service",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FFFDF8",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

모든 페이지는 `Providers` 아래에서 렌더링되므로 어디서든 `useAuth()`를 쓸 수 있다.

### 39. 인증 레이아웃 `(auth)/layout.tsx`

```tsx
return (
  <div className="flex min-h-screen items-center justify-center bg-cream-50 px-4 py-12">
    <div className="w-full max-w-sm">{children}</div>
  </div>
);
```

로그인/회원가입을 모바일 카드 폭(`max-w-sm`)으로 중앙 정렬한다. PRD의 간결한 시작 경험에 맞춘다.

### 40. 메인 레이아웃 `(main)/layout.tsx`

```tsx
<>
  <Sidebar />
  <main className="min-h-screen pb-20 md:pb-0 md:pl-60">
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">{children}</div>
  </main>
  <BottomNav />
</>
```

- 모바일: 하단 nav 공간 때문에 `pb-20`.
- 데스크톱: 사이드바 폭 240px 때문에 `md:pl-60`.
- 콘텐츠 폭은 `max-w-3xl`로 읽기 좋은 너비를 유지한다.

### 41. Sidebar

```tsx
const sidebarItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/trips", label: "여행 기록", icon: Map },
  { href: "/bucket", label: "버킷리스트", icon: Heart },
  { href: "/stats", label: "통계", icon: BarChart3 },
  { href: "/profile", label: "마이페이지", icon: User },
] as const;
```

`usePathname()`으로 현재 경로를 읽고 active 스타일을 적용한다.

```tsx
const isActive = href === "/" ? pathname === "/" : (pathname ?? "").startsWith(href);
```

### 42. BottomNav
모바일 전용 하단 탭이다.

```tsx
<nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/90 backdrop-blur-md safe-area-bottom md:hidden">
```

- `md:hidden`: 데스크톱에서는 사라진다.
- `safe-area-bottom`: iOS 홈 인디케이터 영역 대응.
- `min-w-touch`: 터치 목표 크기 확보.

### 43. PageHeader

```tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}
```

대부분 페이지의 상단 제목과 액션 버튼을 통일한다.

### 44. EmptyState
데이터가 없을 때 같은 형식의 빈 상태를 보여준다. 여행 없음, 버킷 없음, 사진 없음, 체크리스트 없음 등 여러 PRD 흐름에서 재사용된다.

---

## Part 7. UI 프리미티브와 디자인 시스템

### 45. `cn()` 유틸리티

```ts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- `clsx`: 조건부 클래스 결합
- `tailwind-merge`: `px-2 px-4` 같은 충돌을 마지막 값으로 정리

### 46. Button: cva variant 패턴

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors ...",
  {
    variants: {
      variant: {
        default: "bg-coral-500 text-white hover:bg-coral-600",
        secondary: "bg-teal-500 text-white hover:bg-teal-600",
        outline: "border border-border bg-background hover:bg-accent",
        ghost: "hover:bg-accent",
        destructive: "bg-destructive text-destructive-foreground",
      },
      size: {
        default: "h-touch px-5 rounded-lg text-body",
        sm: "h-9 px-3 rounded-md text-caption",
        lg: "h-12 px-8 rounded-xl text-body-lg",
      },
    },
  }
);
```

PRD 디자인 시스템의 coral primary, teal secondary, touch size를 코드로 강제한다.

### 47. Button `asChild`

```tsx
const Comp = asChild ? Slot : "button";
return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
```

Radix `Slot`을 사용하면 버튼 스타일을 다른 요소(예: Link)에 입힐 수 있다.

### 48. Card compound components
`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`는 카드 구조를 일관되게 만든다.

```tsx
<div className={cn("rounded-xl border bg-card text-card-foreground shadow-card", className)} />
```

`shadow-card`, `rounded-xl`, `bg-card`가 프로젝트의 부드러운 카드 디자인을 만든다.

### 49. Input

```tsx
className={cn(
  "flex h-touch w-full rounded-lg border border-input bg-background px-4 py-2 text-body ...",
  className
)}
```

폼 입력의 높이, 포커스 링, disabled 스타일을 통일한다.

### 50. Badge
상태를 작은 라벨로 표현한다.

```tsx
variant: {
  default: "border-transparent bg-coral-500 text-white",
  secondary: "border-transparent bg-teal-500 text-white",
  soft: "border-transparent bg-coral-100 text-coral-600",
  tealSoft: "border-transparent bg-teal-100 text-teal-700",
  muted: "border-transparent bg-muted text-muted-foreground",
}
```

상태 색상 연결:

- 계획: coral default
- 완료: tealSoft
- 취소/비활성: muted

### 51. Tabs: compound component 패턴

```tsx
const TabsContext = React.createContext<TabsContextValue | null>(null);

function Tabs({ defaultValue, value, onValueChange, children }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const activeTab = value ?? internalValue;
  return <TabsContext.Provider value={{ activeTab, setActiveTab }}>{children}</TabsContext.Provider>;
}
```

`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`가 context를 공유한다. 여행 상세의 개요/타임라인/체크리스트/지도/사진 탭에서 사용된다.

---

## Part 8. 인증 페이지

### 52. LoginPage 상태

```tsx
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState("");
const [pending, setPending] = useState(false);
```

각 input은 controlled component다. 화면 값은 React state가 진실의 원천이다.

### 53. Login validation

```tsx
if (!email.trim()) {
  setError("이메일을 입력해주세요.");
  return;
}
if (!password) {
  setError("비밀번호를 입력해주세요.");
  return;
}
```

서버 요청 전 최소 검증으로 불필요한 API 호출을 줄인다.

### 54. Login submit

```tsx
try {
  await login(email.trim(), password);
  router.replace("/");
} catch (err) {
  if (err instanceof ApiError) {
    setError(err.status === 401 ? "이메일 또는 비밀번호가 일치하지 않습니다." : err.body);
  }
} finally {
  setPending(false);
}
```

성공하면 홈으로 replace한다. 뒤로 가기로 로그인 폼에 돌아가지 않게 하는 UX다.

### 55. SignupPage 차이점
회원가입은 닉네임과 비밀번호 확인이 추가된다.

```tsx
if (nickname.trim().length > 20) setError("닉네임은 20자 이하로 입력해주세요.");
if (password.length < 8) setError("비밀번호는 8자 이상이어야 합니다.");
if (password !== confirmPassword) setError("비밀번호가 일치하지 않습니다.");
```

### 56. Signup 후 자동 로그인
`AuthProvider.signup` 내부는 가입 → 로그인 → `/auth/me` 순서다. 사용자는 가입 후 별도 로그인 없이 홈으로 이동한다.

---

## Part 9. 홈 대시보드

### 57. 파일 목적: `src/app/(main)/page.tsx`
홈은 PRD의 “지도와 통계로 여행 히스토리를 한눈에 확인” 요구사항을 구현한다.

### 58. dynamic import로 지도 로딩

```tsx
const WorldMap = dynamic(
  () => import("@/components/maps/WorldMap").then((mod) => ({ default: mod.WorldMap })),
  { ssr: false, loading: () => <MapSkeleton /> }
);
```

`@vnedyalk0v/react19-simple-maps`는 브라우저 렌더링에 적합하므로 SSR을 끈다. 로딩 중에는 skeleton을 보여준다.

### 59. 지도 view 상태

```ts
type MapView = "world" | "domestic";
const [mapView, setMapView] = useState<MapView>("world");
```

문자열 union으로 `"world"`, `"domestic"`만 허용한다.

### 60. 세계 지도 데이터 enrichment

```tsx
const res = await api.get<WorldMapRegion[]>("/maps/world");
const detailPromises = res.data
  .filter((r) => r.status !== "NONE")
  .map(async (region) => api.get<MapRegionDetail>(`/maps/regions/${region.mapKey}`));
```

지도 색칠용 목록 API와 상세 패널용 region detail API를 조합한다. `NONE` 지역은 상세 요청을 생략해 네트워크 비용을 줄인다.

### 61. Promise.all 패턴

```tsx
const details = await Promise.all(detailPromises);
const detailMap = new Map<string, MapRegionDetail>();
```

여러 상세 요청을 병렬로 보내고, `mapKey → detail` 형태로 빠르게 조회한다.

### 62. dashboard summary cards

```tsx
{[
  { label: "완료 여행", value: statsSummary?.completedTrips ?? 0, icon: Plane, color: "text-teal-600", bg: "bg-teal-50" },
  { label: "계획 중", value: statsSummary?.plannedTrips ?? 0, icon: Calendar, color: "text-coral-600", bg: "bg-coral-50" },
].map(({ label, value, icon: Icon }) => ...)}
```

배열로 카드 메타데이터를 만들면 반복 JSX를 줄일 수 있다. 색상은 design token과 상태 의미를 맞춘다.

### 63. 지도 범례

```ts
const STATUS_LEGEND = [
  { color: "bg-teal-500", label: "완료" },
  { color: "bg-coral-500", label: "계획 중" },
  { color: "bg-violet-400", label: "버킷리스트" },
  { color: "bg-gray-300", label: "미방문" },
] as const;
```

색상 언어를 지도와 카드 전체에서 일관되게 유지한다.

---

## Part 10. 여행 목록 페이지

### 64. 파일 목적: `trips/page.tsx`
여행 CRUD 중 “생성”과 “목록 조회/필터/상세 이동”을 담당한다.

### 65. 목록 데이터 fetch

```tsx
const fetchTrips = useCallback(async () => {
  try {
    const res = await api.get<Trip[]>("/trips");
    setTrips(res.data);
  } catch {
    setError("여행 목록을 불러오지 못했습니다.");
  } finally {
    setLoading(false);
  }
}, []);
```

이 프로젝트의 표준 client-side fetching 패턴이다: `useCallback` + `useEffect` + typed `api.get<T>()`.

### 66. 상태 필터

```ts
type FilterStatus = TripStatus | "ALL";
const [filter, setFilter] = useState<FilterStatus>("ALL");
const filtered = filter === "ALL" ? trips : trips.filter((t) => t.status === filter);
```

화면 전용 값 `ALL`과 도메인 값 `TripStatus`를 union으로 합친다.

### 67. 생성 폼 state
여행 생성은 별도 컴포넌트로 분리하지 않고 페이지 내부 폼으로 구현되어 있다.

```tsx
const [title, setTitle] = useState("");
const [startDate, setStartDate] = useState("");
const [travelScope, setTravelScope] = useState<TravelScope>("DOMESTIC");
const [countryId, setCountryId] = useState<number | null>(null);
```

국내/해외 선택에 따라 국가 select 또는 국내 지역 select를 보여준다.

### 68. payload 구성 trade-off

```tsx
const payload: CreateTripPayload = {
  title: title.trim(),
  startDate,
  endDate,
  travelScope,
  countryId: travelScope === "INTERNATIONAL" ? countryId : null,
  domesticRegionId: travelScope === "DOMESTIC" ? domesticRegionId : null,
  cityName: cityName.trim() || undefined,
};
```

빈 문자열은 `undefined`로 보내고, 해당하지 않는 위치 ID는 `null`로 명시한다. 서버가 “값 없음”과 “빈 문자열”을 혼동하지 않게 한다.

### 69. 생성 후 상세 이동

```tsx
const res = await api.post<Trip>("/trips", payload);
router.push(`/trips/${res.data.id}`);
```

생성 완료 후 상세 화면으로 보내 바로 타임라인/체크리스트를 작성하게 한다.

---

## Part 11. 여행 상세 페이지

### 70. 파일 목적: `trips/[tripId]/page.tsx`
여행 하나의 모든 하위 기능을 탭으로 묶는다: 개요, 타임라인, 체크리스트, 지도, 사진.

### 71. URL 파라미터 읽기

```tsx
const params = useParams();
const tripId = Number(params.tripId);
```

Next App Router의 동적 라우트 `[tripId]` 값은 문자열이므로 숫자로 변환한다.

### 72. trip fetch

```tsx
const fetchTrip = useCallback(async () => {
  const res = await api.get<Trip>(`/trips/${tripId}`);
  setTrip(res.data);
}, [tripId]);
```

상세 페이지에서 `trip`은 `Trip | null`이다. 아직 로딩 전에는 데이터가 없기 때문이다.

### 73. 상태 전환 테이블

```ts
const STATUS_TRANSITIONS: Record<TripStatus, { label: string; target: TripStatus }[]> = {
  PLANNED: [
    { label: "완료로 변경", target: "COMPLETED" },
    { label: "취소", target: "CANCELLED" },
  ],
  COMPLETED: [],
  CANCELLED: [{ label: "계획 중으로 복구", target: "PLANNED" }],
};
```

상태별 가능한 액션을 선언형으로 표현했다. PRD의 여행 상태 관리 요구사항과 직접 연결된다.

### 74. 상태 변경 mutation

```tsx
await api.patch(`/trips/${trip.id}/status`, { status: target });
setTrip({ ...trip, status: target });
```

서버 반영 후 local state를 즉시 갱신한다. 전체 refetch보다 빠르지만, 서버가 더 많은 필드를 바꾸는 경우에는 refetch가 안전하다.

### 75. Tabs 구성

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">개요</TabsTrigger>
    <TabsTrigger value="timeline">타임라인</TabsTrigger>
    <TabsTrigger value="checklist">체크리스트</TabsTrigger>
    <TabsTrigger value="map">지도</TabsTrigger>
    <TabsTrigger value="photos">사진</TabsTrigger>
  </TabsList>
</Tabs>
```

복잡한 상세 화면을 한 페이지에서 관리하되, 기능별 컴포넌트로 책임을 분리한다.

### 76. CoverImageSection
대표 이미지 업로드는 JSON API client가 아니라 `fetch + FormData`를 직접 사용한다.

```tsx
const formData = new FormData();
formData.append("file", f);

const res = await fetch(`/api/trips/${tripId}/cover-image`, {
  method: "POST",
  credentials: "include",
  body: formData,
});
```

파일 업로드에서는 `Content-Type: application/json`을 쓰면 안 된다. 브라우저가 multipart boundary를 자동 설정해야 하므로 직접 fetch를 사용한다.

### 77. TripMapView
상세 지도 탭은 타임라인의 위도/경도를 마커로 변환한다.

```tsx
const markers: MarkerData[] = useMemo(() => {
  const result: MarkerData[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      if (item.latitude != null && item.longitude != null) {
        result.push({ id: item.id, title: item.title, latitude: item.latitude, longitude: item.longitude, status: "COMPLETED" as const });
      }
    }
  }
  return result;
}, [groups]);
```

`useMemo`는 groups가 바뀔 때만 마커 배열을 다시 계산한다.

---

## Part 12. 여행 컴포넌트

### 78. TripCard 위치명 계산

```tsx
function getLocationName(trip: Trip): string | null {
  if (trip.travelScope === "INTERNATIONAL" && trip.countryId) {
    return COUNTRIES.find((c) => c.id === trip.countryId)?.nameKo ?? null;
  }
  if (trip.travelScope === "DOMESTIC" && trip.domesticRegionId) {
    return DOMESTIC_REGIONS.find((r) => r.id === trip.domesticRegionId)?.nameKo ?? null;
  }
  return null;
}
```

도메인 ID를 사용자 표시명으로 바꾸는 presentation helper다.

### 79. TripCard 상태 배지

```ts
const STATUS_VARIANT: Record<TripStatus, "default" | "tealSoft" | "muted"> = {
  PLANNED: "default",
  COMPLETED: "tealSoft",
  CANCELLED: "muted",
};
```

상태와 디자인 토큰을 연결한다.

### 80. TripDetail 기간 계산

```ts
function daysBetween(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86400000) + 1;
}
```

시작일과 종료일을 모두 포함하기 때문에 `+1`을 한다. 여행 UX에서는 5/1~5/3이 3일이다.

---

## Part 13. 버킷리스트

### 81. BucketPage 목적
PRD의 “가고 싶은 곳 관리”와 “여행으로 전환” 요구사항을 담당한다.

### 82. Bucket fetch

```tsx
const res = await api.get<Bucket[]>("/buckets");
setBuckets(res.data);
```

목록 조회는 여행 목록과 동일한 패턴이다.

### 83. 생성 성공 시 local insert

```tsx
function handleBucketCreated(bucket: Bucket) {
  setBuckets((prev) => [bucket, ...prev]);
  setShowCreate(false);
}
```

전체 refetch 없이 새 버킷을 맨 위에 추가한다.

### 84. BucketCard 전환 가능 조건

```tsx
const canConvert = bucket.status === "WANT_TO_GO" || bucket.status === "PLANNING";
```

이미 방문했거나 보류된 버킷은 전환 버튼을 숨긴다.

### 85. BucketForm payload

```tsx
const payload: CreateBucketPayload = {
  title: title.trim(),
  travelScope,
  reason: reason.trim() || undefined,
  countryId: travelScope === "INTERNATIONAL" ? countryId : null,
  domesticRegionId: travelScope === "DOMESTIC" ? domesticRegionId : null,
  cityName: cityName.trim() || undefined,
  referenceUrl: referenceUrl.trim() || undefined,
  companion: companion.trim() || undefined,
  status,
};
```

여행 생성과 구조가 비슷하다. 같은 도메인 필드를 공유하기 때문에 사용자가 버킷을 여행으로 전환할 수 있다.

### 86. ConvertTripForm

```tsx
const res = await api.post<{ id: number }>(
  `/buckets/${bucket.id}/convert-to-trip`,
  { startDate, endDate },
);
onSuccess(res.data.id);
```

버킷 자체의 목적지 정보는 이미 있으므로 전환 시 날짜만 받는다. 성공하면 생성된 여행 상세로 이동한다.

---

## Part 14. 타임라인

### 87. TimelineItem 데이터 모델

```ts
export interface TimelineItemData {
  id: number;
  tripDayId: number;
  tripDay: number;
  travelDate: string;
  visitedAt: string | null;
  title: string;
  placeName: string | null;
  latitude: number | null;
  longitude: number | null;
  category: TimelineCategory;
  photos: PhotoData[];
}
```

PRD의 “일자별 타임라인 및 지도 마커” 요구사항의 핵심 타입이다. 위치가 있으면 지도 마커가 되고, 사진이 있으면 갤러리에 포함된다.

### 88. DayGroup

```ts
export interface DayGroup {
  tripDayId: number;
  tripDay: number;
  travelDate: string;
  items: TimelineItemData[];
}
```

서버가 일자별로 묶어 내려주므로 UI는 “1일차, 2일차” 섹션을 쉽게 렌더링한다.

### 89. TimelineView fetch

```tsx
const fetchTimeline = useCallback(async () => {
  const res = await api.get<DayGroup[]>(`/trips/${tripId}/timeline`);
  setGroups(res.data);
}, [tripId]);
```

타임라인, 상세 지도, 사진 갤러리 모두 같은 endpoint를 활용한다.

### 90. refreshRef 패턴

```tsx
const refreshRef = useRef<() => void>(() => {});
refreshRef.current = fetchTimeline;
```

생성/수정/삭제/사진 업로드 후 최신 fetch 함수를 호출하기 위한 ref다. 콜백 closure 문제를 줄인다.

### 91. TimelineForm payload key 설계

```ts
export interface TimelineFormPayload {
  title: string;
  place_name?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  visited_at?: string;
  category: TimelineCategory;
  memo?: string;
}
```

주의: payload는 snake_case(`place_name`, `visited_at`)를 사용한다. 서버 API 계약을 그대로 따른다.

### 92. 좌표 validation

```tsx
function buildCoordinates(latStr: string, lngStr: string) {
  const lat = latStr.trim() === "" ? null : parseFloat(latStr);
  const lng = lngStr.trim() === "" ? null : parseFloat(lngStr);
  if (lat != null && (isNaN(lat) || lat < -90 || lat > 90)) return {};
  if (lng != null && (isNaN(lng) || lng < -180 || lng > 180)) return {};
  if (lat == null && lng == null) return {};
  return { latitude: lat, longitude: lng };
}
```

잘못된 좌표는 payload에서 제외한다. 사용자에게 더 구체적 에러를 주는 개선 여지는 있다.

### 93. TimelineItem actions
각 항목은 hover 시 사진 업로드, 편집, 삭제 버튼을 보여준다.

```tsx
<Button variant="ghost" size="icon" onClick={() => onUploadPhoto(item.id)}>
  <Camera className="h-3.5 w-3.5" />
</Button>
```

모바일에서는 hover가 약하므로 항상 보이게 하는 개선을 고려할 수 있다.

---

## Part 15. 체크리스트

### 94. ChecklistView 목적
PRD의 “체크리스트(템플릿 기반 자동 생성)” 요구사항의 프론트 구현이다.

### 95. ChecklistResponse

```ts
interface ChecklistResponse {
  id: number;
  tripId: number;
  title: string;
  progressRate: number;
  items: ChecklistItemData[];
}
```

서버가 progressRate까지 계산해서 내려준다. 프론트는 이를 progress bar width로 사용한다.

### 96. 체크리스트 생성

```tsx
const res = await api.post<ChecklistResponse>(`/trips/${tripId}/checklists`);
setChecklist(res.data);
```

체크리스트가 없을 때 `EmptyState`에서 생성 버튼을 보여준다.

### 97. toggle mutation

```tsx
async function handleToggle(id: number) {
  const res = await api.patch<ChecklistResponse>(`/checklist-items/${id}`);
  setChecklist(res.data);
}
```

토글 후 서버가 갱신된 전체 체크리스트를 돌려주므로 local 계산 없이 바로 반영한다.

### 98. grouping reduce

```tsx
const grouped = checklist.items.reduce<Record<string, ChecklistItemData[]>>((acc, item) => {
  const key = item.category || "기타";
  if (!acc[key]) acc[key] = [];
  acc[key].push(item);
  return acc;
}, {});
```

카테고리별 섹션을 만들기 위해 배열을 객체로 변환한다.

### 99. ChecklistItem 스타일

```tsx
className={cn(
  "flex h-5 w-5 ... rounded border-2 transition-colors",
  done ? "border-teal-500 bg-teal-500 text-white" : "border-border hover:border-coral-400"
)}
```

완료 상태는 teal, 미완료 hover는 coral로 design system을 따른다.

---

## Part 16. 사진 업로드와 갤러리

### 100. PhotoUploader 파일 제한

```ts
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
```

대표 이미지와 타임라인 사진 모두 같은 제한을 사용한다.

### 101. object URL preview

```tsx
setPreview(URL.createObjectURL(f));

useEffect(() => {
  return () => {
    if (preview) URL.revokeObjectURL(preview);
  };
}, [preview]);
```

로컬 파일 미리보기 URL을 만들고, 컴포넌트 cleanup에서 해제한다. 메모리 누수를 막는 중요한 패턴이다.

### 102. multipart upload

```tsx
const formData = new FormData();
formData.append("file", file);

await fetch(`/api/timeline-items/${timelineItemId}/photos`, {
  method: "POST",
  credentials: "include",
  body: formData,
});
```

파일 업로드는 API client의 JSON header와 맞지 않으므로 직접 fetch한다.

### 103. PhotoGallery 데이터 구성

```tsx
const res = await api.get<DayGroup[]>(`/trips/${tripId}/timeline`);
const entries: PhotoEntry[] = [];
for (const group of res.data) {
  for (const item of group.items) {
    for (const photo of item.photos) entries.push({ photo, itemTitle: item.title, itemDate: group.travelDate, itemId: item.id });
  }
}
```

타임라인에 흩어진 사진을 갤러리용 flat 배열로 변환한다.

### 104. modal UX
사진을 클릭하면 `selectedPhoto`에 저장하고 fixed overlay를 렌더링한다. 바깥 클릭은 닫기, 내부 클릭은 `stopPropagation()`으로 닫힘을 막는다.

---

## Part 17. 지도 구현

### 105. WorldMap 목적
`@vnedyalk0v/react19-simple-maps`로 세계 TopoJSON을 렌더링하고 국가별 상태 색을 입힌다.

### 106. WorldMap 색상 매핑

```ts
const STATUS_FILL: Record<MapStatus, string> = {
  COMPLETED: "#14B8A6",
  PLANNED: "#FF6B54",
  BUCKET: "#A78BFA",
  NONE: "#EBE9D9",
};
```

Tailwind token 값과 직접 HEX 값을 맞춘다. SVG fill에는 Tailwind class보다 HEX가 편하다.

### 107. react19-simple-maps 구조

```tsx
<ComposableMap projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}>
  <Sphere stroke="#DDD9C4" fill="#FAFAF5" />
  <Graticule stroke="#DDD9C4" />
  <Geographies geography={GEO_URL}>
    {({ geographies }) => geographies.map((geo) => <Geography geography={geo} />)}
  </Geographies>
</ComposableMap>
```

- `ComposableMap`: SVG 지도 컨테이너
- `Geographies`: GeoJSON/TopoJSON 로딩
- `Geography`: 각 국가/지역 path

### 108. 클릭 시 상세 패널

```tsx
function handleGeoClick(geo) {
  const geoId = geo.properties.ISO_A3 ?? geo.properties.ISO_A2 ?? geo.properties.id ?? "";
  const found = dataMap().get(geoId);
  setDetail(found ? {...} : {...});
  setSheetOpen(true);
}
```

지도 feature의 ID와 서버 mapKey가 일치해야 색칠과 상세가 제대로 동작한다.

### 109. KoreaMap 차이점
KoreaMap은 같은 패턴이지만 projection이 다르다.

```tsx
<ComposableMap
  projection="geoMercator"
  projectionConfig={{ center: [127.5, 36.0], scale: 4500 }}
  width={500}
  height={600}
>
```

대한민국 시도 지도를 화면에 크게 맞추기 위한 설정이다.

### 110. MapDetailSheet
지도 국가/지역 클릭 시 모바일은 bottom sheet, 데스크톱은 side panel로 보여준다.

```tsx
if (!data || !open) return null;
```

열리지 않았을 때 DOM 자체를 렌더링하지 않는다.

### 111. 외부 클릭/ESC 닫기

```tsx
useEffect(() => {
  if (!open) return;
  function handleKey(e: KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }
  document.addEventListener("keydown", handleKey);
  return () => document.removeEventListener("keydown", handleKey);
}, [open, onClose]);
```

이벤트 listener는 반드시 cleanup해야 한다.

### 112. LeafletMap 목적
여행 상세 지도 탭에서 타임라인 위치를 실제 지도 타일 위에 마커로 보여준다.

### 113. Leaflet 인스턴스 ref

```tsx
const containerRef = useRef<HTMLDivElement>(null);
const mapRef = useRef<L.Map | null>(null);
const markersLayerRef = useRef<L.LayerGroup | null>(null);
```

React state가 아니라 ref를 쓰는 이유: Leaflet map 객체는 화면 렌더링 값이 아니라 외부 라이브러리 인스턴스다.

### 114. Leaflet cleanup

```tsx
return () => {
  map.remove();
  mapRef.current = null;
};
```

컴포넌트가 사라질 때 지도 인스턴스를 제거하지 않으면 이벤트와 DOM이 남을 수 있다.

### 115. MarkerData와 popup escape

```ts
function escapeHtml(text: string | null): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

Leaflet popup은 HTML 문자열을 사용한다. 사용자 입력을 그대로 넣으면 XSS 위험이 있으므로 escape한다. `MapMarker.test.ts`가 이 보안을 검증한다.

---

## Part 18. 통계와 Recharts

### 116. StatsPage 목적
PRD의 “월별, 지역별 통계 대시보드” 요구사항을 구현한다.

### 117. 병렬 fetch

```tsx
const [summaryRes, monthlyRes, regionsRes] = await Promise.all([
  api.get<StatsSummary>("/statistics/summary"),
  api.get<MonthlyCount[]>("/statistics/monthly"),
  api.get<TopRegion[]>("/statistics/top-regions"),
]);
```

서로 의존하지 않는 API는 병렬로 요청해 로딩 시간을 줄인다.

### 118. SUMMARY_CARDS as const

```ts
const SUMMARY_CARDS = [
  { key: "completedTrips" as const, label: "완료 여행", icon: Plane },
  { key: "plannedTrips" as const, label: "계획 중 여행", icon: Calendar },
] as const;
```

`summary[key]`를 안전하게 사용하기 위해 key를 정확한 문자열 리터럴로 고정한다.

### 119. 월 label formatting

```ts
function formatMonthLabel(monthStr: string): string {
  const parts = monthStr.split("-");
  const month = parseInt(parts[1], 10);
  return `${month}월`;
}
```

서버의 `yyyy-MM` 데이터를 차트 X축용 `5월`로 변환한다.

### 120. Recharts 구성

```tsx
<ResponsiveContainer width="100%" height={280}>
  <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -12 }}>
    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
    <XAxis dataKey="label" />
    <YAxis allowDecimals={false} />
    <Tooltip formatter={(value) => [`${value}회`, "여행"]} />
    <Bar dataKey="count" fill="#FF6B54" radius={[4, 4, 0, 0]} maxBarSize={48} />
  </BarChart>
</ResponsiveContainer>
```

chart도 design system을 따른다. `fill="#FF6B54"`는 coral primary다.

### 121. 국내/해외 top regions 분리

```tsx
const domesticRegions = topRegions.filter((r) => r.scope === "DOMESTIC");
const internationalRegions = topRegions.filter((r) => r.scope === "INTERNATIONAL");
```

같은 API 데이터를 사용자에게 더 이해하기 쉬운 두 섹션으로 나눈다.

---

## Part 19. 상태 관리 전략

### 122. 왜 Redux/Zustand가 없는가
Travel Archive는 대부분 화면이 독립적인 CRUD다. 전역으로 공유해야 하는 것은 인증 사용자뿐이다. 그래서 AuthContext + local state가 충분하다.

### 123. local state 사용 위치

- 페이지 loading/error/data
- 폼 input 값
- modal/sheet open 상태
- 선택된 사진/버킷/탭
- pending/uploading/deleting 상태

### 124. Context 사용 위치
인증만 Context다.

```tsx
const { user, login, logout } = useAuth();
```

### 125. refetch vs optimistic update
이 프로젝트는 두 방식을 섞는다.

- 여행 상태 변경: local update (`setTrip({ ...trip, status })`)
- 체크리스트 toggle: 서버 응답으로 전체 교체
- 타임라인 mutation: refetch
- 버킷 생성: local insert

선택 기준은 “서버가 결과를 얼마나 많이 바꾸는가”다.

### 126. error 상태 패턴
대부분 문자열 상태를 쓴다.

```tsx
const [error, setError] = useState("");
```

장점: 단순하다. 단점: 에러 코드별 UX 분기가 복잡해지면 구조화된 error 객체가 필요하다.

---

## Part 20. 테스트

### 127. `test/setup.ts`

```ts
import '@testing-library/jest-dom';
```

`toBeInTheDocument()` 같은 DOM matcher를 등록한다.

### 128. API client 테스트

```ts
vi.stubGlobal('fetch', vi.fn());
await new ApiClient('/api').get('/trips');
expect(fetch).toHaveBeenCalledWith('/api/trips', expect.objectContaining({
  method: 'GET',
  credentials: 'include',
}));
```

실제 네트워크 대신 mock fetch를 사용해 request option을 검증한다.

### 129. 401 redirect 테스트

```ts
vi.mocked(fetch).mockResolvedValue(new Response('Unauthorized', { status: 401 }));
await expect(new ApiClient('/api').get('/me')).rejects.toBeInstanceOf(ApiError);
expect(window.location.href).toBe('/login');
```

인증 만료 UX의 핵심 동작을 테스트한다.

### 130. StatsPage 테스트

```tsx
vi.mock('@/lib/auth/hooks', () => ({
  useRequireAuth: () => ({ loading: false }),
}));

vi.mock('@/lib/api/client', () => ({
  api: { get: vi.fn() },
}));
```

인증과 API를 mock 처리해 통계 페이지 렌더링만 테스트한다.

### 131. Recharts mock
테스트 환경에서는 실제 SVG 차트가 중요하지 않으므로 mock 컴포넌트로 대체한다.

```tsx
ResponsiveContainer: ({ children }) => <div data-testid="chart">{children}</div>
```

### 132. Type test
`types/travel.test.ts`는 `satisfies`로 payload 구조를 검증한다.

```ts
const payload = {
  title: 'Seoul weekend',
  travelScope: 'DOMESTIC',
  domesticRegionId: 1,
} satisfies CreateTripPayload;
```

### 133. 보안 테스트
`MapMarker.test.ts`는 popup HTML escape를 확인한다.

```ts
expect(content).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
expect(content).not.toContain('<script>');
```

---

## Part 21. 레거시 Pages Router 파일

### 134. `pages/_app.tsx`

```tsx
export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
```

Pages Router 호환 파일이다. 현재 주요 화면은 App Router에 있지만, Next 프로젝트 호환성을 위해 남아 있다.

### 135. `pages/_document.tsx`

```tsx
export default function Document() {
  return (
    <Html lang="ko">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

HTML 문서 뼈대다. App Router의 `app/layout.tsx`와 역할이 일부 겹치지만 Pages Router용이다.

---

## Part 22. 파일별 빠른 책임 사전

### 136. Config 파일 책임

| 파일 | 책임 |
|---|---|
| `package.json` | 의존성, 실행 스크립트 |
| `next.config.mjs` | API rewrite, Strict Mode |
| `tailwind.config.ts` | 색상/타입/간격/반응형 토큰 |
| `tsconfig.json` | strict TS, alias |
| `vitest.config.ts` | 테스트 환경, alias |
| `postcss.config.js` | Tailwind/PostCSS pipeline |
| `components.json` | shadcn/ui 생성 설정 |

### 137. App Router 파일 책임

| 파일 | 책임 |
|---|---|
| `app/layout.tsx` | 루트 HTML, metadata, Providers |
| `app/globals.css` | 전역 CSS 변수, body style |
| `(auth)/layout.tsx` | 인증 카드 중앙 정렬 |
| `(auth)/login/page.tsx` | 로그인 폼 |
| `(auth)/signup/page.tsx` | 회원가입 폼 |
| `(main)/layout.tsx` | Sidebar/BottomNav 앱 셸 |
| `(main)/page.tsx` | 지도 대시보드 |
| `(main)/trips/page.tsx` | 여행 목록/생성 |
| `(main)/trips/[tripId]/page.tsx` | 여행 상세 탭 통합 |
| `(main)/bucket/page.tsx` | 버킷 목록/생성/전환 |
| `(main)/stats/page.tsx` | 통계 대시보드 |
| `(main)/profile/page.tsx` | 계정 정보/로그아웃 |

### 138. Component 파일 책임

| 영역 | 파일 | 책임 |
|---|---|---|
| layout | `sidebar.tsx` | 데스크톱 내비게이션 |
| layout | `bottom-nav.tsx` | 모바일 하단 탭 |
| layout | `page-header.tsx` | 페이지 제목/action |
| layout | `empty-state.tsx` | 빈 상태 UI |
| ui | `button/card/input/badge/tabs` | 디자인 시스템 primitive |
| trips | `TripCard.tsx` | 여행 목록 카드 |
| trips | `TripDetail.tsx` | 여행 상세 헤더 정보 |
| bucket | `BucketCard.tsx` | 버킷 카드와 전환 버튼 |
| bucket | `BucketForm.tsx` | 버킷 생성 폼 |
| bucket | `ConvertTripForm.tsx` | 여행 전환 폼 |
| timeline | `TimelineView.tsx` | 일자별 목록/CRUD 조율 |
| timeline | `TimelineItem.tsx` | 타임라인 항목 표시 |
| timeline | `TimelineForm.tsx` | 타임라인 생성/수정 폼 |
| checklist | `ChecklistView.tsx` | 체크리스트 전체 관리 |
| checklist | `ChecklistItem.tsx` | 체크 항목 한 줄 |
| photos | `PhotoUploader.tsx` | 파일 선택/미리보기/업로드 |
| photos | `PhotoGallery.tsx` | 사진 모아보기/모달 |
| maps | `WorldMap.tsx` | 세계 지도 |
| maps | `KoreaMap.tsx` | 국내 지도 |
| maps | `LeafletMap.tsx` | 상세 위치 지도 |
| maps | `MapMarker.tsx` | Leaflet marker/popup |
| maps | `MapDetailSheet.tsx` | 지도 상세 패널 |

---

## Part 23. 300개 학습 체크포인트

아래 체크포인트는 CSAT prep book처럼 빠르게 복습하기 위한 목록이다. 각 항목은 이 프로젝트의 실제 코드와 연결된다.

### 139. 기본 구조 체크포인트
1. Next.js App Router에서 `page.tsx`는 URL 페이지다.
2. `layout.tsx`는 하위 페이지를 감싸는 공통 UI다.
3. `(main)` route group은 URL에 표시되지 않는다.
4. `[tripId]`는 동적 라우트 segment다.
5. `"use client"`는 hook과 브라우저 API 사용을 허용한다.
6. `Providers`는 전역 context를 넣는 확장 지점이다.
7. `@/*` alias는 `tsconfig.json`과 `vitest.config.ts`에 모두 필요하다.
8. API 요청은 `/api`로 시작하고 Next rewrite가 백엔드로 보낸다.
9. httpOnly cookie 인증 때문에 `credentials: "include"`가 필수다.
10. 401은 API client에서 로그인 redirect로 처리한다.

### 140. TypeScript 체크포인트
11. `TripStatus`는 문자열 union이다.
12. `Record<TripStatus, string>`은 모든 상태 key를 강제한다.
13. `Trip | null`은 로딩 전 상태를 표현한다.
14. `number | null`은 선택 안 됨 또는 해당 없음이다.
15. `?` optional property는 key 자체가 없을 수 있음을 뜻한다.
16. `as const`는 literal type을 보존한다.
17. `import type`은 런타임 번들에 남지 않는다.
18. `satisfies`는 객체가 타입을 만족하는지 검사하면서 literal을 보존한다.
19. `React.ReactNode`는 렌더링 가능한 모든 자식 타입이다.
20. `React.FormEvent`는 form submit 이벤트 타입이다.
21. `React.ChangeEvent<HTMLInputElement>`는 input change 이벤트 타입이다.
22. `[number, number]`는 좌표 tuple이다.
23. `Map<string, MapRegionDetail>`은 key/value 타입이 있는 JS Map이다.
24. `unknown`은 타입을 알 수 없으므로 좁히기 전 사용을 막는다.
25. `instanceof ApiError`는 타입 narrowing이다.

### 141. React hook 체크포인트
26. `useState`는 화면 state를 저장한다.
27. `useEffect`는 렌더링 후 side effect를 실행한다.
28. `useCallback`은 함수 참조를 안정화한다.
29. `useMemo`는 계산 결과를 memoize한다.
30. `useRef`는 DOM/외부 인스턴스/함수 참조를 저장한다.
31. effect dependency array는 재실행 조건이다.
32. cleanup 함수는 이벤트 리스너와 Leaflet map 제거에 필요하다.
33. controlled input은 `value`와 `onChange`를 함께 가진다.
34. `pending` state는 중복 submit을 막는다.
35. `loading` state는 skeleton/spinner 렌더링에 쓴다.
36. `error` state는 사용자 메시지 표시용이다.
37. `null` return은 인증 로딩 중 화면 깜빡임을 막는다.
38. `router.push`는 history를 남긴다.
39. `router.replace`는 history를 대체한다.
40. `useParams`는 URL segment 값을 읽는다.

### 142. 디자인 시스템 체크포인트
41. 앱 배경은 `bg-cream-50`이다.
42. 주요 CTA는 coral이다.
43. 완료 상태는 teal이다.
44. 버킷 상태는 violet 계열이다.
45. 취소/미방문은 muted/gray다.
46. 카드 radius는 `rounded-xl`이다.
47. 카드 그림자는 `shadow-card`다.
48. 입력 높이는 `h-touch`다.
49. 모바일 터치 목표는 44px 이상이다.
50. 제목은 `text-display-lg` 또는 `text-title` 계열이다.
51. 보조 문구는 `text-caption`과 `text-muted-foreground`다.
52. section gap은 대체로 `gap-6`, `gap-8`이다.
53. screen padding은 `px-4`, 데스크톱은 `md:px-8`이다.
54. bottom nav는 `safe-area-bottom`을 쓴다.
55. 상태 badge variant는 도메인 상태와 연결된다.

### 143. API/data 체크포인트
56. 모든 JSON API는 `ApiResponse<T>` envelope를 기대한다.
57. `api.get<T>`의 T는 `res.data` 타입이다.
58. POST/PUT/PATCH는 body를 JSON.stringify한다.
59. 파일 업로드는 API client를 쓰지 않고 fetch + FormData를 쓴다.
60. 목록 fetch는 `useCallback + useEffect` 패턴이다.
61. mutation 후 refetch는 서버 계산 결과가 중요할 때 쓴다.
62. local insert는 새 객체가 충분히 완전할 때 쓴다.
63. local update는 단일 필드 변경에 빠르다.
64. `Promise.all`은 독립 API 병렬화에 쓴다.
65. 지도 enrichment는 목록 API와 detail API를 조합한다.

### 144. 페이지 체크포인트
66. LoginPage는 `useAuth().login`을 호출한다.
67. SignupPage는 가입 후 자동 로그인한다.
68. HomePage는 지도와 summary cards를 보여준다.
69. TripsPage는 여행 생성 후 상세로 이동한다.
70. TripDetailPage는 탭으로 하위 기능을 묶는다.
71. BucketPage는 버킷 생성과 전환을 관리한다.
72. StatsPage는 세 통계 API를 병렬 fetch한다.
73. ProfilePage는 AuthContext user를 표시한다.
74. MainLayout은 sidebar와 bottom nav를 동시에 렌더링한다.
75. AuthLayout은 인증 폼을 중앙 카드로 제한한다.

### 145. 컴포넌트 체크포인트
76. Button은 cva로 variant/size를 만든다.
77. Card는 compound component다.
78. Tabs는 context 기반 compound component다.
79. Badge는 상태 라벨 표현에 집중한다.
80. Input은 표준 input props를 확장한다.
81. TripCard는 Link로 전체 카드 클릭을 만든다.
82. TripDetail은 기간과 위치 요약을 보여준다.
83. BucketCard는 전환 가능 여부를 판단한다.
84. BucketForm은 국내/해외 조건부 select를 가진다.
85. ConvertTripForm은 날짜만 입력받는다.
86. TimelineView는 list, form, uploader를 조율한다.
87. TimelineItem은 항목 표시와 actions를 담당한다.
88. TimelineForm은 좌표와 카테고리를 입력받는다.
89. ChecklistView는 progress와 grouping을 담당한다.
90. ChecklistItem은 toggle/delete 상태를 가진다.
91. PhotoUploader는 object URL cleanup이 중요하다.
92. PhotoGallery는 nested timeline photos를 flatten한다.
93. WorldMap/KoreaMap은 같은 패턴의 SVG 지도다.
94. LeafletMap은 외부 map 인스턴스를 ref로 관리한다.
95. MapMarker는 XSS 방지를 위해 HTML escape한다.
96. MapDetailSheet는 모바일 bottom sheet와 데스크톱 side panel을 모두 제공한다.

### 146. PRD 연결 체크포인트
97. “여행 CRUD 및 상태 관리”는 TripsPage와 TripDetailPage가 담당한다.
98. “버킷리스트 관리 및 여행 전환”은 BucketPage, BucketForm, ConvertTripForm이 담당한다.
99. “일자별 타임라인”은 TimelineView/Form/Item이 담당한다.
100. “지도 마커”는 Timeline 좌표 → MarkerData → LeafletMap 흐름이다.
101. “체크리스트”는 ChecklistView/Item이 담당한다.
102. “사진 업로드”는 PhotoUploader와 CoverImageSection이 담당한다.
103. “세계/대한민국 지도 집계”는 HomePage + WorldMap/KoreaMap이 담당한다.
104. “통계 대시보드”는 StatsPage + Recharts가 담당한다.
105. “JWT 쿠키 인증”은 ApiClient credentials와 AuthProvider가 담당한다.

### 147. 고급 구현 체크포인트
106. dynamic import의 `ssr:false`는 브라우저 전용 라이브러리 보호다.
107. Leaflet CSS는 컴포넌트 파일에서 import된다.
108. 지도 marker popup은 HTML 문자열이라 escape가 필요하다.
109. 외부 클릭 감지는 `ref.current.contains(e.target as Node)`를 쓴다.
110. ESC 닫기는 document keydown listener를 쓴다.
111. `setTimeout`으로 sheet 외부 클릭 listener 등록을 지연한다.
112. `fitBounds`는 마커 전체가 보이도록 지도를 조정한다.
113. `URL.revokeObjectURL`은 preview 메모리 해제다.
114. `FormData`에는 JSON content-type을 수동 설정하지 않는다.
115. Recharts Tooltip은 project typography와 border token을 맞춘다.
116. `line-clamp-2`는 카드 설명을 짧게 유지한다.
117. `truncate`는 긴 제목 overflow를 막는다.
118. `group-hover`는 카드 내부 action 노출에 쓰인다.
119. `opacity-0 group-hover:opacity-100`은 desktop hover UX다.
120. `md:hidden`, `hidden md:flex`는 responsive navigation 핵심이다.

### 148. 테스트 체크포인트
121. Vitest는 Vite 기반 테스트 러너다.
122. jsdom은 DOM API를 흉내낸다.
123. Testing Library는 사용자 관점 query를 권장한다.
124. `vi.mock`은 모듈 mock이다.
125. `vi.stubGlobal`은 global 객체 mock이다.
126. `mockResolvedValueOnce`는 Promise 응답 순서를 만든다.
127. `findByText`는 비동기 요소를 기다린다.
128. `waitFor`는 조건이 만족될 때까지 반복한다.
129. Recharts는 테스트에서 mock해도 화면 로직 검증이 가능하다.
130. XSS escape 같은 작은 함수는 단위 테스트 가치가 크다.

### 149. 유지보수 체크포인트
131. 새 TripStatus가 생기면 `TRIP_STATUS_LABEL`, badge mapping, transitions를 모두 확인한다.
132. 새 BucketStatus가 생기면 label과 `BucketCard` variant를 확인한다.
133. 새 지도 상태가 생기면 WorldMap/KoreaMap/MapDetailSheet/legend를 확인한다.
134. API envelope가 바뀌면 `ApiClient`와 모든 test를 확인한다.
135. 파일 업로드 제한이 바뀌면 CoverImageSection과 PhotoUploader를 함께 수정한다.
136. 디자인 색상이 바뀌면 tailwind config와 SVG HEX 매핑을 함께 확인한다.
137. route가 바뀌면 Sidebar/BottomNav item을 갱신한다.
138. 인증 흐름이 바뀌면 AuthProvider와 useRequireAuth를 먼저 본다.
139. 통계 API가 바뀌면 StatsPage와 HomePage summary를 함께 본다.
140. timeline API가 바뀌면 TimelineView, TripMapView, PhotoGallery가 모두 영향받는다.

### 150. 성능 체크포인트
141. 지도 컴포넌트는 dynamic import로 초기 SSR 부담을 줄인다.
142. detail API는 `status !== "NONE"`일 때만 호출한다.
143. 독립 API는 `Promise.all`로 병렬 처리한다.
144. 외부 라이브러리 인스턴스는 ref에 저장한다.
145. 마커 변환은 `useMemo`로 불필요한 계산을 줄인다.
146. 함수 dependency 안정화에는 `useCallback`을 쓴다.
147. 하지만 과도한 memoization은 코드 복잡도를 높일 수 있다.
148. 카드 목록은 key로 id를 사용한다.
149. 이미지 목록은 thumbnail 크기를 CSS로 제한한다.
150. 대용량 사진은 서버 썸네일 API가 있으면 더 좋다.

### 151. 접근성 체크포인트
151. form label은 `htmlFor`와 input `id`를 연결한다.
152. error 메시지는 일부에서 `role="alert"`를 사용한다.
153. Tabs는 `role="tablist"`, `role="tab"`, `role="tabpanel"`를 사용한다.
154. button은 `type="button"`을 명시해 form submit 오작동을 막는다.
155. 아이콘만 있는 버튼에는 aria-label 개선 여지가 있다.
156. modal/sheet focus trap은 현재 구현되어 있지 않아 개선 가능하다.
157. 지도 색상만으로 상태를 구분하지 않도록 범례를 제공한다.
158. 터치 영역은 `h-touch`와 `min-w-touch`로 확보한다.
159. disabled 상태는 opacity와 pointer events로 표현한다.
160. hover-only action은 모바일 접근성 개선이 필요하다.

### 152. 보안 체크포인트
161. JWT는 httpOnly cookie라 JS에서 직접 읽지 않는다.
162. fetch에는 credentials include가 필요하다.
163. popup HTML은 escape해야 한다.
164. 외부 링크 다운로드에는 `rel="noopener noreferrer"`가 있다.
165. 파일 MIME type을 클라이언트에서 1차 검증한다.
166. 파일 크기도 클라이언트에서 1차 검증한다.
167. 클라이언트 검증은 보조이며 서버 검증이 필수다.
168. API error body를 그대로 보여줄 때 민감 정보 노출에 주의한다.
169. image `src`는 내부 `/api/files/:id` 경로를 사용한다.
170. XSS 가능성이 있는 HTML 삽입은 MapMarker 외에는 거의 없다.

### 153. 코드 읽기 순서 추천
171. `types/travel.ts`로 도메인 단어를 먼저 익힌다.
172. `lib/api/client.ts`로 서버 통신 규칙을 익힌다.
173. `lib/auth/context.tsx`로 인증 흐름을 익힌다.
174. `app/layout.tsx`와 `(main)/layout.tsx`로 shell을 본다.
175. `components/ui/*`로 디자인 primitive를 본다.
176. `trips/page.tsx`로 표준 목록/생성 패턴을 본다.
177. `bucket/page.tsx`로 부모-자식 callback 패턴을 본다.
178. `trips/[tripId]/page.tsx`로 복합 페이지 구성을 본다.
179. `TimelineView`로 CRUD/refetch 조율을 본다.
180. `WorldMap`과 `LeafletMap`으로 외부 라이브러리 통합을 본다.

### 154. 추가 개선 과제
181. Trip create form을 별도 `TripForm` 컴포넌트로 분리할 수 있다.
182. BucketForm과 Trip create form의 공통 위치 선택 UI를 추출할 수 있다.
183. 파일 업로드 제한 상수를 공통 파일로 뺄 수 있다.
184. API error 타입을 구조화할 수 있다.
185. React Query를 도입하면 fetch/cache/refetch가 단순해질 수 있다.
186. 지도 detail 요청을 서버에서 한 번에 내려주면 N+1 요청을 줄일 수 있다.
187. accessibility label을 아이콘 버튼에 추가할 수 있다.
188. modal focus trap을 추가할 수 있다.
189. optimistic update rollback 패턴을 추가할 수 있다.
190. form validation library 없이도 공통 validator를 만들 수 있다.
191. Country/Region lookup을 Map으로 memoize할 수 있다.
192. `img` 대신 Next Image를 검토할 수 있다.
193. photo thumbnail endpoint를 만들 수 있다.
194. PWA manifest/service worker를 추가할 수 있다.
195. dark mode 토큰을 확장할 수 있다.

### 155. 마지막 복습: 데이터 흐름 한 문장 요약
196. 로그인하면 AuthProvider가 `/auth/me`로 user를 채운다.
197. 보호 페이지는 `useRequireAuth`로 user 없음을 감지해 `/login`으로 보낸다.
198. 페이지는 `api.get<T>`로 typed data를 가져와 local state에 저장한다.
199. 폼은 controlled input state로 payload를 만들고 mutation API를 호출한다.
200. mutation 후에는 local update 또는 refetch로 화면을 갱신한다.
201. 지도는 서버 status를 색상으로 바꾸고 클릭 시 detail sheet를 연다.
202. 상세 지도는 타임라인 좌표를 Leaflet marker로 바꾼다.
203. 사진 갤러리는 타임라인 사진을 flatten해서 보여준다.
204. 체크리스트는 서버 progressRate와 items를 받아 grouping해서 렌더링한다.
205. 통계는 summary/monthly/top-regions를 병렬로 가져와 카드와 차트로 보여준다.

---

## Part 24. 실전 과제

### 156. 초급 과제
1. `TripCard`에 여행 기간 일수를 표시해 보라.
2. `BucketCard`에 `referenceUrl`이 있으면 “참고 링크” 버튼을 추가해 보라.
3. `EmptyState`의 기본 아이콘 배경색을 `bg-cream-100`으로 바꿔 보라.
4. `StatsPage`의 summary card 순서를 바꿔 보라.
5. LoginPage의 에러 메시지를 `CardContent` 상단으로 이동해 보라.

### 157. 중급 과제
1. 여행 생성 폼을 `components/trips/TripForm.tsx`로 분리해 보라.
2. 국가/국내 지역 선택 UI를 `LocationSelect`로 재사용해 보라.
3. `TimelineForm`의 좌표 validation 실패 시 사용자 에러를 표시해 보라.
4. `MapDetailSheet`에 bucketCount를 모바일에서도 표시해 보라.
5. `PhotoUploader`와 CoverImageSection의 파일 제한 상수를 공통화해 보라.

### 158. 고급 과제
1. HomePage의 region detail N+1 요청을 줄이는 API/프론트 구조를 설계해 보라.
2. React Query 도입 시 어떤 코드가 사라지는지 비교해 보라.
3. 지도 색상 매핑을 `styles/tokens.ts`와 완전히 동기화하는 방법을 설계해 보라.
4. Tabs에 keyboard navigation(ArrowLeft/Right)을 추가해 보라.
5. PhotoGallery modal에 focus trap과 ESC 닫기를 추가해 보라.

---

## 결론
Travel Archive 프론트엔드는 “작지만 완성도 있는 CRUD + 지도 + 통계 앱”의 좋은 학습 예제다. 핵심은 거대한 전역 상태나 복잡한 추상화가 아니라, 타입으로 도메인을 고정하고, API client로 통신을 통일하고, 디자인 토큰으로 UI 일관성을 유지하며, 기능별 컴포넌트를 책임 있게 나누는 것이다.

이 문서를 읽은 뒤에는 다음 흐름을 스스로 설명할 수 있어야 한다.

1. 로그인 상태가 어떻게 전역으로 공유되는가?
2. `/trips`에서 여행을 만들면 왜 `/trips/:id`로 이동하는가?
3. 타임라인 좌표가 어떻게 Leaflet 지도 마커가 되는가?
4. 버킷리스트는 어떤 payload로 여행으로 전환되는가?
5. 통계 페이지는 왜 `Promise.all`을 사용하는가?
6. 디자인 시스템 색상이 Button, Badge, Map, Chart에 어떻게 반영되는가?
7. 파일 업로드가 JSON API client가 아니라 FormData fetch를 쓰는 이유는 무엇인가?

이 질문에 답할 수 있다면, Travel Archive의 프론트엔드 구조를 실무적으로 이해한 것이다.
