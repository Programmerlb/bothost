# Database setup

Apply these SQL files to a new Supabase project in this order:

1. `schema.sql`
2. `migrations/002_private_bot_source_storage.sql`
3. `migrations/003_runner_jobs_and_secrets.sql`

Use the Supabase SQL Editor or a migration workflow. Apply each migration once and review the output for errors.

## What the migrations create

- `bots`: user-owned bot project records protected by row-level security.
- `bot-source` storage bucket: private ZIP uploads, limited to 20 MiB, with object access scoped to the owning user and bot.
- `bot_secrets`: server-managed encrypted token storage. There are intentionally no browser-user policies.
- `runner_jobs`: server-managed lifecycle job queue. Users may read only their own job history; trusted server code manages job state.

## Important

The application currently uploads source archives but does not unpack or execute them. The runner API exposes a health check and a disabled action contract only. Do not enable user-code execution until archive validation, ownership verification, durable job processing, and container isolation are implemented and reviewed.

Store encryption keys and Supabase service-role credentials only in server-side secret configuration. Never put them in a `NEXT_PUBLIC_*` variable or commit them to Git.
