import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KoreaMap, type RegionData } from "./KoreaMap";

// 지도에 전달할 지역 데이터 픽스처입니다.
const REGIONS: RegionData[] = [
  {
    code: "KR-11",
    name: "서울특별시",
    status: "COMPLETED",
    tripCount: 2,
    bucketCount: 0,
    recentTrips: [
      {
        id: 1,
        title: "서울 콘서트 여행",
        startDate: "2026-01-02",
        endDate: "2026-01-04",
      },
    ],
  },
  { code: "KR-26", name: "부산광역시", status: "PLANNED", tripCount: 1, bucketCount: 0 },
  { code: "KR-42", name: "강원특별자치도", status: "BUCKET", tripCount: 0, bucketCount: 3 },
];

// KoreaMap 과 테스트가 공유해야 하는 색 상수입니다.
const FILL = {
  COMPLETED: "#14B8A6",
  PLANNED: "#FF6B54",
  BUCKET: "#A78BFA",
  NONE: "#EBE9D9",
} as const;
const HOVER = {
  COMPLETED: "#0D9488",
  PLANNED: "#E8523B",
  BUCKET: "#8B5CF6",
  NONE: "#DDD9C4",
} as const;

function renderMap() {
  return render(<KoreaMap data={REGIONS} />);
}

// aria-label 로 지역 path 를 찾습니다.
function regionPath(name: string) {
  return screen.getByLabelText(`${name} 상세 보기`) as unknown as SVGPathElement;
}

// 포커스 윤곽선 overlay path 들을 반환합니다.
function focusRings(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<SVGPathElement>('[data-map-focus-ring]')
  );
}

// jsdom 은 :focus-visible 을 항상 false 로 평가하므로 키보드 포커스 케이스에서만 스텁합니다.
function stubFocusVisible() {
  const original = SVGElement.prototype.matches;
  SVGElement.prototype.matches = function (this: SVGElement, selector: string) {
    if (selector === ":focus-visible") return true;
    return original.call(this, selector);
  };
  return () => {
    SVGElement.prototype.matches = original;
  };
}

