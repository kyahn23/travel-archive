"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/auth/hooks";
import { api, ApiError } from "@/lib/api/client";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { TripCard } from "@/components/trips/TripCard";
import type { Trip, TripStatus, TravelScope, CreateTripPayload } from "@/types/travel";
import { SCOPE_LABEL, COUNTRIES, DOMESTIC_REGIONS } from "@/types/travel";
import { Map } from "lucide-react";

type FilterStatus = TripStatus | "ALL";

/**
 * 필터 탭에서 사용할 상태 문자열을 union type으로 묶습니다.
 * JavaScript에서는 임의의 문자열도 들어갈 수 있지만, TypeScript는 여기서 허용된 값만 받게 해서
 * 잘못된 필터 키를 쓰는 실수를 막아줍니다.
 */

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "PLANNED", label: "계획 중" },
  { value: "COMPLETED", label: "완료" },
  { value: "CANCELLED", label: "취소" },
];

const selectClass =
  "flex h-touch w-full rounded-lg border border-input bg-background px-4 py-2 text-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export default function TripsPage() {
  const { loading: authLoading } = useRequireAuth();
  const router = useRouter();

  // useState<Trip[]>는 trips 배열의 각 원소가 Trip 타입임을 보장합니다.
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // ALL은 "모든 상태"를 뜻하는 화면 전용 값이라서 실제 TripStatus와 합집합으로 표현합니다.
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [travelScope, setTravelScope] = useState<TravelScope>("DOMESTIC");
  const [countryId, setCountryId] = useState<string | null>(null);
  const [domesticRegionId, setDomesticRegionId] = useState<string | null>(null);
  const [cityName, setCityName] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  /**
   * 여행 목록을 불러오는 비동기 함수입니다.
   * useCallback을 쓰면 effect 의존성에 넣었을 때 불필요하게 새 함수로 인식되는 일을 줄일 수 있습니다.
   */
  const fetchTrips = useCallback(async () => {
    try {
      // api.get<Trip[]>는 응답 본문이 Trip 배열이라는 뜻입니다.
      const res = await api.get<Trip[]>("/trips");
      setTrips(res.data);
    } catch {
      setError("여행 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) fetchTrips();
  }, [authLoading, fetchTrips]);

  // filter가 ALL이면 전체를 그대로 쓰고, 아니면 .filter()로 상태가 같은 것만 남깁니다.
  const filtered = filter === "ALL" ? trips : trips.filter((t) => t.status === filter);

  /**
   * 폼 제출 이벤트의 타입을 React.FormEvent로 명시합니다.
   * 이렇게 해야 e.preventDefault() 같은 폼 이벤트 메서드를 안전하게 사용할 수 있습니다.
   */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");

    if (!title.trim()) { setCreateError("제목을 입력해주세요."); return; }
    if (!startDate || !endDate) { setCreateError("날짜를 입력해주세요."); return; }
    if (new Date(endDate) < new Date(startDate)) { setCreateError("도착일은 출발일 이후여야 합니다."); return; }
    if (!cityName.trim()) { setCreateError("도시명을 입력해주세요."); return; }
    if (travelScope === "DOMESTIC" && !domesticRegionId) {
      setCreateError("국내 여행은 지역을 선택해주세요."); return;
    }
    if (travelScope === "INTERNATIONAL" && !countryId) {
      setCreateError("해외 여행은 국가를 선택해주세요."); return;
    }

    setCreating(true);
    try {
      // CreateTripPayload는 서버로 보낼 요청 바디의 모양을 정확히 정의합니다.
      // TypeScript가 이 객체의 필드를 검사해, 빠진 값이나 잘못된 타입을 미리 잡아줍니다.
      const payload: CreateTripPayload = {
        title: title.trim(),
        startDate,
        endDate,
        travelScope,
        countryId: travelScope === "INTERNATIONAL" ? countryId : null,
        domesticRegionId: travelScope === "DOMESTIC" ? domesticRegionId : null,
        cityName: cityName.trim() || undefined,
      };
      const res = await api.post<Trip>("/trips", payload);
      setShowCreate(false);
      setTitle("");
      setStartDate("");
      setEndDate("");
      setCityName("");
      setCountryId(null);
      setDomesticRegionId(null);
      router.push(`/trips/${res.data.id}`);
    } catch (err) {
      // instanceof로 에러 타입을 좁히는 타입 narrowing입니다.
      // JavaScript의 런타임 분기처럼 보이지만, TS는 여기서 err의 정체를 더 좁혀서 이해합니다.
      if (err instanceof ApiError) setCreateError(err.body);
      else setCreateError("여행 생성 중 오류가 발생했습니다.");
    } finally {
      setCreating(false);
    }
  }

  if (authLoading) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="여행 기록"
        description="나의 모든 여행을 한곳에서"
        action={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            + 새 여행
          </Button>
        }
      />

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>새 여행 만들기</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="trip-title" className="text-caption font-medium">제목</label>
                <Input
                  id="trip-title"
                  placeholder="여행 제목"
                  value={title}
                  // onChange의 이벤트 객체는 컴포넌트 prop 타입에 의해 좁혀집니다.
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={creating}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="trip-start" className="text-caption font-medium">출발일</label>
                  <Input
                    id="trip-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={creating}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="trip-end" className="text-caption font-medium">도착일</label>
                  <Input
                    id="trip-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={creating}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-caption font-medium">여행 범위</span>
                <div className="flex gap-2">
                  {/* as const는 배열의 각 원소를 그냥 string이 아니라 정확한 리터럴 타입으로 유지합니다. */}
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
                  <label htmlFor="trip-region" className="text-caption font-medium">지역</label>
                  <select
                    id="trip-region"
                    value={domesticRegionId ?? ""}
                    onChange={(e) => setDomesticRegionId(e.target.value || null)}
                    disabled={creating}
                    className={selectClass}
                  >
                    <option value="">지역을 선택하세요</option>
                    {/* 배열 원소 r은 DOMESTIC_REGIONS의 타입 추론을 그대로 이어받습니다. */}
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
                  <label htmlFor="trip-country" className="text-caption font-medium">국가</label>
                  <select
                    id="trip-country"
                    value={countryId ?? ""}
                    onChange={(e) => setCountryId(e.target.value || null)}
                    disabled={creating}
                    className={selectClass}
                  >
                    <option value="">국가를 선택하세요</option>
                    {/* 마찬가지로 c는 COUNTRIES 배열의 원소 타입으로 자동 추론됩니다. */}
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.nameKo}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="trip-city" className="text-caption font-medium">도시명 (선택)</label>
                <Input
                  id="trip-city"
                  placeholder="예: 오사카, 부산"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  disabled={creating}
                />
              </div>

              {createError && (
                <p className="text-caption text-destructive" role="alert">{createError}</p>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>
                  취소
                </Button>
                <Button type="submit" className="flex-1" disabled={creating}>
                  {creating ? "생성 중…" : "만들기"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-caption font-medium transition-colors ${
              filter === opt.value
                ? "bg-coral-500 text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <Badge variant="soft">{filtered.length}</Badge>
      </div>

      {loading ? (
        <div className="py-12 text-center text-body text-muted-foreground">
          불러오는 중…
        </div>
      ) : error ? (
        <div className="py-12 text-center text-body text-destructive">{error}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Map className="h-8 w-8 text-muted-foreground" />}
          title="여행 기록이 없습니다"
          description="첫 여행을 기록해보세요"
          action={
            <Button size="sm" onClick={() => setShowCreate(true)}>
              + 새 여행
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
