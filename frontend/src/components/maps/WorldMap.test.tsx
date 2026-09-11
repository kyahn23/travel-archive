import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorldMap, type CountryData } from "./WorldMap";

// 좁은 픽스처 테스트에서만 실제 토폴로지를 대체하기 위한 홀더입니다.
// getter 로 반환값을 지연 평가하여 렌더 시점의 holder 값을 사용하게 합니다.
const geography = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("@/lib/geo/world-110m.json", async (importOriginal) => {
  // JSON 모듈의 네임스페이스 타입은 default 멤버를 노출하지 않으므로
  // 런타임 구조({ default: 실제 토폴로지 })만 좁혀서 받습니다.
  const actual = (await importOriginal()) as { default: unknown };
  return {
    get default() {
      return geography.current ?? actual.default;
    },
  };
});

afterEach(() => {
  geography.current = null;
});

// 대한민국(M49 410) + 일본(M49 392) 동적 데이터 픽스처입니다.
const WORLD_DATA: CountryData[] = [
  {
    id: "410",
    name: "대한민국",
    status: "COMPLETED",
    tripCount: 2,
    bucketCount: 0,
    recentTrips: [
      {
        id: 1,
        title: "서울 여행",
        startDate: "2026-01-02",
        endDate: "2026-01-04",
      },
    ],
  },
  { id: "392", name: "일본", status: "PLANNED", tripCount: 1, bucketCount: 0 },
];

// WorldMap 과 테스트가 공유해야 하는 색 상수입니다.
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

// ID 와 이름이 모두 없는 지형 2개로 이루어진 좁은 픽스처입니다.
const NARROW_GEO = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
      },
    },
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [[[2, 0], [3, 0], [3, 1], [2, 0]]],
      },
    },
  ],
};

function renderMap(data: CountryData[] = WORLD_DATA) {
  return render(<WorldMap data={data} />);
}

