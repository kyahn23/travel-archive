import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./page";
import { api } from "@/lib/api/client";

vi.mock("@/lib/auth/hooks", () => ({
  useRequireAuth: () => ({ loading: false }),
}));

vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/components/home/HomeOverview", () => ({
  HomeOverview: (props: Record<string, unknown>) => {
    const stats = props.statsSummary as Record<string, number> | null;
    return (
      <div data-testid="home-overview">
        <span data-testid="stats-trips">{stats?.completedTrips ?? "null"}</span>
        <button data-testid="btn-new-trip" onClick={props.onNewTripClick as () => void}>new-trip</button>
        <button data-testid="btn-stats" onClick={props.onStatsClick as () => void}>stats</button>
      </div>
    );
  },
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("calls useRequireAuth and fetches protected APIs on mount", async () => {
    // API call order: /maps/world, /statistics/summary (fire in parallel), then /maps/regions/JP (after world resolves)
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: [{ mapKey: "JP", countryCode: "JP", nameKo: "일본", status: "COMPLETED" }],
        message: "Success",
      })
      .mockResolvedValueOnce({
        data: {
          completedTrips: 5,
          plannedTrips: 1,
          travelDays: 20,
          visitedCountries: 2,
          visitedDomesticRegions: 1,
        },
        message: "Success",
      })
      .mockResolvedValueOnce({
        data: { mapKey: "JP", name: "일본", completedCount: 2, plannedCount: 0, bucketCount: 0, trips: [] },
        message: "Success",
      });

    render(<DashboardPage />);

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(3));

    expect(api.get).toHaveBeenCalledWith("/maps/world");
    expect(api.get).toHaveBeenCalledWith("/statistics/summary");

    expect(screen.getByTestId("home-overview")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("stats-trips")).toHaveTextContent("5");
    });
  });

  it("passes statsSummary to HomeOverview", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: [],
        message: "Success",
      })
      .mockResolvedValueOnce({
        data: {
          completedTrips: 3,
          plannedTrips: 0,
          travelDays: 10,
          visitedCountries: 1,
          visitedDomesticRegions: 0,
        },
        message: "Success",
      });

    render(<DashboardPage />);

    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/statistics/summary"));
    await waitFor(() => {
      expect(screen.getByTestId("stats-trips")).toHaveTextContent("3");
    });
  });
});
