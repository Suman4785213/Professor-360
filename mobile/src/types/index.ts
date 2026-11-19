import { z } from "zod";
import { roles } from "../constants/roles";
export const userSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    role: z.enum(roles),
    college: z.string().nullable().optional(),
    college_name: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
    designation: z.string().optional(),
    faculty_profile: z
      .object({ profile_photo: z.string().nullable().optional() })
      .passthrough()
      .nullable()
      .optional(),
    avatar: z.string().nullable().optional(),
    department_name: z.string().nullable().optional(),
  })
  .passthrough();
export type User = z.infer<typeof userSchema>;
export type Tokens = { access: string; refresh: string };
export type College = {
  id: string;
  name: string;
  code: string;
  city?: string;
  state?: string;
};
export type Notice = {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
};
export type Page<T> = { count: number; next: string | null; results: T[] };
