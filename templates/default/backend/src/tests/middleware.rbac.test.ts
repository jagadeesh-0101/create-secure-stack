import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { Role } from "../types.js";
import { requireRole } from "../middleware/rbac.js";
import { AppError } from "../errors.js";

function makeReq(role?: Role): Request {
  return {
    user: role ? { id: "u1", role } : undefined,
  } as unknown as Request;
}

const res = {} as Response;

describe("requireRole — RBAC middleware", () => {
  it("401 when req.user is not set", () => {
    const next = vi.fn() as unknown as NextFunction;
    requireRole(Role.admin)(makeReq(), res, next);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
  });

  it("403 when user role is not in the allowed list", () => {
    const next = vi.fn() as unknown as NextFunction;
    requireRole(Role.admin)(makeReq(Role.member), res, next);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(403);
  });

  it("passes when user role matches", () => {
    const next = vi.fn() as unknown as NextFunction;
    requireRole(Role.admin)(makeReq(Role.admin), res, next);
    expect(next).toHaveBeenCalledWith(); // no args = success
  });

  it("passes when multiple roles are allowed and user matches one", () => {
    const next = vi.fn() as unknown as NextFunction;
    requireRole(Role.admin, Role.member)(makeReq(Role.member), res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
