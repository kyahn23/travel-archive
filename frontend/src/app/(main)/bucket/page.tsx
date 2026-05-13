"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/auth/hooks";
import { api } from "@/lib/api/client";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { BucketCard } from "@/components/bucket/BucketCard";
import { BucketForm } from "@/components/bucket/BucketForm";
import { ConvertTripForm } from "@/components/bucket/ConvertTripForm";
import type { Bucket } from "@/types/travel";
import { Heart, Loader2 } from "lucide-react";

/**
 * 버킷리스트 페이지 컴포넌트입니다.
 *
 * 이 파일에는 TypeScript의 여러 핵심 문법이 들어 있습니다:
 * - `import type { Bucket }` : 실행 코드가 아니라 "타입 정보만" 가져옵니다.
 * - `useState<Bucket[]>([])` : 상태 안에 들어갈 값의 타입을 제네릭으로 지정합니다.
 * - `Bucket | null` : `Bucket`이거나 `null`일 수 있음을 뜻하는 유니온 타입입니다.
 * - `api.get<Bucket[]>('/buckets')` : API 응답 데이터가 `Bucket[]` 배열이라고 알려줍니다.
 */
export default function BucketPage() {
  const { loading: authLoading } = useRequireAuth();
  const router = useRouter();

  // `Bucket[]` : 버킷 객체가 여러 개 들어있는 배열 상태입니다.
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  // `boolean` 상태: 로딩 여부를 true/false로 관리합니다.
  const [loading, setLoading] = useState(true);
  // 문자열 상태: 에러 메시지가 없으면 빈 문자열을 사용합니다.
  const [error, setError] = useState("");
  // 새 버킷 폼을 보여줄지 여부를 관리하는 불리언 상태입니다.
  const [showCreate, setShowCreate] = useState(false);
  // `Bucket | null` : 현재 변환 중인 버킷이 있으면 Bucket, 없으면 null입니다.
  const [convertingBucket, setConvertingBucket] = useState<Bucket | null>(null);

  const fetchBuckets = useCallback(async () => {
    try {
      // `api.get<Bucket[]>` : 서버 응답의 `data`가 `Bucket[]`라고 TypeScript에 알려줍니다.
      const res = await api.get<Bucket[]>("/buckets");
      setBuckets(res.data);
    } catch {
      setError("버킷리스트를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
    // `useCallback`은 이 함수를 메모이제이션해서, 의존성이 같으면
    // 렌더링마다 새 함수가 만들어지지 않도록 합니다.
  }, []);

  useEffect(() => {
    if (!authLoading) fetchBuckets();
  }, [authLoading, fetchBuckets]);

  function handleBucketCreated(bucket: Bucket) {
    // 매개변수 `bucket: Bucket`은 이 함수가 반드시 Bucket 형태의 값을 받는다는 뜻입니다.
    setBuckets((prev) => [bucket, ...prev]);
    setShowCreate(false);
  }

  function handleConvertSuccess(tripId: number) {
    // `tripId: number`는 숫자만 받는다는 타입 주석입니다.
    setConvertingBucket(null);
    router.push(`/trips/${tripId}`);
  }

  if (authLoading) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="버킷리스트"
        description="가고 싶은 곳을 모아보세요"
        action={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            + 새 버킷
          </Button>
        }
      />

      {showCreate && (
        <BucketForm
          onCreated={handleBucketCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {convertingBucket && (
        <ConvertTripForm
          bucket={convertingBucket}
          onSuccess={handleConvertSuccess}
          onCancel={() => setConvertingBucket(null)}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="py-12 text-center text-body text-destructive">{error}</div>
      ) : buckets.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-8 w-8 text-muted-foreground" />}
          title="버킷리스트가 비어 있습니다"
          description="가고 싶은 곳을 추가해보세요"
          action={
            <Button size="sm" onClick={() => setShowCreate(true)}>
              + 새 버킷
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {buckets.map((bucket) => (
            <BucketCard
              key={bucket.id}
              bucket={bucket}
              onConvert={(b) => setConvertingBucket(b)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
