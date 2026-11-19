import { describe, it, expect, vi } from "vitest";
import { create } from "axios";
import MockAdapter from "axios-mock-adapter";
import {
  workflowApi,
  editable,
  stage,
  validateUpload,
  uploadBody,
  uploadEvidence,
  type Activity,
  type Verification,
} from "../src/features/activities/api";
import type { User } from "../src/types";
const user: User = {
  id: "u",
  college: "c",
  department: "d",
  role: "FACULTY",
  first_name: "Test",
  last_name: "User",
  email: "u@example.invalid",
};
const a: Activity = {
  id: "a",
  college: "c",
  department: "d",
  faculty: "u",
  title: "Test draft",
  status: "DRAFT",
  is_editable: true,
  last_rejection_reason: "",
  documents: [],
};
const raw = {
  title: "Test draft",
  activity_type: "FDP",
  organizer: "",
  venue: "",
  location: "",
  start_date: "",
  end_date: "",
  duration: "",
  duration_days: "",
  duration_hours: "",
  description: "",
  additional_remarks: "",
  certificate_number: "",
  academic_year: "",
  category: "",
  is_online: false,
};
const v = (status: string): Verification => ({
  id: "v",
  current_status: status,
  activity_details: { ...a, status, is_editable: false },
  logs: [],
});
const file = {
  uri: "file://test",
  name: "certificate.pdf",
  size: 24,
  mimeType: "application/pdf",
};
describe("faculty activity and verification", () => {
  it("creates draft fields and patches editable corrections without setting workflow status", async () => {
    const api = create();
    const mock = new MockAdapter(api);
    mock.onPost().reply(201, a);
    mock.onPatch().reply(200, a);
    const invalidate = vi.fn().mockResolvedValue(null);
    const service = workflowApi(api, user, invalidate);
    await service.save(raw);
    await service.save(raw, { ...a, status: "RETURNED_TO_FACULTY" });
    expect(JSON.parse(mock.history.post[0].data)).not.toHaveProperty("status");
    expect(mock.history.patch[0].url).toBe("activities/a/");
    expect(invalidate).toHaveBeenCalledTimes(2);
  });
  it("denies foreign ownership, locked records and non-draft deletion", async () => {
    const api = create();
    const service = workflowApi(api, user, async () => {});
    expect(editable(user, { ...a, college: "foreign" })).toBe(false);
    await expect(
      service.save(raw, { ...a, faculty: "peer" }),
    ).rejects.toThrow();
    await expect(
      service.remove({ ...a, status: "RETURNED_TO_FACULTY" }),
    ).rejects.toThrow();
  });
  it("deduplicates concurrent submission and supports returned resubmission", async () => {
    const api = create();
    const mock = new MockAdapter(api, { delayResponse: 10 });
    mock.onPost().reply(200, { status: "PENDING_INCHARGE" });
    const service = workflowApi(api, user, async () => {});
    await Promise.all([service.submit(a), service.submit(a)]);
    expect(mock.history.post).toHaveLength(1);
    await service.submit({ ...a, status: "RETURNED_TO_FACULTY" });
    expect(mock.history.post).toHaveLength(2);
  });
  for (const [role, status, action] of [
    ["DEPARTMENT_INCHARGE", "PENDING_INCHARGE", "incharge-verify"],
    ["DEPARTMENT_INCHARGE", "RETURNED_TO_INCHARGE", "incharge-verify"],
    ["HOD", "PENDING_HOD", "hod-verify"],
    ["IQAC", "PENDING_IQAC", "iqac-verify"],
  ] as const) {
    it(`${role} approves and returns ${status} through actual endpoint`, async () => {
      const api = create();
      const mock = new MockAdapter(api);
      mock.onPost().reply(200, {});
      const service = workflowApi(api, { ...user, role }, async () => {});
      await service.decide(v(status), "APPROVE", "Reviewed");
      await service.decide(
        v(status),
        "REJECT",
        "Correction required",
        "FACULTY",
      );
      expect(mock.history.post[0].url).toBe(`verifications/v/${action}/`);
      expect(JSON.parse(mock.history.post[1].data).comment).toBe(
        "Correction required",
      );
    });
  }
  it("requires rejection comment, rejects stale and cross-tenant actions", async () => {
    const api = create();
    const service = workflowApi(api, { ...user, role: "HOD" }, async () => {});
    await expect(
      service.decide(v("PENDING_HOD"), "REJECT", ""),
    ).rejects.toThrow("reason");
    expect(
      stage({ ...user, role: "HOD" }, v("PENDING_IQAC").activity_details),
    ).toBeNull();
    expect(
      stage(
        { ...user, role: "IQAC", college: "foreign" },
        v("PENDING_IQAC").activity_details,
      ),
    ).toBeNull();
  });
  it("refreshes after conflicting/unauthorized backend responses without hiding failure", async () => {
    const api = create();
    const mock = new MockAdapter(api);
    mock
      .onPost()
      .replyOnce(400, { detail: "Stale state" })
      .onPost()
      .replyOnce(403, {});
    const invalidate = vi.fn().mockResolvedValue(null);
    const service = workflowApi(api, { ...user, role: "HOD" }, invalidate);
    await expect(
      service.decide(v("PENDING_HOD"), "APPROVE", ""),
    ).rejects.toHaveProperty("response.status", 400);
    await expect(
      service.decide(v("PENDING_HOD"), "APPROVE", ""),
    ).rejects.toHaveProperty("response.status", 403);
    expect(invalidate).toHaveBeenCalledTimes(2);
  });
  it("enforces actual upload extensions and 10 MiB boundary", () => {
    expect(validateUpload({ ...file, size: 10 * 1024 * 1024 })).toBeTruthy();
    for (const bad of [
      { ...file, size: 10 * 1024 * 1024 + 1 },
      { ...file, name: "x.exe" },
      { ...file, mimeType: "text/plain" },
      { ...file, size: 0 },
    ])
      expect(() => validateUpload(bad)).toThrow();
  });
  it("constructs native multipart metadata and forbids foreign upload", () => {
    const parts: unknown[] = [];
    const form = {
      append: (...args: unknown[]) => parts.push(args),
    } as unknown as FormData;
    uploadBody(a, user, file, "CERTIFICATE", form);
    expect(parts).toContainEqual(["activity", "a"]);
    expect(parts).toContainEqual([
      "file",
      { uri: "file://test", name: "certificate.pdf", type: "application/pdf" },
    ]);
    expect(() =>
      uploadBody({ ...a, faculty: "peer" }, user, file, "CERTIFICATE", form),
    ).toThrow();
  });
  it("does not attempt a cancelled upload", async () => {
    const api = create();
    const controller = new AbortController();
    controller.abort();
    const mock = new MockAdapter(api);
    await expect(
      uploadEvidence(
        api,
        user,
        a,
        file,
        "CERTIFICATE",
        controller.signal,
        () => {},
        async () => {},
      ),
    ).rejects.toThrow("cancelled");
    expect(mock.history.post).toHaveLength(0);
  });
});

it("refreshes metadata after upload network failure without retrying", async () => {
  const api = create();
  const post = vi
    .spyOn(api, "post")
    .mockRejectedValueOnce(new Error("offline"));
  const invalidate = vi.fn().mockResolvedValue(null);
  const old = globalThis.FormData;
  class NativeForm {
    append() {}
  }
  vi.stubGlobal("FormData", NativeForm);
  try {
    await expect(
      uploadEvidence(
        api,
        user,
        a,
        file,
        "SUPPORTING",
        new AbortController().signal,
        () => {},
        invalidate,
      ),
    ).rejects.toThrow("offline");
    expect(post).toHaveBeenCalledOnce();
    expect(invalidate).toHaveBeenCalledOnce();
  } finally {
    vi.stubGlobal("FormData", old);
  }
});
