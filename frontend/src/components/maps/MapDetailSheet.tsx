"use client";

import { useEffect, useRef } from "react";
import { X, MapPin, Calendar, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 지도에서 지역/국가를 클릭했을 때 보여줄 상세 정보입니다.
 *
 * export interface는 다른 컴포넌트가 같은 데이터 모양을 재사용할 수 있게 합니다.
 */
export interface MapDetailData {
  name: string;
  status: "COMPLETED" | "PLANNED" | "BUCKET" | "NONE";
  tripCount: number;
  bucketCount: number;
  // 최근 여행 목록은 없을 수도 있으므로 optional로 선언합니다.
  recentTrips?: Array<{
    id: number;
    title: string;
    startDate: string;
    endDate: string;
  }>;
}

// 문자열 리터럴 유니온으로 UI variant를 제한합니다.
type StatusVariant = "tealSoft" | "default" | "outline" | "muted";

// Record<string, ...>은 상태 문자열을 키로 쓰는 lookup table입니다.
const STATUS_VARIANT: Record<string, StatusVariant> = {
  COMPLETED: "tealSoft",
  PLANNED: "default",
  BUCKET: "outline",
  NONE: "muted",
};

// 표시용 한글 라벨도 상태별로 매핑합니다.
const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "완료",
  PLANNED: "계획 중",
  BUCKET: "버킷리스트",
  NONE: "미방문",
};

// 작은 점 색상 클래스도 상태별로 분리합니다.
const STATUS_DOT: Record<string, string> = {
  COMPLETED: "bg-teal-500",
  PLANNED: "bg-coral-500",
  BUCKET: "bg-violet-400",
  NONE: "bg-gray-300",
};

/**
 * 상세 시트 컴포넌트에 전달되는 props 타입입니다.
 * onClose는 인자를 받지 않고 아무것도 반환하지 않는 함수입니다.
 */
interface MapDetailSheetProps {
  data: MapDetailData | null;
  open: boolean;
  onClose: () => void;
  // 선택 이벤트 콜백은 있을 수도, 없을 수도 있습니다.
  onTripClick?: (tripId: number) => void;
}

// ISO 문자열을 한국어 형식으로 보여주기 위한 헬퍼 함수입니다.
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

/**
 * 모바일/데스크톱에서 지역 상세 정보를 보여주는 패널 컴포넌트입니다.
 */
export function MapDetailSheet({ data, open, onClose, onTripClick }: MapDetailSheetProps) {
  // ref.current의 타입을 HTMLDivElement로 고정합니다.
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // KeyboardEvent는 브라우저 키보드 이벤트 객체의 타입입니다.
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    // MouseEvent는 클릭/마우스 이벤트 객체 타입입니다.
    function handleClick(e: MouseEvent) {
      // as Node 는 "이 값이 DOM Node라고 개발자가 보증"하는 타입 단언입니다.
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 100);

    return () => {
      // setTimeout의 반환값을 저장해 두었다가 cleanup 때 제거합니다.
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, onClose]);

  // data가 없거나 열려 있지 않으면 아무것도 렌더링하지 않습니다.
  if (!data || !open) return null;

  return (
    <>
      {/* Mobile bottom sheet */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          open ? "visible" : "invisible"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-black/20 transition-opacity",
            open ? "opacity-100" : "opacity-0"
          )}
          onClick={onClose}
        />
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${data.name} 상세`}
          className={cn(
            "absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 pb-safe-bottom shadow-card transition-transform duration-300",
            open ? "translate-y-0" : "translate-y-full"
          )}
        >
          {/* Drag handle */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />

          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={cn("h-2.5 w-2.5 rounded-full", STATUS_DOT[data.status])} />
                <h3 className="text-title font-semibold">{data.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[data.status]}>
                  {STATUS_LABEL[data.status]}
                </Badge>
                {data.tripCount > 0 && (
                  <span className="text-caption text-muted-foreground">
                    여행 {data.tripCount}회
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mr-2"
              aria-label="상세 닫기"
              onClick={onClose}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {data.recentTrips && data.recentTrips.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-caption font-medium text-muted-foreground">최근 여행</h4>
              {data.recentTrips.map((trip) => (
                <button
                  key={trip.id}
                  className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-muted"
                  onClick={() => onTripClick?.(trip.id)}
                >
                  <MapPin className="h-4 w-4 shrink-0 text-coral-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium">{trip.title}</p>
                    <p className="text-micro text-muted-foreground">
                      <Calendar className="mr-1 inline h-3 w-3" />
                      {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                    </p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop side panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 hidden h-full w-80 border-l bg-white shadow-card transition-transform duration-300 md:block",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={cn("h-2.5 w-2.5 rounded-full", STATUS_DOT[data.status])} />
                <h3 className="text-title font-semibold">{data.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[data.status]}>
                  {STATUS_LABEL[data.status]}
                </Badge>
                {data.tripCount > 0 && (
                  <span className="text-caption text-muted-foreground">
                    여행 {data.tripCount}회
                  </span>
                )}
                {data.bucketCount > 0 && (
                  <span className="text-caption text-muted-foreground">
                    버킷 {data.bucketCount}개
                  </span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {data.recentTrips && data.recentTrips.length > 0 && (
            <div className="mt-6 space-y-2">
              <h4 className="text-caption font-medium text-muted-foreground">최근 여행</h4>
              <div className="space-y-1">
                {data.recentTrips.map((trip) => (
                  <button
                    key={trip.id}
                    className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-muted"
                    onClick={() => onTripClick?.(trip.id)}
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-coral-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-medium">{trip.title}</p>
                      <p className="text-micro text-muted-foreground">
                        <Calendar className="mr-1 inline h-3 w-3" />
                        {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                      </p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
