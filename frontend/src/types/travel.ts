/* ── Trip ── */

/**
 * TypeScript의 `type` 키워드는 JavaScript의 변수 선언이 아니라
 * "타입 별칭(Type Alias)"을 만드는 문법입니다.
 *
 * 아래처럼 문자열 리터럴을 `|` 로 연결하면,
 * 이 값은 "PLANNED" 또는 "COMPLETED" 또는 "CANCELLED" 중 하나만
 * 허용된다는 뜻입니다.
 *
 * 이런 유니언 타입은 런타임에 존재하지 않고,
 * 컴파일 단계에서만 잘못된 문자열을 막는 역할을 합니다.
 */
export type TripStatus = "PLANNED" | "COMPLETED" | "CANCELLED";
/**
 * 여행 범위를 나타내는 타입 별칭입니다.
 *
 * `|` 는 "둘 중 하나"가 아니라 "열거된 값들 중 하나"를 의미합니다.
 * 그래서 이 값은 국내/해외 중 하나만 가질 수 있습니다.
 */
export type TravelScope = "DOMESTIC" | "INTERNATIONAL";

/**
 * `interface` 는 객체의 모양(shape)을 설명하는 타입입니다.
 *
 * JavaScript 객체에 어떤 속성이 있어야 하는지,
 * 그리고 각 속성의 타입이 무엇인지 정의합니다.
 *
 * 아래 `number | null` 같은 표기는
 * "숫자 또는 null"을 허용한다는 뜻입니다.
 * 즉, 값이 없음을 명시적으로 표현할 수 있습니다.
 */
export interface Trip {
  id: number; // `: number` 는 이 값이 숫자여야 함을 뜻하는 타입 주석입니다.
  title: string; // 문자열만 허용합니다.
  travelScope: TravelScope; // 위에서 정의한 별칭 타입을 재사용합니다.
  countryId: string | null; // ISO 국가 코드 (예: "JP", "US")
  domesticRegionId: string | null; // 지역 코드 (예: "KR-11", "KR-26")
  cityName: string | null; // 도시명이 없는 경우도 허용합니다.
  startDate: string; // 날짜를 문자열로 보관합니다.
  endDate: string; // 종료일도 문자열입니다.
  status: TripStatus; // 허용된 상태 문자열만 받을 수 있습니다.
  travelType: string | null; // 여행 유형이 비어 있을 수 있습니다.
  companion: string | null; // 동행 정보가 없을 수도 있습니다.
  summary: string | null; // 요약 메모는 선택적 의미를 가질 수 있습니다.
  tripDays: TripDay[] | null; // `TripDay[]` 는 TripDay 타입 객체들의 배열입니다.
  coverPhotoId: number | null; // 대표 사진이 없으면 null 입니다.
}

/**
 * 일자별 여행 정보를 담는 객체 구조입니다.
 *
 * `TripDay` 라는 이름은 타입 이름일 뿐이고,
 * JavaScript 런타임 객체가 따로 생성되는 것은 아닙니다.
 */
export interface TripDay {
  id: number; // 식별자 숫자 타입입니다.
  dayNo: number; // 여행의 며칠차인지 나타내는 숫자입니다.
  travelDate: string; // 날짜 문자열입니다.
  title: string | null; // 제목이 없을 수도 있으므로 `| null` 을 씁니다.
  memo: string | null; // 메모도 비어 있을 수 있습니다.
}

/**
 * 여행 생성 API로 보낼 요청 본문(payload) 구조입니다.
 *
 * `?` 가 붙은 속성은 "optional property" 입니다.
 * 즉, 객체에 있어도 되고 없어도 됩니다.
 *
 * `countryId?: number | null` 은
 * - 아예 키가 없을 수도 있고
 * - 키가 있더라도 값이 number 또는 null 일 수 있다는 뜻입니다.
 */
