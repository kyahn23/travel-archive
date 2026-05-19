"use client";

import { useCallback, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "@vnedyalk0v/react19-simple-maps";
import { MapDetailSheet, type MapDetailData } from "./MapDetailSheet";
import { cn } from "@/lib/utils";
import koreaGeo from "@/lib/geo/korea-sido.json";

// 상태를 문자열 리터럴 유니온으로 제한합니다.
type MapStatus = "COMPLETED" | "PLANNED" | "BUCKET" | "NONE";

// Record<MapStatus, string>은 모든 상태 키를 빠짐없이 가진 객체만 허용합니다.
const STATUS_FILL: Record<MapStatus, string> = {
  COMPLETED: "#14B8A6",
  PLANNED: "#FF6B54",
  BUCKET: "#A78BFA",
  NONE: "#EBE9D9",
};

// hover 색상도 동일한 타입 규칙을 공유합니다.
const STATUS_HOVER: Record<MapStatus, string> = {
  COMPLETED: "#0D9488",
  PLANNED: "#E8523B",
  BUCKET: "#8B5CF6",
  NONE: "#DDD9C4",
};

/**
 * 대한민국 지도에서 사용할 지역 데이터의 인터페이스입니다.
 * export가 붙어 있으므로 다른 파일에서도 import 할 수 있습니다.
 */
export interface RegionData {
  code: string;
  name: string;
  status: MapStatus;
  tripCount: number;
  bucketCount: number;
  // Array<{ ... }> 는 "객체 배열"을 뜻합니다.
  recentTrips?: Array<{
    id: number;
    title: string;
    startDate: string;
    endDate: string;
  }>;
}

/**
 * 컴포넌트 props 타입입니다.
 * ?가 붙은 속성은 부모가 넘기지 않아도 되는 선택값입니다.
 */
interface KoreaMapProps {
  data: RegionData[];
  className?: string;
  // callback 함수 타입: tripId 숫자를 받아서 아무것도 반환하지 않는 함수
  onTripClick?: (tripId: number) => void;
}

// 상세 패널 기본값입니다.
const DEFAULT_DETAIL: MapDetailData = {
  name: "",
  status: "NONE",
  tripCount: 0,
  bucketCount: 0,
};

/**
 * 대한민국 지도를 렌더링하는 React 컴포넌트입니다.
 */
export function KoreaMap({ data, className, onTripClick }: KoreaMapProps) {
  // useState에 제네릭을 넣어 상태가 어떤 객체인지 명확히 고정합니다.
  const [detail, setDetail] = useState<MapDetailData>(DEFAULT_DETAIL);
  const [sheetOpen, setSheetOpen] = useState(false);
  // null을 허용하는 이유: 아직 hover된 지역이 없을 수 있기 때문입니다.
  const [hoveredGeo, setHoveredGeo] = useState<string | null>(null);

  // Map<string, RegionData>는 지역 코드 -> 지역 데이터의 빠른 조회용 해시맵 역할입니다.
  const dataMap = useCallback(() => {
    const map = new Map<string, RegionData>();
    data.forEach((d) => map.set(d.code, d));
    return map;
  }, [data]);

  const getStatus = useCallback(
    // 반환 타입 MapStatus를 적어 실수로 다른 문자열이 들어가지 않게 막습니다.
    (code: string): MapStatus => {
      const d = dataMap().get(code);
      return d?.status ?? "NONE";
    },
    [dataMap]
  );

  // geo 매개변수는 최소한 이 구조를 가진다고 타입으로 설명합니다.
  function handleGeoClick(geo: { properties?: Record<string, any> | null }) {
    const code = geo.properties?.code ?? "";
    const found = dataMap().get(code);

    // found가 있으면 지역 데이터에서, 없으면 GeoJSON 이름으로 상세 정보를 구성합니다.
    const detailData: MapDetailData = found
      ? {
          name: found.name,
          status: found.status,
          tripCount: found.tripCount,
          bucketCount: found.bucketCount,
          recentTrips: found.recentTrips,
        }
      : {
          name: geo.properties?.name ?? "",
          status: "NONE",
          tripCount: 0,
          bucketCount: 0,
        };

    setDetail(detailData);
    setSheetOpen(true);
  }

  return (
    <div className={cn("relative", className)}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          // @ts-expect-error react19-simple-maps 타입 이슈
          center: [127.5, 36.0],
          scale: 3800,
        }}
        width={600}
        height={600}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={koreaGeo}>
          {({ geographies }) =>
            geographies.map((geo, index) => {
              const code = geo.properties?.code ?? "";
              const status = getStatus(code);
              const isHovered = hoveredGeo === code;

              return (
                <Geography
                  key={geo.id || index}
                  geography={geo}
                  fill={isHovered ? STATUS_HOVER[status] : STATUS_FILL[status]}
                  stroke="#FFFFFF"
                  strokeWidth={0.8}
                  style={{
                    default: { cursor: "pointer", outline: "none" },
                    hover: { cursor: "pointer", outline: "none" },
                    pressed: { cursor: "pointer", outline: "none" },
                  }}
                  onMouseEnter={() => setHoveredGeo(code)}
                  onMouseLeave={() => setHoveredGeo(null)}
                  onClick={() => handleGeoClick(geo)}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      <MapDetailSheet
        data={detail}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onTripClick={onTripClick}
      />
    </div>
  );
}
