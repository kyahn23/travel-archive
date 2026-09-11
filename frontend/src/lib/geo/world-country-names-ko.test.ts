import worldCountries110m from './world-110m.json';
import {
  WORLD_COUNTRY_ALIASES,
  WORLD_COUNTRY_NAMES_M49,
} from './world-country-names-ko';
import { COUNTRIES } from '@/types/travel';
import { describe, expect, it } from 'vitest';

const HANGUL_RE = /[\uAC00-\uD7AF]/;
const M49_LABELS = WORLD_COUNTRY_NAMES_M49 as Record<string, string>;

describe('world-country-names-ko (generated from CLDR 48.2.0)', () => {
  const topologyGeos = worldCountries110m.objects.countries.geometries;
  const topologyNumericIds = topologyGeos
    .filter((g) => g.id)
    .map((g) => String(g.id));
  const topologyAliasIds = topologyGeos
    .filter((g) => !g.id)
    .map((g) => g.properties?.name ?? '');

  it('exposes exactly 177 topologies split into 174 numeric + 3 alias', () => {
    expect(topologyGeos).toHaveLength(177);
    expect(topologyNumericIds).toHaveLength(174);
    expect(topologyAliasIds).toHaveLength(3);
    expect(new Set(topologyNumericIds).size).toBe(174);
    expect(topologyAliasIds.sort()).toEqual([
      'Kosovo',
      'N. Cyprus',
      'Somaliland',
    ]);
  });

  it('exposes 174 three-digit M49 labels and 3 fixed aliases', () => {
    const m49Keys = Object.keys(WORLD_COUNTRY_NAMES_M49);
    expect(m49Keys).toHaveLength(174);
    expect(m49Keys.every((k) => /^\d{3}$/.test(k))).toBe(true);
    expect(new Set(m49Keys).size).toBe(174);

    const aliasKeys = Object.keys(WORLD_COUNTRY_ALIASES);
    expect(aliasKeys.sort()).toEqual([
      'Kosovo',
      'N. Cyprus',
      'Somaliland',
    ]);
  });

  it('covers every numeric topology ID and adds no extras', () => {
    const generated = new Set(Object.keys(M49_LABELS));
    const missing = topologyNumericIds.filter((id) => !generated.has(id));
    const extra = Object.keys(M49_LABELS).filter(
      (id) => !topologyNumericIds.includes(id),
    );
    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
  });

  it('uses Hangul-bearing, nonblank values for every entry', () => {
    for (const [key, value] of Object.entries(M49_LABELS)) {
      expect(typeof value).toBe('string');
      expect(value.trim().length, `blank label for ${key}`).toBeGreaterThan(0);
      expect(HANGUL_RE.test(value), `missing Hangul for ${key}`).toBe(true);
    }
    for (const [key, value] of Object.entries(WORLD_COUNTRY_ALIASES)) {
      expect(typeof value).toBe('string');
      expect(value.trim().length, `blank alias for ${key}`).toBeGreaterThan(0);
      expect(HANGUL_RE.test(value), `missing Hangul for alias ${key}`).toBe(
        true,
      );
    }
  });

  it('emits the representative current-code Korean labels from CLDR', () => {
    expect(M49_LABELS['180']).toBe('콩고-킨샤사');
    expect(M49_LABELS['626']).toBe('동티모르');
    expect(M49_LABELS['732']).toBe('서사하라');
    expect(M49_LABELS['275']).toBe('팔레스타인 지구');
    expect(M49_LABELS['010']).toBe('남극 대륙');
    expect(M49_LABELS['408']).toBe('북한');
    expect(M49_LABELS['410']).toBe('대한민국');
  });

  it('uses the documented alias spellings for the three ID-less topologies', () => {
    expect(WORLD_COUNTRY_ALIASES.Kosovo).toBe('코소보');
    expect(WORLD_COUNTRY_ALIASES['N. Cyprus']).toBe('북키프로스');
    expect(WORLD_COUNTRY_ALIASES.Somaliland).toBe('소말릴란드');
  });

  it('lets the 19 topology-present COUNTRIES catalog rows overlay the generated data', () => {
    const m49 = new Set(Object.keys(M49_LABELS));
    const aliasSet = new Set(Object.keys(WORLD_COUNTRY_ALIASES));

    const catalogKeys = COUNTRIES.map((c) => c.mapKey);
    const present = catalogKeys.filter((k) => m49.has(k));
    const absent = catalogKeys.filter((k) => !m49.has(k));
    expect(present).toHaveLength(19);
    expect(absent).toEqual(['702']);

    for (const key of present) {
      const label = M49_LABELS[key];
      expect(label.trim().length, `catalog key ${key}`).toBeGreaterThan(0);
      expect(HANGUL_RE.test(label), `catalog key ${key} not Hangul`).toBe(true);
    }

    // Australia stays catalog "호주" (override of CLDR "오스트레일리아") —
    // catalog contract is locked; resolution override is a Wave 2/3 concern.
    const au = COUNTRIES.find((c) => c.mapKey === '036');
    expect(au?.nameKo).toBe('호주');
    expect(M49_LABELS['036']).not.toBe('호주');

    expect(m49.has('702')).toBe(false);
    expect(aliasSet.has('702')).toBe(false);
  });
});