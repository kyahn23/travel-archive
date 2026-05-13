/**
 * Next.js의 "type" import는 "타입 전용 임포트"입니다.
 * JavaScript로 컴파일될 때 완전히 제거되며, 런타임에는 아묟 영향을 주지 않습니다.
 * Metadata와 Viewport는 Next.js가 제공하는 "타입 별칭"으로,
 * 메타데이터와 뷰포트 설정 객체의 구조를 TypeScript가 검증하는 데 쓰입니다.
 */
import type { Metadata, Viewport } from "next";
import { Providers } from "@/lib/auth/providers";
import "./globals.css";

/**
 * `export const metadata: Metadata`에서 `: Metadata`는 "이 객체가 Metadata 타입의 구조를 따라야 한다"는 타입 주석입니다.
 * TypeScript는 이 객체에 title, description 같은 필수/선택 속성이 올바르게 들어있는지 컴파일 시점에 확인합니다.
 * JavaScript로 변환되면 `: Metadata` 부분은 사라지고, 순수한 객체 리터럴 `{ title: "...", description: "..." }`만 남습니다.
 */
export const metadata: Metadata = {
  title: "Travel Archive",
  description: "Personal travel archive service",
};

// Viewport 타입 역시 Next.js가 제공하는 타입 별칭입니다.
// 이 객체의 각 속성(width, initialScale 등)이 올바른 타입(문자열, 숫자 등)인지 TypeScript가 검증합니다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FFFDF8",
};

/**
 * RootLayout은 Next.js App Router의 "루트 레이아웃"입니다.
 * 모든 페이지가 이 레이아웃 낶에서 렌더링됩니다.
 *
 * `Readonly<{ children: React.ReactNode }>`는 props 객체의 타입을 정의합니다:
 * - `Readonly<...>`: 이 객체의 속성을 읽기 전용으로 만들어, 실수로 재할당하지 않도록 합니다.
 * - `children: React.ReactNode`: children prop은 React가 렌더링할 수 있는 모든 것(문자열, 숫자, JSX, 배열 등)을 받을 수 있습니다.
 * - `{ children }`: 구조 분해 할당으로 props 객체에서 children을 꺼냅니다.
 *
 * 참고: JavaScript에서는 `Readonly<...>`나 `: React.ReactNode` 같은 문법이 없습니다.
 * 이는 TypeScript가 컴파일 시점에 타입 안정성을 보장하기 위해 사용하는 문법입니다.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
