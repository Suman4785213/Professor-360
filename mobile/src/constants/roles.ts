export const roles = [
  "SUPER_ADMIN",
  "COLLEGE_MANAGEMENT",
  "IQAC",
  "HOD",
  "DEPARTMENT_INCHARGE",
  "FACULTY",
] as const;
export type Role = (typeof roles)[number];
export const labels: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  COLLEGE_MANAGEMENT: "College Management",
  IQAC: "IQAC Coordinator",
  HOD: "Head of Department",
  DEPARTMENT_INCHARGE: "Department In-charge",
  FACULTY: "Faculty",
};
export const paths = {
  SUPER_ADMIN: "/super-admin",
  COLLEGE_MANAGEMENT: "/management",
  IQAC: "/iqac",
  HOD: "/hod",
  DEPARTMENT_INCHARGE: "/incharge",
  FACULTY: "/faculty",
} as const satisfies Record<Role, string>;
export function canEnter(actual: Role | undefined, expected: Role) {
  return actual === expected;
}
