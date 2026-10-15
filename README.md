# Assembly Endgame / Word Rescue

React + Vite word game with English words, Myanmar slang, and Myanmar proverbs. Proverbs support multiple choice and typed answers with the first half visible from the start.

## Run

```sh
npm install
npm run dev
```

`npm run lint` and `npm run build` validate the project.

## Layout

The game fits one viewport, including the result and next-round action. Settings, account, meanings, and leaderboard open in accessible modal panels. Long panel contents can scroll independently so text remains readable. Software keyboard viewport changes keep the typed-answer form visible.

## Accounts and leaderboard

Players can join the leaderboard with just a nickname using Supabase anonymous Auth. Email/password accounts are optional; unregistered guests can still play immediately. Signed-in players' new rounds are saved with retry-safe UUIDs. Rankings are separated by English difficulty, slang, and the two proverb play modes.

Run the database migration and configure Auth as described in [Supabase setup](supabase/README.md). The supplied publishable browser key cannot create database tables or change Auth settings.

Rankings are casual and client-reported. See the setup document for the security scope and production configuration.

## Production

https://swnt-end-game.vercel.app/

## Credits

Original creator and inspiration: **Jeff307-kib (Sai Wanna Tun)** and [Assembly: End-Game](https://github.com/Jeff307-kib/End-Game).

Additional development and adaptations: **Sann Lynn Htun**, including Myanmar Slang and proverb modes, Burmese clues, categories and difficulty options, mobile layout, Google sign-in, timed leaderboard, feedback, and PWA support.

Myanmar slang source: [Ban Sagar (ဗန်းစကား)](https://bansagar.com/). Clues are rewritten for the game.

မြန်မာစကားပုံများကို ဆရာ ဒေါက်တာ ၀င်းသိန်း Website မှ ယူသုံးထားတာဖြစ်ပါတယ်

Mobile font: Noto Sans Myanmar; license included at `public/fonts/noto-sans-myanmar-OFL.txt`.

## Full-dataset Myanmar challenges

Myanmar Proverbs (869 unique playable items) and Slang (20 current entries) each use one shuffled, non-repeating deck per run. Proverb choice and input have separate runs and leaderboards. The whole run shares three lives; each wrong answer or skip consumes one life and reveals that question's answer. Correct answers preserve lives. The run ends on deck completion, life exhaustion, or explicit Stop.

Only active question time counts. Answer reading, manual Pause, background tabs, account dialogs, and time away from the game are excluded. Local checkpoints restore paused in the same browser; the landing screen offers Resume. Signed-in identity is captured at run start. A result is queued once by its run UUID when finished, with retries preserved in the existing outbox.

Apply `supabase/migrations/202610160004_challenge_runs.sql` before deploying this version. The dedicated table/RPCs preserve legacy single-question results. Each player's best run is ranked by correct count descending, then total active time ascending. SQL writes validate totals, counters, terminal status, and ownership; scores remain client reported. The migration's dataset totals must change alongside future dataset updates.

Validation: `node --test scripts/challenge.test.mjs`, `npm run lint`, `npm run build`. Run `supabase/tests/challenge_runs.sql` in the SQL editor to test ranking, retries, and permissions with rolled-back fixtures.

Paused runs also publish their current correct count and cumulative active time to the leaderboard. Migration `202610160005_paused_challenge_scores.sql` permits monotonic updates to the same run UUID while paused; final results are immutable. Old or reordered paused snapshots cannot reduce counters/time or reopen a finalized run. The outbox replaces pending snapshots for the same run and acknowledges only the matching queue entry. Signed-in players can see save/retry status in the pause panel.

## Public player profiles

Open your profile from the avatar menu or another player's profile from their leaderboard name. `/players/<player UUID>` is shareable. The 365-day chart uses the existing navy/mint theme and displays saved correct answers, grouped by Myanmar calendar date. It is a game-activity chart; no GitHub account connection is required. The chart scrolls horizontally on mobile and provides a readable daily-totals list.

Apply migration `202610160006_player_activity.sql` before deployment. Activity triggers count only newly added correct answers when a paused challenge is updated. Historical scores are backfilled to their original saved date, since historical per-answer timestamps were not recorded. Public profile RPC output contains only player ID, display name, aggregate correct counts and daily counts, without email or authentication metadata. Existing theme color remains `#090f18` in `index.html` and the PWA manifest.

Tests: `node --test scripts/activity.test.mjs scripts/challenge.test.mjs` and `supabase/tests/player_activity.sql` (fixtures roll back).
