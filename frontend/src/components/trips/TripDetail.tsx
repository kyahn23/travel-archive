"use client";

import { Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Trip, TripStatus } from "@/types/travel";
import { TRIP_STATUS_LABEL, SCOPE_LABEL, COUNTRIES, DOMESTIC_REGIONS } from "@/types/travel";

// Record 타입: 특정 키 집합을 정확히 강제하는 객체 타입입니다.
// TripStatus가 바뀌면 이 매핑도 함께 맞춰야 해서, 누락/오타를 컴파일 시점에 잡아줍니다.
const STATUS_VARIANT: Record<TripStatus, "default" | "tealSoft" | "muted"> = {
  PLANNED: "default",
  COMPLETED: "tealSoft",
  CANCELLED: "muted",
};

// string 타입의 날짜 문자열(보통 ISO 문자열)을 받아 사람이 읽는 한국어 날짜로 바꿉니다.
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

// 두 날짜 사이의 기간을 계산하는 함수입니다.
// 반환 타입은 number이며, getTime()의 밀리초 차이를 날짜 수로 바꿔 1일을 더해 시작/종료일을 모두 포함합니다.
function daysBetween(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86400000) + 1;
}

// Trip 타입 객체에서 국내/해외 위치명을 안전하게 찾아서 반환합니다.
function getLocationName(trip: Trip): string | null {
  if (trip.travelScope === "INTERNATIONAL" && trip.countryId) {
    return COUNTRIES.find((c) => c.id === trip.countryId)?.nameKo ?? null;
  }
  if (trip.travelScope === "DOMESTIC" && trip.domesticRegionId) {
    return DOMESTIC_REGIONS.find((r) => r.id === trip.domesticRegionId)?.nameKo ?? null;
  }
  return null;
}

/**
 * TripDetailProps는 이 컴포넌트가 외부로부터 받는 props의 형태를 정의합니다.
 * 인터페이스는 객체의 "설계도"처럼 동작하며, JS의 느슨한 props 전달보다 더 안전합니다.
 */
interface TripDetailProps {
  // trip은 반드시 Trip 구조를 만족해야 합니다.
  trip: Trip;
}

/**
 * TripDetail은 여행 상세 정보를 보여주는 컴포넌트입니다.
 * { trip }: TripDetailProps 는 props 객체를 분해하면서 동시에 타입을 붙이는 TypeScript 문법입니다.
 */
export function TripDetail({ trip }: TripDetailProps) {
  const location = getLocationName(trip);

  // 날짜 문자열을 daysBetween 함수에 넣어 여행 기간(일수)을 계산합니다.
  const days = daysBetween(trip.startDate, trip.endDate);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-title-lg font-bold">{trip.title}</h2>
        <Badge variant={STATUS_VARIANT[trip.status]}>
          {TRIP_STATUS_LABEL[trip.status]}
        </Badge>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-cream-100 p-4">
        <div className="flex items-center gap-2 text-body">
          <Calendar className="h-4 w-4 text-coral-500" />
          <span>
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
          </span>
          <span className="text-caption text-muted-foreground">
            ({days}일)
          </span>
        </div>

        <div className="flex items-center gap-2 text-body">
          <MapPin className="h-4 w-4 text-teal-500" />
          <span>
            {SCOPE_LABEL[trip.travelScope]}
            {location && (
              <span className="text-muted-foreground"> · {location}</span>
            )}
          </span>
        </div>
      </div>

      {trip.summary && (
        <p className="text-body leading-relaxed">{trip.summary}</p>
      )}
    </div>
  );
}
