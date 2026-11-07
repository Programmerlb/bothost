"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Bot = {
  id: string;
  name: string;
  status: "stopped" | "starting" | "running" | "stopping" | "failed";
  entrypoint: string;
  created_at: string;
};

const MAX_ARCHIVE_BYTES = 20 * 1024 * 1024;

export default function DashboardPage() {
  const router = useRouter();
  const [bots, setBots] = useState<Bot[]>([]);
  const [name, setName] = useState("");
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingBot, setUploadingBot] = useState<string | null>(null);
  const [workingBot, setWorkingBot] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function getAccessToken() {
    const supabase = getSupabaseBrowserClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.access_token) throw new Error("Please sign in again.");
    return session.access_token;
  }

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
      setMessage("Bot project created.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not create bot.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadSource(bot: Bot, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setMessage("Please choose a .zip archive.");
      return;
    }
    if (file.size === 0 || file.size > MAX_ARCHIVE_BYTES) {
      setMessage("Choose a non-empty ZIP archive no larger than 20 MB.");
      return;
    }

    setUploadingBot(bot.id);
    setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Please sign in again.");
      const objectPath = user.id + "/" + bot.id + "/source.zip";
      const { error } = await supabase.storage.from("bot-source").upload(objectPath, file, {
        upsert: true, contentType: "application/zip", cacheControl: "0"
      });
      if (error) throw error;
      setMessage("Private source archive uploaded. It has not been executed.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingBot(null);
    }
  }

  async function saveToken(bot: Bot) {
    const token = tokens[bot.id]?.trim() ?? "";
    if (!token) {
      setMessage("Enter the Telegram bot token first.");
      return;
    }
    setWorkingBot(bot.id);
    setMessage("");
    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/bots/" + bot.id + "/secret", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + accessToken },
        body: JSON.stringify({ token })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save token.");
      setTokens(current => ({ ...current, [bot.id]: "" }));
      setMessage("Telegram token encrypted and saved. It will not be shown again.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save token.");
    } finally {
      setWorkingBot(null);
    }
  }

  async function requestAction(bot: Bot, action: "deploy" | "start" | "stop" | "restart") {
    setWorkingBot(bot.id);
    setMessage("");
    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/bots/" + bot.id + "/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + accessToken },
        body: JSON.stringify({ action })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not queue action.");
      setMessage(action + " request queued (" + result.job.id + "). Runner execution is not enabled yet.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not queue action.");
    } finally {
      setWorkingBot(null);
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
        <p>Create projects, upload private source archives, and configure Telegram credentials. Every operation is checked against your account.</p>
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
                <article className="bot" key={bot.id} style={{ alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="bot-name">{bot.name}</div>
                    <div className="muted">{bot.entrypoint}</div>
                    <label className="field" style={{ marginTop: 12 }}>
                      <span>Python source (.zip, max 20 MB)</span>
                      <input type="file" accept=".zip,application/zip" disabled={uploadingBot !== null} onChange={event => uploadSource(bot, event)} />
                    </label>
                    <label className="field" style={{ marginTop: 12 }}>
                      <span>Telegram bot token</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={tokens[bot.id] ?? ""}
                        onChange={event => setTokens(current => ({ ...current, [bot.id]: event.target.value }))}
                        placeholder="Paste token from BotFather"
                      />
                    </label>
                    <div className="row" style={{ justifyContent: "flex-start", flexWrap: "wrap", marginTop: 10 }}>
                      <button className="btn btn-secondary" disabled={workingBot !== null || !(tokens[bot.id] ?? "").trim()} onClick={() => saveToken(bot)}>Save token</button>
                      <button className="btn btn-secondary" disabled={workingBot !== null} onClick={() => requestAction(bot, "deploy")}>Deploy</button>
                      <button className="btn btn-secondary" disabled={workingBot !== null} onClick={() => requestAction(bot, "start")}>Start</button>
                      <button className="btn btn-secondary" disabled={workingBot !== null} onClick={() => requestAction(bot, "stop")}>Stop</button>
                      <button className="btn btn-secondary" disabled={workingBot !== null} onClick={() => requestAction(bot, "restart")}>Restart</button>
                    </div>
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
          <p className="muted">Each project has private source storage and separately encrypted token storage.</p>
        </section>
      </div>
      <p className="notice" style={{ marginTop: 18 }}>Important: action requests are recorded in the database queue, but no bot process is launched yet. Do not rely on the status display as proof of execution. Never put tokens in ZIP files or source control.</p>
      {message && <p className="muted" role="status">{message}</p>}
    </main>
  );
}
