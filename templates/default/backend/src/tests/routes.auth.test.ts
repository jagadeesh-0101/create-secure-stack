/**
 * Integration tests for /auth routes.
 * Uses the real Express app against the test SQLite database seeded in setup.ts.
 * supertest handles cookies automatically via the `Set-Cookie` header.
 */
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { prisma } from "../db.js";
import { app } from "../app.js";

// Clean the Users and AuditLog tables before each test
beforeEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
});

const VALID_REG = {
  email: "test@example.com",
  password: "password123",
};

// supertest needs Origin header to pass validateOrigin middleware
const ORIGIN = { Origin: "http://localhost:5173" };

describe("POST /auth/register", () => {
  it("201 — creates user, sets auth cookie, returns user object", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set(ORIGIN)
      .send(VALID_REG);

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(VALID_REG.email);
    expect(res.body.user.role).toBe("member");
    // No token in response body — it's in the cookie
    expect(res.body.token).toBeUndefined();
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("400 — missing password", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set(ORIGIN)
      .send({ email: "a@b.com" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("BAD_REQUEST");
  });

  it("400 — password too short", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set(ORIGIN)
      .send({ email: "a@b.com", password: "short" });
    expect(res.status).toBe(400);
  });

  it("400 — invalid email", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set(ORIGIN)
      .send({ email: "not-an-email", password: "password123" });
    expect(res.status).toBe(400);
  });

  it("409 — duplicate email", async () => {
    await request(app).post("/auth/register").set(ORIGIN).send(VALID_REG);
    const res = await request(app).post("/auth/register").set(ORIGIN).send(VALID_REG);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CONFLICT");
  });

  it("encrypts SSN — stored value differs from plaintext", async () => {
    await request(app)
      .post("/auth/register")
      .set(ORIGIN)
      .send({ ...VALID_REG, ssn: "123-45-6789" });

    const user = await prisma.user.findUnique({ where: { email: VALID_REG.email } });
    expect(user?.ssnEncrypted).not.toBe("123-45-6789");
    expect(user?.ssnEncrypted).not.toBeNull();
  });
});

describe("POST /auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/auth/register").set(ORIGIN).send(VALID_REG);
  });

  it("200 — correct credentials return user and set cookie", async () => {
    const res = await request(app)
      .post("/auth/login")
      .set(ORIGIN)
      .send(VALID_REG);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(VALID_REG.email);
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("401 — wrong password (generic error message, no user enumeration)", async () => {
    const res = await request(app)
      .post("/auth/login")
      .set(ORIGIN)
      .send({ email: VALID_REG.email, password: "wrongpassword" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("401 — unknown email (same generic error as wrong password)", async () => {
    const res = await request(app)
      .post("/auth/login")
      .set(ORIGIN)
      .send({ email: "nobody@example.com", password: "password123" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });
});

describe("POST /auth/logout", () => {
  it("200 — clears the auth cookie when authenticated", async () => {
    // Register + login to get a cookie
    const agent = request.agent(app);
    await agent.post("/auth/register").set(ORIGIN).send(VALID_REG);

    const res = await agent.post("/auth/logout").set(ORIGIN);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("401 — cannot logout without being authenticated", async () => {
    const res = await request(app).post("/auth/logout").set(ORIGIN);
    expect(res.status).toBe(401);
  });
});
