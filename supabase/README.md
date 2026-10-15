# Supabase setup

The game supports nickname-only players through Supabase anonymous Auth, plus optional email/password accounts. Unregistered guest play remains local. Signed-in players' **new rounds** enter a persistent retry outbox and are recorded once per round UUID. Existing local wins are not uploaded.

1. Make sure `muiwhmmcpghkazvrmafl` is active in Supabase.
2. Run `supabase/migrations/202610140001_game_leaderboard.sql` in its SQL Editor.
3. Enable Anonymous Sign-Ins under Authentication / Sign In / Providers for nickname-only play. Enable Email sign-up for optional accounts. Set Site URL to `https://swnt-end-game.vercel.app` and add this URL to allowed redirects. Keep email verification enabled and configure production email delivery if needed.
4. Open နာမည်ထည့်မယ်, enter a 2–30 character nickname, and start playing. This creates a persistent anonymous Auth identity and starts a new tracked round. Alternatively, choose email account login. Nicknames do not let a different device resume the same anonymous identity.

The supplied publishable key and project URL are browser-safe configuration. Optionally override them with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never put a database password, service-role key, or secret key into a VITE variable.

## Database access

All three game tables use RLS and have no direct anon/authenticated table grants. RPCs authenticate the caller, use their own `auth.uid()`, validate modes/names, serialize player updates, and deduplicate retry UUIDs. The public leaderboard exposes player UUID, display name, wins, best streak, recorded average completion time, timed-win count, and proverb wins. Email addresses are not exposed. Different play modes have separate rankings.

## Timed leaderboard

Migration `202610160003_timed_leaderboard.sql` was applied on 2026-10-16. `/leaderboard` is a standalone page showing up to 100 players, total player profiles, the playable proverb count, total proverb wins, and mode participation. Rank order is wins descending, average recorded winning-round duration ascending (missing times last), best streak descending, then player UUID. Old wins remain intact with unknown time; averages use only timed wins and their sample count is shown. The game timer includes time spent on other panels or background tabs. Timing is client-reported, not anti-cheat proof.

New clients call `record_timed_game_result`, with 1–86,400,000 ms accepted or null for untimed legacy outbox items. Retrying a round cannot change its score or duration. The old RPC remains available to installed older clients. `tests/timed_leaderboard.sql` passed with 107 temporary player fixtures, verifying faster tie-breaks, duplicate retries, anonymous write permissions, and the 100-player cap; all fixtures were rolled back.

## Scope of rankings

This is a **casual, client-reported leaderboard**, not an anti-cheat competitive ranking. RPCs prevent direct score editing and modifying another user's totals, but a determined user can submit fabricated completed rounds for their own account. Competitive rankings require server-issued puzzles and server-validated moves/answers. No prizes or trusted competition should rely on this ranking.

On 2026-10-16, both migrations were applied successfully to Assembly-End-Game (`muiwhmmcpghkazvrmafl`) through the Supabase SQL Editor. The public leaderboard RPC was verified against the live project. Google OAuth is enabled and the Google consent app is in production; see `GOOGLE_SETUP.md`. Anonymous sign-ins and manual identity linking remain disabled. Full Google login verification remains pending because the embedded browser's connection to accounts.google.com closed during testing.

## Feedback

Run `migrations/202610140002_feedback.sql` in the project's SQL Editor. Feedback requires an authenticated player (anonymous nickname accounts count), allows one submission per account per calendar day in `Asia/Rangoon`, and resets at Myanmar midnight. The unique database constraint rejects concurrent duplicates. Messages are 10–2000 characters and remain private to project administrators; no direct table access is granted to browser clients. Feedback is viewable in Supabase Table Editor > `game_feedback`.

### Full-dataset challenges

Migration `202610160004_challenge_runs.sql` adds `challenge_results`, `record_challenge_result`, and `get_challenge_leaderboard`. It is additive: legacy RPCs and results remain available to old clients and queued results. Apply it before deploying the challenge UI. Dataset limits are 869 proverbs and 20 Slang entries; update the RPC validation when changing those datasets. Test with `tests/challenge_runs.sql` (fixtures roll back).
