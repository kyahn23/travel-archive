import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StatsPage from './page';
import { api } from '@/lib/api/client';

vi.mock('@/lib/auth/hooks', () => ({
  useRequireAuth: () => ({ loading: false }),
}));

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('recharts', () => ({
  // 여기의 `({ children }: { children: React.ReactNode })` 는
  // 함수 매개변수 `children` 에 React 노드 타입을 명시한 것입니다.
  // `React.ReactNode` 는 문자열, JSX, 배열 등 화면에 렌더링 가능한 값을 넓게 나타냅니다.
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}));

/**
 * StatsPage 테스트는 비동기 API 응답을 모킹하고,
 * 화면 렌더링 결과가 올바른지 확인합니다.
 *
 * TypeScript 문법 설명:
 * - `vi.mocked(api.get)` 는 `api.get` 을 모킹 함수로 안전하게 다루기 위한 타입 보정입니다.
 * - `mockResolvedValueOnce(...)` 는 Promise가 순서대로 다른 값을 반환하도록 설정합니다.
 * - `React.ReactNode` 는 위 mock 컴포넌트의 자식 타입을 명시합니다.
 */
describe('StatsPage', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it('renders summary, monthly chart, and top regions from API data', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: {
          completedTrips: 4,
          plannedTrips: 2,
          travelDays: 18,
          visitedCountries: 3,
          visitedDomesticRegions: 2,
        },
        message: 'Success',
      })
      .mockResolvedValueOnce({
        data: [{ month: '2026-05', count: 2 }],
        message: 'Success',
      })
      .mockResolvedValueOnce({
        data: [
          { name: '부산', scope: 'DOMESTIC', count: 2 },
          { name: '일본', scope: 'INTERNATIONAL', count: 1 },
        ],
        message: 'Success',
      });

    render(<StatsPage />);

    // `findByText` 는 비동기 렌더링이 끝날 때까지 기다렸다가 요소를 찾습니다.
    expect(await screen.findByText('여행 통계')).toBeInTheDocument();
    // `waitFor` 는 API 호출이 모두 끝날 때까지 반복적으로 검증합니다.
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(3));

    expect(screen.getByText('완료 여행')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('여행 일수')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByTestId('chart')).toBeInTheDocument();
    expect(screen.getByText('부산')).toBeInTheDocument();
    expect(screen.getByText('일본')).toBeInTheDocument();
  });
});
