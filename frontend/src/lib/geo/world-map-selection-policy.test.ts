import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worldCountries110m from '@/lib/geo/world-110m.json';
import {
  assertWorldMapPolicyIsFresh,
  getWorldMapBlockPolicy,
  NON_SELECTABLE_TOPOLOGY_ALIASES,
  NORTH_KOREA_M49,
  OFFICIAL_WHOLE_COUNTRY_BAN_M49,
  WORLD_MAP_TRAVEL_POLICY,
} from './world-map-selection-policy';

type TopologyGeometry = {
  id?: string;
  type: string;
  arcs: unknown;
  properties: { name: string };
};

const topologies = (
  worldCountries110m as unknown as {
    objects: { countries: { geometries: TopologyGeometry[] } };
  }
).objects.countries.geometries;

const topologyM49Set = new Set<string>(
  topologies
    .filter((g) => g.id !== undefined && g.id !== '')
    .map((g) => String(g.id)),
);

const topologyIdLessNames = topologies
  .filter((g) => g.id === undefined || g.id === '')
  .map((g) => g.properties.name);

const OFFICIAL_IDS = [
  '004',
  '332',
  '364',
  '368',
  '434',
  '466',
  '706',
  '729',
  '804',
  '887',
] as const;

// 광범위하지만 전국 단위가 아닌 부분 금지 국가들 — 차단 Set 에 절대 포함하지 않음.
const PARTIAL_REGION_IDS = [
  '031', // 아제르바이잔
  '051', // 아르메니아
  '104', // 미얀마
  '112', // 벨라루스
  '180', // 콩고민주공화국
  '275', // 팔레스타인
  '376', // 이스라엘
  '418', // 라오스
  '422', // 레바논
  '562', // 니제르
  '586', // 파키스탄
  '608', // 필리핀
  '643', // 러시아
  '760', // 시리아
] as const;

describe('WORLD_MAP_TRAVEL_POLICY metadata', () => {
  it('matches the exact official source/version metadata', () => {
    expect(WORLD_MAP_TRAVEL_POLICY).toEqual({
      officialCurrentStatusUrl:
        'https://www.0404.go.kr/bbs/contsPst/MST0000000000101/1/detail',
      officialAdjustmentNoticeUrl:
        'https://0404.go.kr/bbs/embsyNtc/17/detail?ntnCd=345',
      noticeTitle: '2026년도 상반기 여행경보 정기 조정',
      noticeDate: '2026-07-13',
      lastVerifiedAt: '2026-09-11',
      validThrough: '2027-01-31',
      refreshRequiredAt: '2027-01-31T15:00:00.000Z',
    });
  });

  it('is frozen so callers cannot mutate policy fields', () => {
    expect(Object.isFrozen(WORLD_MAP_TRAVEL_POLICY)).toBe(true);
  });
});

describe('OFFICIAL_WHOLE_COUNTRY_BAN_M49', () => {
  it('contains exactly the 10 official IDs (sorted equality)', () => {
    expect(OFFICIAL_WHOLE_COUNTRY_BAN_M49.size).toBe(10);
    expect(Array.from(OFFICIAL_WHOLE_COUNTRY_BAN_M49).sort()).toEqual(
      [...OFFICIAL_IDS].sort(),
    );
  });
});

describe('NORTH_KOREA_M49', () => {
  it('is a separate identifier from the official 10-country list', () => {
    expect(NORTH_KOREA_M49).toBe('408');
    expect(OFFICIAL_WHOLE_COUNTRY_BAN_M49.has(NORTH_KOREA_M49)).toBe(false);
  });
});

describe('NON_SELECTABLE_TOPOLOGY_ALIASES', () => {
  it('contains exactly Somaliland (length 1)', () => {
    expect([...NON_SELECTABLE_TOPOLOGY_ALIASES]).toEqual(['Somaliland']);
    expect(NON_SELECTABLE_TOPOLOGY_ALIASES.length).toBe(1);
  });

  it('does not collide with any official or North Korea M49 (no alias has an M49)', () => {
    for (const alias of NON_SELECTABLE_TOPOLOGY_ALIASES) {
      expect(OFFICIAL_WHOLE_COUNTRY_BAN_M49.has(alias)).toBe(false);
      expect(String(alias) === NORTH_KOREA_M49).toBe(false);
      // 별칭은 M49 형식이 아니어야 함 (오직 ID-less topology 만을 위함).
      expect(/^[0-9]{3}$/.test(alias)).toBe(false);
    }
  });
});

describe('blocked M49 totals', () => {
  it('union of official + North Korea = 11 unique blocked M49 IDs (disjoint)', () => {
    const blocked = new Set<string>();
    OFFICIAL_WHOLE_COUNTRY_BAN_M49.forEach((id) => blocked.add(id));
    blocked.add(NORTH_KOREA_M49);
    expect(blocked.size).toBe(11);
  });
});

describe('real topology containment', () => {
  it('contains every official M49 ID', () => {
    for (const id of OFFICIAL_IDS) {
      expect(topologyM49Set.has(id)).toBe(true);
    }
  });

  it('contains North Korea M49 (408)', () => {
    expect(topologyM49Set.has(NORTH_KOREA_M49)).toBe(true);
  });

  it('contains Somaliland as one of the ID-less topology shapes', () => {
    expect(topologyIdLessNames).toContain('Somaliland');
    expect(topologyIdLessNames.length).toBe(3);
  });
});

