/**
 * 세계 지도 여행금지 선택 정책 모듈.
 *
 * 외교부 0404 의 2026년도 상반기 정기 조정(2026-07-13 공지)을 기준으로,
 * 전국 단위 여행금지 국가와 별도 정책으로 비공개 처리하는 지역을 인코딩합니다.
 * 본 모듈은 순수합니다 — 현지화 데이터를 import 하지 않으며, 차단 사유 접미사를
 * 한국어로 직접 들고 있습니다. 호출자가 한국어 국가명 + 접미사를 합쳐
 * 차단 라벨을 만듭니다.
 *
 * 정책 갱신 절차 (refreshRequiredAt 이전에 수행)
 * --------------------------------------------------------------
 * refreshRequiredAt 시점이 지나면 assertWorldMapPolicyIsFresh() 가 두 공식
 * URL 과 validThrough 을 한국어 메시지에 담아 던집니다. 정책은 갱신 후에만
 * 다시 살아납니다.
 *
 * 갱신 시 다음을 함께 갱신하세요 (한 곳만 갱신하지 마세요):
 *   - 두 공식 URL 에서 최신 여행금지 국가/지역 표를 다시 확인
 *     *   - 공식 현재 여행금지 국가/지역: officialCurrentStatusUrl
 *     *   - 공식 정기 조정 공지: officialAdjustmentNoticeUrl
 *   - OFFICIAL_WHOLE_COUNTRY_BAN_M49 (전국 단위 금지 10개)
 *   - 부분 금지만 있는 국가는 절대 본 Set 에 포함하지 않음
 *     (예: 니제르 562 는 광범위 금지지만 전국 금지가 아니므로 제외)
 *   - NON_SELECTABLE_TOPOLOGY_ALIASES (Somaliland 처럼 ID-less 인 별칭)
 *     별칭에 M49 를 임의로 부여하지 않습니다
 *   - noticeTitle / noticeDate / lastVerifiedAt
 *   - validThrough / refreshRequiredAt (한국시간 2027-02-01 00:00 KST =
 *     UTC 2027-01-31T15:00:00.000Z 가 다음 분기 기준)
 *   - 본 모듈의 Vitest 테스트와 Hermes 인벤토리 (한국어 정책 표)
 *
 * 검토가 끝나기 전까지는 fail-closed 동작을 유지합니다 — 정책을 갱신하지
 * 않고 assertWorldMapPolicyIsFresh 호출을 제거하거나 약화시키지 마세요.
 */
export const WORLD_MAP_TRAVEL_POLICY = Object.freeze({
  officialCurrentStatusUrl:
    "https://www.0404.go.kr/bbs/contsPst/MST0000000000101/1/detail",
  officialAdjustmentNoticeUrl:
    "https://0404.go.kr/bbs/embsyNtc/17/detail?ntnCd=345",
  noticeTitle: "2026년도 상반기 여행경보 정기 조정",
  noticeDate: "2026-07-13",
  lastVerifiedAt: "2026-09-11",
  // 한국시간 기준 2027-01-31 까지 유효 (inclusive).
  validThrough: "2027-01-31",
  // 한국시간 2027-02-01 00:00 KST = UTC 2027-01-31T15:00:00.000Z.
  // 본 시점을 기준으로 assertWorldMapPolicyIsFresh 가 fail-closed 동작을 강제합니다.
  refreshRequiredAt: "2027-01-31T15:00:00.000Z",
} as const);

/**
 * 외교부 0404 공식 발표 기준 전국 단위 여행금지 국가의 M49 코드.
 *
 * 본 Set 은 부분 금지만 있는 국가(예: 562 니제르)나 별도 정책에 따라
 * 비공개 처리되는 지역(예: 408 북한)을 포함하지 않습니다 — 별도 상수로
 * 다룹니다. 정책 갱신 시 두 공식 URL 의 표를 다시 확인하고,
 * 부분 금지를 절대 본 Set 에 승격하지 마세요.
 */
export const OFFICIAL_WHOLE_COUNTRY_BAN_M49: ReadonlySet<string> = new Set([
  "004", // 아프가니스탄
  "332", // 아이티
  "364", // 이란
  "368", // 이라크
  "434", // 리비아
  "466", // 말리
  "706", // 소말리아
  "729", // 수단
  "804", // 우크라이나
  "887", // 예멘
]);

/**
 * 별도 정책(공식 0404 목록과 분리)에 따라 비공개 처리되는 지역의 M49 코드.
 *
 * 북한은 외교부 0404 의 열 개 국가 목록과 별개의 정책 사유로
 * 선택을 차단합니다. 본 모듈은 그 사유를 노출하지 않으며,
 * "별도 정책" 이라는 사실만 한국어 접미사로 알려 줍니다.
 */
