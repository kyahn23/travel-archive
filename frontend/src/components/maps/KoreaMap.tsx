"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  type PreparedFeature,
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

// 모든 변형에서 포인터 커서와 outline 제거를 유지합니다.
const GEOGRAPHY_STYLE = {
  default: { cursor: "pointer", outline: "none" },
  hover: { cursor: "pointer", outline: "none" },
  pressed: { cursor: "pointer", outline: "none" },
  focused: { cursor: "pointer", outline: "none" },
} as const;

/**
 * 대한민국 지도를 렌더링하는 React 컴포넌트입니다.
 */
export function KoreaMap({ data, className, onTripClick }: KoreaMapProps) {
  // useState에 제네릭을 넣어 상태가 어떤 객체인지 명확히 고정합니다.
  const [detail, setDetail] = useState<MapDetailData>(DEFAULT_DETAIL);
  const [sheetOpen, setSheetOpen] = useState(false);
  // null을 허용하는 이유: 아직 hover된 지역이 없을 수 있기 때문입니다.
  const [hoveredGeo, setHoveredGeo] = useState<string | null>(null);
  // 선택/포커스는 라이브러리가 보장하는 geo.rsmKey 로만 식별합니다.
  const [selectedGeoKey, setSelectedGeoKey] = useState<string | null>(null);
  const [focusedGeoKey, setFocusedGeoKey] = useState<string | null>(null);

  // Map<string, RegionData>는 지역 코드 -> 지역 데이터의 빠른 조회용 해시맵 역할입니다.
  // useCallback 팩토리 대신 useMemo 로 렌더링마다 같은 인스턴스를 재사용합니다.
  const dataMap = useMemo(() => {
    const map = new Map<string, RegionData>();
    data.forEach((d) => map.set(d.code, d));
    return map;
  }, [data]);

  const getStatus = useCallback(
    // 반환 타입 MapStatus를 적어 실수로 다른 문자열이 들어가지 않게 막습니다.
    (code: string): MapStatus => {
      const d = dataMap.get(code);
      return d?.status ?? "NONE";
    },
    [dataMap]
  );

  // 포인터 클릭과 키보드 활성화가 같은 동작을 거치도록 하나의 활성화 함수를 씁니다.
  const activateGeo = useCallback(
    (geo: PreparedFeature) => {
      // properties.code 는 도메인 데이터 조회에만 씁니다.
      const code = geo.properties?.code ?? "";
      const found = dataMap.get(code);

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
      // 다른 지역 활성화는 선택을 교체합니다.
      setSelectedGeoKey(geo.rsmKey);
    },
    [dataMap]
  );

  // 시트를 닫는 모든 경로(닫기 버튼, Escape, 바깥 클릭)가 선택도 함께 해제합니다.
  const closeDetail = useCallback(() => {
    setSheetOpen(false);
    setSelectedGeoKey(null);
  }, []);

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
          {({ geographies }) => {
            // 라이브러리는 실제로 svgPath/rsmKey 가 붙은 PreparedFeature 를 전달합니다.
            const geos = geographies as PreparedFeature[];
            const focusedGeo = focusedGeoKey
              ? geos.find((g) => g.rsmKey === focusedGeoKey)
              : undefined;

            return (
              <>
                {geos.map((geo) => {
                  const code = geo.properties?.code ?? "";
                  const status = getStatus(code);
                  const isHovered = hoveredGeo === geo.rsmKey;
                  const isSelected = selectedGeoKey === geo.rsmKey;
                  const resolvedName =
                    dataMap.get(code)?.name ?? geo.properties?.name ?? "";

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      // hover 또는 선택이면 어두운 hover 색을 유지합니다.
                      fill={
                        isHovered || isSelected
                          ? STATUS_HOVER[status]
                          : STATUS_FILL[status]
                      }
                      stroke="#FFFFFF"
                      strokeWidth={0.8}
                      role="button"
                      aria-label={`${resolvedName} 상세 보기`}
                      aria-pressed={isSelected}
                      style={GEOGRAPHY_STYLE}
                      onMouseEnter={() => setHoveredGeo(geo.rsmKey)}
                      // mouse leave 는 hover 만 해제하고 선택은 유지합니다.
                      onMouseLeave={() => setHoveredGeo(null)}
                      onFocus={(event) => {
                        // 키보드 포커스일 때만 윤곽선을 그립니다.
                        if (event.currentTarget.matches(":focus-visible")) {
                          setFocusedGeoKey(geo.rsmKey);
                        }
                      }}
                      // blur 는 포커스 표시만 해제하고 선택은 유지합니다.
                      onBlur={() => setFocusedGeoKey(null)}
                      onClick={() => activateGeo(geo)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          if (event.repeat) return;
                          activateGeo(geo);
                        }
                      }}
                    />
                  );
                })}
                {/* 키보드 포커스 윤곽선: 대화형 path 뒤에 항상 마지막에 그립니다. */}
                {focusedGeo && (
                  <>
                    <path
                      data-map-focus-ring="outer"
                      d={focusedGeo.svgPath}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth={4}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      pointerEvents="none"
                      aria-hidden="true"
                      focusable="false"
                      vectorEffect="non-scaling-stroke"
                    />
                    <path
                      data-map-focus-ring="inner"
                      d={focusedGeo.svgPath}
                      fill="none"
                      stroke="hsl(var(--foreground))"
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      pointerEvents="none"
                      aria-hidden="true"
                      focusable="false"
                      vectorEffect="non-scaling-stroke"
                    />
                  </>
                )}
              </>
            );
          }}
        </Geographies>
      </ComposableMap>

      <MapDetailSheet
        data={detail}
        open={sheetOpen}
        onClose={closeDetail}
        onTripClick={onTripClick}
      />
    </div>
  );
}
