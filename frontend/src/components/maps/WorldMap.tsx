"use client";

import { useCallback, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Sphere,
  Graticule,
} from "@vnedyalk0v/react19-simple-maps";
import { MapDetailSheet, type MapDetailData } from "./MapDetailSheet";
import { cn } from "@/lib/utils";
import worldGeo from "@/lib/geo/world-110m.json";

// 문자열 리터럴만 허용하는 타입 별칭입니다.
// plain JavaScript에는 없고, TypeScript에서 "status 값은 이 4개 중 하나만 가능"이라고 제한할 때 씁니다.
type MapStatus = "COMPLETED" | "PLANNED" | "BUCKET" | "NONE";

// Record<K, V>는 "K 타입 키를 반드시 모두 가지고, 값은 V 타입"이라는 의미의 제네릭 유틸 타입입니다.
// 즉, MapStatus 각각에 대해 색상 문자열을 1:1로 매핑합니다.
const STATUS_FILL: Record<MapStatus, string> = {
  COMPLETED: "#14B8A6",
  PLANNED: "#FF6B54",
  BUCKET: "#A78BFA",
  NONE: "#EBE9D9",
};

// hover 상태일 때 사용할 색상도 같은 방식으로 타입 안전하게 묶습니다.
const STATUS_HOVER: Record<MapStatus, string> = {
  COMPLETED: "#0D9488",
  PLANNED: "#E8523B",
  BUCKET: "#8B5CF6",
  NONE: "#DDD9C4",
};

/**
 * 세계 지도에 표시할 국가 데이터 구조입니다.
 *
 * export interface는 다른 파일에서도 import 해서 사용할 수 있는
 * "객체 모양 설명서"라고 생각하면 됩니다.
 */
export interface CountryData {
  id: string;
  name: string;
  status: MapStatus;
  tripCount: number;
  bucketCount: number;
  // Array<T>는 "T 타입의 배열"이라는 뜻입니다.
  // 여기서는 recentTrips 배열 안의 각 원소가 아래 구조를 가진다고 명시합니다.
  recentTrips?: Array<{
    id: number;
    title: string;
    startDate: string;
    endDate: string;
  }>;
}

// ?는 "있을 수도 있고 없을 수도 있다"는 optional 속성입니다.
interface WorldMapProps {
  data: CountryData[];
  className?: string;
  // 함수 타입: (tripId: number) => void 는 "number 하나를 받아서 아무 값도 반환하지 않는 함수"입니다.
  onTripClick?: (tripId: number) => void;
}

// 상태가 아직 없을 때 보여줄 기본 상세 정보입니다.
const DEFAULT_DETAIL: MapDetailData = {
  name: "",
  status: "NONE",
  tripCount: 0,
  bucketCount: 0,
};

/**
 * 세계 지도를 렌더링하는 React 컴포넌트입니다.
 *
 * props 객체를 구조 분해하면서 각 속성의 타입은 WorldMapProps로 검증됩니다.
 */
export function WorldMap({ data, className, onTripClick }: WorldMapProps) {
  // useState<MapDetailData>(...)의 <MapDetailData>는 제네릭 타입 인자입니다.
  // 이 상태에는 MapDetailData 모양의 객체만 들어갈 수 있습니다.
  const [detail, setDetail] = useState<MapDetailData>(DEFAULT_DETAIL);
  const [sheetOpen, setSheetOpen] = useState(false);
  // string | null 은 "문자열이거나, 아무 값도 없는 null"을 뜻하는 union 타입입니다.
  const [hoveredGeo, setHoveredGeo] = useState<string | null>(null);

  // useCallback의 반환 함수는 data 배열을 빠르게 찾기 위한 Map<string, CountryData>를 만듭니다.
  // Map<K, V>는 JavaScript의 Map 자료구조를 제네릭으로 감싼 타입입니다.
  const dataMap = useCallback(() => {
    const map = new Map<string, CountryData>();
    data.forEach((d) => map.set(d.id, d));
    return map;
  }, [data]);

  const getStatus = useCallback(
    // (geoId: string): MapStatus => ... 는 입력 타입과 반환 타입을 함께 적은 화살표 함수입니다.
    (geoId: string): MapStatus => {
      const d = dataMap().get(geoId);
      return d?.status ?? "NONE";
    },
    [dataMap]
  );

  // 함수 매개변수 geo의 타입도 직접 선언해서, 어떤 필드가 있는지 TypeScript가 검사하게 합니다.
  function handleGeoClick(geo: {
    properties?: { ISO_A3?: string; ISO_A2?: string; id?: string; name?: string } | null;
  }) {
    // ?? 는 왼쪽 값이 null/undefined일 때만 오른쪽 기본값을 쓰는 연산자입니다.
    const geoId = geo.properties?.ISO_A3 ?? geo.properties?.ISO_A2 ?? geo.properties?.id ?? "";
    const found = dataMap().get(geoId);

    // 조걶 연산의 결과를 MapDetailData 타입으로 명시합니다.
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
        // @ts-expect-error react19-simple-maps 타입 이슈
        projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}
        width={800}
        height={500}
        style={{ width: "100%", height: "auto" }}
      >
        <Sphere stroke="#DDD9C4" strokeWidth={0.5} fill="#FAFAF5" id="sphere" />
        <Graticule stroke="#DDD9C4" strokeWidth={0.3} />
        <Geographies geography={worldGeo}>
          {({ geographies }) =>
            geographies.map((geo, index) => {
              const geoId = geo.properties?.ISO_A3 ?? geo.properties?.ISO_A2 ?? geo.id ?? "";
              const status = getStatus(geoId);
              const isHovered = hoveredGeo === geoId;

              return (
                <Geography
                  key={geo.id || index}
                  geography={geo}
                  fill={isHovered ? STATUS_HOVER[status] : STATUS_FILL[status]}
                  stroke="#FFFFFF"
                  strokeWidth={0.4}
                  style={{
                    default: { cursor: "pointer", outline: "none" },
                    hover: { cursor: "pointer", outline: "none" },
                    pressed: { cursor: "pointer", outline: "none" },
                  }}
                  onMouseEnter={() => setHoveredGeo(geoId)}
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
