# Security remediation — 17 October 2026

The OWASP code review and dependency scan findings are addressed in source:

- Updated the dependency lockfile and raised Vite's minimum version to 6.4.4. Full npm audit now reports zero vulnerabilities, including development dependencies.
- Added a global enforced CSP, frame restrictions, nosniff, HSTS, referrer and permissions policies in vercel.json. Scripts are restricted to the application origin and the existing JSON-LD hash. Inline styles remain allowed for React and the policy pages. Google avatar images are limited to googleusercontent.com hosts.
- Replaced raw backend error fallbacks with safe messages and added a rate-limit message. The browser never renders unrecognized backend diagnostics.
- Added migration 202610170007_result_submission_limits.sql. One private counter row per player enforces a shared maximum of 120 changed result writes per UTC minute and 2,000 per Myanmar calendar day. New legacy results, timed results and challenge progress updates share the budget. Exact retries do not consume it. Counter updates lock the player's row atomically; rejection rolls back result/ranking/activity changes. Counter rows cascade on player deletion.

## Applying the change

Apply all existing migrations, then `supabase/migrations/202610170007_result_submission_limits.sql` to the target Supabase project, and deploy the frontend build and vercel.json. These production steps were not performed during local remediation. Existing score rows are retained; quota accounting begins with new writes after migration.

If VITE_SUPABASE_URL targets another project, update connect-src in vercel.json to its exact HTTPS origin before deploying. If the JSON-LD in index.html changes, update its CSP hash; scripts/security-headers.test.mjs checks this. New third-party avatar hosts require an explicit policy decision.

Verify actual deployment headers on `/`, `/leaderboard`, `/about`, `/players/:id`, policy pages and PWA assets. Confirm the installed service worker updates. Keep project-level gateway abuse protections enabled: database per-player budgets cannot by themselves prevent account churn, requests rejected before SQL, or excessive public reads. Verify Supabase CAPTCHA/rate limits, email verification, allowed redirects and session lifetimes in project settings. No changes to these remote settings are claimed.

## Verification performed

- npm audit: zero vulnerabilities after dependency updates.
- npm run lint and npm run build: passed (existing large-bundle warning remains).
- node --test scripts/*.test.mjs: includes safe-error and CSP integrity regression checks.
- All five SQL fixture files passed in an isolated PGlite PostgreSQL runtime after applying every migration. New coverage includes shared minute/daily quotas, exact retries at the limit, paused updates, rollback of scores/activity, independent players, counter window resets and grants. Additional actual authenticated/anon role checks confirmed private quota/feedback tables are inaccessible, quota enforcement applies to authenticated RPC callers, and anon cannot call the result RPC. Auth schema helpers were stubbed locally; this does not verify live JWT/gateway configuration or prove concurrency under production load.
- Browser smoke test served the production build with vercel.json security headers. The app rendered, styles loaded and the service worker registered. A deliberate inline script was blocked by CSP; there were no unexpected browser console errors. Main routes, legal pages, service-worker script and manifest returned expected MIME types and frame restrictions. Google OAuth and signed-in avatar rendering were not exercised end to end.

## Accepted product limitation

Scores and times remain client-reported, as documented in README, Supabase setup and terms. Authentic competitive results would require server-issued games and validated answers, including replacement of legacy result APIs; that is a separate gameplay architecture change. Persistent browser auth sessions also remain the existing Supabase architecture. No claim of complete WSTG compliance or production rollout is made.

## Production rollout status

On 17 October 2026, the updated app was built and promoted through the signed-in Vercel CLI to production deployment `dpl_8kdCSNNXQn3Ta5Re9jEcDQU2wBnG`. The public site https://swnt-end-game.vercel.app returned HTTP 200, the updated `index-Dtbc__kP.js` bundle and the configured CSP, DENY frame header and nosniff header. Local scan artifacts and agent state were excluded through .vercelignore.

After the user restored dashboard access on 17 October 2026, migration `202610170007_result_submission_limits.sql` was applied successfully through the SQL Editor to production project `muiwhmmcpghkazvrmafl` (Assembly-End-Game). Read-only catalog checks confirmed the quota table exists, RLS is enabled, and both legacy and challenge quota triggers are active. Permission checks confirmed anonymous table reads, authenticated quota edits, and direct authenticated execution of the internal trigger function are denied. No production test scores or users were created. The Supabase CLI remains unsigned in; the migration was applied through the authenticated dashboard.

## Legacy result execution permission

Production verification identified an older explicit `anon` EXECUTE grant on `record_game_result(uuid,text,boolean)`. The login guard prevented unauthenticated writes, but the grant was broader than intended. Migration `202610170008_legacy_result_execute_permissions.sql` revokes execution from both PUBLIC and anon and explicitly preserves authenticated execution. It was applied successfully to production through the authenticated SQL Editor on 17 October 2026.

The new `legacy_result_execute_permissions.sql` regression passed locally and on production: anon is denied at invocation with insufficient_privilege, while authenticated retains EXECUTE. All six SQL test files passed in the isolated PostgreSQL runtime. Production actual-role tests also verified signed-in result recording, retry handling, quota rejection and private-table restrictions, with all fixture changes rolled back and fixture removal checked. This database-only fix does not require a frontend rebuild.
