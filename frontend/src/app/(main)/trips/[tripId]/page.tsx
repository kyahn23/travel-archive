"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useRequireAuth } from "@/lib/auth/hooks";
import { api } from "@/lib/api/client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TripDetail } from "@/components/trips/TripDetail";
import { ChecklistView } from "@/components/checklist/ChecklistView";
import { TimelineView } from "@/components/timeline/TimelineView";
import { PhotoGallery } from "@/components/photos/PhotoGallery";
import type { Trip, TripStatus } from "@/types/travel";
import type { DayGroup } from "@/components/timeline/TimelineItem";
import type { MarkerData } from "@/components/maps/MapMarker";
import { COUNTRIES, DOMESTIC_REGIONS } from "@/types/travel";
import { ArrowLeft, Loader2, MapPin, Camera } from "lucide-react";

const LeafletMap = dynamic(
  () => import("@/components/maps/LeafletMap").then((mod) => ({ default: mod.LeafletMap })),
  { ssr: false, loading: () => <MapTabSkeleton /> }
);

/**
 * 여행 상태별로 보여줄 전환 버튼을 미리 정의합니다.
 * Record<TripStatus, ...>는 TripStatus의 모든 값을 반드시 키로 가져야 한다는 뜻이라서,
 * 상태가 추가되면 컴파일 단계에서 누락을 잡아줍니다.
 */
const STATUS_TRANSITIONS: Record<TripStatus, { label: string; target: TripStatus }[]> = {
  PLANNED: [
    { label: "완료로 변경", target: "COMPLETED" },
    { label: "취소", target: "CANCELLED" },
  ],
  COMPLETED: [],
  CANCELLED: [
    { label: "계획 중으로 복구", target: "PLANNED" },
  ],
};

/**
 * 지도 탭에서 Leaflet 지도가 로딩되기 전에 보여주는 스켈레톤입니다.
 */
function MapTabSkeleton() {
  return (
    <div className="flex items-center justify-center rounded-xl border bg-card" style={{ minHeight: "300px" }}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-caption text-muted-foreground">지도를 불러오는 중...</p>
      </div>
    </div>
  );
}

/**
 * 여행 지도 탭 전용 뷰입니다.
 * 매개변수 객체 전체의 타입을 inline으로 적어서, tripId와 travelScope가 어떤 자료형인지 명확히 합니다.
 */
function TripMapView({ tripId, travelScope }: { tripId: number; travelScope: string }) {
  // useState<DayGroup[]>는 타임라인 그룹 배열의 각 원소 구조를 TS가 알 수 있게 해줍니다.
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchTimeline() {
      try {
        // 응답이 DayGroup[]임을 명시하면 group.items 같은 중첩 접근도 안전해집니다.
        const res = await api.get<DayGroup[]>(`/trips/${tripId}/timeline`);
        setGroups(res.data);
      } catch {
        setError("타임라인을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }
    fetchTimeline();
  }, [tripId]);

  // useMemo의 결과를 MarkerData[]로 명시해, LeafletMap으로 넘길 마커 배열의 구조를 보장합니다.
  const markers: MarkerData[] = useMemo(() => {
    // result도 MarkerData[]로 시작해서 push되는 객체의 모양이 정확히 맞는지 확인받습니다.
    const result: MarkerData[] = [];
    for (const group of groups) {
      for (const item of group.items) {
        // null 체크를 통해 위도/경도가 실제 숫자인 경우에만 마커를 만듭니다.
        if (item.latitude != null && item.longitude != null) {
          result.push({
            id: item.id,
            title: item.title,
            placeName: item.placeName,
            visitedAt: item.visitedAt,
            latitude: item.latitude,
            longitude: item.longitude,
            status: "COMPLETED" as const,
          });
        }
      }
    }
    return result;
  }, [groups]);

  // [number, number]는 튜플 타입입니다. 배열이지만 길이와 각 자리의 타입까지 고정합니다.
  const center: [number, number] = useMemo(() => {
    if (markers.length > 0) {
      return [markers[0].latitude, markers[0].longitude];
    }
    return travelScope === "DOMESTIC" ? [36.5, 127.5] : [20, 0];
  }, [markers, travelScope]);

  if (loading) return <MapTabSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-8">
        <p className="text-body text-destructive">{error}</p>
      </div>
    );
  }

  if (markers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-8">
        <MapPin className="h-8 w-8 text-muted-foreground" />
        <p className="text-body text-muted-foreground">타임라인에 위치 정보가 없습니다.</p>
        <p className="text-caption text-muted-foreground">타임라인에 장소를 추가하면 지도에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border" style={{ height: "450px" }}>
      <LeafletMap markers={markers} center={center} zoom={12} />
    </div>
  );
}

