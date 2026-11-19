import { create } from "axios";
import type { Tokens } from "../types";
export interface Vault {
  read(): Promise<Tokens | null>;
  write(tokens: Tokens | null): Promise<void>;
}
export function resolveResource(base: string, path: string) {
  const origin = new URL(base).origin;
  const url = new URL(path, path.startsWith("/") ? origin : base);
  if (url.origin !== origin || url.username || url.password)
    throw new Error("Untrusted API resource");
  return url.href;
}
export function createSessionClient(
  base: string,
  vault: Vault,
  onClear: () => void,
) {
  const publicApi = create({ baseURL: base, timeout: 15000 });
  const api = create({ baseURL: base, timeout: 15000 });
  if (!base) {
    const rejectUnconfigured = () => { throw new Error("Authorized HTTPS backend is not configured for this QA build."); };
    publicApi.interceptors.request.use(rejectUnconfigured);
    api.interceptors.request.use(rejectUnconfigured);
  }
  let tokens: Tokens | null = null,
    epoch = 0;
  let writes: Promise<void> = Promise.resolve();
  let refreshing: Promise<string> | null = null;
  const persist = (value: Tokens | null) => {
    writes = writes.catch(() => {}).then(() => vault.write(value));
    return writes;
  };
  async function clear() {
    epoch++;
    tokens = null;
    refreshing = null;
    onClear();
    await persist(null);
  }
  async function commit(value: Tokens, version: number) {
    if (version !== epoch) throw new Error("Session changed");
    if (!value.access || !value.refresh)
      throw new Error("Invalid session response");
    try {
      await persist(value);
    } catch (error) {
      if (version === epoch) await clear().catch(() => {});
      throw error;
    }
    if (version === epoch) tokens = value;
    if (version !== epoch) throw new Error("Session changed");
  }
  api.interceptors.request.use((config) => {
    config.url = resolveResource(base, config.url || "");
    const c = config as typeof config & { sessionEpoch?: number };
    if (c.sessionEpoch !== undefined && c.sessionEpoch !== epoch)
      throw new Error("Session changed");
    c.sessionEpoch = epoch;
    if (tokens) config.headers.Authorization = `Bearer ${tokens.access}`;
    return config;
  });
  api.interceptors.response.use(
    (response) => {
      if (
        (response.config as typeof response.config & { sessionEpoch: number })
          .sessionEpoch !== epoch
      )
        throw new Error("Session changed");
      return response;
    },
    async (error) => {
      const config = error.config;
      if (!config || config.sessionEpoch !== epoch) throw error;
      if (error.response?.status !== 401) throw error;
      if (config.retried || !tokens) {
        await clear();
        throw error;
      }
      config.retried = true;
      const version = epoch;
      try {
        if (config.headers.Authorization === `Bearer ${tokens.access}`) {
          if (!refreshing) {
            const old = tokens.refresh;
            const pending = publicApi
              .post<Tokens>("auth/refresh/", { refresh: old })
              .then(async (r) => {
                if (!r.data.access || !r.data.refresh)
                  throw new Error("Invalid refresh response");
                await commit(r.data, version);
                return r.data.access;
              });
            refreshing = pending;
            void pending
              .finally(() => {
                if (refreshing === pending) refreshing = null;
              })
              .catch(() => {});
          }
          await refreshing;
        }
        if (version !== epoch) throw new Error("Session changed");
        return api(config);
      } catch (e) {
        if (version === epoch) await clear();
        throw e;
      }
    },
  );
  return {
    api,
    publicApi,
    clear,
    version: () => epoch,
    commit,
    load: async () => {
      const version = epoch;
      await writes;
      const stored = await vault.read();
      if (version !== epoch) throw new Error("Session changed");
      if (stored && (!stored.access || !stored.refresh)) {
        await clear();
        throw new Error("Invalid stored session");
      }
      tokens = stored;
      return stored;
    },
    logout: async () => {
      const previous = tokens;
      await clear();
      if (previous)
        await publicApi
          .post(
            "auth/logout/",
            { refresh: previous.refresh },
            { headers: { Authorization: `Bearer ${previous.access}` } },
          )
          .catch(() => {});
    },
  };
}
