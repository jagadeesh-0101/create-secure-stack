import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { api, type AuthUser, ApiError } from "../lib/api";

export function Dashboard() {
  // ProtectedRoute guarantees user is non-null here — no inline redirect needed.
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<Array<AuthUser & { createdAt: string }>>([]);
  const [ssnByUserId, setSsnByUserId] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === "admin") {
      api
        .listUsers()
        .then((res) => setUsers(res.users))
        .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load users"));
    }
  }, [user]);

  async function revealSsn(userId: string) {
    setError(null);
    try {
      const res = await api.viewSsn(userId);
      setSsnByUserId((prev) => ({ ...prev, [userId]: res.ssn }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to decrypt field");
    }
  }

  return (
    <div className="dashboard-container">
      <nav className="nav-bar">
        <div className="nav-brand">
          <h2>SecureStack</h2>
        </div>
        <div className="nav-actions">
          <span className="nav-user">{user!.email}</span>
          <button className="btn-secondary" onClick={logout}>Sign out</button>
        </div>
      </nav>

      {user!.role === "admin" && (
        <section className="card dashboard-card">
          <h3>User Management</h3>
          <p className="hint">
            Clicking &ldquo;Reveal SSN&rdquo; calls an admin-only route that decrypts the field on
            the server and writes an audit log entry — it never sends the plaintext value anywhere else.
          </p>
          
          {error && <div className="error">{error}</div>}
          
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>SSN (Encrypted)</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-badge role-${u.role}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {ssnByUserId[u.id] ? (
                      <span style={{ fontFamily: "monospace", letterSpacing: "1px" }}>
                        {ssnByUserId[u.id]}
                      </span>
                    ) : (
                      <button className="btn-secondary" onClick={() => revealSsn(u.id)}>Reveal SSN</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      
      {user!.role !== "admin" && (
        <section className="card dashboard-card">
          <h3>Member Portal</h3>
          <p className="hint" style={{ marginTop: 0 }}>
            You are signed in as a standard member. Admin features (like user management and SSN decryption) are hidden.
          </p>
        </section>
      )}
    </div>
  );
}
