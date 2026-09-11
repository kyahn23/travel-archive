import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { WorldMap, type CountryData } from "./WorldMap";
import worldGeo from "@/lib/geo/world-110m.json";

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

// ponytail: TEST-ONLY marker. 라이브러리 <Geography> 가 emit 한 path 만 식별하기 위해
// 한 겹의 wrapper 를 더 입혀 data-geography-rendered="true" 를 stamp 한다. 차단 shape 은
// wrapper 자체를 우회한 literal <path> 이므로 marker 가 없어 165/12 분할의 근거가 된다.
// production code path 에는 없는 속성.
vi.mock("@vnedyalk0v/react19-simple-maps", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@vnedyalk0v/react19-simple-maps")
  >();
  // ponytail: TEST-ONLY marker. 라이브러리 <Geography> 가 emit 한 path 만 식별하기 위해
  // 한 겹의 wrapper 를 더 입혀 data-geography-rendered="true" 를 stamp 한다. 차단 shape 은
  // wrapper 자체를 우회한 literal <path> 이므로 marker 가 없어 165/12 분할의 근거가 된다.
  // production code path 에는 없는 속성.
  const Real = actual.Geography as unknown as React.ComponentType<
    Record<string, unknown> & { children?: ReactNode }
  >;
  const RenderedGeography = (props: Record<string, unknown>) => (
    <Real {...props} data-geography-rendered="true" />
  );
  RenderedGeography.displayName = "Geography";
  return { ...actual, Geography: RenderedGeography };
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

// 차단 경로의 고정 음영 색상 (계획 명시).
const BLOCKED_FILL_HEX = "#D1CEC2";

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

// 12 개 차단 shape 의 입력 ID / 표시명 / 사유 접미사.
// 10 개 외교부 공식 + 408 북한 + Somaliland 별칭.
const BLOCKED_SHAPES: ReadonlyArray<{
  match: (geo: { id?: string; properties?: { name?: string } }) => boolean;
  label: string;
}> = [
  { match: (g) => g.id === "004", label: "아프가니스탄, 외교부 여행금지 국가로 선택할 수 없음" },
  { match: (g) => g.id === "332", label: "아이티, 외교부 여행금지 국가로 선택할 수 없음" },
  { match: (g) => g.id === "364", label: "이란, 외교부 여행금지 국가로 선택할 수 없음" },
  { match: (g) => g.id === "368", label: "이라크, 외교부 여행금지 국가로 선택할 수 없음" },
  { match: (g) => g.id === "434", label: "리비아, 외교부 여행금지 국가로 선택할 수 없음" },
  { match: (g) => g.id === "466", label: "말리, 외교부 여행금지 국가로 선택할 수 없음" },
  { match: (g) => g.id === "706", label: "소말리아, 외교부 여행금지 국가로 선택할 수 없음" },
  { match: (g) => g.id === "729", label: "수단, 외교부 여행금지 국가로 선택할 수 없음" },
  { match: (g) => g.id === "804", label: "우크라이나, 외교부 여행금지 국가로 선택할 수 없음" },
  { match: (g) => g.id === "887", label: "예멘, 외교부 여행금지 국가로 선택할 수 없음" },
  { match: (g) => g.id === "408", label: "북한, 별도 정책에 따라 선택할 수 없음" },
  {
    match: (g) => g.properties?.name === "Somaliland",
    label: "소말릴란드, 소말리아 여행금지 정책에 따라 선택할 수 없음",
  },
];

// 부분 금지만 있는 14 개 국가 — 차단되지 않으므로 버튼으로 남아 있어야 합니다.
const PARTIAL_REGION_M49: ReadonlyArray<readonly [string, string]> = [
  ["031", "아제르바이잔"],
  ["051", "아르메니아"],
  ["104", "미얀마"],
  ["112", "벨라루스"],
  ["180", "콩고-킨샤사"],
  ["275", "팔레스타인 지구"],
  ["376", "이스라엘"],
  ["418", "라오스"],
  ["422", "레바논"],
  ["562", "니제르"],
  ["586", "파키스탄"],
  ["608", "필리핀"],
  ["643", "러시아"],
  ["760", "시리아"],
];

function renderMap(data: CountryData[] = WORLD_DATA) {
  return render(<WorldMap data={data} />);
}

// 선택 가능 경로: "${name} 상세 보기" 형식.
function countryPath(name: string) {
  return screen.getByLabelText(`${name} 상세 보기`) as unknown as SVGPathElement;
}

// 차단 경로: "<이름>, <사유 접미사>" 형식 — 라벨 전체를 그대로 넘긴다.
function blockedPath(label: string) {
  return screen.getByLabelText(label) as unknown as SVGPathElement;
}

// 차단/선택 분기를 위해 토폴로지의 shape 객체를 순서대로 가져옵니다.
function topologyGeos(): Array<{
  id?: string;
  properties?: { name?: string };
  type: string;
}> {
  const data = worldGeo as unknown as {
    objects: { countries: { geometries: Array<unknown> } };
  };
  return data.objects.countries.geometries as Array<{
    id?: string;
    properties?: { name?: string };
    type: string;
  }>;
}

// 포커스 윤곽선 overlay path 들을 반환합니다.
function focusRings(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<SVGPathElement>('[data-map-focus-ring]')
  );
}