describe("KoreaMap", () => {
  it("17개 시/도 path 에 role=button 과 한글 aria-label 을 부여한다", () => {
    const { container } = renderMap();
    const buttons = Array.from(
      container.querySelectorAll<SVGPathElement>('path[role="button"]')
    );
    expect(buttons).toHaveLength(17);
    for (const button of buttons) {
      expect(button.getAttribute("aria-label")).toMatch(/ 상세 보기$/);
      expect(button.getAttribute("aria-pressed")).toBe("false");
      expect(button.style.outline).toBe("none");
    }
    // 데이터에 있는 지역은 RegionData.name 을 씁니다.
    expect(regionPath("서울특별시")).toBeInTheDocument();
    expect(regionPath("부산광역시")).toBeInTheDocument();
    // 데이터에 없는 지역은 GeoJSON 이름을 씁니다.
    expect(regionPath("세종특별자치시")).toBeInTheDocument();
    expect(regionPath("세종특별자치시").getAttribute("fill")).toBe(FILL.NONE);
  });

  it("포인터 클릭은 상세 시트를 열고 선택을 남기되 포커스 윤곽선은 그리지 않는다", () => {
    const { container } = renderMap();
    const seoul = regionPath("서울특별시");
    fireEvent.click(seoul);
    expect(
      screen.getByRole("dialog", { name: "서울특별시 상세" })
    ).toBeInTheDocument();
    expect(seoul.getAttribute("aria-pressed")).toBe("true");
    // 선택된 지역은 어두운 hover 색을 유지합니다.
    expect(seoul.getAttribute("fill")).toBe(HOVER.COMPLETED);
    expect(focusRings(container)).toHaveLength(0);
  });

  it("Enter 키는 지역을 선택하고 상세 시트를 연다", () => {
    const restore = stubFocusVisible();
    try {
      const { container } = renderMap();
      const seoul = regionPath("서울특별시");
      fireEvent.focus(seoul);
      fireEvent.keyDown(seoul, { key: "Enter" });
      expect(seoul.getAttribute("aria-pressed")).toBe("true");
      expect(seoul.getAttribute("fill")).toBe(HOVER.COMPLETED);
      expect(
        screen.getByRole("dialog", { name: "서울특별시 상세" })
      ).toBeInTheDocument();
      expect(focusRings(container)).toHaveLength(2);
    } finally {
      restore();
    }
  });

  it("Space 키는 지역을 활성화하며 기본 동작을 막는다", () => {
    const restore = stubFocusVisible();
    try {
      renderMap();
      const busan = regionPath("부산광역시");
      fireEvent.focus(busan);
      const spaceEvent = createEvent.keyDown(busan, { key: " " });
      fireEvent(busan, spaceEvent);
      expect(spaceEvent.defaultPrevented).toBe(true);
      expect(busan.getAttribute("aria-pressed")).toBe("true");
      expect(
        screen.getByRole("dialog", { name: "부산광역시 상세" })
      ).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it("키 반복과 관련 없는 키는 무시한다", () => {
    const restore = stubFocusVisible();
    try {
      renderMap();
      const seoul = regionPath("서울특별시");
      fireEvent.focus(seoul);
      const repeatEvent = createEvent.keyDown(seoul, {
        key: "Enter",
        repeat: true,
      });
      fireEvent(seoul, repeatEvent);
      expect(repeatEvent.defaultPrevented).toBe(true);
      expect(seoul.getAttribute("aria-pressed")).toBe("false");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      const repeatSpaceEvent = createEvent.keyDown(seoul, {
        key: " ",
        repeat: true,
      });
      fireEvent(seoul, repeatSpaceEvent);
      expect(repeatSpaceEvent.defaultPrevented).toBe(true);
      expect(seoul.getAttribute("aria-pressed")).toBe("false");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      const otherEvent = createEvent.keyDown(seoul, { key: "a" });
      fireEvent(seoul, otherEvent);
      expect(otherEvent.defaultPrevented).toBe(false);
      expect(seoul.getAttribute("aria-pressed")).toBe("false");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it("다른 지역 활성화는 선택을 교체한다", () => {
    renderMap();
    const seoul = regionPath("서울특별시");
    const busan = regionPath("부산광역시");
    fireEvent.click(seoul);
    expect(seoul.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(busan);
    expect(seoul.getAttribute("aria-pressed")).toBe("false");
    // 선택이 해제된 서울은 기본 색으로 돌아갑니다.
    expect(seoul.getAttribute("fill")).toBe(FILL.COMPLETED);
    expect(busan.getAttribute("aria-pressed")).toBe("true");
    expect(busan.getAttribute("fill")).toBe(HOVER.PLANNED);
    expect(
      screen.getByRole("dialog", { name: "부산광역시 상세" })
    ).toBeInTheDocument();
  });

  it("선택된 지역은 mouse leave 후에도 어두운 채우기를 유지한다", () => {
    renderMap();
    const seoul = regionPath("서울특별시");
    fireEvent.mouseEnter(seoul);
    expect(seoul.getAttribute("fill")).toBe(HOVER.COMPLETED);
    fireEvent.click(seoul);
    fireEvent.mouseLeave(seoul);
    expect(seoul.getAttribute("fill")).toBe(HOVER.COMPLETED);
    expect(seoul.getAttribute("aria-pressed")).toBe("true");
    // 미선택 지역은 hover 해제 시 기본 색으로 돌아갑니다.
    const busan = regionPath("부산광역시");
    fireEvent.mouseEnter(busan);
    expect(busan.getAttribute("fill")).toBe(HOVER.PLANNED);
    fireEvent.mouseLeave(busan);
    expect(busan.getAttribute("fill")).toBe(FILL.PLANNED);
  });

  it("상세 닫기 버튼은 시트를 닫고 선택을 해제한다", () => {
    renderMap();
    const seoul = regionPath("서울특별시");
    fireEvent.click(seoul);
    fireEvent.click(screen.getByTestId("desktop-close"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(seoul.getAttribute("aria-pressed")).toBe("false");
    expect(seoul.getAttribute("fill")).toBe(FILL.COMPLETED);
  });

  it("Escape 는 시트를 닫고 선택을 해제한다", () => {
    renderMap();
    const seoul = regionPath("서울특별시");
    fireEvent.click(seoul);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(seoul.getAttribute("aria-pressed")).toBe("false");
    expect(seoul.getAttribute("fill")).toBe(FILL.COMPLETED);
  });

  it("포커스 변형 스타일도 outline 을 끄고 포인터 커서를 유지한다", () => {
    const restore = stubFocusVisible();
    try {
      renderMap();
      const seoul = regionPath("서울특별시");
      fireEvent.focus(seoul);
      expect(seoul.style.outline).toBe("none");
      expect(seoul.style.cursor).toBe("pointer");
    } finally {
      restore();
    }
  });

  it("포커스 윤곽선은 두 겹의 비대화형 path 로 대상과 같은 경로를 그린다", () => {
    const restore = stubFocusVisible();
    try {
      const { container } = renderMap();
      const seoul = regionPath("서울특별시");
      fireEvent.focus(seoul);
      const rings = focusRings(container);
      expect(rings).toHaveLength(2);
      const [outer, inner] = rings;
      expect(outer.getAttribute("data-map-focus-ring")).toBe("outer");
      expect(inner.getAttribute("data-map-focus-ring")).toBe("inner");
      for (const ring of rings) {
        expect(ring.getAttribute("d")).toBe(seoul.getAttribute("d"));
        expect(ring.getAttribute("fill")).toBe("none");
        expect(ring.getAttribute("pointer-events")).toBe("none");
        expect(ring.getAttribute("aria-hidden")).toBe("true");
        expect(ring.getAttribute("focusable")).toBe("false");
        expect(ring.getAttribute("vector-effect")).toBe("non-scaling-stroke");
        expect(ring.getAttribute("stroke-linejoin")).toBe("round");
        expect(ring.getAttribute("stroke-linecap")).toBe("round");
      }
      expect(outer.getAttribute("stroke")).toBe("#FFFFFF");
      expect(outer.getAttribute("stroke-width")).toBe("4");
      expect(inner.getAttribute("stroke")).toBe("hsl(var(--foreground))");
      expect(inner.getAttribute("stroke-width")).toBe("2");
    } finally {
      restore();
    }
  });

  it("blur 는 포커스 윤곽선만 제거하고 선택을 유지한다", () => {
    const restore = stubFocusVisible();
    try {
      const { container } = renderMap();
      const seoul = regionPath("서울특별시");
      fireEvent.focus(seoul);
      fireEvent.keyDown(seoul, { key: "Enter" });
      expect(focusRings(container)).toHaveLength(2);
      fireEvent.blur(seoul);
      expect(focusRings(container)).toHaveLength(0);
      expect(seoul.getAttribute("aria-pressed")).toBe("true");
      expect(seoul.getAttribute("fill")).toBe(HOVER.COMPLETED);
      expect(
        screen.getByRole("dialog", { name: "서울특별시 상세" })
      ).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it("포커스 윤곽선은 모든 대화형 path 뒤에 위치한다", () => {
    const restore = stubFocusVisible();
    try {
      const { container } = renderMap();
      const seoul = regionPath("서울특별시");
      fireEvent.focus(seoul);
      const paths = Array.from(container.querySelectorAll<SVGPathElement>("path"));
      const firstRingIndex = paths.findIndex((p) =>
        p.hasAttribute("data-map-focus-ring")
      );
      expect(firstRingIndex).toBe(paths.length - 2);
      expect(
        paths.filter((p) => p.getAttribute("role") === "button")
      ).toHaveLength(17);
      // 대화형 path 는 소스 순서를 유지합니다 (첫 path = 서울).
      expect(paths[0].getAttribute("aria-label")).toBe("서울특별시 상세 보기");
    } finally {
      restore();
    }
  });
});
