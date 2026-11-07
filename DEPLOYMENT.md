# Deployment guide

This repository is a development foundation. Complete the steps below before inviting users.

## 1. Supabase

1. Create a Supabase project.
2. Open the SQL Editor and apply, in order:
   - `database/schema.sql`
   - `database/migrations/002_private_bot_source_storage.sql`
   - `database/migrations/003_runner_jobs_and_secrets.sql`
3. Copy the project URL and anon key from the API settings.
4. Keep the service-role key private. It is server-only and bypasses row-level security.

## 2. Vercel web app

1. Import this GitHub repository into Vercel.
2. Set Root Directory to `apps/web`.
3. Use the Next.js framework preset.
4. Add these environment variables to the Vercel project:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `BOT_SECRET_ENCRYPTION_KEY`
5. Generate the encryption key with `openssl rand -base64 32`. Store it in a password manager or managed secret store. Do not commit it.
6. Deploy. Test account creation, sign-in, bot creation, and private source upload.

## 3. Runner API

The runner is a separate persistent service. It is not a Vercel function.

1. Deploy `services/runner` to a Linux host with Docker support.
2. Set a long random `RUNNER_API_SECRET`.
3. Configure the Vercel environment variable `RUNNER_API_URL` to the runner's HTTPS URL and `RUNNER_API_SECRET` to the same secret.
4. Restrict inbound runner traffic to the web backend where your hosting provider supports it.
5. Check `GET /health`.

The current runner action endpoint intentionally returns `503 runner_runtime_not_configured`. The durable job rows are queued by the web API, but no worker claims jobs or starts user containers yet.

## 4. Before public launch

Do not advertise this as production bot hosting until all items below are implemented and tested:

- Durable worker with idempotent job claiming, retries, cancellation, and reconciliation.
- Isolated per-bot containers with no privileged mode, no host mounts, no Docker socket in bot containers, strict CPU/RAM/PID/disk limits, and controlled network egress.
- Safe ZIP extraction into a dedicated per-bot workspace after archive validation.
- Secret delivery to bot containers without exposing tokens in logs or process arguments.
- Per-user quotas, request rate limits, abuse reporting, billing/usage accounting, and audit logs.
- HTTPS, backups, monitoring, alerting, dependency scanning, and restore tests.
- Security review and tests for cross-user access and container escape boundaries.

A successful Vercel deployment does not mean the Python runner is operational.
