import { describe, expect, it } from 'vitest';
import { formatPopupContent, type MarkerData } from './MapMarker';

/**
 * MapMarker 관련 테스트는 팝업 문자열이 안전하게 이스케이프되는지 확인합니다.
 *
 * TypeScript 문법 설명:
 * - `Partial<MarkerData>` 는 `MarkerData` 의 모든 필드를 강제하지 않고
 *   일부만 덮어쓸 수 있게 해 주는 제네릭 유틸리티 타입입니다.
 * - `: MarkerData` 와 같은 반환 타입 표시는 함수가 어떤 객체 모양을 돌려주는지
 *   컴파일 시점에 검증하도록 돕습니다.
 */
function marker(overrides: Partial<MarkerData>): MarkerData {
  return {
    id: 1,
    title: 'Title',
    placeName: 'Place',
    visitedAt: '2025-01-01T09:30:00.000Z',
    latitude: 37.5665,
    longitude: 126.978,
    status: 'COMPLETED',
    ...overrides,
  };
}

describe('formatPopupContent', () => {
  it('escapes script tags in user-provided marker title', () => {
    const content = formatPopupContent(marker({ title: '<script>alert("xss")</script>' }));

    // `toContain` / `not.toContain` 는 실제 문자열 결과를 부분 검사합니다.
    expect(content).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(content).not.toContain('<script>');
    expect(content).not.toContain('</script>');
  });

  it('escapes ampersands and angle brackets in place names', () => {
    const content = formatPopupContent(marker({ placeName: 'A & B <Cafe>' }));

    expect(content).toContain('A &amp; B &lt;Cafe&gt;');
    expect(content).not.toContain('A & B <Cafe>');
  });
});
