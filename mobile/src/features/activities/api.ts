import { z } from "zod";
import type { AxiosInstance } from "axios";
import type { User } from "../../types";
export const activityTypes = [
  "FDP",
  "WORKSHOP",
  "SEMINAR",
  "CONFERENCE",
  "CERTIFICATION",
  "PUBLICATION",
  "RESEARCH",
  "TRAINING",
  "ACHIEVEMENT",
  "AWARD",
  "OTHER",
] as const;
export type Document = {
  id: string;
  file_name: string;
  original_filename?: string;
  file_size: number;
  mime_type: string;
  download_url: string;
};
export type Activity = {
  id: string;
  college: string;
  department: string;
  faculty: string;
  title: string;
  status: string;
  is_editable: boolean;
  last_rejection_reason: string;
  documents: Document[];
  verification_details?: { id: string };
  [field: string]: unknown;
};
export type Verification = {
  id: string;
  current_status: string;
  activity_details: Activity;
  logs: {
    id: string;
    action: string;
    comment: string;
    previous_status: string;
    new_status: string;
    created_at: string;
    actor_name?: string;
  }[];
};
const date = z
  .string()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use YYYY-MM-DD");
export const activitySchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    activity_type: z.enum(activityTypes),
    organizer: z.string().max(200),
    venue: z.string().max(200),
    location: z.string().max(200),
    start_date: date,
    end_date: date,
    duration: z.string().max(100),
    duration_days: z.string().regex(/^\d*$/),
    duration_hours: z
      .string()
      .refine(
        (v) => !v || (!isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 999),
        "Enter valid hours",
      ),
    description: z.string(),
    additional_remarks: z.string(),
    certificate_number: z.string().max(100),
    academic_year: z.string(),
    category: z.string(),
    is_online: z.boolean(),
  })
  .refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, {
    path: ["end_date"],
    message: "End date must follow start date",
  });
export function owns(user: User, a: Activity) {
  return (
    user.role === "FACULTY" &&
    user.id === a.faculty &&
    user.college === a.college &&
    user.department === a.department
  );
}
export function editable(user: User, a: Activity) {
  return owns(user, a) && a.is_editable;
}
export function stage(user: User, a: Activity) {
  if (!user.college || user.college !== a.college) return null;
  if (
    ["HOD", "DEPARTMENT_INCHARGE"].includes(user.role) &&
    (!user.department || user.department !== a.department)
  )
    return null;
  return user.role === "IQAC" && a.status === "PENDING_IQAC"
    ? "iqac-verify"
    : user.role === "HOD" && a.status === "PENDING_HOD"
      ? "hod-verify"
      : user.role === "DEPARTMENT_INCHARGE" &&
          ["PENDING_INCHARGE", "RETURNED_TO_INCHARGE"].includes(a.status)
        ? "incharge-verify"
        : null;
}
export function singleFlight() {
  const running = new Map<string, Promise<unknown>>();
  return <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    const previous = running.get(key);
    if (previous) return previous as Promise<T>;
    const request = fn().finally(() => running.delete(key));
    running.set(key, request);
    return request;
  };
}
export function workflowApi(
  api: AxiosInstance,
  user: User,
  invalidate: () => Promise<unknown>,
) {
  const once = singleFlight();
  async function mutate<T>(key: string, fn: () => Promise<T>) {
    return once(key, async () => {
      try {
        return await fn();
      } finally {
        await invalidate();
      }
    });
  }
  return {
    save: (raw: unknown, a?: Activity) =>
      mutate("save", async () => {
        if (
          user.role !== "FACULTY" ||
          !user.college ||
          !user.department ||
          (a && !editable(user, a))
        )
          throw new Error("Only the author can save an editable activity.");
        const data = activitySchema.parse(raw);
        const payload = {
          ...data,
          category: data.category || null,
          academic_year: data.academic_year || null,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          duration_days: data.duration_days ? Number(data.duration_days) : null,
          duration_hours: data.duration_hours || null,
        };
        return (
          await (a
            ? api.patch<Activity>(`activities/${a.id}/`, payload)
            : api.post<Activity>("activities/", payload))
        ).data;
      }),
    submit: (a: Activity) =>
      mutate("submit", async () => {
        if (!editable(user, a))
          throw new Error("Activity cannot be submitted by this account.");
        return (await api.post(`activities/${a.id}/submit/`, {})).data;
      }),
    remove: (a: Activity) =>
      mutate("delete", async () => {
        if (!owns(user, a) || a.status !== "DRAFT")
          throw new Error("Only your own draft can be deleted.");
        await api.delete(`activities/${a.id}/`);
      }),
    decide: (
      v: Verification,
      decision: "APPROVE" | "REJECT",
      comment: string,
      target = "FACULTY",
    ) =>
      mutate("decision", async () => {
        const action = stage(user, v.activity_details);
        if (!action)
          throw new Error("This review is no longer actionable by your role.");
        if (decision === "REJECT" && !comment.trim())
          throw new Error("A return reason is required.");
        return (
          await api.post(`verifications/${v.id}/${action}/`, {
            decision,
            comment,
            ...(action === "iqac-verify" ? { target } : {}),
          })
        ).data;
      }),
  };
}
export type PickedFile = {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
};
export function validateUpload(file: PickedFile) {
  if (
    !/\.(pdf|jpg|jpeg|png)$/i.test(file.name) ||
    !["application/pdf", "image/jpeg", "image/png"].includes(file.mimeType)
  )
    throw new Error("Choose PDF, JPG, JPEG or PNG.");
  if (
    !Number.isFinite(file.size) ||
    file.size <= 0 ||
    file.size > 10 * 1024 * 1024
  )
    throw new Error("File must be between 1 byte and 10 MiB.");
  return file;
}
export function uploadBody(
  a: Activity,
  user: User,
  file: PickedFile,
  type: string,
  form = new FormData(),
) {
  if (!editable(user, a))
    throw new Error("Only the author may upload to an editable activity.");
  validateUpload(file);
  if (!["CERTIFICATE", "SUPPORTING", "OTHER"].includes(type))
    throw new Error("Invalid document type.");
  form.append("activity", a.id);
  form.append("file_name", file.name.replace(/[\/\\\x00-\x1f]/g, "_"));
  form.append("document_type", type);
  form.append("file", {
    uri: file.uri,
    name: file.name.replace(/[\/\\\x00-\x1f]/g, "_"),
    type: file.mimeType,
  } as unknown as Blob);
  return form;
}

export async function uploadEvidence(
  api: AxiosInstance,
  user: User,
  a: Activity,
  file: PickedFile,
  type: string,
  signal: AbortSignal,
  progress: (value: number) => void,
  invalidate: () => Promise<unknown>,
) {
  if (signal.aborted) throw new Error("Upload cancelled");
  try {
    return (
      await api.post<Document>("documents/", uploadBody(a, user, file, type), {
        headers: { "Content-Type": "multipart/form-data" },
        signal,
        onUploadProgress: (e) => {
          if (e.total) progress(Math.round((e.loaded / e.total) * 100));
        },
      })
    ).data;
  } finally {
    await invalidate();
  }
}

export function workflowError(error: unknown) {
  const data = (
    error as {
      response?: {
        data?: { details?: unknown; error?: { details?: unknown } };
      };
    }
  )?.response?.data;
  const details = data?.error?.details || data?.details;
  if (details && typeof details === "object")
    return Object.entries(details)
      .map(
        ([field, value]) =>
          `${field}: ${Array.isArray(value) ? value.join(", ") : String(value)}`,
      )
      .join("\n");
  return null;
}
