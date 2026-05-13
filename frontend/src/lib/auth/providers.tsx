"use client";

import { AuthProvider } from "@/lib/auth/context";
import type { ReactNode } from "react";

// `import type` 는 ReactNode 타입 정보만 가져오고,
// 실제 실행 코드에는 포함하지 않습니다.
// Providers 는 여러 전역 Provider 를 감싸는 패턴의 시작점입니다.
export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
