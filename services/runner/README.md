# Bothost Runner

This service runs separately from Vercel on a persistent host.

Responsibilities:
- Authenticate control requests from the web backend.
- Verify bot ownership for every operation, or accept signed short-lived job claims.
- Supervise one isolated container per bot.
- Provide bounded application logs and lifecycle status.

Security baseline:
- Use unprivileged containers with strict CPU, memory, PID, storage, and runtime limits.
- Do not use privileged mode or host PID/network namespaces.
- Never mount the Docker socket or host filesystem into bot containers.
- Restrict network access according to the product's needs.
- Do not expose a general-purpose shell endpoint.
- Treat uploaded archives and logs as untrusted input.

This is a design scaffold, not a production-ready sandbox. Review and harden isolation before running untrusted code.
