import { it, expect } from "vitest";
import { create } from "axios";
import MockAdapter from "axios-mock-adapter";
import {
  canRegister,
  registerFaculty,
  createMerge,
} from "../src/features/dashboards/actions";
import { sectionsFor } from "../src/features/dashboards/contracts";
import type { User } from "../src/types";
const user: User = {
  id: "u",
  role: "IQAC",
  college: "c",
  department: "d",
  first_name: "Test",
  last_name: "User",
  email: "test@example.invalid",
};
const form = {
  first_name: "Test",
  last_name: "Faculty",
  email: "faculty@example.invalid",
  department: "d",
  password: "Test-only-password9!",
  confirm_password: "Test-only-password9!",
  employee_id: "",
  designation: "",
  phone: "",
};
it("registers within actor college without adopting new account tokens", async () => {
  const api = create();
  const mock = new MockAdapter(api);
  mock
    .onPost("auth/register/faculty/")
    .reply(201, {
      success: true,
      message: "Created",
      access: "new-faculty-token",
    });
  expect(await registerFaculty(api, user, form, [{ id: "d" }])).toEqual({
    success: true,
    message: "Created",
  });
  expect(JSON.parse(mock.history.post[0].data).college).toBe("c");
});
it("denies unauthorized registration and foreign departments", async () => {
  const api = create();
  expect(canRegister({ ...user, role: "FACULTY" })).toBe(false);
  await expect(
    registerFaculty(api, user, form, [{ id: "foreign" }]),
  ).rejects.toThrow("department");
  await expect(
    registerFaculty(api, { ...user, role: "FACULTY" }, form, [{ id: "d" }]),
  ).rejects.toThrow("permitted");
});
it("preserves backend validation errors", async () => {
  const api = create();
  new MockAdapter(api)
    .onPost()
    .reply(400, { error: { details: { email: ["Already exists"] } } });
  await expect(
    registerFaculty(api, user, form, [{ id: "d" }]),
  ).rejects.toHaveProperty("response.status", 400);
});
it("deduplicates concurrent merge and retains key after timeout", async () => {
  const api = create();
  const mock = new MockAdapter(api, { delayResponse: 5 });
  mock
    .onPost()
    .replyOnce(500)
    .onPost()
    .reply(201, {
      id: "merged",
      download_url: "/api/v1/reports/merged/download/",
    });
  const merge = createMerge(api, { ...user, role: "DEPARTMENT_INCHARGE" });
  const a = merge(["a", "b"]),
    b = merge(["b", "a"]);
  expect(a).toBe(b);
  await a.catch(() => {});
  await merge(["a", "b"]);
  expect(mock.history.post).toHaveLength(2);
  expect(mock.history.post[0].headers?.["Idempotency-Key"]).toBe(
    mock.history.post[1].headers?.["Idempotency-Key"],
  );
});
it("requires in-charge role for merge and restricts workflow navigation", async () => {
  await expect(createMerge(create(), user)(["a"])).rejects.toThrow();
  expect(
    sectionsFor({ ...user, role: "FACULTY" }).some(
      (s) => s.id === "merge" || s.id === "registration",
    ),
  ).toBe(false);
  expect(sectionsFor(user).some((s) => s.id === "registration")).toBe(true);
});
