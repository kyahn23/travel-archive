import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignupPage from "./page";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  signup: vi.fn(),
}));

vi.mock("@/lib/auth/context", () => ({
  useAuth: () => ({ signup: mocks.signup }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("SignupPage", () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.signup.mockReset();
  });

  it("redirects to dashboard after successful signup", async () => {
    mocks.signup.mockResolvedValue(undefined);

    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "여행자" } });
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("비밀번호 확인"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "회원가입" }));

    await waitFor(() => expect(mocks.signup).toHaveBeenCalledWith("new@example.com", "password123", "여행자"));
    expect(mocks.replace).toHaveBeenCalledWith("/dashboard");
  });
});
