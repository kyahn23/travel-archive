"use client";

import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import type { Bucket } from "@/types/travel";

/**
 * ConvertTripFormProps는 "버킷을 여행으로 전환"할 때 필요한 props 구조입니다.
 * onSuccess는 생성된 tripId를 받아 부모에게 알려주고, onCancel은 닫기 동작을 담당합니다.
 */
interface ConvertTripFormProps {
  // 전환 대상 버킷 데이터입니다.
  bucket: Bucket;
  // 성공 시 서버가 만든 여행 id를 넘겨줍니다.
  onSuccess: (tripId: number) => void;
  // 취소 버튼 클릭 시 호출됩니다.
  onCancel: () => void;
}

/**
 * ConvertTripForm은 버킷을 실제 여행으로 바꾸기 위해 출발일/도착일을 입력받는 컴포넌트입니다.
 * 구조 분해된 props와 useState의 타입 추론/명시를 함께 볼 수 있는 TypeScript 예시입니다.
 */
export function ConvertTripForm({ bucket, onSuccess, onCancel }: ConvertTripFormProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // FormEvent는 폼 제출 이벤트의 정확한 타입입니다.
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!startDate || !endDate) {
      setError("출발일과 도착일을 입력해주세요.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError("도착일은 출발일 이후여야 합니다.");
      return;
    }

    setPending(true);
    try {
      // api.post<{ id: number }>에서 중괄호 타입은 "응답 data가 id:number 형태"임을 뜻하는 인라인 타입입니다.
      const res = await api.post<{ id: number }>(
        `/buckets/${bucket.id}/convert-to-trip`,
        { startDate, endDate },
      );
      onSuccess(res.data.id);
    } catch (err) {
      // instanceof로 ApiError인지 확인한 뒤에만 err.body를 읽는 타입 가드 패턴입니다.
      if (err instanceof ApiError) {
        setError(err.body);
      } else {
        setError("전환 중 오류가 발생했습니다.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>여행으로 전환</CardTitle>
        <CardDescription>
          「{bucket.title}」을(를) 새 여행으로 만듭니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="conv-start" className="text-caption font-medium">
              출발일
            </label>
            <Input
              id="conv-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={pending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="conv-end" className="text-caption font-medium">
              도착일
            </label>
            <Input
              id="conv-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={pending}
            />
          </div>

          {error && (
            <p className="text-caption text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
              취소
            </Button>
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "전환 중…" : "여행 만들기"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