// aria-label 로 국가 path 를 찾습니다.
function countryPath(name: string) {
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

describe("WorldMap", () => {
  it("177개 국가 path 에 role=button 과 aria-label 을 부여한다 (싱가포르 제외)", () => {
    const { container } = renderMap();
    const buttons = Array.from(
      container.querySelectorAll<SVGPathElement>('path[role="button"]')
    );
    // 110m 토폴로지는 177개 지형이며, 그중 3개는 ID 가 없습니다.
    expect(buttons).toHaveLength(177);
    for (const button of buttons) {
      expect(button.getAttribute("aria-label")).toMatch(/ 상세 보기$/);
      expect(button.getAttribute("aria-pressed")).toBe("false");
      expect(button.style.outline).toBe("none");
    }
    // 동적 데이터 국가는 CountryData.name 을 씁니다.
    expect(countryPath("대한민국").getAttribute("fill")).toBe(FILL.COMPLETED);
    // 카탈로그 전용 국가는 nameKo 를 쓰고 NONE 상태입니다.
    expect(countryPath("오스트리아").getAttribute("fill")).toBe(FILL.NONE);
    // 카탈로그에 없는 국가는 토폴로지 영문 이름을 씁니다.
    expect(countryPath("Fiji").getAttribute("fill")).toBe(FILL.NONE);
    // 싱가포르는 카탈로그에 있지만 110m 토폴로지에 지형이 없어 렌더되지 않습니다.
    expect(screen.queryByLabelText("싱가포르 상세 보기")).not.toBeInTheDocument();
  });

  it("410 클릭은 대한민국 상세 시트를 열고 선택을 남기되 포커스 윤곽선은 그리지 않는다", () => {
    const { container } = renderMap();
    const korea = countryPath("대한민국");
    fireEvent.click(korea);
    expect(
      screen.getByRole("dialog", { name: "대한민국 상세" })
    ).toBeInTheDocument();
    expect(korea.getAttribute("aria-pressed")).toBe("true");
    // 선택된 국가는 어두운 hover 색을 유지합니다.
    expect(korea.getAttribute("fill")).toBe(HOVER.COMPLETED);
    expect(focusRings(container)).toHaveLength(0);
  });

  it("카탈로그만 있는 040 오스트리아도 한글 상세를 연다", () => {
    renderMap();
    const austria = countryPath("오스트리아");
    fireEvent.click(austria);
    expect(
      screen.getByRole("dialog", { name: "오스트리아 상세" })
    ).toBeInTheDocument();
    expect(austria.getAttribute("aria-pressed")).toBe("true");
    // 카탈로그 전용 국가는 NONE 상태의 어두운 색으로 선택 표시됩니다.
    expect(austria.getAttribute("fill")).toBe(HOVER.NONE);
  });

  it("패딩 없는 입력 40 은 040 지오메트리와 매칭된다", () => {
    renderMap([
      {
        id: "40",
        name: "오스트리아(동적)",
        status: "PLANNED",
        tripCount: 1,
        bucketCount: 0,
      },
    ]);
    // 동적 이름이 카탈로그 nameKo 보다 우선합니다.
    const austria = countryPath("오스트리아(동적)");
    // "40" → "040" 정규화로 오스트리아 지형에 상태가 매칭되었습니다.
    expect(austria.getAttribute("fill")).toBe(FILL.PLANNED);
    fireEvent.click(austria);
    expect(
      screen.getByRole("dialog", { name: "오스트리아(동적) 상세" })
    ).toBeInTheDocument();
  });

  it("알파-2 데모 입력 JP 는 지오메트리 392 일본과 매칭된다", () => {
    renderMap([
      {
        id: "JP",
        name: "일본",
        status: "COMPLETED",
        tripCount: 3,
        bucketCount: 0,
        recentTrips: [
          {
            id: 2,
            title: "오사카 여행",
            startDate: "2026-05-10",
            endDate: "2026-05-14",
          },
        ],
      },
    ]);
    const japan = countryPath("일본");
    // "JP" 가 카탈로그 별칭을 통해 M49 392 지형에 매칭되었습니다.
    expect(japan.getAttribute("fill")).toBe(FILL.COMPLETED);
    fireEvent.click(japan);
    expect(
      screen.getByRole("dialog", { name: "일본 상세" })
    ).toBeInTheDocument();
    expect(japan.getAttribute("aria-pressed")).toBe("true");
  });

  it("Fiji 는 영문 이름을 쓰고 이전 대한민국 상세를 물려받지 않는다", () => {
    renderMap();
    const korea = countryPath("대한민국");
    fireEvent.click(korea);
    expect(
      screen.getByRole("dialog", { name: "대한민국 상세" })
    ).toBeInTheDocument();

    const fiji = countryPath("Fiji");
    fireEvent.click(fiji);
    // 이전 선택의 한글 상세/상태가 남지 않고 Fiji 로 교체됩니다.
    expect(
      screen.getByRole("dialog", { name: "Fiji 상세" })
    ).toBeInTheDocument();
    expect(fiji.getAttribute("aria-pressed")).toBe("true");
    expect(fiji.getAttribute("fill")).toBe(HOVER.NONE);
    expect(korea.getAttribute("aria-pressed")).toBe("false");
  });

  it("ID 없는 지형도 독립적인 aria-pressed 를 가진다", () => {
    renderMap();
    const northCyprus = countryPath("N. Cyprus");
    const somaliland = countryPath("Somaliland");
    expect(northCyprus.getAttribute("aria-pressed")).toBe("false");
    expect(somaliland.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(northCyprus);
    expect(northCyprus.getAttribute("aria-pressed")).toBe("true");
    expect(somaliland.getAttribute("aria-pressed")).toBe("false");

    // 다른 ID 없는 지형 활성화는 선택을 교체합니다 (빈 키 충돌 없음).
    fireEvent.click(somaliland);
    expect(somaliland.getAttribute("aria-pressed")).toBe("true");
    expect(northCyprus.getAttribute("aria-pressed")).toBe("false");
  });

  it("ID/이름 없는 좁은 픽스처는 알 수 없는 지역 라벨을 쓰고 빈 키로 충돌하지 않는다", () => {
    geography.current = NARROW_GEO;
    renderMap([]);
    const unknowns = screen.queryAllByLabelText("알 수 없는 지역 상세 보기");
    expect(unknowns).toHaveLength(2);

    fireEvent.click(unknowns[0]);
    expect(unknowns[0].getAttribute("aria-pressed")).toBe("true");
    expect(unknowns[1].getAttribute("aria-pressed")).toBe("false");
    expect(
      screen.getByRole("dialog", { name: "알 수 없는 지역 상세" })
    ).toBeInTheDocument();
  });

  it("Enter 키는 국가를 선택하고 상세 시트를 연다", () => {
    const restore = stubFocusVisible();
    try {
      const { container } = renderMap();
      const korea = countryPath("대한민국");
      fireEvent.focus(korea);
      fireEvent.keyDown(korea, { key: "Enter" });
      expect(korea.getAttribute("aria-pressed")).toBe("true");
      expect(korea.getAttribute("fill")).toBe(HOVER.COMPLETED);
      expect(
        screen.getByRole("dialog", { name: "대한민국 상세" })
      ).toBeInTheDocument();
      expect(focusRings(container)).toHaveLength(2);
    } finally {
      restore();
    }
  });

  it("Space 키는 국가를 활성화하며 기본 동작을 막는다", () => {
    const restore = stubFocusVisible();
    try {
      renderMap();
      const japan = countryPath("일본");
      fireEvent.focus(japan);
      const spaceEvent = createEvent.keyDown(japan, { key: " " });
      fireEvent(japan, spaceEvent);
      expect(spaceEvent.defaultPrevented).toBe(true);
      expect(japan.getAttribute("aria-pressed")).toBe("true");
      expect(
        screen.getByRole("dialog", { name: "일본 상세" })
      ).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it("키 반복과 관련 없는 키는 무시한다", () => {
    const restore = stubFocusVisible();
    try {
      renderMap();
      const korea = countryPath("대한민국");
      fireEvent.focus(korea);
      const repeatEvent = createEvent.keyDown(korea, {
        key: "Enter",
        repeat: true,
      });
      fireEvent(korea, repeatEvent);
      expect(repeatEvent.defaultPrevented).toBe(true);
      expect(korea.getAttribute("aria-pressed")).toBe("false");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      const repeatSpaceEvent = createEvent.keyDown(korea, {
        key: " ",
        repeat: true,
      });
      fireEvent(korea, repeatSpaceEvent);
      expect(repeatSpaceEvent.defaultPrevented).toBe(true);
      expect(korea.getAttribute("aria-pressed")).toBe("false");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      const otherEvent = createEvent.keyDown(korea, { key: "a" });
      fireEvent(korea, otherEvent);
      expect(otherEvent.defaultPrevented).toBe(false);
      expect(korea.getAttribute("aria-pressed")).toBe("false");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it("다른 국가 활성화는 선택을 교체한다", () => {
    renderMap();
    const korea = countryPath("대한민국");
    const japan = countryPath("일본");
    fireEvent.click(korea);
    expect(korea.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(japan);
    expect(korea.getAttribute("aria-pressed")).toBe("false");
    // 선택이 해제된 대한민국은 기본 색으로 돌아갑니다.
    expect(korea.getAttribute("fill")).toBe(FILL.COMPLETED);
    expect(japan.getAttribute("aria-pressed")).toBe("true");
    expect(japan.getAttribute("fill")).toBe(HOVER.PLANNED);
    expect(
      screen.getByRole("dialog", { name: "일본 상세" })
    ).toBeInTheDocument();
  });

  it("선택된 국가는 mouse leave 후에도 어두운 채우기를 유지한다", () => {
    renderMap();
    const korea = countryPath("대한민국");
    fireEvent.mouseEnter(korea);
    expect(korea.getAttribute("fill")).toBe(HOVER.COMPLETED);
    fireEvent.click(korea);
    fireEvent.mouseLeave(korea);
    expect(korea.getAttribute("fill")).toBe(HOVER.COMPLETED);
    expect(korea.getAttribute("aria-pressed")).toBe("true");
    // 미선택 국가는 hover 해제 시 기본 색으로 돌아갑니다.
    const japan = countryPath("일본");
    fireEvent.mouseEnter(japan);
    expect(japan.getAttribute("fill")).toBe(HOVER.PLANNED);
    fireEvent.mouseLeave(japan);
    expect(japan.getAttribute("fill")).toBe(FILL.PLANNED);
  });

  it("상세 닫기 버튼은 시트를 닫고 선택을 해제한다", () => {
    renderMap();
    const korea = countryPath("대한민국");
    fireEvent.click(korea);
    fireEvent.click(screen.getByTestId("desktop-close"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(korea.getAttribute("aria-pressed")).toBe("false");
    expect(korea.getAttribute("fill")).toBe(FILL.COMPLETED);
  });

  it("Escape 는 시트를 닫고 선택을 해제한다", () => {
    renderMap();
    const korea = countryPath("대한민국");
    fireEvent.click(korea);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(korea.getAttribute("aria-pressed")).toBe("false");
    expect(korea.getAttribute("fill")).toBe(FILL.COMPLETED);
  });

  it("포커스 변형 스타일도 outline 을 끄고 포인터 커서를 유지한다", () => {
    const restore = stubFocusVisible();
    try {
      renderMap();
      const korea = countryPath("대한민국");
      fireEvent.focus(korea);
      expect(korea.style.outline).toBe("none");
      expect(korea.style.cursor).toBe("pointer");
    } finally {
      restore();
    }
  });

  it("포커스 윤곽선은 두 겹의 비대화형 path 로 대상과 같은 경로를 그린다", () => {
    const restore = stubFocusVisible();
    try {
      const { container } = renderMap();
      const korea = countryPath("대한민국");
      fireEvent.focus(korea);
      const rings = focusRings(container);
      expect(rings).toHaveLength(2);
      const [outer, inner] = rings;
      expect(outer.getAttribute("data-map-focus-ring")).toBe("outer");
      expect(inner.getAttribute("data-map-focus-ring")).toBe("inner");
      for (const ring of rings) {
        expect(ring.getAttribute("d")).toBe(korea.getAttribute("d"));
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
      const korea = countryPath("대한민국");
      fireEvent.focus(korea);
      fireEvent.keyDown(korea, { key: "Enter" });
      expect(focusRings(container)).toHaveLength(2);
      fireEvent.blur(korea);
      expect(focusRings(container)).toHaveLength(0);
      expect(korea.getAttribute("aria-pressed")).toBe("true");
      expect(korea.getAttribute("fill")).toBe(HOVER.COMPLETED);
      expect(
        screen.getByRole("dialog", { name: "대한민국 상세" })
      ).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it("포커스 윤곽선은 모든 대화형 path 뒤에 위치한다", () => {
    const restore = stubFocusVisible();
    try {
      const { container } = renderMap();
      const korea = countryPath("대한민국");
      fireEvent.focus(korea);
      const paths = Array.from(container.querySelectorAll<SVGPathElement>("path"));
      const firstRingIndex = paths.findIndex((p) =>
        p.hasAttribute("data-map-focus-ring")
      );
      expect(firstRingIndex).toBe(paths.length - 2);
      expect(
        paths.filter((p) => p.getAttribute("role") === "button")
      ).toHaveLength(177);
    } finally {
      restore();
    }
  });
});
