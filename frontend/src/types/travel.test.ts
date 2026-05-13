import { describe, expect, it } from 'vitest';
import {
  BUCKET_STATUS_LABEL,
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
      domesticRegionId: 1,
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
      countryId: 17,
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
      countryId: 17,
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
});
