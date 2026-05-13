"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";

// 커스텀 훅은 보통 반환 타입을 직접 적지 않아도 되지만,
// 내부에서 사용하는 훅들의 타입 덕분에 사용 시점의 안전성이 유지됩니다.
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  // `useEffect` 의 의존성 배열은 "어떤 값이 바뀌면 다시 실행할지"를 정합니다.
  // 배열 안의 각 항목은 React가 추적하는 값이며, 타입은 각 변수에서 추론됩니다.
  }, [user, loading, router]);

  return { user, loading };
}
