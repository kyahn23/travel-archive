"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Sphere,
  Graticule,
  type PreparedFeature,
} from "@vnedyalk0v/react19-simple-maps";
import { MapDetailSheet, type MapDetailData } from "./MapDetailSheet";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "@/types/travel";
import worldGeo from "@/lib/geo/world-110m.json";

// 상태를 문자열 리터럴 유니온으로 제한합니다.
type MapStatus = "COMPLETED" | "PLANNED" | "BUCKET" | "NONE";

// Record<MapStatus, string>은 모든 상태 키를 빠짐없이 가진 객체만 허용합니다.
const STATUS_FILL: Record<MapStatus, string> = {
  COMPLETED: "#14B8A6",
  PLANNED: "#FF6B54",
  BUCKET: "#A78BFA",
  NONE: "#EBE9D9",
};

// hover/선택 상태에서 쓸 어두운 색상도 동일한 타입 규칙을 공유합니다.
const STATUS_HOVER: Record<MapStatus, string> = {
  COMPLETED: "#0D9488",
  PLANNED: "#E8523B",
  BUCKET: "#8B5CF6",
  NONE: "#DDD9C4",
};

/**
 * 세계 지도에 표시할 국가 데이터 구조입니다.
 *
 * id 는 M49("392") 또는 알파-2("JP") 어느 쪽이 와도 정규화로 매칭됩니다.
 */
