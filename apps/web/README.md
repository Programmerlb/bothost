# Bothost Web

Next.js App Router application intended for deployment on Vercel.

Planned dashboard features:
- Supabase authentication
- Per-user bot list and status
- Bot upload and deployment workflow
- Start, stop, and restart controls
- Bounded application logs (not a host shell)
- Server-side environment variable management

The web app must call an authenticated runner control API. It must never execute uploaded Python code itself.
