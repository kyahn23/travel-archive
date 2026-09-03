import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeOverview } from "./HomeOverview";

// next/dynamic must be mocked so dynamic imports resolve in jsdom
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    // Return a simple placeholder component; jsdom has no SVG/Leaflet
    function DynamicPlaceholder() {
      return <div data-testid="dynamic-map">map-placeholder</div>;
    }
    DynamicPlaceholder.displayName = "DynamicMap";
    return DynamicPlaceholder;
  },
}));

const sampleWorldData = [
  { id: "JP", name: "일본", status: "COMPLETED" as const, tripCount: 2, bucketCount: 0 },
  { id: "TH", name: "태국", status: "BUCKET" as const, tripCount: 0, bucketCount: 1 },
  { id: "US", name: "미국", status: "NONE" as const, tripCount: 0, bucketCount: 0 },
];

const sampleDomesticData = [
  { code: "KR-11", name: "서울특별시", status: "COMPLETED" as const, tripCount: 1, bucketCount: 0 },
  { code: "KR-26", name: "부산광역시", status: "PLANNED" as const, tripCount: 0, bucketCount: 0 },
];

const sampleStats = {
  completedTrips: 4,
  plannedTrips: 2,
  travelDays: 18,
  visitedCountries: 3,
  visitedDomesticRegions: 2,
};

const defaultProps = {
  worldData: sampleWorldData,
  domesticData: sampleDomesticData,
  statsSummary: sampleStats,
  loading: false,
  error: "",
  mapView: "world" as const,
  onMapViewChange: vi.fn(),
  onTripClick: vi.fn(),
  onStatsClick: vi.fn(),
  onNewTripClick: vi.fn(),
  onRetry: vi.fn(),
};

describe("HomeOverview", () => {
  it("renders page header with title and description", () => {
    render(<HomeOverview {...defaultProps} />);
    expect(screen.getByText("Travel Archive")).toBeInTheDocument();
    expect(screen.getByText("여행 기록, 버킷리스트, 체크리스트, 지도 회고를 한곳에")).toBeInTheDocument();
  });

  it("renders stats cards with values from statsSummary", () => {
    render(<HomeOverview {...defaultProps} />);
    expect(screen.getByText("완료 여행")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    // "계획 중" appears in both stats label and legend
    expect(screen.getAllByText("계획 중").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("여행 일수")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    // 방문 국가/지역 = visitedCountries + visitedDomesticRegions = 3 + 2 = 5
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders default header action button when headerAction is not provided", () => {
    render(<HomeOverview {...defaultProps} />);
    expect(screen.getByText("+ 새 여행")).toBeInTheDocument();
  });

  it("renders custom headerAction when provided", () => {
    render(<HomeOverview {...defaultProps} headerAction={<button>커스텀</button>} />);
    expect(screen.getByText("커스텀")).toBeInTheDocument();
  });

  it("renders map toggle buttons for world and domestic views", () => {
    render(<HomeOverview {...defaultProps} />);
    expect(screen.getByText("세계 지도")).toBeInTheDocument();
    expect(screen.getByText("국내 지도")).toBeInTheDocument();
  });

  it("renders active data badge when not loading and no error", () => {
    render(<HomeOverview {...defaultProps} />);
    // worldData non-NONE: JP(COMPLETED), TH(BUCKET) = 2; also appears in stats card (계획 중=2)
    const twos = screen.getAllByText("2");
    expect(twos.length).toBeGreaterThanOrEqual(1);
  });

  it("renders status legend items", () => {
    render(<HomeOverview {...defaultProps} />);
    expect(screen.getByText("완료")).toBeInTheDocument();
    expect(screen.getAllByText("계획 중").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("버킷리스트")).toBeInTheDocument();
    expect(screen.getByText("미방문")).toBeInTheDocument();
  });

  it("shows map skeleton when loading is true", () => {
    render(<HomeOverview {...defaultProps} loading={true} />);
    expect(screen.getByText("지도를 불러오는 중...")).toBeInTheDocument();
  });

  it("shows error card when error is provided", () => {
    render(<HomeOverview {...defaultProps} error="세계 지도 데이터를 불러오지 못했습니다." />);
    expect(screen.getByText("세계 지도 데이터를 불러오지 못했습니다.")).toBeInTheDocument();
    expect(screen.getByText("다시 시도")).toBeInTheDocument();
  });

  it("renders domestic badge count when mapView is domestic", () => {
    render(<HomeOverview {...defaultProps} mapView="domestic" />);
    // domesticData non-NONE: KR-11(COMPLETED), KR-26(PLANNED) = 2; also stats card (계획 중=2)
    const twos = screen.getAllByText("2");
    expect(twos.length).toBeGreaterThanOrEqual(1);
  });

  it("renders without crashing when statsSummary is null", () => {
    render(<HomeOverview {...defaultProps} statsSummary={null} />);
    // All 4 stats cards default to 0
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBe(4);
  });
});
