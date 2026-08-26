import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: null as { id: number; email: string; nickname: string } | null,
  push: vi.fn(),
}));

vi.mock("@/lib/auth/context", () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    function DynamicPlaceholder() {
      return <div data-testid="dynamic-map">map-placeholder</div>;
    }
    DynamicPlaceholder.displayName = "DynamicMap";
    return DynamicPlaceholder;
  },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));



describe("PublicHomePage", () => {
  it("shows signup and login CTAs for anonymous users", async () => {
    mocks.user = null;
    mocks.push.mockReset();

    const Page = await import("./page");
    render(<Page.default />);

    expect(screen.getByText("시작하기")).toBeInTheDocument();
    expect(screen.getByText("로그인")).toBeInTheDocument();
    expect(screen.queryByText("내 아카이브 보기")).not.toBeInTheDocument();
  });

  it("shows dashboard CTA for logged-in users", async () => {
    mocks.user = { id: 1, email: "demo@example.com", nickname: "Demo" };
    mocks.push.mockReset();

    const Page = await import("./page");
    render(<Page.default />);

    expect(screen.getByText("내 아카이브 보기")).toBeInTheDocument();
    expect(screen.queryByText("시작하기")).not.toBeInTheDocument();
    expect(screen.queryByText("로그인")).not.toBeInTheDocument();
  });

  it("signup CTA links to /signup for anonymous users", async () => {
    mocks.user = null;
    mocks.push.mockReset();

    const Page = await import("./page");
    render(<Page.default />);

    const signupLink = screen.getByText("시작하기").closest("a");
    expect(signupLink).toHaveAttribute("href", "/signup");
  });

  it("login link points to /login for anonymous users", async () => {
    mocks.user = null;
    mocks.push.mockReset();

    const Page = await import("./page");
    render(<Page.default />);

    const loginLink = screen.getByText("로그인");
    expect(loginLink.closest("a")).toHaveAttribute("href", "/login");
  });

  it("dashboard CTA links to /dashboard for logged-in users", async () => {
    mocks.user = { id: 1, email: "demo@example.com", nickname: "Demo" };
    mocks.push.mockReset();

    const Page = await import("./page");
    render(<Page.default />);

    const dashboardLink = screen.getByText("내 아카이브 보기").closest("a");
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
  });

  it("renders HomeOverview with demo data", async () => {
    mocks.user = null;
    mocks.push.mockReset();

    const Page = await import("./page");
    render(<Page.default />);

    expect(screen.getByText("Travel Archive")).toBeInTheDocument();
    expect(screen.getByText("여행 기록, 버킷리스트, 체크리스트, 지도 회고를 한곳에")).toBeInTheDocument();
  });
});
