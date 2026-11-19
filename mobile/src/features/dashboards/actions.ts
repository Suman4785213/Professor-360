import { z } from "zod";
import type { User } from "../../types";
import type { AxiosInstance } from "axios";
export const registrationSchema = z
  .object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    email: z.email(),
    department: z.string().min(1),
    password: z.string().min(8),
    confirm_password: z.string(),
    employee_id: z.string(),
    designation: z.string(),
    phone: z.string(),
  })
  .refine((x) => x.password === x.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords must match.",
  });
export const canRegister = (u: User) =>
  !!u.college && ["IQAC", "COLLEGE_MANAGEMENT"].includes(u.role);
export async function registerFaculty(
  api: AxiosInstance,
  u: User,
  input: unknown,
  departments: { id: string }[],
) {
  if (!canRegister(u))
    throw new Error("Faculty registration is not permitted.");
  const data = registrationSchema.parse(input);
  if (!departments.some((d) => d.id === data.department))
    throw new Error("Select an authorized department.");
  const response = await api.post("auth/register/faculty/", {
    ...data,
    college: u.college,
  });
  return { success: response.data.success, message: response.data.message };
}
export function createMerge(api: AxiosInstance, user: User) {
  let running: Promise<{ id: string; download_url: string }> | null = null;
  let previous = "";
  let key = "";
  return (ids: string[]) => {
    if (
      user.role !== "DEPARTMENT_INCHARGE" ||
      !user.college ||
      !user.department
    )
      return Promise.reject(new Error("Assigned in-charge required."));
    const selection = [...new Set(ids)].sort();
    if (!selection.length)
      return Promise.reject(new Error("Select at least one report."));
    const body = JSON.stringify(selection);
    if (running) {
      if (body !== previous)
        return Promise.reject(new Error("Wait for the current merge."));
      return running;
    }
    if (body !== previous) {
      key = `merge-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      previous = body;
    }
    running = api
      .post(
        "reports/merge-reports/",
        { report_ids: selection },
        { headers: { "Idempotency-Key": key } },
      )
      .then((r) => r.data)
      .finally(() => {
        running = null;
      });
    return running;
  };
}
