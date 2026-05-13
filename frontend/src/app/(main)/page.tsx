"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useRequireAuth } from "@/lib/auth/hooks";
import { api } from "@/lib/api/client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Globe, Map as MapIcon, AlertCircle, Plane, Calendar, MapPin, BarChart3 } from "lucide-react";
import type { WorldMapRegion, DomesticMapRegion, MapRegionDetail, StatsSummary } from "@/types/travel";
import type { CountryData } from "@/components/maps/WorldMap";
import type { RegionData as KoreaRegionData } from "@/components/maps/KoreaMap";

const WorldMap = dynamic(
  () => import("@/components/maps/WorldMap").then((mod) => ({ default: mod.WorldMap })),
  { ssr: false, loading: () => <MapSkeleton /> }
);

const KoreaMap = dynamic(
  () => import("@/components/maps/KoreaMap").then((mod) => ({ default: mod.KoreaMap })),
  { ssr: false, loading: () => <MapSkeleton /> }
);

/**
 * 화면에서 보여줄 지도 종류를 문자열 리터럴 합집합(union type)으로 제한합니다.
 * JavaScript에서는 그냥 "world" / "domestic" 같은 값이 들어갈 수 있지만,
 * TypeScript는 여기서 가능한 값만 허용해서 오타나 잘못된 분기를 컴파일 단계에서 막습니다.
 */
type MapView = "world" | "domestic";

const STATUS_LEGEND = [
  { color: "bg-teal-500", label: "완료" },
  { color: "bg-coral-500", label: "계획 중" },
  { color: "bg-violet-400", label: "버킷리스트" },
  { color: "bg-gray-300", label: "미방문" },
] as const;

/**
 * 지도 컴포넌트가 동적으로 로딩되는 동안 보여주는 임시 UI입니다.
 * Next.js의 dynamic()은 지도처럼 브라우저 API에 의존하는 컴포넌트를
 * 클라이언트에서만 불러오게 만들 때 자주 사용합니다.
 */
