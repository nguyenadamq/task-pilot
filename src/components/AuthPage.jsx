import { useState } from "react";
import { supabase } from "../lib/supabase";

function AuthPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const authAction =
      mode === "login"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });

    const { error } = await authAction;

    if (error) {
      setMessage(error.message);
    } else if (mode === "signup") {
      setMessage("Account created. Check your email if confirmation is enabled.");
    }

    setLoading(false);
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Task Pilot</h1>
        <p>Plan realistic work around your actual schedule.</p>

        <div className="segmented-control">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>
            Log in
          </button>
          <button className={mode === "signup" ? "active" : ""} type="button" onClick={() => setMode("signup")}>
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              minLength="6"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {message ? <p className="form-message">{message}</p> : null}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Working..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default AuthPage;
