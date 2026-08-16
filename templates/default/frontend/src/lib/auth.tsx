import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type AuthUser } from "./api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, ssn?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, try to hydrate the session from the httpOnly cookie.
  // If /users/me returns 401, the cookie is missing/expired — not logged in.
  // No localStorage — the browser owns the cookie.
  useEffect(() => {
    api
      .me()
      .then((me) => setUser({ id: me.id, email: me.email, role: me.role }))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    setUser(res.user); // cookie is set by the server's Set-Cookie header
  };

  const register = async (email: string, password: string, ssn?: string) => {
    const res = await api.register(email, password, ssn);
    setUser(res.user);
  };

  const logout = async () => {
    await api.logout(); // server clears the cookie
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
