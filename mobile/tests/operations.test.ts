import { it, expect, vi } from "vitest";
import { create } from "axios";
import MockAdapter from "axios-mock-adapter";
import {
  operationApi,
  notificationTarget,
  pageRows,
  accreditationSummary,
  reportActions,
} from "../src/features/operations/api";
import type { User } from "../src/types";
const user: User = {
  id: "user",
  role: "FACULTY",
  college: "college",
  department: "dept",
  first_name: "Test",
  last_name: "User",
  email: "test@example.invalid",
};
function setup(role: User["role"] = "FACULTY") {
  const api = create();
  const mock = new MockAdapter(api);
  const invalid = vi.fn().mockResolvedValue(null);
  return {
    service: operationApi(api, { ...user, role }, invalid),
    mock,
    invalid,
  };
}
it("faculty responds with actual request choices", async () => {
  const s = setup();
  s.mock.onPost().reply(200, {});
  await s.service.respond("n", "Okay");
  expect(JSON.parse(s.mock.history.post[0].data)).toEqual({ response: "Okay" });
  await expect(s.service.respond("n", "invented")).rejects.toThrow();
});
it("in-charge request creation is scoped by role and deduplicated", async () => {
  const s = setup("DEPARTMENT_INCHARGE");
  s.mock.onPost().reply(201, {});
  await Promise.all([
    s.service.request("f", "Period: 2025-26"),
    s.service.request("f", "Period: 2025-26"),
  ]);
  expect(s.mock.history.post).toHaveLength(1);
  expect(s.mock.history.post[0].url).toBe("notifications/send-report-request/");
  await expect(setup().service.request("f", "x")).rejects.toThrow();
});
it("generation retains idempotency key after a network/server failure", async () => {
  const s = setup();
  s.mock
    .onPost()
    .replyOnce(500)
    .onPost()
    .reply(201, { id: "r", status: "COMPLETED" });
  const body = { report_type: "type", output_format: "PDF" };
  await s.service.generate(body).catch(() => {});
  await s.service.generate(body);
  expect(s.mock.history.post[0].headers?.["Idempotency-Key"]).toBe(
    s.mock.history.post[1].headers?.["Idempotency-Key"],
  );
  expect(s.invalid).toHaveBeenCalledTimes(2);
});
for (const [role, action] of [
  ["DEPARTMENT_INCHARGE", "submit-to-hod"],
  ["HOD", "hod-download"],
  ["HOD", "submit-to-admins"],
] as const)
  it(`${role} uses ${action} contract`, async () => {
    const s = setup(role);
    s.mock.onPost().reply(200, {});
    await s.service.handoff("r", action);
    expect(s.mock.history.post[0].url).toBe(`reports/r/${action}/`);
  });
it("report authorization errors stay errors and refresh history", async () => {
  const s = setup("HOD");
  s.mock.onPost().reply(403, {});
  await expect(
    s.service.handoff("foreign", "submit-to-admins"),
  ).rejects.toHaveProperty("response.status", 403);
  expect(s.invalid).toHaveBeenCalledOnce();
  expect(reportActions("FACULTY")).toEqual([]);
});
it("maps backend accreditation values without calculating compliance", () => {
  expect(
    accreditationSummary({
      workspace: "AQAR",
      overall_progress: 17.4,
      progress: { total_metrics: 8 },
    }),
  ).toEqual({
    workspace: "AQAR",
    overall_progress: 17.4,
    progress: { total_metrics: 8 },
  });
});
it("keeps pagination and empty/metric arrays intact", () => {
  expect(
    pageRows({ results: [], next: "/api/v1/metrics/?page=2" }).next,
  ).toContain("page=2");
  expect(
    pageRows([{ metric_title: "Real metric" }]).results[0].metric_title,
  ).toBe("Real metric");
  expect(pageRows(null).results).toEqual([]);
});
it("notification actions whitelist related models and reject arbitrary links", () => {
  expect(
    notificationTarget(user, {
      related_model: "GeneratedReport",
      related_id: "r",
    }),
  ).toEqual({ view: "reports", id: "r" });
  expect(
    notificationTarget(user, { related_model: "unknown", related_id: "r" }),
  ).toBeNull();
  expect(
    notificationTarget(user, {
      related_model: "Activity",
      related_id: "../../auth/users",
    }),
  ).toBeNull();
});
it("marks notifications read and does not cache away future bulk reads", async () => {
  const s = setup();
  s.mock.onPost().reply(200, {});
  await s.service.read("n");
  await s.service.readAll();
  await s.service.readAll();
  expect(s.mock.history.post).toHaveLength(3);
});
it("tasks respect Management read-only and faculty assignment restrictions", async () => {
  const s = setup("COLLEGE_MANAGEMENT");
  await expect(s.service.saveTask({ title: "T" })).rejects.toThrow();
  await expect(s.service.task("t", "complete", "")).rejects.toThrow();
  await expect(
    setup().service.saveTask({ title: "T", owner: "peer" }),
  ).rejects.toThrow();
});
it("task status updates can repeat after reopen, with comments/history invalidation", async () => {
  const s = setup();
  s.mock.onPost().reply(200, {});
  await s.service.task("t", "complete", "Finished");
  await s.service.task("t", "reopen", "Correction");
  await s.service.task("t", "complete", "Finished");
  await s.service.comment("t", "Progress");
  expect(s.mock.history.post).toHaveLength(4);
  expect(s.invalid).toHaveBeenCalledTimes(4);
});
it("failed mutations are not silently retried", async () => {
  const s = setup();
  s.mock.onPost().networkError();
  await expect(
    s.service.saveTask({ title: "T", owner: user.id }),
  ).rejects.toBeTruthy();
  expect(s.mock.history.post).toHaveLength(1);
});
