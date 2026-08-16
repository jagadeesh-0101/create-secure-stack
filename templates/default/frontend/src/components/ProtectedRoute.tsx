import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

interface Props {
  /** If provided, user must have one of these roles. Redirects to /unauthorized otherwise. */
  allowedRoles?: string[];
  children: ReactNode;
}

/**
 * Wraps protected routes. Behaviour:
 * - While auth status is loading: shows a centered spinner (no flash of content).
 * - Not authenticated: redirects to /login.
 * - Authenticated but wrong role: redirects to /unauthorized.
 * - Otherwise: renders children.
 *
 * Use in App.tsx:
 *   <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
 *   <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><Admin /></ProtectedRoute>} />
 */
export function ProtectedRoute({ allowedRoles, children }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px" }}>
        <p style={{ color: "#94a3b8" }}>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
