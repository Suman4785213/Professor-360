import type { AxiosInstance } from "axios";
import type { User } from "../../types";
import { singleFlight } from "../activities/api";
export const reportActions = (role: User["role"]) =>
  role === "DEPARTMENT_INCHARGE"
    ? ["submit-to-hod"]
    : role === "HOD"
      ? ["hod-download", "submit-to-admins"]
      : [];
export const taskActions = [
  "start",
  "complete",
  "block",
  "reopen",
  "cancel",
] as const;
export function notificationTarget(
  user: User,
  n: { related_model?: string; related_id?: string },
) {
  if (!n.related_id || !/^[a-zA-Z0-9-]+$/.test(n.related_id)) return null;
  return n.related_model === "GeneratedReport"
    ? { view: "reports", id: n.related_id }
    : n.related_model === "IQACTask"
      ? { view: "tasks", id: n.related_id }
      : n.related_model === "Activity"
        ? { view: "activity", id: n.related_id }
        : null;
}
export function operationApi(
  api: AxiosInstance,
  user: User,
  invalidate: () => Promise<unknown>,
) {
  const once = singleFlight();
  const keys = new Map<string, string>();
  const completed = new Map<string, unknown>();
  const call = (
    path: string,
    body: unknown = {},
    idempotent = false,
    method: "post" | "patch" = "post",
  ) => {
    const signature = JSON.stringify([method, path, body]);
    return once(signature, async () => {
      const remember =
        idempotent ||
        path === "tasks/" ||
        path === "notifications/send-report-request/" ||
        path.endsWith("/comments/");
      if (remember && completed.has(signature)) return completed.get(signature);
      if (!keys.has(signature))
        keys.set(
          signature,
          `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        );
      try {
        const response = await api[method](
          path,
          body,
          idempotent
            ? { headers: { "Idempotency-Key": keys.get(signature) } }
            : undefined,
        );
        if (remember) completed.set(signature, response.data);
        return response.data;
      } finally {
        await invalidate();
      }
    });
  };
  return {
    generate: (body: Record<string, unknown>) =>
      call("reports/generate/", body, true),
    preview: (body: Record<string, unknown>) => call("reports/preview/", body),
    handoff: (id: string, action: string) => {
      if (!reportActions(user.role).includes(action))
        return Promise.reject(new Error("Report action not permitted."));
      return call(`reports/${encodeURIComponent(id)}/${action}/`);
    },
    request: (faculty_id: string, message: string) => {
      if (user.role !== "DEPARTMENT_INCHARGE" || !user.department)
        return Promise.reject(new Error("Assigned In-charge required."));
      return call("notifications/send-report-request/", {
        faculty_id,
        message,
      });
    },
    facultyReport: (faculty_id: string) => {
      if (user.role !== "DEPARTMENT_INCHARGE" || !user.department)
        return Promise.reject(new Error("Assigned In-charge required."));
      return call("reports/incharge-faculty-report/", { faculty_id }, true);
    },
    respond: (id: string, response: string) => {
      if (!["Okay", "Done", "No"].includes(response))
        return Promise.reject(new Error("Invalid response."));
      return call(`notifications/${encodeURIComponent(id)}/respond-report-request/`, { response });
    },
    read: (id: string) => call(`notifications/${encodeURIComponent(id)}/read/`),
    readAll: () => call("notifications/mark-all-read/"),
    task: (id: string, action: string, comment: string) => {
      if (
        user.role === "COLLEGE_MANAGEMENT" ||
        !taskActions.includes(action as (typeof taskActions)[number])
      )
        return Promise.reject(new Error("Task action not permitted."));
      return call(`tasks/${encodeURIComponent(id)}/${action}/`, { comment });
    },
    saveTask: (body: Record<string, unknown>, id?: string) => {
      if (user.role === "COLLEGE_MANAGEMENT")
        return Promise.reject(new Error("Management has read-only oversight."));
      if (user.role === "FACULTY" && body.owner && body.owner !== user.id)
        return Promise.reject(new Error("Faculty may assign only themselves."));
      return call(
        id ? `tasks/${encodeURIComponent(id)}/` : "tasks/",
        body,
        false,
        id ? "patch" : "post",
      );
    },
    comment: (id: string, comment: string) => {
      if (!comment.trim() || user.role === "COLLEGE_MANAGEMENT")
        return Promise.reject(new Error("Comment not permitted."));
      return call(`tasks/${encodeURIComponent(id)}/comments/`, { comment });
    },
  };
}

export function pageRows(data: unknown): {
  results: Record<string, unknown>[];
  next?: string | null;
} {
  if (Array.isArray(data)) return { results: data };
  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray(data.results)
  )
    return data as { results: Record<string, unknown>[]; next?: string | null };
  return {
    results:
      data && typeof data === "object" ? [data as Record<string, unknown>] : [],
  };
}
export function accreditationSummary(data: Record<string, unknown>) {
  return {
    workspace: data.workspace,
    overall_progress: data.overall_progress,
    progress: data.progress,
  };
}
