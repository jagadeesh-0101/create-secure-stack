import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ssn, setSsn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, ssn || undefined);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card-wrapper">
      <div className="card">
      <h1>Create an account</h1>
      <p className="subtitle">Join us to start building securely</p>
      
      <form onSubmit={handleSubmit}>
        <label>
          Email address
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="you@example.com"
            required 
          />
        </label>
        <label>
          Password
          <div className="hint" style={{marginTop: '-6px', marginBottom: '2px'}}>Minimum 8 characters</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
            required
          />
        </label>
        <label>
          SSN (Optional)
          <div className="hint" style={{marginTop: '-6px', marginBottom: '2px'}}>Demonstrates field-level AES-256-GCM encryption</div>
          <input
            type="text"
            value={ssn}
            onChange={(e) => setSsn(e.target.value)}
            placeholder="000-00-0000"
          />
        </label>
        
        {error && <div className="error">{error}</div>}
        
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Register"}
        </button>
      </form>
      
      <div className="footer-text">
        Already have an account? <Link to="/login">Sign in instead</Link>
      </div>
      </div>
    </div>
  );
}
