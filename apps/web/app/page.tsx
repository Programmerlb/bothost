"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function signUp() {
    setBusy(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;
      setError("Account request submitted. Check your email if confirmation is enabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark">B</span> bothost</a>
        <span className="muted">Python Telegram bot hosting</span>
      </header>
      <section className="grid">
        <div className="hero">
          <div className="eyebrow">Your bots, organized</div>
          <h1>Ship your bot.<br />We’ll handle the dashboard.</h1>
          <p>Create an account to manage your Telegram bot projects, review their status, and access deployment controls from one place.</p>
          <div className="notice">Bot execution runs on a separate isolated runner service. This website does not execute uploaded Python code.</div>
        </div>
        <section className="panel">
          <div className="eyebrow">Welcome back</div>
          <h2 style={{ marginTop: 8, marginBottom: 20 }}>Sign in to Bothost</h2>
          <form className="stack" onSubmit={signIn}>
            <label className="field">Email
              <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <label className="field">Password
              <input type="password" autoComplete="current-password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
            </label>
            <button className="btn" type="submit" disabled={busy}>{busy ? "Please wait…" : "Sign in"}</button>
            <button className="btn btn-secondary" type="button" disabled={busy || !email || password.length < 6} onClick={signUp}>Create account</button>
          </form>
          {error && <p className="error" role="status">{error}</p>}
          <p className="muted">Authentication is handled by Supabase. Configure the environment variables before using this page.</p>
        </section>
      </section>
    </main>
  );
}
