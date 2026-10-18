# ChefSpark development rules

## Product and architecture

1. Keep the project beginner-friendly: prefer small, readable changes over new abstraction layers.
2. Use the approved stack only: React, Vite, vanilla CSS, lucide-react, existing motion/PWA dependencies, Node.js, Express, and SQLite.
3. Do not add Next.js, Prisma, PostgreSQL, Docker, Redis, GraphQL, microservices, or a replacement architecture without explicit approval.
4. Implement one scoped feature at a time; do not modify unrelated files.
5. Inspect current source before changing a documented behavior.
6. Explain significant architectural choices and any newly needed file before implementation.

## Recipe and Zine accuracy

1. Structured Recipe JSON is the factual source of truth.
2. Images and Zines are presentation only; they must not authoritatively supply recipe quantities, instructions, times, temperatures, or safety claims.
3. Keep backend matching authoritative. Salt, sugar, and basic cooking oil are matching-only pantry assumptions; soy sauce is not. Pantry defaults must not be written to inventory or SQLite merely for matching.
4. Do not silently change the recipe schema to store Zine styles. Future persistent Zines store `styleId` and version metadata on a Zine record.

## Security and paid tooling

1. Keep API keys server-side. Never commit `.env`, real credentials, request headers, or secret values; rotate any credential exposed in history.
2. Pexels and OpenAI requests remain server-side. Do not expose developer-only image scripts through public routes.
3. Dry-run is the default for image tooling. Never make a paid OpenAI request without explicit user authorization for that request.
4. Preserve one-image limits, interactive confirmations, cost-uncertainty warnings, output isolation, and disabled automatic retries in the Phase 6A and 6B.2 tools.
5. Do not present usage-based estimates as exact billed cost. An error or timeout may still be billable.

## Collaboration

1. Preserve existing user changes in a dirty worktree.
2. Use clear names and minimal components/helpers. Avoid duplicate files with overlapping purposes.
3. Run focused verification appropriate to a code change, but do not run paid commands as routine verification.
4. In reports, distinguish what was inspected, what was changed, and what was actually run.
