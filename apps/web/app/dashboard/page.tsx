"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Bot = {
  id: string;
  name: string;
  status: "stopped" | "starting" | "running" | "stopping" | "failed";
  entrypoint: string;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [bots, setBots] = useState<Bot[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadBots() {
    const supabase = getSupabaseBrowserClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      router.replace("/");
      return;
    }
    const { data, error } = await supabase
      .from("bots")
      .select("id,name,status,entrypoint,created_at")
      .order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    else setBots((data ?? []) as Bot[]);
    setLoading(false);
  }

  useEffect(() => {
    loadBots().catch(err => {
      setMessage(err instanceof Error ? err.message : "Could not load bots.");
      setLoading(false);
    });
  }, []);

  async function createBot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Please sign in again.");
      const { error } = await supabase.from("bots").insert({
        owner_id: user.id,
        name: name.trim(),
        entrypoint: "main.py"
      });
      if (error) throw error;
      setName("");
      await loadBots();
      setMessage("Bot project created. Connect the runner to enable deployment.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not create bot.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark">B</span> bothost</a>
        <button className="btn btn-secondary" onClick={signOut}>Sign out</button>
      </header>
      <section className="hero">
        <div className="eyebrow">Workspace</div>
        <h1>Your bot projects</h1>
        <p>Create and organize your Telegram bot projects. Each account sees only its own records through database row-level security.</p>
      </section>
      <div className="grid">
        <section className="panel">
          <div className="row">
            <h2>My bots</h2>
            <span className="muted">{bots.length} projects</span>
          </div>
          {loading ? <p>Loading your projects…</p> : bots.length === 0 ? <p>No bots yet. Create your first project using the form.</p> : (
            <div className="bot-list">
              {bots.map(bot => (
                <article className="bot" key={bot.id}>
                  <div>
                    <div className="bot-name">{bot.name}</div>
                    <div className="muted">{bot.entrypoint}</div>
                  </div>
                  <span className={`status status-${bot.status}`}><span className="dot" />{bot.status}</span>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <div className="eyebrow">New project</div>
          <h2 style={{ marginTop: 8, marginBottom: 18 }}>Create a bot</h2>
          <form className="stack" onSubmit={createBot}>
            <label className="field">Project name
              <input value={name} onChange={e => setName(e.target.value)} maxLength={80} required placeholder="My Telegram bot" />
            </label>
            <button className="btn" disabled={busy || !name.trim()} type="submit">{busy ? "Creating…" : "Create project"}</button>
          </form>
          <p className="muted">This creates a project record only. Uploads and start/stop actions will be enabled after the isolated runner is implemented.</p>
        </section>
      </div>
      <p className="notice" style={{ marginTop: 18 }}>Security note: do not paste bot tokens into chat or commit them to Git. Secret storage and runner deployment are the next backend tasks.</p>
      {message && <p className="muted" role="status">{message}</p>}
    </main>
  );
}