export interface CreateTripPayload {
  title: string;
  travelScope: TravelScope;
  countryId?: string | null; // 선택적 속성입니다.
  domesticRegionId?: string | null; // 국내 지역 코드는 선택 사항입니다.
  cityName?: string | null; // 도시명도 선택적으로 보낼 수 있습니다.
  startDate: string;
  endDate: string;
  travelType?: string | null; // 여행 유형은 없어도 됩니다.
  companion?: string | null; // 동행 정보는 필요할 때만 보냅니다.
  summary?: string | null; // 요약도 optional 입니다.
  status?: TripStatus | null; // 상태 자체를 생략하거나 null 로 보낼 수 있습니다.
}

/**
 * `type` 로 객체 형태를 바로 적을 수도 있습니다.
 * 여기서는 `{ status: TripStatus }` 라는 단일 속성 객체를 별칭으로 만든 것입니다.
 */
export type UpdateTripStatusPayload = { status: TripStatus };

/* ── Bucket ── */

/**
 * 버킷리스트 상태를 나타내는 유니언 타입입니다.
 *
 * `|` 는 여러 문자열 중 정확히 하나만 허용한다는 뜻입니다.
 * 이런 방식은 오타를 컴파일 단계에서 잡는 데 도움이 됩니다.
 */
export type BucketStatus =
  | "WANT_TO_GO"
  | "PLANNING"
  | "BOOKED"
  | "VISITED"
  | "ON_HOLD";

