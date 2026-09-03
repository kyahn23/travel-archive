import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { Sidebar } from "./sidebar";

const mockPathname = vi.fn(() => "/dashboard");

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("Sidebar", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/dashboard");
  });

  it("links home navigation to dashboard", () => {
    render(<Sidebar />);

    expect(screen.getByRole("link", { name: /홈/ })).toHaveAttribute("href", "/dashboard");
  });

  it("activates home link for /dashboard subpaths", () => {
    mockPathname.mockReturnValue("/dashboard/foo");
    render(<Sidebar />);

    expect(screen.getByRole("link", { name: /홈/ })).toHaveClass("bg-coral-50");
  });
});