// 모든 rsm-geography path 를 반환합니다 (차단 + 선택).
function allGeoPaths(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<SVGPathElement>("path.rsm-geography"),
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

// 차단 shape 하나에 대해 가능한 모든 입력 이벤트를 쏘고 어떤 상태 변화도
// 발생하지 않음을 확인합니다. 라벨로 찾은 path 를 직접 반환합니다.
function fireAllBlockedInputs(node: SVGPathElement, container: HTMLElement) {
  fireEvent.mouseEnter(node);
  fireEvent.mouseDown(node);
  fireEvent.click(node);
  fireEvent.pointerOver(node);
  fireEvent.pointerDown(node);
  fireEvent.pointerUp(node);
  fireEvent.click(node);
  fireEvent.touchStart(node);
  fireEvent.touchEnd(node);
  fireEvent.click(node);
  fireEvent.focus(node);
  const enterEvent = createEvent.keyDown(node, { key: "Enter" });
  fireEvent(node, enterEvent);
  const spaceEvent = createEvent.keyDown(node, { key: " " });
  fireEvent(node, spaceEvent);

  return {
    fill: node.getAttribute("fill"),
    ariaPressed: node.getAttribute("aria-pressed"),
    dataSelectable: node.getAttribute("data-map-selectable"),
    tabIndex: node.getAttribute("tabindex"),
    pointerEvents: node.getAttribute("pointer-events"),
    role: node.getAttribute("role"),
    dialog: screen.queryByRole("dialog"),
    focusRingCount: focusRings(container).length,
  };
}

describe("WorldMap", () => {
  it("177 개 path 가 모두 DOM 에 존재하며 165 개 button / 12 개 img 로 정확히 분할된다", () => {
    const { container } = renderMap();
    // 토폴로지 path 가 DOM 에 모두 존재 (block 으로 숨기지 않음).
    expect(allGeoPaths(container)).toHaveLength(177);
    const buttons = container.querySelectorAll<SVGPathElement>(
      'path.rsm-geography[role="button"]',
    );
    const imgs = container.querySelectorAll<SVGPathElement>(
      'path.rsm-geography[role="img"]',
    );
    expect(buttons).toHaveLength(165);
    expect(imgs).toHaveLength(12);

    // tabIndex 분할: 선택 가능은 0, 차단은 -1.
    const tabIdxZero = container.querySelectorAll<SVGPathElement>(
      'path.rsm-geography[tabindex="0"]',
    );
    const tabIdxNegOne = container.querySelectorAll<SVGPathElement>(
      'path.rsm-geography[tabindex="-1"]',
    );
    expect(tabIdxZero).toHaveLength(165);
    expect(tabIdxNegOne).toHaveLength(12);

    // Geography wrapper marker 분할: 165 selectable 은 marker 가 있고, 12 blocked
    // literal path 는 wrapper 자체를 우회했으므로 marker 가 없다 — 이 분할이
    // 165 selectable Geography / 12 blocked literal <path> 의 root cause 식별 근거다.
    const rendered = container.querySelectorAll<SVGPathElement>(
      'path.rsm-geography[data-geography-rendered="true"]',
    );
    const notRendered = container.querySelectorAll<SVGPathElement>(
      'path.rsm-geography:not([data-geography-rendered])',
    );
    expect(rendered).toHaveLength(165);
    expect(notRendered).toHaveLength(12);
    expect(rendered.length + notRendered.length).toBe(177);

    // 각 selectable 는 aria-pressed="false" 와 outline=none 를 유지한다.
    for (const button of Array.from(buttons)) {
      expect(button.getAttribute("aria-pressed")).toBe("false");
      expect(button.getAttribute("data-map-selectable")).toBe("true");
      expect(button.style.outline).toBe("none");
    }
    // 각 blocked 는 aria-pressed 부재, data-map-selectable=false, 고정 음영.
    // literal <path> 이므로 inline style 이 없다 — cursor/outline 은 unset 이 정상.
    for (const img of Array.from(imgs)) {
      expect(img.getAttribute("aria-pressed")).toBeNull();
      expect(img.getAttribute("data-map-selectable")).toBe("false");
      expect(img.getAttribute("fill")).toBe(BLOCKED_FILL_HEX);
      expect(img.getAttribute("data-geography-rendered")).toBeNull();
      expect(img.style.cursor).toBe("");
      expect(img.style.outline).toBe("");
    }

    // 동적 데이터 국가는 카탈로그 nameKo (strict priority 1) 를 쓴다.
    expect(countryPath("대한민국").getAttribute("fill")).toBe(FILL.COMPLETED);
    // 카탈로그 전용 국가는 nameKo 를 쓰고 NONE 상태입니다.
    expect(countryPath("오스트리아").getAttribute("fill")).toBe(FILL.NONE);
    // 카탈로그 오버레이: 호주는 CLDR 오스트레일리아가 아닌 카탈로그 우선.
    expect(countryPath("호주").getAttribute("fill")).toBe(FILL.NONE);
    // 카탈로그에 없는 토폴로지 M49 는 생성된 CLDR 표를 쓴다.
    expect(countryPath("피지").getAttribute("fill")).toBe(FILL.NONE);
    // 영문 properties.name 은 어떤 ARIA 에도 나타나지 않는다.
    expect(screen.queryByLabelText("Fiji 상세 보기")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Australia 상세 보기")).not.toBeInTheDocument();
    // 싱가포르는 카탈로그에 있지만 110m 토폴로지에 지형이 없어 렌더되지 않습니다.
    expect(screen.queryByLabelText("싱가포르 상세 보기")).not.toBeInTheDocument();
  });

  it("렌더 path 순서와 실제 토폴로지를 1:1 로 zip 하면 모든 비-차단 shape 은 button 이다", () => {
    const { container } = renderMap();
    const rendered = allGeoPaths(container);
    const geos = topologyGeos();
    expect(rendered).toHaveLength(geos.length);
    expect(rendered).toHaveLength(177);

    const blockedIds = new Set([
      "004",
      "332",
      "364",
      "368",
      "434",
      "466",
      "706",
      "729",
      "804",
      "887",
      "408",
    ]);
    const blockedAliases = new Set(["Somaliland"]);

    for (let i = 0; i < rendered.length; i++) {
      const path = rendered[i];
      const geo = geos[i];
      const isBlocked =
        blockedIds.has(geo.id ?? "") || blockedAliases.has(geo.properties?.name ?? "");
      if (isBlocked) {
        expect(path.getAttribute("role")).toBe("img");
        expect(path.getAttribute("tabindex")).toBe("-1");
        expect(path.getAttribute("data-map-selectable")).toBe("false");
        expect(path.getAttribute("aria-pressed")).toBeNull();
      } else {
        expect(path.getAttribute("role")).toBe("button");
        expect(path.getAttribute("tabindex")).toBe("0");
        expect(path.getAttribute("data-map-selectable")).toBe("true");
        // 모든 비-차단 path 는 aria-label 끝이 " 상세 보기" 이다.
        const label = path.getAttribute("aria-label") ?? "";
        expect(label.endsWith(" 상세 보기")).toBe(true);
        expect(label).not.toContain(", ");
      }
    }
  });

  it.each(BLOCKED_SHAPES)(
    "$label — 차단 path 가 비-대화형 이미지로 렌더된다",
    ({ label }) => {
      const { container } = renderMap();
      const path = blockedPath(label);
      expect(path.getAttribute("role")).toBe("img");
      expect(path.getAttribute("tabindex")).toBe("-1");
      expect(path.getAttribute("data-map-selectable")).toBe("false");
      expect(path.getAttribute("aria-pressed")).toBeNull();
      expect(path.getAttribute("fill")).toBe(BLOCKED_FILL_HEX);
      expect(path.getAttribute("pointer-events")).toBe("none");
      expect(path.getAttribute("data-geography-rendered")).toBeNull();
      expect(path.style.cursor).toBe("");
      expect(path.style.outline).toBe("");
      // 같은 rsm-geography class 는 유지한다 (DOM 에 남아 있어야 한다).
      expect(path.classList.contains("rsm-geography")).toBe(true);
      // 차단 shape 의 container 어디에도 포커스 링이 없어야 한다.
      expect(focusRings(container)).toHaveLength(0);
    },
  );

  it.each(BLOCKED_SHAPES)(
    "$label — 어떤 입력 이벤트도 시트/상태/포커스/호버를 바꾸지 않는다",
    ({ label }) => {
      const { container } = renderMap();
      const path = blockedPath(label);
      // defense-in-depth only: jsdom fireEvent 는 synthetic 이라 trusted touch 가 아니다.
      // 진짜 클릭 차단은 Todo 3 의 Chromium 390x844 컨텍스트에서 검증한다.
      const after = fireAllBlockedInputs(path, container);

      // 시각적 상태 변화 없음.
      expect(after.fill).toBe(BLOCKED_FILL_HEX);
      expect(after.ariaPressed).toBeNull();
      expect(after.dataSelectable).toBe("false");
      expect(after.tabIndex).toBe("-1");
      expect(after.pointerEvents).toBe("none");
      expect(after.role).toBe("img");
      // 시트/포커스/호버 변화 없음.
      expect(after.dialog).toBeNull();
      expect(after.focusRingCount).toBe(0);
    },
  );

  it.each(BLOCKED_SHAPES)(
    "$label — 차단 path 가 이미 열린 selectable 상세를 교체하거나 닫지 않는다",
    ({ label }) => {
      const { container } = renderMap();
      // 먼저 대한민국 상세를 연다 (활성 selectable).
      const korea = countryPath("대한민국");
      fireEvent.click(korea);
      expect(
        screen.getByRole("dialog", { name: "대한민국 상세" }),
      ).toBeInTheDocument();
      const koreaPressedBefore = korea.getAttribute("aria-pressed");

      // 차단 shape 의 모든 입력 이벤트를 쏜다.
      const path = blockedPath(label);
      fireAllBlockedInputs(path, container);

      // 기존 활성 상세와 선택이 그대로 유지된다.
      expect(
        screen.getByRole("dialog", { name: "대한민국 상세" }),
      ).toBeInTheDocument();
      expect(korea.getAttribute("aria-pressed")).toBe(koreaPressedBefore);
      expect(path.getAttribute("fill")).toBe(BLOCKED_FILL_HEX);
    },
  );

  it.each(PARTIAL_REGION_M49)(
    "부분 금지만 있는 M49 %s ($koreanName) 는 차단 영향 없이 button 으로 열린다",
    (m49, koreanName) => {
      const { container } = renderMap();
      const path = countryPath(koreanName);
      expect(path.getAttribute("role")).toBe("button");
      expect(path.getAttribute("tabindex")).toBe("0");
      expect(path.getAttribute("data-map-selectable")).toBe("true");
      expect(path.getAttribute("aria-label")).toBe(`${koreanName} 상세 보기`);
      expect(path.getAttribute("aria-pressed")).toBe("false");
      fireEvent.click(path);
      expect(
        screen.getByRole("dialog", { name: `${koreanName} 상세` }),
      ).toBeInTheDocument();
      expect(path.getAttribute("aria-pressed")).toBe("true");
      fireEvent.click(screen.getByTestId("desktop-close"));
      const blockedPaths = container.querySelectorAll<SVGPathElement>(
        `path.rsm-geography[role="img"][data-map-selectable="false"]`,
      );
      const blockedLabels = Array.from(blockedPaths).map(
        (p) => p.getAttribute("aria-label") ?? "",
      );
      expect(blockedLabels.some((l) => l.startsWith(koreanName))).toBe(false);
    },
  );

  it("608 필리핀은 마우스 클릭과 키보드 Enter 로 한글 상세를 연다", () => {
    const restore = stubFocusVisible();
    try {
      const { container } = renderMap();
      const philippines = countryPath("필리핀");

      // 마우스 클릭 경로.
      fireEvent.click(philippines);
      expect(
        screen.getByRole("dialog", { name: "필리핀 상세" }),
      ).toBeInTheDocument();
      expect(philippines.getAttribute("aria-pressed")).toBe("true");
      fireEvent.click(screen.getByTestId("desktop-close"));

      // 키보드 Enter 경로.
      fireEvent.focus(philippines);
      fireEvent.keyDown(philippines, { key: "Enter" });
      expect(philippines.getAttribute("aria-pressed")).toBe("true");
      expect(
        screen.getByRole("dialog", { name: "필리핀 상세" }),
      ).toBeInTheDocument();
      expect(focusRings(container)).toHaveLength(2);
    } finally {
      restore();
    }
  });

  it("586 파키스탄은 마우스 클릭과 키보드 Space 로 한글 상세를 연다", () => {
    const restore = stubFocusVisible();
    try {
      renderMap();
      const pakistan = countryPath("파키스탄");

      // 마우스 클릭 경로.
      fireEvent.click(pakistan);
      expect(
        screen.getByRole("dialog", { name: "파키스탄 상세" }),
      ).toBeInTheDocument();
      expect(pakistan.getAttribute("aria-pressed")).toBe("true");
      fireEvent.click(screen.getByTestId("desktop-close"));

      // 키보드 Space 경로.
      fireEvent.focus(pakistan);
      const spaceEvent = createEvent.keyDown(pakistan, { key: " " });
      fireEvent(pakistan, spaceEvent);
      expect(spaceEvent.defaultPrevented).toBe(true);
      expect(pakistan.getAttribute("aria-pressed")).toBe("true");
      expect(
        screen.getByRole("dialog", { name: "파키스탄 상세" }),
      ).toBeInTheDocument();
    } finally {
      restore();
    }
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

  it("패딩 없는 입력 40 은 040 지오메트리/카탈로그로 매칭된다 (동적 영문명은 무시)", () => {
    renderMap([
      {
        id: "40",
        // 영문만 — 한글-only 가드에서 거부된다. 그래도 카탈로그가 우선이므로 결과는 동일.
        name: "Austria",
        status: "PLANNED",
        tripCount: 1,
        bucketCount: 0,
      },
    ]);
    // strict priority 1: 카탈로그 nameKo 가 dynamic name 보다 우선한다.
    const austria = countryPath("오스트리아");
    // "40" → "040" 정규화로 오스트리아 지형에 상태가 매칭되었습니다.
    expect(austria.getAttribute("fill")).toBe(FILL.PLANNED);
    fireEvent.click(austria);
    expect(
      screen.getByRole("dialog", { name: "오스트리아 상세" })
    ).toBeInTheDocument();
    // 영문 dynamic name 은 어떤 경로에도 새지 않는다.
    expect(screen.queryByLabelText("Austria 상세 보기")).not.toBeInTheDocument();
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

  it("피지는 카탈로그 외부의 토폴로지 M49 로 한국어 라벨을 쓰고 이전 대한민국 상세를 교체한다", () => {
    renderMap();
    const korea = countryPath("대한민국");
    fireEvent.click(korea);
    expect(
      screen.getByRole("dialog", { name: "대한민국 상세" })
    ).toBeInTheDocument();

    const fiji = countryPath("피지");
    fireEvent.click(fiji);
    // 이전 선택의 한글 상세/상태가 남지 않고 피지로 교체됩니다.
    expect(
      screen.getByRole("dialog", { name: "피지 상세" })
    ).toBeInTheDocument();
    expect(fiji.getAttribute("aria-pressed")).toBe("true");
    expect(fiji.getAttribute("fill")).toBe(HOVER.NONE);
    expect(korea.getAttribute("aria-pressed")).toBe("false");
  });

  it("호주는 카탈로그 오버레이로 CLDR 오스트레일리아를 덮어쓴다", () => {
    renderMap();
    const australia = countryPath("호주");
    expect(australia.getAttribute("fill")).toBe(FILL.NONE);
    fireEvent.click(australia);
    expect(
      screen.getByRole("dialog", { name: "호주 상세" })
    ).toBeInTheDocument();
    expect(australia.getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByLabelText("오스트레일리아 상세 보기")).not.toBeInTheDocument();
  });

  it("코소보 (ID-less) 는 별칭으로 한국어 라벨을 쓰고 상세를 연다", () => {
    renderMap();
    const kosovo = countryPath("코소보");
    expect(kosovo.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(kosovo);
    // 코소보는 정책상 차단되지 않으므로 정상 선택.
    expect(kosovo.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByRole("dialog", { name: "코소보 상세" })
    ).toBeInTheDocument();
  });

  it("한글+ASCII 가 섞인 CountryData.name 은 카탈로그를 덮지 못한다", () => {
    renderMap([
      {
        id: "040",
        name: "오스트리아 A",
        status: "PLANNED",
        tripCount: 1,
        bucketCount: 0,
      },
    ]);
    // strict priority 1: 카탈로그 nameKo 가 dynamic name 을 이긴다.
    const austria = countryPath("오스트리아");
    expect(austria.getAttribute("fill")).toBe(FILL.PLANNED);
    fireEvent.click(austria);
    expect(
      screen.getByRole("dialog", { name: "오스트리아 상세" })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("오스트리아 A 상세 보기")).not.toBeInTheDocument();
  });

  it("차단된 M49 의 dynamic data 가 COMPLETED/여행/카운트를 가져도 시트로 새지 않는다", () => {
    renderMap([
      {
        id: "408",
        name: "북한",
        status: "COMPLETED",
        tripCount: 99,
        bucketCount: 99,
        recentTrips: [
          {
            id: 1,
            title: "평양 여행",
            startDate: "2026-01-01",
            endDate: "2026-01-05",
          },
        ],
      },
    ]);
    const northKorea = blockedPath("북한, 별도 정책에 따라 선택할 수 없음");
    // 차단된 경로는 dynamic data 가 있어도 status=NONE 으로 강제, 고정 음영.
    expect(northKorea.getAttribute("aria-pressed")).toBeNull();
    expect(northKorea.getAttribute("data-map-selectable")).toBe("false");
    expect(northKorea.getAttribute("fill")).toBe(BLOCKED_FILL_HEX);
    // 클릭/Enter/Space 등 어떤 입력에도 시트가 열리지 않거나 상태가 바뀌지 않는다.
    fireEvent.click(northKorea);
    fireEvent.mouseEnter(northKorea);
    fireEvent.mouseDown(northKorea);
    fireEvent.focus(northKorea);
    const enterEvent = createEvent.keyDown(northKorea, { key: "Enter" });
    fireEvent(northKorea, enterEvent);
    const spaceEvent = createEvent.keyDown(northKorea, { key: " " });
    fireEvent(northKorea, spaceEvent);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(northKorea.getAttribute("aria-pressed")).toBeNull();
    expect(northKorea.getAttribute("fill")).toBe(BLOCKED_FILL_HEX);
  });

  it("ID 없는 지형은 rsmKey 로 독립 식별된다 (북키프로스 선택, 소말릴란드 차단)", () => {
    renderMap();
    const northCyprus = countryPath("북키프로스");
    const somaliland = blockedPath(
      "소말릴란드, 소말리아 여행금지 정책에 따라 선택할 수 없음"
    );
    expect(northCyprus.getAttribute("aria-pressed")).toBe("false");
    expect(somaliland.getAttribute("aria-pressed")).toBeNull();

    // 북키프로스 (선택 가능) 활성화.
    fireEvent.click(northCyprus);
    expect(northCyprus.getAttribute("aria-pressed")).toBe("true");
    expect(somaliland.getAttribute("aria-pressed")).toBeNull();

    // 소말릴란드 (차단) 클릭 — 시트가 열리지 않고 선택도 바뀌지 않음.
    fireEvent.click(somaliland);
    expect(somaliland.getAttribute("aria-pressed")).toBeNull();
    expect(northCyprus.getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("dialog", { name: /소말릴란드/ })).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "북키프로스 상세" })
    ).toBeInTheDocument();
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
      // 165 개 button path + 2 개 focus-ring path = 167 (스피어/그래티큘 path 제외한 rsm-geography 합)
      const geoButtons = container.querySelectorAll<SVGPathElement>(
        'path.rsm-geography[role="button"]'
      );
      const geoImgs = container.querySelectorAll<SVGPathElement>(
        'path.rsm-geography[role="img"]'
      );
      expect(geoButtons).toHaveLength(165);
      expect(geoImgs).toHaveLength(12);
    } finally {
      restore();
    }
  });
});
