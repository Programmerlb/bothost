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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingBot, setUploadingBot] = useState<string | null>(null);
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
      setMessage("Bot project created. Upload a ZIP containing your Python bot files.");
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
    if (file.size > MAX_ARCHIVE_BYTES) {
      setMessage("The ZIP archive must be 20 MB or smaller.");
      return;
    }
    if (file.size === 0) {
      setMessage("The selected archive is empty.");
      return;
    }

    setUploadingBot(bot.id);
    setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Please sign in again.");

      const objectPath = user.id + "/" + bot.id + "/source.zip";
      const { error } = await supabase.storage
        .from("bot-source")
        .upload(objectPath, file, {
          upsert: true,
          contentType: "application/zip",
          cacheControl: "0"
        });
      if (error) throw error;
      setMessage("Source archive uploaded privately. It has not been executed; deployment will be available after runner setup.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingBot(null);
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
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="bot-name">{bot.name}</div>
                    <div className="muted">{bot.entrypoint}</div>
                    <label className="field" style={{ marginTop: 12 }}>
                      <span>Upload Python source (.zip, max 20 MB)</span>
                      <input
                        type="file"
                        accept=".zip,application/zip"
                        disabled={uploadingBot !== null}
                        onChange={event => uploadSource(bot, event)}
                      />
                    </label>
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
          <p className="muted">Each project gets a private source archive location. The runner will validate and deploy archives in an isolated environment.</p>
        </section>
      </div>
      <p className="notice" style={{ marginTop: 18 }}>Uploads are private and limited to 20 MB. Do not include secrets such as Telegram bot tokens in your ZIP; configure them separately when secret management is available. Uploaded code is not run by the website.</p>
      {message && <p className="muted" role="status">{message}</p>}
    </main>
  );
}