const MAX_COVER_SIZE = 5 * 1024 * 1024;
const COVER_ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/**
 * 대표 이미지를 업로드하는 섹션입니다.
 * onCoverUploaded: () => void 는 "인자를 받지 않고, 반환값도 사용하지 않는 함수"라는 뜻입니다.
 */
function CoverImageSection({ tripId, coverPhotoId, onCoverUploaded }: { tripId: number; coverPhotoId: number | null; onCoverUploaded: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  /**
   * 파일 input의 change 이벤트 타입을 React.ChangeEvent<HTMLInputElement>로 명시합니다.
   * 이렇게 해야 e.target.files 접근이 타입상 허용되고, input 요소 전용 이벤트라는 점도 분명해집니다.
   */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!COVER_ACCEPTED.includes(f.type)) {
      setError("JPEG, PNG, WebP 형식만 가능합니다.");
      return;
    }
    if (f.size > MAX_COVER_SIZE) {
      setError("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", f);

    try {
      const res = await fetch(`/api/trips/${tripId}/cover-image`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "업로드 실패");
        throw new Error(text);
      }
      onCoverUploaded();
    } catch (err) {
      // instanceof Error로 분기해 문자열/unknown 에러를 안전하게 처리합니다.
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl bg-card border overflow-hidden mb-4">
      {coverPhotoId ? (
        <div className="relative group">
          <img
            src={`/api/files/${coverPhotoId}`}
            alt="대표 이미지"
            className="w-full h-48 object-cover"
          />
          <label className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors cursor-pointer">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1 text-white">
              <Camera className="h-6 w-6" />
              <span className="text-caption font-medium">대표 이미지 변경</span>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 p-8 hover:bg-cream-50 transition-colors border-2 border-dashed border-border rounded-xl m-3">
          {uploading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          ) : (
            <Camera className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="text-body text-muted-foreground">
            {uploading ? "업로드 중..." : "대표 이미지 추가"}
          </span>
          <span className="text-caption text-muted-foreground">JPEG, PNG, WebP (최대 5MB)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUpload}
            className="hidden"
          />
        </label>
      )}
      {error && (
        <p className="text-caption text-destructive px-4 pb-3">{error}</p>
      )}
    </div>
  );
}

