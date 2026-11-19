import { describe, it, expect, vi } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { createSessionClient, resolveResource } from "../src/services/client";
import { errorMessage } from "../src/services/errors";
import { roles, canEnter } from "../src/constants/roles";
import { useSession } from "../src/store/session";
import type { Tokens } from "../src/types";
function setup() {
  let stored: Tokens | null = null;
  const cleared = vi.fn();
  const client = createSessionClient(
    "https://example.invalid/api/v1/",
    {
      read: async () => stored,
      write: async (v) => {
        stored = v;
      },
    },
    cleared,
  );
  return {
    client,
    cleared,
    stored: () => stored,
    api: new MockAdapter(client.api),
    publicApi: new MockAdapter(client.publicApi),
  };
}
describe("authentication and API foundation", () => {
  it("stores and restores the token pair", async () => {
    const s = setup();
    await s.client.commit({ access: "a", refresh: "r" }, s.client.version());
    expect(await s.client.load()).toEqual({ access: "a", refresh: "r" });
  });
  it("coordinates concurrent rotation and persists both tokens", async () => {
    const s = setup();
    await s.client.commit({ access: "old", refresh: "old-r" }, 0);
    s.api
      .onGet()
      .reply((c) =>
        c.headers?.Authorization === "Bearer new" ? [200, {}] : [401, {}],
      );
    s.publicApi.onPost("auth/refresh/").reply(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return [200, { access: "new", refresh: "new-r" }];
    });
    await Promise.all([
      s.client.api.get("auth/me/"),
      s.client.api.get("notifications/"),
    ]);
    expect(s.publicApi.history.post).toHaveLength(1);
    expect(s.stored()).toEqual({ access: "new", refresh: "new-r" });
  });
  it("clears revoked refresh and caches through callback", async () => {
    const s = setup();
    await s.client.commit({ access: "old", refresh: "r" }, 0);
    s.api.onGet().reply(401);
    s.publicApi.onPost().reply(401);
    await expect(s.client.api.get("auth/me/")).rejects.toBeTruthy();
    expect(s.stored()).toBeNull();
    expect(s.cleared).toHaveBeenCalledOnce();
  });
  it("logout cannot be undone by pending refresh", async () => {
    const s = setup();
    await s.client.commit({ access: "a", refresh: "r" }, 0);
    s.api.onGet().reply(401);
    let release: (v: [number, object]) => void = () => {};
    s.publicApi.onPost("auth/refresh/").reply(
      () =>
        new Promise((r) => {
          release = r;
        }),
    );
    const request = s.client.api.get("auth/me/").catch(() => null);
    await new Promise((r) => setTimeout(r, 15));
    await s.client.clear();
    release([200, { access: "new", refresh: "new-r" }]);
    await request;
    expect(s.stored()).toBeNull();
  });
  it("logout calls blacklist endpoint and clears immediately", async () => {
    const s = setup();
    await s.client.commit({ access: "a", refresh: "r" }, 0);
    s.publicApi.onPost("auth/logout/").reply(200);
    await s.client.logout();
    expect(s.stored()).toBeNull();
    expect(s.publicApi.history.post[0].headers?.Authorization).toBe("Bearer a");
    expect(s.cleared).toHaveBeenCalledOnce();
  });
  it("does not automatically retry unsafe failures", async () => {
    const s = setup();
    s.api.onPost().reply(500);
    await expect(
      s.client.api.post("reports/generate/", {}),
    ).rejects.toBeTruthy();
    expect(s.api.history.post).toHaveLength(1);
  });
  it("rejects cross-origin credential forwarding", () => {
    expect(() =>
      resolveResource(
        "https://api.example/api/v1/",
        "https://evil.example/media/x",
      ),
    ).toThrow();
    expect(
      resolveResource(
        "https://api.example/api/v1/",
        "/api/documents/1/download/",
      ),
    ).toBe("https://api.example/api/documents/1/download/");
  });
  it("rejects stale session commits", async () => {
    const s = setup();
    const version = s.client.version();
    await s.client.clear();
    await expect(
      s.client.commit({ access: "a", refresh: "r" }, version),
    ).rejects.toThrow("Session changed");
  });
  it("enforces all six role guards", () => {
    for (const actual of roles)
      for (const target of roles)
        expect(canEnter(actual, target)).toBe(actual === target);
    expect(canEnter(undefined, "FACULTY")).toBe(false);
  });
  it("preserves institution selection and supports separate platform login", () => {
    const c = { id: "college", name: "Institution", code: "INST" };
    useSession.getState().select(c);
    expect(useSession.getState().college).toEqual(c);
    useSession.getState().select(null);
    expect(useSession.getState().college).toBeNull();
  });
  it("normalizes structured and legacy API errors", () => {
    expect(
      errorMessage({ response: { data: { error: { message: "Denied" } } } }),
    ).toBe("Denied");
    expect(errorMessage({ response: { data: { detail: "Invalid" } } })).toBe(
      "Invalid",
    );
    expect(errorMessage({ response: { data: { error: "Quota" } } })).toBe(
      "Quota",
    );
  });
  it("handles network errors", () => {
    expect(errorMessage(new Error("Network unavailable"))).toBe(
      "Network unavailable",
    );
  });
});