export interface CountryData {
  id: string;
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
interface WorldMapProps {
  data: CountryData[];
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
// fill 은 라이브러리가 style 객체를 통째로 선택하므로 SVG prop 으로만 전달합니다.
const GEOGRAPHY_STYLE = {
  default: { cursor: "pointer", outline: "none" },
  hover: { cursor: "pointer", outline: "none" },
  pressed: { cursor: "pointer", outline: "none" },
  focused: { cursor: "pointer", outline: "none" },
} as const;

/**
 * 입력값(문자열/숫자/null/undefined)을 정규화된 지도 키로 바꿉니다.
 *
 * - 빈 값은 그대로 빈 문자열을 반환합니다.
 * - 1~3자리 숫자는 M49 규칙에 따라 3자리로 패딩합니다 ("40" → "040").
 * - 그 외(알파-2 등)는 대문자로 바꿉니다 ("jp" → "JP").
 */
function normalizeKey(value: string | number | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (raw === "") return "";
  if (/^[0-9]{1,3}$/.test(raw)) return raw.padStart(3, "0");
  return raw.toUpperCase();
}

// 카탈로그 행 타입 (COUNTRIES 는 as const 이므로 리터럴 타입으로 좁혀집니다).
type Country = (typeof COUNTRIES)[number];

// 카탈로그 인덱스는 렌더와 무관하게 한 번만 만듭니다 (모듈 로드 시 1회).
// 정규화된 mapKey(M49) 와 대문자 code(알파-2) 각각으로 조회합니다.
const CATALOG_BY_MAP_KEY = new Map<string, Country>(
  COUNTRIES.map((c) => [normalizeKey(c.mapKey), c])
);
const CATALOG_BY_CODE = new Map<string, Country>(
  COUNTRIES.map((c) => [normalizeKey(c.code), c])
);

/**
 * 세계 지도를 렌더링하는 React 컴포넌트입니다.
 */
export function WorldMap({ data, className, onTripClick }: WorldMapProps) {
  const [detail, setDetail] = useState<MapDetailData>(DEFAULT_DETAIL);
  const [sheetOpen, setSheetOpen] = useState(false);
  // null을 허용하는 이유: 아직 hover된 국가가 없을 수 있기 때문입니다.
  const [hoveredGeo, setHoveredGeo] = useState<string | null>(null);
  // 선택/포커스는 라이브러리가 보장하는 geo.rsmKey 로만 식별합니다.
  const [selectedGeoKey, setSelectedGeoKey] = useState<string | null>(null);
  const [focusedGeoKey, setFocusedGeoKey] = useState<string | null>(null);

  // 동적 데이터 인덱스: 정규화된 id 를 키로 CountryData 를 조회합니다.
  // id 가 카탈로그의 M49/알파-2와 일치하면 상대 별칭도 같은 데이터에 연결합니다.
  // (예: id "392" ↔ "JP", id "JP" ↔ "392") — 카탈로그 무결성 테스트가
  // 별칭 충돌(같은 키가 서로 다른 국가를 가리키는 경우)이 없음을 보장합니다.
  const dataMap = useMemo(() => {
    const map = new Map<string, CountryData>();
    data.forEach((d) => {
      const key = normalizeKey(d.id);
      if (key === "") return;
      map.set(key, d);
      const byMapKey = CATALOG_BY_MAP_KEY.get(key);
      if (byMapKey) map.set(normalizeKey(byMapKey.code), d);
      const byCode = CATALOG_BY_CODE.get(key);
      if (byCode) map.set(normalizeKey(byCode.mapKey), d);
    });
    return map;
  }, [data]);

  /**
   * geo 하나를 해석해 상태/라벨/상세 정보를 만듭니다.
   *
   * 도메인 조회는 항상 정규화된 최상위 geo.id(M49)로만 합니다.
   * 라벨 우선순위: 매칭된 동적 CountryData.name → 카탈로그 nameKo(M49) →
   * 비어 있지 않은 geo.properties.name → "알 수 없는 지역".
   */
  const resolveGeo = useCallback(
    (geo: PreparedFeature) => {
      const key = normalizeKey(geo.id);
      const datum = key ? dataMap.get(key) : undefined;
      const catalog = key ? CATALOG_BY_MAP_KEY.get(key) : undefined;
      const propsName =
        typeof geo.properties?.name === "string" ? geo.properties.name.trim() : "";

      let name = "알 수 없는 지역";
      if (datum?.name) name = datum.name;
      else if (catalog?.nameKo) name = catalog.nameKo;
      else if (propsName) name = propsName;

      // 동적 데이터가 있을 때만 상태/횟수/여행이 따라옵니다.
      const detailData: MapDetailData = datum
        ? {
            name,
            status: datum.status,
            tripCount: datum.tripCount,
            bucketCount: datum.bucketCount,
            recentTrips: datum.recentTrips,
          }
        : { name, status: "NONE", tripCount: 0, bucketCount: 0 };

      return { status: (datum?.status ?? "NONE") as MapStatus, name, detailData };
    },
    [dataMap]
  );

  // 포인터 클릭과 키보드 활성화가 같은 동작을 거치도록 하나의 활성화 함수를 씁니다.
  const activateGeo = useCallback(
    (geo: PreparedFeature) => {
      setDetail(resolveGeo(geo).detailData);
      setSheetOpen(true);
      // 다른 국가 활성화는 선택을 교체합니다.
      setSelectedGeoKey(geo.rsmKey);
    },
    [resolveGeo]
  );

  // 시트를 닫는 모든 경로(닫기 버튼, Escape, 바깥 클릭)가 선택도 함께 해제합니다.
  const closeDetail = useCallback(() => {
    setSheetOpen(false);
    setSelectedGeoKey(null);
  }, []);

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
          {({ geographies }) => {
            // 라이브러리는 실제로 svgPath/rsmKey 가 붙은 PreparedFeature 를 전달합니다.
            const geos = geographies as PreparedFeature[];
            // ponytail: 포커스된 geo 를 O(n) find 로 찾습니다. 177개 지형이라 충분합니다.
            const focusedGeo = focusedGeoKey
              ? geos.find((g) => g.rsmKey === focusedGeoKey)
              : undefined;

            return (
              <>
                {geos.map((geo) => {
                  const { status, name } = resolveGeo(geo);
                  const isHovered = hoveredGeo === geo.rsmKey;
                  const isSelected = selectedGeoKey === geo.rsmKey;

                  return (
                    <Geography
                      // rsmKey 는 라이브러리가 보장하는 유일 키입니다 (id 없는 지형 포함).
                      key={geo.rsmKey}
                      geography={geo}
                      // hover 또는 선택이면 어두운 hover 색을 유지합니다.
                      fill={
                        isHovered || isSelected
                          ? STATUS_HOVER[status]
                          : STATUS_FILL[status]
                      }
                      stroke="#FFFFFF"
                      strokeWidth={0.4}
                      role="button"
                      aria-label={`${name} 상세 보기`}
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
