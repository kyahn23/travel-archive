# Travel Archive - Frontend

Next.js 16.2.6 App Router 기반 프론트엔드입니다.

## 사전 준비

- Node.js 18 이상
- 백엔드 서버가 `http://localhost:8080`에서 실행 중이어야 합니다.

## 설치

```bash
npm install
```

## 개발 서버 실행

```bash
npm run dev
```

기본적으로 `http://localhost:3000`에서 실행됩니다.

API 요청은 Next.js 리라이트를 통해 백엔드로 프록시됩니다.

## 빌드

```bash
npm run build
```

빌드는 `next.config.mjs`를 직접 사용합니다. 별도 config 변환이나 복원 절차가 필요하지 않습니다.

## 기술 스택

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 14.2.35 | React 프레임워크 (App Router) |
| React | 18.3.1 | UI 라이브러리 |
| TypeScript | 5.7.2 | 정적 타입 |
| Tailwind CSS | 3.4.17 | 유틸리티 CSS |
| Leaflet | 1.9.4 | 지도 (타임라인 마커) |
| react-leaflet | 5.0.0 | Leaflet React 래퍼 (React 19 지원) |
| @vnedyalk0v/react19-simple-maps | 2.0.7 | SVG 세계/국내 지도 (React 19 호환) |
| Recharts | 3.8.1 | 통계 차트 |
| Lucide React | 1.14.0 | 아이콘 |

## 프로젝트 구조

```
src/
├── app/               # App Router 페이지
│   ├── (auth)/        # 인증 관련 페이지 (로그인, 회원가입)
│   ├── (main)/        # 메인 레이아웃 페이지 (로그인 필요)
│   │   ├── dashboard/page.tsx  # 대시보드 (지도 + 통계 요약)
│   │   ├── trips/     # 여행 목록 및 상세
│   │   ├── bucket/    # 버킷리스트
│   │   ├── stats/     # 통계 대시보드
│   │   └── profile/   # 프로필
│   ├── page.tsx       # 공개 홈 (비로그인 미리보기)
│   ├── layout.tsx     # 루트 레이아웃
│   └── globals.css    # 전역 스타일
├── components/        # 재사용 UI 컴포넌트
│   ├── ui/            # 기본 UI (Button, Input, Card, ...)
│   ├── home/          # 홈 공통 컴포넌트 (HomeOverview 등)
│   ├── maps/          # 지도 컴포넌트
│   ├── checklist/     # 체크리스트 컴포넌트
│   ├── timeline/      # 타임라인 컴포넌트
│   └── photos/        # 사진 컴포넌트
├── lib/               # 유틸리티
│   ├── api/client.ts  # API 클라이언트
│   ├── auth/          # 인증 관련 (context, hooks)
│   ├── geo/           # 지도 GeoJSON 데이터 (직접 임포트용)
│   ├── home/          # 홈 데모 데이터
│   └── utils.ts       # 공통 유틸
├── types/
│   └── travel.ts      # 공통 타입 정의
└── public/            # 정적 파일
```

## 중요 참고 사항

### 라우팅 변경 (2026-05-18)

- `/`는 이제 **비로그인 공개 홈**입니다. 샘플 데이터 기반 미리보기와 가입/로그인 유도 CTA를 제공합니다.
- `/dashboard`는 **로그인 후 홈 대시보드**입니다. 실제 사용자 API 데이터를 표시합니다.
- 로그인/회원가입 성공 후 이동 경로는 `/dashboard`입니다.
- `AuthProvider`의 초기 `/auth/me` 요청은 401 응답 시 자동으로 `/login`으로 리다이렉트하지 않습니다.

### 지도 컴포넌트

지도 관련 컴포넌트는 브라우저 API(`window`, `document`, Leaflet DOM)에 의존하므로 반드시 `ssr: false`로 동적 임포트해야 합니다.

```tsx
import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("@/components/maps/LeafletMap"), {
  ssr: false,
});
```

### `@vnedyalk0v/react19-simple-maps` GeoJSON 로딩

`@vnedyalk0v/react19-simple-maps`는 납치 내 보안 정책으로 인해 `localhost` 환경에서 상대경로 GeoJSON URL(`/geo/...`)을 fetch할 수 없습니다. 이를 해결하기 위해 컴포넌트에서 GeoJSON 파일을 직접 import하여 객체로 전달합니다.

```tsx
import koreaGeo from "@/lib/geo/korea-sido.json";

<Geographies geography={koreaGeo}>
  {({ geographies }) =>
    geographies.map((geo) => (
      <Geography key={geo.rsmKey} geography={geo} />
    ))
  }
</Geographies>
```

> **참고**: Next.js App Router에서는 `public/` 파일을 직접 import할 수 없으므로, `public/geo/`에 있는 파일을 `src/lib/geo/`로 복사하여 사용합니다.

### 지도 데이터 출처

- **세계 지도**: `world-110m.json` — Natural Earth 1:110m Admin-0 데이터 (Topology)
- **국내 지도**: `korea-sido.json` — KOSTAT 2018 행정구역 경계 데이터 (17개 시/도, Topology)
  - 출처: [southkorea/southkorea-maps](https://github.com/southkorea/southkorea-maps)

### Lucide React `Map` 아이콘

`Map` 아이콘은 JavaScript 전역 `Map` 생성자를 가립니다. 반드시 별칭으로 임포트하세요.

```tsx
import { Map as MapIcon } from "lucide-react";
```

## API 프록시 설정

`next.config.mjs`의 `rewrites` 설정을 통해 `/api/*` 요청이 백엔드로 전달됩니다.

```js
{
  source: "/api/:path*",
  destination: "http://localhost:8080/api/:path*",
}
```

`NEXT_PUBLIC_API_BASE_URL` 환경 변수로 백엔드 주소를 변경할 수 있습니다.
