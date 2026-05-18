"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/auth/hooks";
import { api } from "@/lib/api/client";
import { HomeOverview } from "@/components/home/HomeOverview";
import { Button } from "@/components/ui/button";
import type { WorldMapRegion, DomesticMapRegion, MapRegionDetail, StatsSummary } from "@/types/travel";
import type { CountryData } from "@/components/maps/WorldMap";
import type { RegionData as KoreaRegionData } from "@/components/maps/KoreaMap";

type MapView = "world" | "domestic";

export default function DashboardPage() {
  const { loading: authLoading } = useRequireAuth();
  const router = useRouter();

  const [mapView, setMapView] = useState<MapView>("world");
  const [worldData, setWorldData] = useState<CountryData[]>([]);
  const [domesticData, setDomesticData] = useState<KoreaRegionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statsSummary, setStatsSummary] = useState<StatsSummary | null>(null);

  const fetchWorldData = useCallback(async () => {
    try {
      const res = await api.get<WorldMapRegion[]>("/maps/world");

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

      const enriched: CountryData[] = res.data.map((region) => {
        const detail = detailMap.get(region.mapKey);
        return {
          id: region.mapKey || region.countryCode,
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

      setWorldData(enriched);
    } catch {
      setError("세계 지도 데이터를 불러오지 못했습니다.");
    }
  }, []);

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
    if (authLoading) return;
    setLoading(true);
    setError("");

    const fetcher = mapView === "world" ? fetchWorldData : fetchDomesticData;
    fetcher().finally(() => setLoading(false));
  }, [authLoading, mapView, fetchWorldData, fetchDomesticData]);

  useEffect(() => {
    if (authLoading) return;
    api.get<StatsSummary>("/statistics/summary")
      .then((res) => setStatsSummary(res.data))
      .catch(() => {});
  }, [authLoading]);

  if (authLoading) return null;

  function handleTripClick(tripId: number) {
    router.push(`/trips/${tripId}`);
  }

  function handleRetry() {
    setError("");
    setLoading(true);
    const fetcher = mapView === "world" ? fetchWorldData : fetchDomesticData;
    fetcher().finally(() => setLoading(false));
  }

  return (
    <HomeOverview
      worldData={worldData}
      domesticData={domesticData}
      statsSummary={statsSummary}
      loading={loading}
      error={error}
      mapView={mapView}
      onMapViewChange={setMapView}
      onTripClick={handleTripClick}
      onStatsClick={() => router.push("/stats")}
      onNewTripClick={() => router.push("/trips")}
      onRetry={handleRetry}
      headerAction={<Button size="sm" onClick={() => router.push("/trips")}>+ 새 여행</Button>}
    />
  );
}