function MapSkeleton() {
  return (
    <div className="flex items-center justify-center rounded-xl border bg-card" style={{ minHeight: "400px" }}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-caption text-muted-foreground">지도를 불러오는 중...</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { loading: authLoading } = useRequireAuth();
  const router = useRouter();

  // useState<MapView>(...)처럼 제네릭 타입을 명시해서 mapView가 world/domestic만 갖도록 고정합니다.
  const [mapView, setMapView] = useState<MapView>("world");
  // 배열 안의 원소 타입을 명시해, 나중에 .map()/.filter()를 쓸 때 각 항목의 구조를 TypeScript가 정확히 추적합니다.
  const [worldData, setWorldData] = useState<CountryData[]>([]);
  // 국내 지도 데이터도 같은 방식으로, "배열의 각 원소가 어떤 객체인지"를 컴파일러에게 알려줍니다.
  const [domesticData, setDomesticData] = useState<KoreaRegionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // null을 허용하는 이유: 아직 통계 응답을 못 받았거나 로딩 전에는 값이 없을 수 있기 때문입니다.
  const [statsSummary, setStatsSummary] = useState<StatsSummary | null>(null);

  /**
   * 세계 지도 데이터를 불러오는 비동기 함수입니다.
   * useCallback으로 감싸는 이유는 렌더링마다 함수 참조가 바뀌지 않게 해서,
   * useEffect 의존성 배열에서 불필요한 재실행을 줄이기 위함입니다.
   */
  const fetchWorldData = useCallback(async () => {
    try {
      // api.get<WorldMapRegion[]>는 응답 데이터 배열의 원소 타입을 명시합니다.
      // 이렇게 해야 res.data의 각 원소에 status, mapKey 같은 프로퍼티가 있다는 것을 TS가 압니다.
      const res = await api.get<WorldMapRegion[]>("/maps/world");

      // filter()로 NONE 상태를 제외한 뒤 map()으로 비동기 요청 배열을 만드는 전형적인 타입 추론 패턴입니다.
      const detailPromises = res.data
        .filter((r) => r.status !== "NONE")
        .map(async (region) => {
          try {
            const detail = await api.get<MapRegionDetail>(`/maps/regions/${region.mapKey}`);
            return { mapKey: region.mapKey, detail: detail.data };
          } catch {
            return null;
          }
        });

      // Promise.all은 배열 안의 Promise들을 한 번에 기다리고, 결과도 같은 순서의 배열로 돌려줍니다.
      // 여기서는 detailPromises의 배열 타입이 유지되기 때문에 details도 해당 결과 타입 배열로 추론됩니다.
      const details = await Promise.all(detailPromises);
      // Map<string, MapRegionDetail>은 키와 값 타입을 각각 고정합니다.
      // JavaScript의 Map과 비슷하지만, TypeScript에서는 key/value의 자료형까지 엄격하게 관리합니다.
      const detailMap = new Map<string, MapRegionDetail>();
      for (const d of details) {
        if (d !== null) detailMap.set(d.mapKey, d.detail);
      }

      // res.data.map(...)에서 region의 타입은 WorldMapRegion으로 자동 추론됩니다.
      // 그래서 region.mapKey, region.countryCode 같은 속성을 안전하게 사용할 수 있습니다.
      const enriched: CountryData[] = res.data.map((region) => {
        const detail = detailMap.get(region.mapKey);
        return {
          id: region.mapKey || region.countryCode,
          name: region.nameKo,
          status: region.status,
          // optional chaining(?.)은 detail이 null/undefined일 수 있을 때 안전하게 접근하게 해주고,
          // nullish coalescing(??)은 값이 없을 때만 0으로 기본값을 줍니다.
          tripCount: detail?.completedCount ?? 0,
          bucketCount: detail?.bucketCount ?? 0,
          // detail?.trips?.slice(...).map(...)는 배열이 있을 때만 이어서 호출합니다.
          // 중간 값이 없으면 undefined가 되어 런타임 에러를 피합니다.
          recentTrips: detail?.trips?.slice(0, 5).map((t) => ({
            id: t.id,
            title: t.title,
            startDate: t.startDate,
            endDate: t.endDate,
          })),
        };
      });

      setWorldData(enriched);
    } catch {
      setError("세계 지도 데이터를 불러오지 못했습니다.");
    }
  }, []);

  /**
   * 국내 지도 데이터를 불러오는 함수입니다.
   * 세계 지도와 거의 같은 구조지만, 타입만 DomesticMapRegion / KoreaRegionData로 바뀝니다.
   */
  const fetchDomesticData = useCallback(async () => {
    try {
      const res = await api.get<DomesticMapRegion[]>("/maps/domestic");

      const detailPromises = res.data
        .filter((r) => r.status !== "NONE")
        .map(async (region) => {
          try {
            const detail = await api.get<MapRegionDetail>(`/maps/regions/${region.mapKey}`);
            return { mapKey: region.mapKey, detail: detail.data };
          } catch {
            return null;
          }
        });

      const details = await Promise.all(detailPromises);
      const detailMap = new Map<string, MapRegionDetail>();
      for (const d of details) {
        if (d !== null) detailMap.set(d.mapKey, d.detail);
      }

      const enriched: KoreaRegionData[] = res.data.map((region) => {
        const detail = detailMap.get(region.mapKey);
        return {
          code: region.mapKey || region.regionCode,
          name: region.nameKo,
          status: region.status,
          tripCount: detail?.completedCount ?? 0,
          bucketCount: detail?.bucketCount ?? 0,
          recentTrips: detail?.trips?.slice(0, 5).map((t) => ({
            id: t.id,
            title: t.title,
            startDate: t.startDate,
            endDate: t.endDate,
          })),
        };
      });

      setDomesticData(enriched);
    } catch {
      setError("국내 지도 데이터를 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    // authLoading이 끝나기 전에는 인증 상태가 확정되지 않았으므로 바로 데이터 요청을 하지 않습니다.
    if (authLoading) return;
    setLoading(true);
    setError("");

    // mapView가 union type이라서 world/domestic 두 경우만 존재합니다.
    const fetcher = mapView === "world" ? fetchWorldData : fetchDomesticData;
    fetcher().finally(() => setLoading(false));
  }, [authLoading, mapView, fetchWorldData, fetchDomesticData]);

  useEffect(() => {
    if (authLoading) return;
    // 통계 API 응답도 제네릭으로 타입을 지정해, res.data의 구조를 명확히 합니다.
    api.get<StatsSummary>("/statistics/summary")
      .then((res) => setStatsSummary(res.data))
      .catch(() => {});
  }, [authLoading]);

  if (authLoading) return null;

  /**
   * 지도에서 여행을 클릭했을 때 상세 페이지로 이동합니다.
   * tripId: number처럼 타입을 붙여서 문자열이 들어오는 실수를 막습니다.
   */
  function handleTripClick(tripId: number) {
    router.push(`/trips/${tripId}`);
  }

  // 조건부 분기 결과가 숫자라는 점을 TS가 추론하지만, 여기서는 두 배열의 공통 형태를 사용합니다.
  const activeData = mapView === "world"
    ? worldData.filter((d) => d.status !== "NONE").length
    : domesticData.filter((d) => d.status !== "NONE").length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Travel Archive"
        description="여행 기록, 버킷리스트, 체크리스트, 지도 회고를 한곳에"
        action={
          <Button size="sm" onClick={() => router.push("/trips")}>+ 새 여행</Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "완료 여행", value: statsSummary?.completedTrips ?? 0, icon: Plane, color: "text-teal-600", bg: "bg-teal-50" },
          { label: "계획 중", value: statsSummary?.plannedTrips ?? 0, icon: Calendar, color: "text-coral-600", bg: "bg-coral-50" },
          { label: "여행 일수", value: statsSummary?.travelDays ?? 0, icon: BarChart3, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "방문 국가/지역", value: (statsSummary?.visitedCountries ?? 0) + (statsSummary?.visitedDomesticRegions ?? 0), icon: MapPin, color: "text-sand-400", bg: "bg-sand-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="cursor-pointer" onClick={() => router.push("/stats")}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-4.5 w-4.5 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-micro text-muted-foreground">{label}</p>
                <p className="text-title font-bold tracking-tight">{value.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-title font-semibold">여행 지도</h2>
            {!loading && !error && (
              <Badge variant="tealSoft">{activeData}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <button
              className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-caption font-medium transition-all ${
                mapView === "world"
                  ? "bg-background text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMapView("world")}
            >
              <Globe className="h-3.5 w-3.5" />
              세계 지도
            </button>
            <button
              className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-caption font-medium transition-all ${
                mapView === "domestic"
                  ? "bg-background text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMapView("domestic")}
            >
              <MapIcon className="h-3.5 w-3.5" />
              국내 지도
            </button>
          </div>
        </div>

        {error ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-body text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => {
                setError("");
                setLoading(true);
                const fetcher = mapView === "world" ? fetchWorldData : fetchDomesticData;
                fetcher().finally(() => setLoading(false));
              }}>
                다시 시도
              </Button>
            </CardContent>
          </Card>
        ) : loading ? (
          <MapSkeleton />
        ) : (
          <>
            {mapView === "world" ? (
              <WorldMap data={worldData} onTripClick={handleTripClick} />
            ) : (
              <KoreaMap data={domesticData} onTripClick={handleTripClick} />
            )}
            <div className="flex items-center justify-center gap-4">
              {STATUS_LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="text-micro text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
