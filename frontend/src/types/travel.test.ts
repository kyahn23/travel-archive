import { describe, expect, it } from 'vitest';
import worldCountries110m from '@/lib/geo/world-110m.json';
import {
  BUCKET_STATUS_LABEL,
  COUNTRIES,
  TRIP_STATUS_LABEL,
  type BucketStatus,
  type CreateBucketPayload,
  type CreateTripPayload,
  type TripStatus,
} from './travel';

/**
 * 이 파일은 "타입 정의가 실제 데이터 모양과 맞는지"를 확인하는 테스트입니다.
 *
 * TypeScript 문법 설명:
 * - `type BucketStatus`, `type CreateTripPayload` 처럼 `type` 키워드가 붙은 import는
 *   런타임 값이 아니라 타입 정보만 가져오는 "타입 전용 import" 입니다.
 * - 이런 import는 JavaScript에는 없고, 컴파일 시점에만 의미가 있습니다.
 * - `satisfies` 는 "이 객체가 해당 타입 규칙을 만족하는지"만 검사하고,
 *   객체의 실제 리터럴 형태는 최대한 보존합니다.
 */
describe('travel DTO types', () => {
  it('models the required trip creation fields sent to the backend', () => {
    const payload = {
      title: 'Seoul weekend',
      travelScope: 'DOMESTIC',
      domesticRegionId: 'KR-11',
      startDate: '2026-05-01',
      endDate: '2026-05-03',
      status: 'PLANNED',
    } satisfies CreateTripPayload;

    // `Object.keys(...)` 는 실제 런타임 객체의 키 순서를 확인합니다.
    // `satisfies` 덕분에 이 객체는 `CreateTripPayload` 규칙을 지키면서도
    // 불필요하게 타입을 넓히지 않습니다.
    expect(Object.keys(payload)).toEqual([
      'title',
      'travelScope',
      'domesticRegionId',
      'startDate',
      'endDate',
      'status',
    ]);
    expect(payload.travelScope).toBe('DOMESTIC');
  });

  it('models bucket creation fields expected by the backend', () => {
    const payload = {
      title: 'Swiss Alps trek',
      travelScope: 'INTERNATIONAL',
      countryId: 'CH',
      expectedBudget: 2500000,
      desiredSeason: 'SUMMER',
      priority: 1,
      status: 'WANT_TO_GO',
      referenceUrl: 'https://example.com/alps',
      memo: 'Bring hiking gear',
      startDate: null,
      endDate: null,
    } satisfies CreateBucketPayload;

    // `toMatchObject` 는 전체 객체의 모든 속성을 다 적지 않아도,
    // 핵심 필드가 올바른지 부분 비교할 수 있게 해 줍니다.
    expect(payload).toMatchObject({
      title: 'Swiss Alps trek',
      travelScope: 'INTERNATIONAL',
      countryId: 'CH',
      status: 'WANT_TO_GO',
    });
  });

  it('keeps status labels aligned with the allowed status unions', () => {
    // `TripStatus[]` / `BucketStatus[]` 는 "이 배열 원소는 이 타입 중 하나여야 한다"는 뜻입니다.
    // JavaScript 배열에 타입 안전성을 더한 형태라고 이해하면 됩니다.
    const tripTransitions: TripStatus[] = ['PLANNED', 'COMPLETED', 'CANCELLED'];
    const bucketTransitions: BucketStatus[] = ['WANT_TO_GO', 'PLANNING', 'BOOKED', 'VISITED', 'ON_HOLD'];

    expect(Object.keys(TRIP_STATUS_LABEL)).toEqual(tripTransitions);
    expect(Object.keys(BUCKET_STATUS_LABEL)).toEqual(bucketTransitions);
  });

  it('locks the COUNTRIES catalog to the canonical alpha-2 / M49 / Korean triple', () => {
    // 전체 배열 동등성 — order, code, mapKey, nameKo 모두 보존.
    expect(COUNTRIES).toEqual([
      { code: 'KR', mapKey: '410', nameKo: '대한민국' },
      { code: 'JP', mapKey: '392', nameKo: '일본' },
      { code: 'US', mapKey: '840', nameKo: '미국' },
      { code: 'FR', mapKey: '250', nameKo: '프랑스' },
      { code: 'IT', mapKey: '380', nameKo: '이탈리아' },
      { code: 'ES', mapKey: '724', nameKo: '스페인' },
      { code: 'GB', mapKey: '826', nameKo: '영국' },
      { code: 'DE', mapKey: '276', nameKo: '독일' },
      { code: 'TH', mapKey: '764', nameKo: '태국' },
      { code: 'VN', mapKey: '704', nameKo: '베트남' },
      { code: 'SG', mapKey: '702', nameKo: '싱가포르' },
      { code: 'TW', mapKey: '158', nameKo: '대만' },
      { code: 'CN', mapKey: '156', nameKo: '중국' },
      { code: 'AU', mapKey: '036', nameKo: '호주' },
      { code: 'CA', mapKey: '124', nameKo: '캐나다' },
      { code: 'NZ', mapKey: '554', nameKo: '뉴질랜드' },
      { code: 'CH', mapKey: '756', nameKo: '스위스' },
      { code: 'AT', mapKey: '040', nameKo: '오스트리아' },
      { code: 'CZ', mapKey: '203', nameKo: '체코' },
      { code: 'TR', mapKey: '792', nameKo: '튀르키예' },
    ]);
  });

  it('keeps COUNTRIES structurally sound: unique codes, unique 3-digit mapKeys, nonblank Korean names', () => {
    expect(COUNTRIES).toHaveLength(20);

    const codes = COUNTRIES.map((c) => c.code);
    const mapKeys = COUNTRIES.map((c) => c.mapKey);

    // alpha-2 코드는 20개 모두 유일해야 한다.
    expect(new Set(codes).size).toBe(20);

    // mapKey 는 정확히 3자리 숫자 문자열이어야 하고, 선행 0 도 보존된다.
    for (const key of mapKeys) {
      expect(key).toMatch(/^\d{3}$/);
    }
    expect(new Set(mapKeys).size).toBe(20);

    // 선행 0 케이스(AU=036, AT=040) 가 실제로 살아 있는지 별도 검증.
    expect(COUNTRIES.find((c) => c.code === 'AU')?.mapKey).toBe('036');
    expect(COUNTRIES.find((c) => c.code === 'AT')?.mapKey).toBe('040');

    // 한국어 이름은 비어 있으면 안 된다.
    for (const country of COUNTRIES) {
      expect(country.nameKo.trim().length).toBeGreaterThan(0);
    }

    // cross-index alias collision: 어느 entry 의 mapKey 도 다른 entry 의 alpha-2 와 겹치면 안 된다.
    const codeSet: Set<string> = new Set(codes);
    for (const key of mapKeys) {
      expect(codeSet.has(key)).toBe(false);
    }
  });

  it('agrees with the world topology: 19 catalog M49 keys resolve in world-110m.json, only SG/702 is absent', () => {
    // 세계 지도 Topology 의 geometry id 는 M49 코드와 동일한 선행-0 보존 문자열이다.
    const topologyIds = new Set(
      worldCountries110m.objects.countries.geometries.map((g) => g.id),
    );

    const catalogKeys = COUNTRIES.map((c) => c.mapKey);
    const present = catalogKeys.filter((k) => topologyIds.has(k));
    const absent = catalogKeys.filter((k) => !topologyIds.has(k));

    expect(present).toHaveLength(19);
    expect(absent).toEqual(['702']);
  });
});
