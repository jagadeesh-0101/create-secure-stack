import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { Role } from "../types.js";
import { signToken, requireAuth, setAuthCookie } from "../middleware/auth.js";
import { AppError } from "../errors.js";

function mockReq(overrides: Partial<Request> = {}): Request {
  return { headers: {}, cookies: {}, ...overrides } as unknown as Request;
}

function mockRes(): Response & { cookieJar: Record<string, unknown> } {
  const cookieJar: Record<string, unknown> = {};
  return {
    cookie: vi.fn((name: string, val: string) => { cookieJar[name] = val; }),
    clearCookie: vi.fn(),
    cookieJar,
  } as unknown as Response & { cookieJar: Record<string, unknown> };
}

const VALID_USER = { id: "user-1", role: Role.member };

describe("signToken / requireAuth — JWT middleware", () => {
  it("signToken produces a verifiable JWT string", () => {
    const token = signToken(VALID_USER);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("requireAuth passes with a valid cookie", () => {
    const token = signToken(VALID_USER);
    const req = mockReq({ cookies: { "auth-token": token } });
    const next = vi.fn() as unknown as NextFunction;
    requireAuth(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith(); // called with no args = success
    expect(req.user?.id).toBe("user-1");
  });

  it("requireAuth passes with a valid Bearer header (API tooling fallback)", () => {
    const token = signToken(VALID_USER);
    const req = mockReq({
      headers: { authorization: `Bearer ${token}` },
    });
    const next = vi.fn() as unknown as NextFunction;
    requireAuth(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user?.id).toBe("user-1");
  });

  it("requireAuth calls next(AppError) with 401 when no token is present", () => {
    const next = vi.fn() as unknown as NextFunction;
    requireAuth(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
  });

  it("requireAuth calls next(AppError) with 401 on an expired/invalid token", () => {
    const req = mockReq({ cookies: { "auth-token": "invalid.token.here" } });
    const next = vi.fn() as unknown as NextFunction;
    requireAuth(req, mockRes(), next);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
  });

  it("setAuthCookie sets httpOnly cookie on the response", () => {
    const token = signToken(VALID_USER);
    const res = mockRes();
    setAuthCookie(res, token);
    expect(res.cookie).toHaveBeenCalledWith(
      "auth-token",
      token,
      expect.objectContaining({ httpOnly: true, sameSite: "lax" })
    );
  });
});
