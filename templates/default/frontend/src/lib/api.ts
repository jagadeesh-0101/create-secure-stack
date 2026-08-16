const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface AuthResponse {
  user: AuthUser;
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Typed fetch wrapper. All requests use credentials: "include" so the browser
 * automatically attaches the httpOnly auth cookie — no token management in JS.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include", // send the httpOnly auth cookie on every request
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? `Request failed with status ${res.status}`);
  }
  return body as T;
}

export const api = {
  register: (email: string, password: string, ssn?: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, ssn }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request<{ ok: boolean }>("/auth/logout", { method: "POST" }),

  me: () => request<AuthUser & { createdAt: string }>("/users/me"),

  listUsers: () =>
    request<{ users: Array<AuthUser & { createdAt: string }>; nextCursor: string | null }>("/users"),

  viewSsn: (userId: string) =>
    request<{ userId: string; ssn: string }>(`/users/${userId}/ssn`),
};

export { ApiError };
