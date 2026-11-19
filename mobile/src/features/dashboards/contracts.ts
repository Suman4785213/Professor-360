import type { User } from "../../types";
export type Row = {
  document?: string;
  output_format?: string;
  faculty_id?: string | null;
  document_details?: Row;
  documents?: Row[];
  profile_photo?: string | null;
  faculty_count?: number;
  total_fdps?: number;
  total_publications?: number;
  current_status?: string;
  activity_details?: { title: string };
  id?: string;
  name?: string;
  title?: string;
  status?: string;
  code?: string;
  user_name?: string;
  designation?: string;
  department_name?: string;
  faculty_name?: string;
  body?: string;
  response?: string;
  submitted_to_hod?: boolean;
  submitted_to_admins?: boolean;
  download_url?: string;
  file_url?: string;
  user_email?: string;
  college_name?: string;
  plan_details?: { name: string };
};
export type Listing = { results: Row[]; count?: number; next?: string | null };
export type Overview = {
  total_activities: number;
  total_faculty: number;
  total_departments: number;
  status_summary: Record<string, number>;
  activity_types: { activity_type: string; count: number }[];
};
export type Participation = {
  total_activities: number;
  verified_activities: number;
  participation_rate_pct: number;
  category_breakdown: { name: string; code: string; count: number }[];
};
export type Section = {
  id: string;
  title: string;
  path: string;
  kind?: "overview" | "participation" | "health";
  unavailable?: string;
};
export function contextError(user: User) {
  if (user.role !== "SUPER_ADMIN" && !user.college)
    return "Your account needs an institution assignment.";
  if (
    ["HOD", "DEPARTMENT_INCHARGE", "FACULTY"].includes(user.role) &&
    !user.department
  )
    return "Your account needs a department assignment.";
  return null;
}
export function sectionsFor(user: User): Section[] {
  if (contextError(user)) return [];
  const common: Section[] = [
    { id: "evidence", title: "Evidence attachments", path: "evidence/" },
    {
      id: "notifications",
      title: "Recent notifications",
      path: "notifications/",
    },
    {
      id: "tasks",
      title: "My assigned tasks",
      path: `tasks/?owner=${encodeURIComponent(user.id)}`,
    },
  ];
  if (user.role === "SUPER_ADMIN")
    return [
      { id: "colleges", title: "Registered institutions", path: "colleges/" },
      { id: "subscriptions", title: "Subscriptions", path: "subscriptions/" },
      {
        id: "health",
        title: "Platform health",
        path: "system/health/",
        kind: "health",
      },
      ...common,
    ];
  const overview: Section = {
    id: "overview",
    title:
      user.role === "FACULTY" ? "My activity summary" : "Academic overview",
    path: "analytics/overview/",
    kind: "overview",
  };
  const participation: Section = {
    id: "participation",
    title:
      user.role === "FACULTY"
        ? "My FDP, publications and categories"
        : "Faculty participation and categories",
    path: "analytics/faculty-participation/",
    kind: "participation",
  };
  const faculty: Section = {
    id: "faculty",
    title: "Faculty directory",
    path: "auth/faculty/profiles/",
  };
  const reports: Section = {
    id: "reports",
    title: "Available reports",
    path: "reports/",
  };
  if (user.role === "FACULTY")
    return [
      overview,
      participation,
      reports,
      { id: "activities", title: "My activities", path: "activities/" },
      { id: "documents", title: "My documents", path: "documents/" },
      ...common,
    ];
  if (user.role === "HOD")
    return [
      overview,
      faculty,
      {
        id: "verification",
        title: "Pending HOD verification",
        path: "verifications/?current_status=PENDING_HOD",
      },
      {
        id: "received",
        title: "Received in-charge reports and submission status",
        path: "reports/hod-downloaded-reports/",
      },
      reports,
      ...common,
    ];
  if (user.role === "DEPARTMENT_INCHARGE")
    return [
      overview,
      faculty,
      {
        id: "verification",
        title: "Pending and returned in-charge verification",
        path: "verifications/?current_status__in=PENDING_INCHARGE,RETURNED_TO_INCHARGE",
      },
      {
        id: "requests",
        title: "Report requests and faculty responses",
        path: "notifications/incharge-requests/",
      },
      { ...reports, path: "reports/incharge-stored-reports/" },
      {
        id: "merge",
        title: "Merge reports",
        path: "",
      },
      ...common,
    ];
  const departments: Section = {
    id: "departments",
    title: "Departments",
    path: "departments/",
  };
  if (user.role === "COLLEGE_MANAGEMENT")
    return [
      overview,
      participation,
      departments,
      faculty,
      reports,
      {
        id: "registration",
        title: "Register faculty",
        path: "",
      },
      ...common,
    ];
  return [
    overview,
    participation,
    departments,
    {
      id: "verification",
      title: "Pending IQAC approvals",
      path: "verifications/?current_status=PENDING_IQAC",
    },
    reports,
    {
      id: "compliance",
      title: "AQAR and SSR preparation",
      path: "analytics/executive/",
      kind: "health",
    },
    { id: "registration", title: "Register faculty", path: "" },
    ...common,
  ];
}
export function normalizeList(data: unknown): Listing {
  if (Array.isArray(data)) return { results: data };
  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray(data.results)
  )
    return data as Listing;
  throw new Error("Unexpected list response from server.");
}
export function overviewStats(data: Overview, faculty: boolean) {
  return [
    { label: "Activities (all states)", value: data.total_activities },
    ...(!faculty ? [{ label: "Faculty", value: data.total_faculty }] : []),
    ...Object.entries(data.status_summary).map(([label, value]) => ({
      label: label.replaceAll("_", " "),
      value,
    })),
    ...data.activity_types.map((x) => ({
      label: x.activity_type || "Uncategorized",
      value: x.count,
    })),
  ];
}
export async function refreshSections(refreshers: (() => Promise<unknown>)[]) {
  return Promise.allSettled(refreshers.map((fn) => fn()));
}

export function healthStats(data: Record<string, unknown>) {
  const result: { label: string; value: string | number }[] = [];
  for (const [key, value] of Object.entries((data.kpis as object) || data))
    if (typeof value === "string" || typeof value === "number")
      result.push({ label: key.replaceAll("_", " "), value });
  if (data.platform_counts)
    for (const [key, value] of Object.entries(data.platform_counts))
      if (typeof value === "number")
        result.push({ label: key.replaceAll("_", " "), value });
  if (data.services)
    for (const [key, value] of Object.entries(data.services))
      if (
        value &&
        typeof value === "object" &&
        "status" in value &&
        typeof value.status === "string"
      )
        result.push({ label: key, value: value.status });
  return result;
}
