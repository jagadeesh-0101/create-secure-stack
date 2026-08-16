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
    <div className="card">
      <div className="row">
        <h1>Dashboard</h1>
        <button onClick={logout}>Log out</button>
      </div>
      <p>
        Signed in as <strong>{user!.email}</strong> ({user!.role})
      </p>

      {user!.role === "admin" && (
        <section>
          <h2>All users (admin only)</h2>
          <p className="hint">
            Clicking &ldquo;Reveal SSN&rdquo; calls an admin-only route that decrypts the field on
            the server and writes an audit log entry — it never sends the plaintext value anywhere
            else.
          </p>
          {error && <p className="error">{error}</p>}
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>SSN</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    {ssnByUserId[u.id] ? (
                      ssnByUserId[u.id]
                    ) : (
                      <button onClick={() => revealSsn(u.id)}>Reveal SSN</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
