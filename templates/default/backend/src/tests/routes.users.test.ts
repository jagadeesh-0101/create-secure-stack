/**
 * Integration tests for /users routes.
 */
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { prisma } from "../db.js";
import { app } from "../app.js";
import { signToken } from "../middleware/auth.js";
import { Role } from "../types.js";

beforeEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
});

const ORIGIN = { Origin: "http://localhost:5173" };

async function createUser(email: string, role: Role = Role.member, ssn?: string) {
  const bcrypt = await import("bcryptjs");
  return prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash("password123", 1), // cost 1 for speed in tests
      role,
      ssnEncrypted: ssn
        ? (await import("../crypto.js")).encryptField(ssn)
        : null,
    },
  });
}

function authCookie(user: { id: string; role: string }) {
  const token = signToken({ id: user.id, role: user.role as Role });
  return `auth-token=${token}`;
}

describe("GET /users/me", () => {
  it("200 — returns own profile for authenticated user", async () => {
    const user = await createUser("me@example.com");
    const res = await request(app)
      .get("/users/me")
      .set("Cookie", authCookie(user));
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("me@example.com");
  });

  it("401 — no auth", async () => {
    const res = await request(app).get("/users/me");
    expect(res.status).toBe(401);
  });
});

describe("GET /users", () => {
  it("401 — no auth", async () => {
    const res = await request(app).get("/users");
    expect(res.status).toBe(401);
  });

  it("403 — member cannot list users", async () => {
    const member = await createUser("member@example.com", Role.member);
    const res = await request(app)
      .get("/users")
      .set("Cookie", authCookie(member));
    expect(res.status).toBe(403);
  });

  it("200 — admin can list users with pagination", async () => {
    const admin = await createUser("admin@example.com", Role.admin);
    await createUser("a@example.com");
    await createUser("b@example.com");

    const res = await request(app)
      .get("/users?limit=1")
      .set("Cookie", authCookie(admin));

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(typeof res.body.nextCursor).toBe("string");
  });

  it("200 — cursor pagination returns next page", async () => {
    const admin = await createUser("admin@example.com", Role.admin);
    await createUser("first@example.com");
    await createUser("second@example.com");

    const page1 = await request(app)
      .get("/users?limit=2")
      .set("Cookie", authCookie(admin));

    // 3 users total (admin + 2), limit=2, so there is a next page
    const cursor = page1.body.nextCursor;
    expect(cursor).toBeTruthy();

    const page2 = await request(app)
      .get(`/users?limit=2&cursor=${cursor}`)
      .set("Cookie", authCookie(admin));
    expect(page2.status).toBe(200);
    expect(page2.body.nextCursor).toBeNull();
  });
});

describe("GET /users/:id/ssn", () => {
  it("403 — member cannot view SSN", async () => {
    const member = await createUser("member@example.com", Role.member, "111-22-3333");
    const res = await request(app)
      .get(`/users/${member.id}/ssn`)
      .set("Cookie", authCookie(member));
    expect(res.status).toBe(403);
  });

  it("404 — unknown user ID", async () => {
    const admin = await createUser("admin@example.com", Role.admin);
    const res = await request(app)
      .get("/users/nonexistent-id/ssn")
      .set("Cookie", authCookie(admin));
    expect(res.status).toBe(404);
  });

  it("404 — user has no SSN on file", async () => {
    const admin = await createUser("admin@example.com", Role.admin);
    const target = await createUser("target@example.com"); // no ssn
    const res = await request(app)
      .get(`/users/${target.id}/ssn`)
      .set("Cookie", authCookie(admin));
    expect(res.status).toBe(404);
  });

  it("200 — admin can decrypt SSN and it matches original value", async () => {
    const admin = await createUser("admin@example.com", Role.admin);
    const target = await createUser("target@example.com", Role.member, "123-45-6789");

    const res = await request(app)
      .get(`/users/${target.id}/ssn`)
      .set("Cookie", authCookie(admin));

    expect(res.status).toBe(200);
    expect(res.body.ssn).toBe("123-45-6789");
    expect(res.body.userId).toBe(target.id);
  });

  it("writes an audit log entry when SSN is viewed", async () => {
    const admin = await createUser("admin@example.com", Role.admin);
    const target = await createUser("target@example.com", Role.member, "123-45-6789");

    await request(app)
      .get(`/users/${target.id}/ssn`)
      .set("Cookie", authCookie(admin));

    const log = await prisma.auditLog.findFirst({
      where: { action: "user.view_sensitive_field" },
    });
    expect(log).not.toBeNull();
    expect(log?.userId).toBe(admin.id);
    // Sensitive value must NOT be in the log
    expect(log?.metadata).not.toContain("123-45-6789");
  });
});
