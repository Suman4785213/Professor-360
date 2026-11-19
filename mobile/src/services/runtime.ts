import { cleanup } from "./cleanup";
import Constants from "expo-constants";
import { validateApiBase } from "./apiPolicy";
import * as SecureStore from "expo-secure-store";
import { QueryClient } from "@tanstack/react-query";
import { createSessionClient } from "./client";
import { useSession } from "../store/session";
import { userSchema, type Tokens } from "../types";
import type { Role } from "../constants/roles";
import { errorMessage } from "./errors";
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});
export const offlineQa = process.env.EXPO_PUBLIC_QA_OFFLINE === "1";
const base = offlineQa ? "" :
  process.env.EXPO_PUBLIC_API_BASE_URL || (__DEV__ ? "http://10.0.2.2:8000/api/v1/" : "");
validateApiBase(base, offlineQa, __DEV__, Constants.expoConfig?.extra?.localQaApi);
export const session = createSessionClient(
  base,
  {
    read: async () => {
      const value = await SecureStore.getItemAsync("professor360.session");
      return value ? JSON.parse(value) : null;
    },
    write: async (value) => {
      if (value)
        await SecureStore.setItemAsync(
          "professor360.session",
          JSON.stringify(value),
        );
      else await SecureStore.deleteItemAsync("professor360.session");
    },
  },
  () => {
    cleanup();
    void queryClient.cancelQueries();
    queryClient.clear();
    useSession.setState({
      user: null,
      college: null,
      ready: true,
      error: null,
    });
  },
);
let restoration: Promise<void> | null = null;
export function restore(): Promise<void> {
  if (restoration) return restoration;
  const version = session.version();
  useSession.setState({ ready: false, error: null });
  restoration = (async () => {
    try {
      const tokens = await session.load();
      if (tokens) {
        const user = userSchema.parse((await session.api.get("auth/me/")).data);
        if (version === session.version()) useSession.setState({ user });
      }
    } catch (e) {
      if (version === session.version())
        useSession.setState({ user: null, error: errorMessage(e) });
    } finally {
      if (version === session.version()) useSession.setState({ ready: true });
      restoration = null;
    }
  })();
  return restoration;
}
export async function login(
  email: string,
  password: string,
  role: Role,
  collegeId?: string,
) {
  if (role !== "SUPER_ADMIN" && !collegeId)
    throw new Error("Select an institution first.");
  const college = useSession.getState().college;
  const clearing = session.clear();
  useSession.setState({ college });
  await clearing;
  const version = session.version();
  const response = await session.publicApi.post<Tokens & { user: unknown }>(
    "auth/login/",
    {
      email,
      password,
      ...(role === "SUPER_ADMIN"
        ? { is_super_admin: true }
        : { college_id: collegeId }),
    },
  );
  const user = userSchema.parse(response.data.user);
  if (
    user.role !== role ||
    (role !== "SUPER_ADMIN" && user.college !== collegeId)
  )
    throw new Error(
      "This account does not match the selected role or institution.",
    );
  await session.commit(
    { access: response.data.access, refresh: response.data.refresh },
    version,
  );
  useSession.setState({ user, ready: true, error: null });
}