export interface Bucket {
  id: number;
  title: string;
  travelScope: TravelScope;
  countryId: string | null;
  domesticRegionId: string | null;
  cityName: string | null;
  reason: string | null;
  expectedBudget: number | null;
  desiredSeason: string | null;
  priority: number | null;
  status: BucketStatus;
  referenceUrl: string | null;
  memo: string | null;
  companion: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 버킷리스트 생성 요청 본문입니다.
 *
 * `?` 가 많다는 것은 서버가 모든 필드를 강제하지 않는다는 뜻이며,
 * 클라이언트가 필요한 정보만 골라 보낼 수 있다는 의미입니다.
 */
export interface CreateBucketPayload {
  title: string;
  travelScope: TravelScope;
  countryId?: string | null;
  domesticRegionId?: string | null;
  cityName?: string | null;
  reason?: string | null;
  expectedBudget?: number | null;
  desiredSeason?: string | null;
  priority?: number | null;
  status?: BucketStatus | null;
  referenceUrl?: string | null;
  memo?: string | null;
  companion?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

/**
 * 버킷리스트를 여행으로 전환할 때 사용하는 요청 타입입니다.
 */
export interface ConvertToTripPayload {
  startDate: string;
  endDate: string;
}

/* ── Helpers ── */

/**
 * `Record<K, V>` 는 "키 K 와 값 V 로 이루어진 객체"를 만드는 유틸리티 타입입니다.
 *
 * 예를 들어 `Record<TripStatus, string>` 은
 * TripStatus 의 각 값이 반드시 하나씩 존재하고,
 * 그 값은 문자열이어야 한다는 뜻입니다.
 */
export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  PLANNED: "계획 중",
  COMPLETED: "완료",
  CANCELLED: "취소",
};

export const BUCKET_STATUS_LABEL: Record<BucketStatus, string> = {
  WANT_TO_GO: "가고 싶어요",
  PLANNING: "계획 중",
  BOOKED: "예약 완료",
  VISITED: "다녀왔어요",
  ON_HOLD: "보류",
};

export const SCOPE_LABEL: Record<TravelScope, string> = {
  DOMESTIC: "국내",
  INTERNATIONAL: "해외",
};

/* ── Reference Data (seed data from backend) ── */

// `as const` 는 이 배열/객체를 "최대한 좁은 리터럴 타입"으로 고정합니다.
// 즉, 단순한 `string` 이 아니라 실제 문자열 값 자체를 타입으로 보존합니다.
// 그래서 실수로 다른 문자열을 넣는 것을 더 강하게 막을 수 있습니다.
export const COUNTRIES = [
  { code: "KR", nameKo: "대한민국" },
  { code: "JP", nameKo: "일본" },
  { code: "US", nameKo: "미국" },
  { code: "FR", nameKo: "프랑스" },
  { code: "IT", nameKo: "이탈리아" },
  { code: "ES", nameKo: "스페인" },
  { code: "GB", nameKo: "영국" },
  { code: "DE", nameKo: "독일" },
  { code: "TH", nameKo: "태국" },
  { code: "VN", nameKo: "베트남" },
  { code: "SG", nameKo: "싱가포르" },
  { code: "TW", nameKo: "대만" },
  { code: "CN", nameKo: "중국" },
  { code: "AU", nameKo: "호주" },
  { code: "CA", nameKo: "캐나다" },
  { code: "NZ", nameKo: "뉴질랜드" },
  { code: "CH", nameKo: "스위스" },
  { code: "AT", nameKo: "오스트리아" },
  { code: "CZ", nameKo: "체코" },
  { code: "TR", nameKo: "튀르키예" },
] as const;

// 국내 지역 데이터도 마찬가지로 `as const` 로 고정합니다.
export const DOMESTIC_REGIONS = [
  { code: "KR-11", nameKo: "서울특별시" },
  { code: "KR-26", nameKo: "부산광역시" },
  { code: "KR-27", nameKo: "대구광역시" },
  { code: "KR-28", nameKo: "인천광역시" },
  { code: "KR-29", nameKo: "광주광역시" },
  { code: "KR-30", nameKo: "대전광역시" },
  { code: "KR-31", nameKo: "울산광역시" },
  { code: "KR-36", nameKo: "세종특별자치시" },
  { code: "KR-41", nameKo: "경기도" },
  { code: "KR-42", nameKo: "강원특별자치도" },
  { code: "KR-43", nameKo: "충청북도" },
  { code: "KR-44", nameKo: "충청남도" },
  { code: "KR-45", nameKo: "전북특별자치도" },
  { code: "KR-46", nameKo: "전라남도" },
  { code: "KR-47", nameKo: "경상북도" },
  { code: "KR-48", nameKo: "경상남도" },
  { code: "KR-49", nameKo: "제주특별자치도" },
] as const;

/* ── Map ── */

/**
 * 지도 영역의 상태를 나타내는 유니언 타입입니다.
 *
 * `|` 는 여러 상태 문자열 중 하나만 허용하는 문법입니다.
 */
export type MapRegionStatus = "COMPLETED" | "PLANNED" | "BUCKET" | "NONE";

/** GET /api/maps/world response item */
export interface WorldMapRegion {
  mapKey: string;
  countryCode: string;
  nameKo: string;
  status: MapRegionStatus;
}

/** GET /api/maps/domestic response item */
export interface DomesticMapRegion {
  mapKey: string;
  regionCode: string;
  nameKo: string;
  status: MapRegionStatus;
}

/** GET /api/maps/regions/{mapKey} response */
export interface MapRegionDetail {
  mapKey: string;
  name: string;
  completedCount: number;
  plannedCount: number;
  bucketCount: number;
  trips: Array<{
    // `Array<T>` 는 `T[]` 와 같은 의미입니다.
    // 여기서는 "여러 개의 여행 객체"가 들어있는 배열을 뜻합니다.
    id: number;
    title: string;
    travelScope: TravelScope;
    startDate: string;
    endDate: string;
    status: TripStatus;
    cityName: string;
  }>;
}

/* ── Statistics ── */

/** GET /api/statistics/summary response */
export interface StatsSummary {
  completedTrips: number;
  plannedTrips: number;
  travelDays: number;
  visitedCountries: number;
  visitedDomesticRegions: number;
}

/** GET /api/statistics/monthly response item */
export interface MonthlyCount {
  month: string; // "yyyy-MM"
  count: number;
}

/** GET /api/statistics/top-regions response item */
export interface TopRegion {
  name: string;
  scope: TravelScope;
  count: number;
}
