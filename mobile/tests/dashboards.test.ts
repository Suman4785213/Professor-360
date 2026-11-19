import { describe, it, expect, vi } from "vitest";
import {
  sectionsFor,
  contextError,
  normalizeList,
  overviewStats,
  refreshSections,
} from "../src/features/dashboards/contracts";
import { roles } from "../src/constants/roles";
import type { User } from "../src/types";
const user = (role: User["role"]): User => ({
  id: "test-user",
  role,
  college: "test-college",
  department: "test-department",
  first_name: "Test",
  last_name: "User",
  email: "test@example.invalid",
});
describe("dashboard role contracts", () => {
  for (const role of roles)
    it(`${role} uses only allowed sections`, () => {
      const sections = sectionsFor(user(role));
      expect(sections.length).toBeGreaterThan(3);
      expect(sections.some((s) => s.id === "notifications")).toBe(true);
      expect(sections.find((s) => s.id === "tasks")?.path).toContain(
        "owner=test-user",
      );
      expect(sections.some((s) => s.path === "colleges/")).toBe(
        role === "SUPER_ADMIN",
      );
      expect(sections.some((s) => s.path === "subscriptions/")).toBe(
        role === "SUPER_ADMIN",
      );
      if (role === "FACULTY")
        expect(
          sections.some((s) => s.id === "faculty" || s.id === "departments"),
        ).toBe(false);
    });
  it("fails closed for missing college and department", () => {
    expect(sectionsFor({ ...user("IQAC"), college: null })).toEqual([]);
    for (const role of ["HOD", "DEPARTMENT_INCHARGE", "FACULTY"] as const) {
      const u = { ...user(role), department: null };
      expect(contextError(u)).toBeTruthy();
      expect(sectionsFor(u)).toEqual([]);
    }
  });
  it("scopes approval queues to correct state", () => {
    expect(
      sectionsFor(user("HOD")).find((s) => s.id === "verification")?.path,
    ).toContain("PENDING_HOD");
    expect(
      sectionsFor(user("IQAC")).find((s) => s.id === "verification")?.path,
    ).toContain("PENDING_IQAC");
    expect(
      sectionsFor(user("DEPARTMENT_INCHARGE")).find(
        (s) => s.id === "verification",
      )?.path,
    ).toContain("RETURNED_TO_INCHARGE");
  });
  it("preserves server pagination rather than treating a page as a total", () => {
    expect(
      normalizeList({
        count: 91,
        next: "/api/v1/reports/?page=2",
        results: [],
      }),
    ).toEqual({ count: 91, next: "/api/v1/reports/?page=2", results: [] });
    expect(normalizeList([])).toEqual({ results: [] });
    expect(() => normalizeList({ error: "Forbidden" })).toThrow();
  });
  it("maps server counts without inventing absent faculty statistics", () => {
    const values = overviewStats(
      {
        total_activities: 7,
        total_faculty: 200,
        total_departments: 10,
        status_summary: { pending_iqac: 2 },
        activity_types: [{ activity_type: "FDP", count: 3 }],
      },
      true,
    );
    expect(values).toContainEqual({ label: "FDP", value: 3 });
    expect(values.some((v) => v.label === "Faculty")).toBe(false);
  });
  it("refreshes every section even if one is unavailable", async () => {
    const a = vi.fn().mockResolvedValue({}),
      b = vi.fn().mockRejectedValue(new Error("offline"));
    const results = await refreshSections([a, b]);
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
    expect(results[1].status).toBe("rejected");
  });
});
