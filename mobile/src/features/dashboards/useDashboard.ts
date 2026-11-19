import { useInfiniteQuery } from "@tanstack/react-query";
import { session } from "../../services/runtime";
import type { User } from "../../types";
import {
  sectionsFor,
  normalizeList,
  type Section,
  type Listing,
  type Overview,
  type Participation,
} from "./contracts";
export type SectionData =
  Listing | Overview | Participation | Record<string, unknown>;
export function useDashboardSection(user: User, section: Section) {
  const allowed =
    sectionsFor(user).some(
      (s) => s.id === section.id && s.path === section.path,
    ) &&
    !section.unavailable &&
    !!section.path;
  return useInfiniteQuery({
    queryKey: [
      "dashboard",
      user.id,
      user.role,
      user.college,
      user.department,
      section.id,
    ],
    enabled: allowed,
    initialPageParam: section.path,
    queryFn: async ({ pageParam, signal }): Promise<SectionData> => {
      if (!allowed) throw new Error("Section not permitted.");
      const data = (await session.api.get(pageParam, { signal })).data;
      return section.kind ? data : normalizeList(data);
    },
    getNextPageParam: (last) =>
      !section.kind ? (last as Listing).next || undefined : undefined,
    staleTime: 30000,
  });
}
