"use client";

import dynamic from "next/dynamic";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Globe,
  Map as MapIcon,
  AlertCircle,
  Plane,
  Calendar,
  MapPin,
  BarChart3,
} from "lucide-react";
import type { StatsSummary } from "@/types/travel";
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

type MapView = "world" | "domestic";

const STATUS_LEGEND = [
  { color: "bg-teal-500", label: "완료" },
  { color: "bg-coral-500", label: "계획 중" },
  { color: "bg-violet-400", label: "버킷리스트" },
  { color: "bg-gray-300", label: "미방문" },
] as const;

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

export interface HomeOverviewProps {
  worldData: CountryData[];
  domesticData: KoreaRegionData[];
  statsSummary: StatsSummary | null;
  loading: boolean;
  error: string;
  mapView: MapView;
  onMapViewChange: (view: MapView) => void;
  onTripClick: (tripId: number) => void;
  onStatsClick: () => void;
  onNewTripClick: () => void;
  onRetry: () => void;
  headerAction?: React.ReactNode;
}

export function HomeOverview({
  worldData,
  domesticData,
  statsSummary,
  loading,
  error,
  mapView,
  onMapViewChange,
  onTripClick,
  onStatsClick,
  onNewTripClick,
  onRetry,
  headerAction,
}: HomeOverviewProps) {
  const activeData = mapView === "world"
    ? worldData.filter((d) => d.status !== "NONE").length
    : domesticData.filter((d) => d.status !== "NONE").length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Travel Archive"
        description="여행 기록, 버킷리스트, 체크리스트, 지도 회고를 한곳에"
        action={headerAction ?? <Button size="sm" onClick={onNewTripClick}>+ 새 여행</Button>}
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "완료 여행", value: statsSummary?.completedTrips ?? 0, icon: Plane, color: "text-teal-600", bg: "bg-teal-50" },
          { label: "계획 중", value: statsSummary?.plannedTrips ?? 0, icon: Calendar, color: "text-coral-600", bg: "bg-coral-50" },
          { label: "여행 일수", value: statsSummary?.travelDays ?? 0, icon: BarChart3, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "방문 국가/지역", value: (statsSummary?.visitedCountries ?? 0) + (statsSummary?.visitedDomesticRegions ?? 0), icon: MapPin, color: "text-sand-400", bg: "bg-sand-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="cursor-pointer" onClick={onStatsClick}>
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
              onClick={() => onMapViewChange("world")}
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
              onClick={() => onMapViewChange("domestic")}
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
              <Button variant="outline" size="sm" onClick={onRetry}>
                다시 시도
              </Button>
            </CardContent>
          </Card>
        ) : loading ? (
          <MapSkeleton />
        ) : (
          <>
            {mapView === "world" ? (
              <WorldMap data={worldData} onTripClick={onTripClick} />
            ) : (
              <KoreaMap data={domesticData} onTripClick={onTripClick} />
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