describe('blocked topology shape count', () => {
  it('has exactly 12 visible blocked topology shapes (11 M49 + 1 Somaliland)', () => {
    const blockedM49 = new Set<string>();
    OFFICIAL_WHOLE_COUNTRY_BAN_M49.forEach((id) => blockedM49.add(id));
    blockedM49.add(NORTH_KOREA_M49);
    const blocked = topologies.filter((g) => {
      if (g.id !== undefined && g.id !== '') {
        return blockedM49.has(String(g.id));
      }
      return (NON_SELECTABLE_TOPOLOGY_ALIASES as readonly string[]).includes(
        g.properties.name,
      );
    });
    expect(blocked.length).toBe(12);
  });
});

describe('getWorldMapBlockPolicy — category and Korean reason mapping', () => {
  it.each(OFFICIAL_IDS)(
    'returns "official" policy for M49 %s',
    (id) => {
      expect(getWorldMapBlockPolicy(id, 'whatever')).toEqual({
        category: 'official',
        reasonSuffixKo: '외교부 여행금지 국가로 선택할 수 없음',
      });
    },
  );

  it('returns "north-korea" policy for M49 408', () => {
    expect(getWorldMapBlockPolicy('408', 'North Korea')).toEqual({
      category: 'north-korea',
      reasonSuffixKo: '별도 정책에 따라 선택할 수 없음',
    });
  });

  it('returns "alias" policy for Somaliland with empty M49', () => {
    expect(getWorldMapBlockPolicy('', 'Somaliland')).toEqual({
      category: 'alias',
      reasonSuffixKo: '소말리아 여행금지 정책에 따라 선택할 수 없음',
    });
  });

  it('returns null for other ID-less topology names (Kosovo, N. Cyprus)', () => {
    expect(getWorldMapBlockPolicy('', 'Kosovo')).toBeNull();
    expect(getWorldMapBlockPolicy('', 'N. Cyprus')).toBeNull();
  });
});

describe('getWorldMapBlockPolicy — partial-region whole-country IDs stay selectable', () => {
  it.each(PARTIAL_REGION_IDS)(
    'returns null (selectable) for partial-region M49 %s',
    (id) => {
      expect(getWorldMapBlockPolicy(id, 'whatever')).toBeNull();
    },
  );

  it('Niger (562) is selectable despite a broad partial-region restriction', () => {
    expect(getWorldMapBlockPolicy('562', 'Niger')).toBeNull();
  });
});

describe('assertWorldMapPolicyIsFresh — expiry tripwire (fail-closed)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes immediately before the boundary (2027-01-31T14:59:59.000Z)', () => {
    vi.setSystemTime(new Date('2027-01-31T14:59:59.000Z'));
    expect(() => assertWorldMapPolicyIsFresh()).not.toThrow();
    // 차단 결정은 만료 전후로 동일하게 동작.
    expect(getWorldMapBlockPolicy('706', 'Somalia')?.category).toBe('official');
  });

  it('throws at the exact boundary with both URLs and validThrough in Korean', () => {
    vi.setSystemTime(new Date('2027-01-31T15:00:00.000Z'));
    expect(() => assertWorldMapPolicyIsFresh()).toThrow(
      /2027-01-31/,
    );
    try {
      assertWorldMapPolicyIsFresh();
      throw new Error('expected assertWorldMapPolicyIsFresh to throw');
    } catch (caught) {
      const msg = (caught as Error).message;
      expect(msg).toContain(
        'https://www.0404.go.kr/bbs/contsPst/MST0000000000101/1/detail',
      );
      expect(msg).toContain(
        'https://0404.go.kr/bbs/embsyNtc/17/detail?ntnCd=345',
      );
      expect(msg).toContain('2027-01-31');
      expect(msg).toContain('세계 지도 여행금지 정책의 갱신 시점이 지났습니다');
    }
  });

  it('throws after the boundary (2027-02-01 KST)', () => {
    vi.setSystemTime(new Date('2027-02-01T00:00:00+09:00'));
    expect(() => assertWorldMapPolicyIsFresh()).toThrow();
  });

  it('selection predicate remains functional after the boundary — fail-closed via the freshness check only', () => {
    vi.setSystemTime(new Date('2027-02-01T00:00:00+09:00'));
    // 본 함수는 그대로 동작 — 만료는 사용 게이트로 표현됨.
    expect(getWorldMapBlockPolicy('706', 'Somalia')?.category).toBe('official');
    expect(getWorldMapBlockPolicy('408', 'North Korea')?.category).toBe(
      'north-korea',
    );
    expect(getWorldMapBlockPolicy('', 'Somaliland')?.category).toBe('alias');
    // 그러나 사용 게이트는 차단한다.
    expect(() => assertWorldMapPolicyIsFresh()).toThrow();
  });

  it('real-time clock passes before the boundary in production', () => {
    vi.setSystemTime(new Date('2026-09-11T00:00:00.000Z'));
    expect(() => assertWorldMapPolicyIsFresh()).not.toThrow();
  });
});