export const NORTH_KOREA_M49 = "408" as const;

/**
 * topology 에 M49 가 없는 (ID-less) 비공개 별칭.
 *
 * Somaliland 는 M49 가 없으며, 본 토폴로지에서 소말리아(M49 706) 와
 * 분리된 별도 shape 으로 표시됩니다. Somalia 의 전국 단위 여행금지
 * 정책을 그대로 승계하며, 본 별칭에 임의의 M49 를 부여하지 않습니다.
 *
 * 추가 시점은 갱신 절차에 따라 두 공식 URL 의 표와 함께 검토합니다.
 */
export const NON_SELECTABLE_TOPOLOGY_ALIASES = ["Somaliland"] as const;

const OFFICIAL_REASON_SUFFIX_KO = "외교부 여행금지 국가로 선택할 수 없음";
const NORTH_KOREA_REASON_SUFFIX_KO = "별도 정책에 따라 선택할 수 없음";
const ALIAS_REASON_SUFFIX_KO = "소말리아 여행금지 정책에 따라 선택할 수 없음";

export type WorldMapBlockCategory = "official" | "north-korea" | "alias";

export interface WorldMapBlockPolicy {
  category: WorldMapBlockCategory;
  reasonSuffixKo: string;
}

/**
 * 호출자가 정규화한 M49 와 topology 의 properties.name 으로
 * 차단 정책을 조회합니다.
 *
 * - m49 가 비어 있지 않으면 M49 기반 매치만 시도합니다 (별칭 매치 없음).
 * - m49 가 비어 있을 때만 topologyName 기반 매치를 시도합니다.
 *   별칭은 토폴로지에서 M49 가 없는 shape 만을 위해 존재합니다.
 *
 * 본 함수는 어떤 현지화 데이터도 import 하지 않으며, 한국어 국가명
 * 합성은 호출자(WorldMap) 의 책임입니다.
 */
export function getWorldMapBlockPolicy(
  m49: string,
  topologyName: string,
): WorldMapBlockPolicy | null {
  if (m49 !== "") {
    if (OFFICIAL_WHOLE_COUNTRY_BAN_M49.has(m49)) {
      return { category: "official", reasonSuffixKo: OFFICIAL_REASON_SUFFIX_KO };
    }
    if (m49 === NORTH_KOREA_M49) {
      return { category: "north-korea", reasonSuffixKo: NORTH_KOREA_REASON_SUFFIX_KO };
    }
    return null;
  }
  if (topologyName === "Somaliland") {
    return { category: "alias", reasonSuffixKo: ALIAS_REASON_SUFFIX_KO };
  }
  return null;
}

/**
 * 정책 갱신 시점이 지났는지 검사합니다.
 *
 * 본 함수는 정책 사용(차단 결정 적용) 직전에 호출되어야 합니다.
 * refreshRequiredAt (UTC) 시점을 넘으면 fail-closed 로 동작하며,
 * 두 공식 URL 과 validThrough 을 한국어 메시지에 담아 던집니다.
 *
 * 본 모듈의 정책 상수는 그대로 유지되며, getWorldMapBlockPolicy 의
 * 차단 결정은 만료 후에도 그대로 동작합니다 — 만료는 사용 게이트로
 * 표현되며, 정책 자체의 회수/변경이 아닙니다.
 */
export function assertWorldMapPolicyIsFresh(now: Date = new Date()): void {
  const boundary = Date.parse(WORLD_MAP_TRAVEL_POLICY.refreshRequiredAt);
  if (Number.isNaN(boundary)) {
    // refreshRequiredAt 가 손상되면 fail-closed. 침묵 통과는 금지.
    throw new Error(
      "세계 지도 여행금지 정책의 refreshRequiredAt 값을 파싱할 수 없습니다. 정책을 갱신하세요.",
    );
  }
  if (now.getTime() >= boundary) {
    throw new Error(
      `세계 지도 여행금지 정책의 갱신 시점이 지났습니다. ` +
        `두 공식 출처를 다시 확인해 정책을 갱신하세요. ` +
        `현재 정책 유효기간: ${WORLD_MAP_TRAVEL_POLICY.validThrough}까지. ` +
        `공식 현재 여행금지 국가/지역: ${WORLD_MAP_TRAVEL_POLICY.officialCurrentStatusUrl}. ` +
        `공식 정기 조정 공지: ${WORLD_MAP_TRAVEL_POLICY.officialAdjustmentNoticeUrl}.`,
    );
  }
}