import { create } from "zustand";
import type { College, User } from "../types";
export const useSession = create<{
  user: User | null;
  college: College | null;
  ready: boolean;
  error: string | null;
  select: (c: College | null) => void;
}>((set) => ({
  user: null,
  college: null,
  ready: false,
  error: null,
  select: (college) => set({ college }),
}));
