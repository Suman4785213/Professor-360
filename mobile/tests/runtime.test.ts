import { it, expect, vi, beforeEach } from "vitest";
import MockAdapter from "axios-mock-adapter";
vi.stubGlobal("__DEV__", true);
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => {}),
  deleteItemAsync: vi.fn(async () => {}),
}));
const { session, login, queryClient, restore } =
  await import("../src/services/runtime");
const { useSession } = await import("../src/store/session");
const mock = new MockAdapter(session.publicApi);
const user = {
  id: "u1",
  email: "faculty@example.invalid",
  first_name: "Test",
  last_name: "User",
  role: "FACULTY",
  college: "c1",
};
beforeEach(async () => {
  await session.clear();
  mock.reset();
});
it("validates backend role rather than trusting selected option", async () => {
  useSession.getState().select({ id: "c1", name: "Institution", code: "I" });
  mock.onPost("auth/login/").reply(200, { access: "a", refresh: "r", user });
  await expect(login(user.email, "test-only", "HOD", "c1")).rejects.toThrow(
    "selected role",
  );
  expect(useSession.getState().user).toBeNull();
  expect(useSession.getState().college?.id).toBe("c1");
});
it("logs in with institutional context and clears all cached account data", async () => {
  useSession.getState().select({ id: "c1", name: "Institution", code: "I" });
  mock.onPost("auth/login/").reply(200, { access: "a", refresh: "r", user });
  await login(user.email, "test-only", "FACULTY", "c1");
  expect(JSON.parse(mock.history.post[0].data).college_id).toBe("c1");
  expect(useSession.getState().user?.role).toBe("FACULTY");
  queryClient.setQueryData(["private", "u1"], { private: true });
  await session.clear();
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  expect(useSession.getState().user).toBeNull();
});
it("requires institution context for non-platform accounts", async () => {
  await expect(login("x", "x", "FACULTY")).rejects.toThrow(
    "Select an institution",
  );
  expect(mock.history.post).toHaveLength(0);
});

it("restores session using auth/me without trusting stored role data", async () => {
  const store = await import("expo-secure-store");
  vi.mocked(store.getItemAsync).mockResolvedValueOnce(
    JSON.stringify({ access: "saved", refresh: "saved-r" }),
  );
  const api = new MockAdapter(session.api);
  api.onGet().reply(200, user);
  await restore();
  expect(useSession.getState().user?.id).toBe("u1");
  expect(useSession.getState().ready).toBe(true);
  api.restore();
});
it("keeps Super Admin portal separate", async () => {
  mock
    .onPost("auth/login/")
    .reply(200, {
      access: "a",
      refresh: "r",
      user: { ...user, role: "SUPER_ADMIN", college: null },
    });
  await login(user.email, "test-only", "SUPER_ADMIN");
  const payload = JSON.parse(mock.history.post[0].data);
  expect(payload.is_super_admin).toBe(true);
  expect(payload).not.toHaveProperty("college_id");
  expect(useSession.getState().user?.role).toBe("SUPER_ADMIN");
});
it("does not restore an account after logout wins the race", async () => {
  const store = await import("expo-secure-store");
  vi.mocked(store.getItemAsync).mockResolvedValueOnce(
    JSON.stringify({ access: "saved", refresh: "saved-r" }),
  );
  const api = new MockAdapter(session.api);
  let reply: (v: [number, object]) => void = () => {};
  let started: () => void = () => {};
  const start = new Promise<void>((r) => {
    started = r;
  });
  api.onGet().reply(
    () =>
      new Promise((r) => {
        reply = r;
        started();
      }),
  );
  const restoring = restore();
  await start;
  await session.clear();
  reply([200, user]);
  await restoring;
  expect(useSession.getState().user).toBeNull();
  api.restore();
});
vi.mock('expo-constants', () => ({ default: { expoConfig: { extra: { localQaApi: null } } } }));
