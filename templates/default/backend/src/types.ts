/**
 * Application-level role type. Stored as a plain string in the database
 * (Prisma enums aren't supported on SQLite), enforced here at the TypeScript
 * level. Every place that reads or writes a role should use this type.
 */
export type Role = "admin" | "member";

export const Role = {
  admin: "admin" as const,
  member: "member" as const,
} satisfies Record<Role, Role>;
