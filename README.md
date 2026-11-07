# Bothost

A multi-user platform for managing Python Telegram bots.

## Architecture

- Web dashboard: Next.js on Vercel.
- Authentication and database: Supabase.
- Persistent Python bot processes: a separate runner host using isolated containers.

Vercel hosts the web app and API; it does not host long-running bot processes.

## Security baseline

- Run each uploaded bot in its own unprivileged container.
- Apply CPU, memory, process, storage, and runtime limits.
- Never expose the host shell, Docker socket, or host filesystem to bot code.
- Keep bot tokens and service credentials server-side.
- Enforce per-user ownership checks on every bot operation.
- Treat uploaded archives and logs as untrusted input.

## Initial setup

1. Create a Supabase project.
2. Configure the web app with Supabase credentials.
3. Deploy the web app to Vercel.
4. Deploy the isolated runner separately on a persistent container host.

The runner must be hardened and reviewed before accepting untrusted user code.
