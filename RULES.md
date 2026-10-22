# ChefSpark development rules

## Product and architecture

1. Keep the project beginner-friendly: small, readable changes over new abstraction layers.
2. Approved stack: React, Vite, Tailwind CSS (approved 2026-10-22), React Router (approved 2026-10-23), lucide-react, the existing
   motion and PWA dependencies, Node.js, Express, SQLite, and server-side DeepSeek.
3. Do not add Next.js, Prisma, PostgreSQL, Docker, Redis, GraphQL, microservices, n8n or
   any other dependency or service without explicit approval.
4. One scoped feature or phase at a time; do not modify unrelated files.
5. Inspect current source before changing documented behaviour.
6. Explain significant architectural choices and new files before implementing them.
7. Use clear names and minimal components/helpers; avoid duplicate files with overlapping purposes.

## Design

1. New and migrated UI follows `DESIGN_SYSTEM.md` and uses its tokens; no ad-hoc colours or fonts.
2. Style with Tailwind utilities and the theme tokens in `client/src/index.css`; add custom CSS only
   when utilities cannot express it (the paused Zine keeps `components/zine.css`).
3. Accessibility is part of done: real controls, labels, focus states, 44px targets, 4.5:1 text contrast.

## Recipe accuracy and AI

1. Structured Recipe JSON is the factual source of truth.
2. Images are illustrations only; never present them as recipe facts.
3. An AI-proposed recipe change must come back as structured data, pass validation and be shown to
   the user as a new version; never silently overwrite facts.
4. Use code, not AI, for deterministic work (scaling, timers, matching).
5. Keep backend matching authoritative. Salt, sugar and basic cooking oil are matching-only pantry
   assumptions unless the user opts into more; soy sauce is not a default. Pantry defaults are never
   written to inventory.
6. Paused features (One-Page Zine, AI artwork, developer image CLIs) stay behind their switches.
   Do not store Zine or image metadata inside Recipe JSON.

## Security and paid services

1. Keys stay server-side. Never commit `.env` files, credentials or request headers; never print
   or read secret values; rotate any credential exposed in history.
2. DeepSeek, Pexels, OpenAI and any future image provider are called only from the server.
   Developer image CLIs are never exposed through routes.
3. Every paid AI path has an off-by-default switch, per-user and global limits, no automatic retries,
   and logs usage without secrets. Keep the developer CLIs' dry-run default, one-image limit and
   interactive confirmation.
4. Never make a paid request (OpenAI, Jimeng or any other) without explicit user authorization for
   that request. Tests, builds and startup must never call paid APIs.
5. Usage-based cost figures are estimates, not bills; errors may still be billed.

## Collaboration

1. Preserve existing user changes in the working tree.
2. Ask before pushes, force operations, merges with the remote, or deleting data.
3. Run focused verification for each change; never run paid commands as routine verification.
4. In reports, separate what was inspected, changed and actually run.
