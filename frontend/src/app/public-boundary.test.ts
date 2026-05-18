import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";

const pageSrc = fs.readFileSync(
  path.resolve(__dirname, "page.tsx"),
  "utf-8",
);

const homeOverviewSrc = fs.readFileSync(
  path.resolve(__dirname, "..", "components", "home", "HomeOverview.tsx"),
  "utf-8",
);

const FORBIDDEN_API_CALLS = ["api.get", "api.post", "api.put", "api.patch", "api.delete"];

describe("Public boundary – page.tsx", () => {
  it("does not import useRequireAuth", () => {
    expect(pageSrc).not.toContain("useRequireAuth");
  });

  FORBIDDEN_API_CALLS.forEach((call) => {
    it(`does not contain ${call}`, () => {
      expect(pageSrc).not.toContain(call);
    });
  });

  it("does not import Sidebar", () => {
    expect(pageSrc).not.toContain("Sidebar");
  });

  it("does not import BottomNav", () => {
    expect(pageSrc).not.toContain("BottomNav");
  });
});

describe("Public boundary – HomeOverview.tsx", () => {
  it("does not import useRequireAuth", () => {
    expect(homeOverviewSrc).not.toContain("useRequireAuth");
  });

  it("does not contain api.get", () => {
    expect(homeOverviewSrc).not.toContain("api.get");
  });

  it("does not contain api.post", () => {
    expect(homeOverviewSrc).not.toContain("api.post");
  });
});
