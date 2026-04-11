import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../services/api";

export default function Login() {
  const { login } = useAuth();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      login(res.accessToken, res.refreshToken, res.user);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">🪟</span>
          <div>
            <h1 className="login-title">Inventry</h1>
            <p className="login-subtitle">Inventory Management System</p>
          </div>
        </div>

        <form onSubmit={submit} className="login-form">
          <h2 className="login-heading">Sign in to your account</h2>

          {error && <div className="login-error">{error}</div>}

          <div className="login-field">
            <label className="login-label">Email address</label>
            <input
              type="email"
              className="login-input"
              placeholder="admin@inventry.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="login-field">
            <label className="login-label">Password</label>
            <input
              type="password"
              className="login-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="login-footer">UPVC &amp; Glass Door Co.</p>
      </div>
    </div>
  );
}
