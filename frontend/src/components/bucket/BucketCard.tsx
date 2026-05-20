"use client";

import { Globe, MapPin, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Bucket, BucketStatus } from "@/types/travel";
import { BUCKET_STATUS_LABEL, SCOPE_LABEL, COUNTRIES, DOMESTIC_REGIONS } from "@/types/travel";

// Record<BucketStatus, ...>는 버킷 상태 키를 전부 포함하는 객체만 허용합니다.
// 즉, 상태별 Badge 색상 문자열을 안전하게 매핑하는 TypeScript 방식입니다.
const STATUS_VARIANT: Record<BucketStatus, "default" | "tealSoft" | "muted" | "soft"> = {
  WANT_TO_GO: "soft",
  PLANNING: "default",
  BOOKED: "tealSoft",
  VISITED: "tealSoft",
  ON_HOLD: "muted",
};

// Bucket 객체에 들어있는 travelScope/countryId/domesticRegionId를 바탕으로 표시용 이름을 찾습니다.
function getLocationName(bucket: Bucket): string | null {
  if (bucket.travelScope === "INTERNATIONAL" && bucket.countryId) {
    return COUNTRIES.find((c) => c.code === bucket.countryId)?.nameKo ?? null;
  }
  if (bucket.travelScope === "DOMESTIC" && bucket.domesticRegionId) {
    return DOMESTIC_REGIONS.find((r) => r.code === bucket.domesticRegionId)?.nameKo ?? null;
  }
  return null;
}

/**
 * BucketCardProps는 이 컴포넌트가 받아야 할 props의 타입 정의입니다.
 * onConvert의 타입 (bucket: Bucket) => void 는 "Bucket을 받아 아무 값도 반환하지 않는 함수"를 의미합니다.
 */
interface BucketCardProps {
  // bucket 자체는 버킷 데이터 객체여야 합니다.
  bucket: Bucket;
  // onConvert는 클릭 시 이 버킷을 부모 컴포넌트에 전달하는 콜백입니다.
  onConvert: (bucket: Bucket) => void;
}

/**
 * BucketCard는 버킷리스트 항목 하나를 카드로 보여주는 컴포넌트입니다.
 * props를 구조 분해하면서 타입을 명시해, JS보다 더 엄격하게 전달값을 검사합니다.
 */
export function BucketCard({ bucket, onConvert }: BucketCardProps) {
  const location = getLocationName(bucket);

  // boolean 조건식으로 "여행으로 전환" 버튼을 노출할지 결정합니다.
  const canConvert = bucket.status === "WANT_TO_GO" || bucket.status === "PLANNING";

  return (
    <Card className="transition-shadow hover:shadow-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="truncate text-body-lg font-semibold">
              {bucket.title}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                {bucket.travelScope === "INTERNATIONAL" ? (
                  <Globe className="h-3.5 w-3.5" />
                ) : (
                  <MapPin className="h-3.5 w-3.5" />
                )}
                {location ?? SCOPE_LABEL[bucket.travelScope]}
              </span>
              {bucket.companion && (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {bucket.companion}
                </span>
              )}
            </div>
          </div>
          <Badge variant={STATUS_VARIANT[bucket.status]}>
            {BUCKET_STATUS_LABEL[bucket.status]}
          </Badge>
        </div>

        {bucket.reason && (
          <p className="mt-3 line-clamp-2 text-body text-muted-foreground">
            {bucket.reason}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          {canConvert && (
            <Button size="sm" onClick={() => onConvert(bucket)}>
              여행으로 전환
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
