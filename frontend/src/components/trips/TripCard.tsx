"use client";

import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Trip, TripStatus } from "@/types/travel";
import { TRIP_STATUS_LABEL, SCOPE_LABEL, COUNTRIES, DOMESTIC_REGIONS } from "@/types/travel";

// Record<키 타입, 값 타입>은 "키 목록이 정해진 객체"를 만드는 TypeScript 표기입니다.
// 여기서는 TripStatus(PLANNED/COMPLETED/CANCELLED)를 키로 받고, 각 상태에 맞는 Badge variant 문자열을 매핑합니다.
const STATUS_VARIANT: Record<TripStatus, "default" | "tealSoft" | "muted"> = {
  PLANNED: "default",
  COMPLETED: "tealSoft",
  CANCELLED: "muted",
};

// 함수 매개변수의 타입 주석(string)은 "이 값은 문자열이어야 한다"는 뜻입니다.
// 반환 타입이 없으면 TypeScript가 추론하지만, 여기서는 날짜 문자열을 받아 로케일에 맞춘 문자열을 돌려줍니다.
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// trip: Trip은 travel.ts에 정의된 인터페이스(여행 데이터의 구조)입니다.
// 반환 타입 string | null은 "문자열이거나(null이 아닌 값), 위치가 없으면 null"이라는 뜻입니다.
function getLocationName(trip: Trip): string | null {
  // === 비교는 JS의 일반 비교와 같지만, TypeScript에서는 travelScope의 가능한 값이 더 엄격하게 제한됩니다.
  if (trip.travelScope === "INTERNATIONAL" && trip.countryId) {
    // ?. 는 optional chaining입니다. find() 결과가 없을 수도 있으니, 없으면 undefined 대신 안전하게 넘어갑니다.
    // ?? null 은 nullish coalescing입니다. undefined 또는 null일 때만 오른쪽 null을 사용합니다.
    return COUNTRIES.find((c) => c.code === trip.countryId)?.nameKo ?? null;
  }
  if (trip.travelScope === "DOMESTIC" && trip.domesticRegionId) {
    return DOMESTIC_REGIONS.find((r) => r.code === trip.domesticRegionId)?.nameKo ?? null;
  }
  return null;
}

/**
 * TripCardProps는 이 컴포넌트가 외부에서 받을 props의 모양을 정의한 인터페이스입니다.
 * JS에서는 보통 주석으로만 설명하지만, TS에서는 props 구조를 타입으로 고정해 전달 실수를 줄입니다.
 */
interface TripCardProps {
  // trip 프로퍼티는 Trip 타입이어야 합니다. 즉, 여행 객체 전체 구조가 맞아야 합니다.
  trip: Trip;
}

/**
 * TripCard는 단일 여행을 카드 형태로 보여주는 React 컴포넌트입니다.
 * 함수 매개변수 { trip }: TripCardProps 는 구조 분해 할당과 타입 주석이 함께 쓰인 예입니다.
 */
export function TripCard({ trip }: TripCardProps) {
  const location = getLocationName(trip);

  return (
    <Link href={`/trips/${trip.id}`}>
      <Card className="transition-shadow hover:shadow-card">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="truncate text-body-lg font-semibold">
                {trip.title}
              </h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                </span>
                {(location ?? trip.travelScope) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {location ?? SCOPE_LABEL[trip.travelScope]}
                  </span>
                )}
              </div>
            </div>
            <Badge variant={STATUS_VARIANT[trip.status]}>
              {TRIP_STATUS_LABEL[trip.status]}
            </Badge>
          </div>
          {trip.summary && (
            <p className="mt-3 line-clamp-2 text-body text-muted-foreground">
              {trip.summary}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
