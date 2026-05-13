"use client";

import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";

/**
 * 메인 레이아웃 컴포넌트입니다.
 *
 * `children`은 React가 자동으로 넘겨주는 특수한 props로,
 * 이 레이아웃 안에 들어오는 모든 페이지 내용을 뜻합니다.
 * TypeScript에서는 `React.ReactNode`로 "렌더링 가능한 모든 값"이라는
 * 의미를 명시해서, 문자열/JSX/배열/null 같은 값도 안전하게 받습니다.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="min-h-screen pb-20 md:pb-0 md:pl-60">
        <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
          {children}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