export default function TripDetailPage() {
  const { loading: authLoading } = useRequireAuth();
  const router = useRouter();
  const params = useParams();
  if (!params) return null;
  // URL 파라미터는 문자열/문자열 배열 등으로 들어올 수 있어 Number()로 숫자화합니다.
  // 위에서 null 가드를 했기 때문에 이제 params는 존재한다고 보고 직접 읽을 수 있습니다.
  const tripId = Number(params.tripId);

  // Trip | null은 아직 데이터가 없을 수 있다는 상태를 표현합니다.
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  /**
   * 단일 여행 상세를 불러오는 함수입니다.
   * useCallback의 의존성에 tripId를 넣어, ID가 바뀌면 올바르게 다시 가져오게 합니다.
   */
  const fetchTrip = useCallback(async () => {
    try {
      // api.get<Trip>은 응답 데이터가 Trip 단일 객체라는 것을 선언합니다.
      const res = await api.get<Trip>(`/trips/${tripId}`);
      setTrip(res.data);
    } catch {
      setError("여행 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (!authLoading && !isNaN(tripId)) fetchTrip();
  }, [authLoading, tripId, fetchTrip]);

  /**
   * 여행 상태를 서버에 반영하는 비동기 함수입니다.
   * target: TripStatus처럼 타입을 붙이면 잘못된 상태 문자열을 전달하는 실수를 막습니다.
   */
  async function handleStatusChange(target: TripStatus) {
    if (!trip) return;
    setUpdating(true);
    try {
      await api.patch(`/trips/${trip.id}/status`, { status: target });
      setTrip({ ...trip, status: target });
    } catch {
      setError("상태 변경에 실패했습니다.");
    } finally {
      setUpdating(false);
    }
  }

  if (authLoading) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-body text-destructive">{error || "여행을 찾을 수 없습니다."}</p>
        <Button variant="outline" onClick={() => router.push("/trips")}>
          여행 목록으로
        </Button>
      </div>
    );
  }

  // trip.status는 TripStatus이므로 STATUS_TRANSITIONS[trip.status]로 안전하게 현재 상태의 버튼 목록을 꺼낼 수 있습니다.
  const transitions = STATUS_TRANSITIONS[trip.status];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title=""
        action={
          <div className="flex items-center gap-2">
            {transitions.map((t) => (
              <Button
                key={t.target}
                size="sm"
                variant={t.target === "CANCELLED" ? "outline" : "default"}
                onClick={() => handleStatusChange(t.target)}
                disabled={updating}
              >
                {t.label}
              </Button>
            ))}
          </div>
        }
      />

      <button
        onClick={() => router.push("/trips")}
        className="inline-flex items-center gap-1 text-caption text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        여행 목록
      </button>

      <TripDetail trip={trip} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="timeline">타임라인</TabsTrigger>
          <TabsTrigger value="checklist">체크리스트</TabsTrigger>
          <TabsTrigger value="map">지도</TabsTrigger>
          <TabsTrigger value="photos">사진</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <CoverImageSection tripId={trip.id} coverPhotoId={trip.coverPhotoId} onCoverUploaded={fetchTrip} />
          <div className="rounded-xl bg-card p-5 border">
            <h3 className="text-title font-semibold mb-3">여행 개요</h3>
            <div className="grid gap-3">
              <div className="flex justify-between text-body">
                <span className="text-muted-foreground">제목</span>
                <span className="font-medium">{trip.title}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between text-body">
                <span className="text-muted-foreground">기간</span>
                <span>{trip.startDate} ~ {trip.endDate}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between text-body">
                <span className="text-muted-foreground">범위</span>
                <span>
                  {trip.travelScope === "DOMESTIC" ? "국내" : "해외"}
                  {/* 즉시 실행 함수로 복잡한 조건 분기를 JSX 안에서 한 번에 처리합니다. */}
                  {(() => {
                    const loc = trip.travelScope === "INTERNATIONAL" && trip.countryId
                      ? COUNTRIES.find((c) => c.id === trip.countryId)?.nameKo
                      : trip.domesticRegionId
                        ? DOMESTIC_REGIONS.find((r) => r.id === trip.domesticRegionId)?.nameKo
                        : null;
                    return loc ? (
                      <span className="text-muted-foreground"> · {loc}</span>
                    ) : null;
                  })()}
                </span>
              </div>
              {trip.cityName && (
                <>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between text-body">
                    <span className="text-muted-foreground">도시</span>
                    <span>{trip.cityName}</span>
                  </div>
                </>
              )}
              {trip.summary && (
                <>
                  <div className="h-px bg-border" />
                  <div className="flex flex-col gap-1 text-body">
                    <span className="text-muted-foreground">요약</span>
                    <p>{trip.summary}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineView tripId={trip.id} />
        </TabsContent>

        <TabsContent value="checklist">
          <ChecklistView tripId={trip.id} />
        </TabsContent>

        <TabsContent value="map">
          <TripMapView tripId={trip.id} travelScope={trip.travelScope} />
        </TabsContent>

        <TabsContent value="photos">
          <PhotoGallery tripId={trip.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
