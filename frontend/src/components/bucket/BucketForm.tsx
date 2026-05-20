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
  CardContent,
} from "@/components/ui/card";
import type { TravelScope, Bucket, CreateBucketPayload, BucketStatus } from "@/types/travel";
import { SCOPE_LABEL, COUNTRIES, DOMESTIC_REGIONS } from "@/types/travel";

// 문자열 클래스 조합을 상수로 빼두면 JSX 안이 덜 복잡해집니다.
const selectClass =
  "flex h-touch w-full rounded-lg border border-input bg-background px-4 py-2 text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * BucketFormProps는 새 버킷을 만들 때 부모가 넘겨주는 콜백 props를 정의합니다.
 * onCreated/onCancel 모두 함수 타입이며, TS는 인자와 반환값까지 검사합니다.
 */
interface BucketFormProps {
  // 생성 완료 후 새 Bucket 객체를 부모에게 전달합니다.
  onCreated: (bucket: Bucket) => void;
  // 취소 버튼 클릭 시 호출되는 콜백입니다.
  onCancel: () => void;
}

/**
 * BucketForm은 새 버킷리스트를 입력받아 API로 생성하는 컴포넌트입니다.
 * useState 뒤의 제네릭이나 명시 타입은 "상태 값이 어떤 종류인지"를 TypeScript에 알려줍니다.
 */
export function BucketForm({ onCreated, onCancel }: BucketFormProps) {
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  // useState<TravelScope>(...)처럼 제네릭을 명시하지 않아도, 초기값 "DOMESTIC"으로부터 타입을 추론합니다.
  const [travelScope, setTravelScope] = useState<TravelScope>("DOMESTIC");
  // number | null 은 "숫자일 수도 있고 값이 없으면 null"이라는 뜻의 유니언 타입입니다.
  const [countryId, setCountryId] = useState<string | null>(null);
  const [domesticRegionId, setDomesticRegionId] = useState<string | null>(null);
  const [cityName, setCityName] = useState("");
  const [companion, setCompanion] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  // BucketStatus 타입으로 상태 문자열을 제한해 오타를 방지합니다.
  const [status, setStatus] = useState<BucketStatus>("WANT_TO_GO");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // FormEvent는 React 폼 submit 이벤트 타입입니다. JS에서는 event 객체를 직접 다루지만 TS는 정확한 타입을 붙입니다.
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    setPending(true);
    try {
      // CreateBucketPayload는 서버로 보낼 JSON 본문의 정확한 모양을 정해 둔 타입입니다.
      // 값 뒤의 || undefined 는 빈 문자열을 실제 값 대신 "아예 없음"으로 보내기 위한 패턴입니다.
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
      // api.post<Bucket>(...)의 <Bucket>는 제네릭 타입 인자입니다.
      // "이 요청의 응답 data는 Bucket 타입이다"라고 TS에 알려줍니다.
      const res = await api.post<Bucket>("/buckets", payload);
      onCreated(res.data);
    } catch (err) {
      // instanceof는 TypeScript의 타입 가드처럼 동작해, err가 ApiError일 때만 body를 안전하게 읽게 합니다.
      if (err instanceof ApiError) {
        setError(err.body);
      } else {
        setError("버킷리스트 생성 중 오류가 발생했습니다.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>새 버킷리스트</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bucket-title" className="text-caption font-medium">
              제목
            </label>
            <Input
              id="bucket-title"
              placeholder="어디로 가고 싶으신가요?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={pending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bucket-reason" className="text-caption font-medium">
              가고 싶은 이유 (선택)
            </label>
            <Input
              id="bucket-reason"
              placeholder="간단한 메모를 남겨보세요"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={pending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-caption font-medium">여행 범위</span>
            <div className="flex gap-2">
              {/* as const 는 배열의 문자열을 그냥 string[]로 넓히지 않고, "DOMESTIC" | "INTERNATIONAL" 리터럴로 유지합니다. */}
              {(["DOMESTIC", "INTERNATIONAL"] as const).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => {
                    setTravelScope(scope);
                    setCountryId(null);
                    setDomesticRegionId(null);
                  }}
                  className={`flex-1 rounded-lg border px-4 py-2 text-caption font-medium transition-colors ${
                    travelScope === scope
                      ? "border-coral-500 bg-coral-50 text-coral-600"
                      : "border-border bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {SCOPE_LABEL[scope]}
                </button>
              ))}
            </div>
          </div>

          {travelScope === "DOMESTIC" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bucket-region" className="text-caption font-medium">지역</label>
              {/* null 대신 빈 문자열을 넣어 select의 controlled input 규칙을 맞춥니다. */}
              <select
                id="bucket-region"
                value={domesticRegionId ?? ""}
                onChange={(e) => setDomesticRegionId(e.target.value || null)}
                disabled={pending}
                className={selectClass}
              >
                <option value="">지역을 선택하세요</option>
                {DOMESTIC_REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.nameKo}
                  </option>
                ))}
              </select>
            </div>
          )}

          {travelScope === "INTERNATIONAL" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bucket-country" className="text-caption font-medium">국가</label>
              {/* nullish coalescing으로 null/undefined일 때만 빈 문자열을 사용합니다. */}
              <select
                id="bucket-country"
                value={countryId ?? ""}
                onChange={(e) => setCountryId(e.target.value || null)}
                disabled={pending}
                className={selectClass}
              >
                <option value="">국가를 선택하세요</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.nameKo}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bucket-city" className="text-caption font-medium">
              도시명 (선택)
            </label>
            <Input
              id="bucket-city"
              placeholder="예: 오사카, 부산"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              disabled={pending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bucket-companion" className="text-caption font-medium">
              동행자 (선택)
            </label>
            <Input
              id="bucket-companion"
              placeholder="예: 가족, 친구"
              value={companion}
              onChange={(e) => setCompanion(e.target.value)}
              disabled={pending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bucket-url" className="text-caption font-medium">
              참고 링크 (선택)
            </label>
            <Input
              id="bucket-url"
              type="url"
              placeholder="https://..."
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
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
              {pending ? "생성 중…" : "추가"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
