# Supabase setup

The game supports nickname-only players through Supabase anonymous Auth, plus optional email/password accounts. Unregistered guest play remains local. Signed-in players' **new rounds** enter a persistent retry outbox and are recorded once per round UUID. Existing local wins are not uploaded.

1. Make sure `fvylqtaiwzbhfpjkrwlo` is active in Supabase.
2. Run `supabase/migrations/202610140001_game_leaderboard.sql` in its SQL Editor.
3. Enable Anonymous Sign-Ins under Authentication / Sign In / Providers for nickname-only play. Enable Email sign-up for optional accounts. Set Site URL to `https://swnt-end-game.vercel.app` and add this URL to allowed redirects. Keep email verification enabled and configure production email delivery if needed.
4. Open နာမည်ထည့်မယ်, enter a 2–30 character nickname, and start playing. This creates a persistent anonymous Auth identity and starts a new tracked round. Alternatively, choose email account login. Nicknames do not let a different device resume the same anonymous identity.

The supplied publishable key and project URL are browser-safe configuration. Optionally override them with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never put a database password, service-role key, or secret key into a VITE variable.

## Database access

All three game tables use RLS and have no direct anon/authenticated table grants. RPCs authenticate the caller, use their own `auth.uid()`, validate modes/names, serialize player updates, and deduplicate retry UUIDs. The public leaderboard exposes only player UUID, display name, wins and best streak, with a maximum of 50 results. Email addresses are not exposed. Different play modes have separate rankings.

## Scope of rankings

This is a **casual, client-reported leaderboard**, not an anti-cheat competitive ranking. RPCs prevent direct score editing and modifying another user's totals, but a determined user can submit fabricated completed rounds for their own account. Competitive rankings require server-issued puzzles and server-validated moves/answers. No prizes or trusted competition should rely on this ranking.

No live database migration or real Auth verification has been performed until project access is available. SQL was verified in a local PostgreSQL-compatible runtime with Auth stubs; this does not replace testing against the project's actual Auth configuration.
