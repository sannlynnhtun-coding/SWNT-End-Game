# Google signup setup

Game: https://swnt-end-game.vercel.app/
Supabase project: muiwhmmcpghkazvrmafl

## Setup progress (2026-10-16)

- Confirmed Google account: sannlynnhtun.developer@gmail.com.
- Created Google Cloud project **SWNT End Game**, project ID `alien-outlet-511719-m9`, project number `189325156447`.
- Created the Google Auth Platform configuration with app name **SWNT End Game**, External audience, and the account above as support email and developer contact.
- Accepted the Google API Services User Data Policy with the user's explicit approval. Google displayed **OAuth configuration created.**
- Created web OAuth client **SWNT End Game Web** with the origin and callback below, and saved its credentials directly in Supabase. The client secret is not stored in this repository.
- Saved the home page, privacy policy, and terms links. Google confirmed **Branding changes saved.**
- Published the External app: Google shows **In production**.
- Supabase Google provider is enabled, confirmed both in the dashboard and the live public Auth settings endpoint. Site URL and the `/?login=google` allowed redirect were already correct.
- The live game's **Continue with Google** button reached Google's authorization URL with the new client ID and correct Supabase callback. Full login and callback completion remain unverified: the embedded browser failed to connect to accounts.google.com with `ERR_CONNECTION_CLOSED`.
- Anonymous sign-ins and manual identity linking remain disabled. These are separate from regular Google sign-in.
- Resume in Google Cloud: https://console.cloud.google.com/auth/branding?project=alien-outlet-511719-m9
- OAuth client form: https://console.cloud.google.com/auth/clients/create?project=alien-outlet-511719-m9
- Supabase provider settings: https://supabase.com/dashboard/project/muiwhmmcpghkazvrmafl/auth/providers

## Configuration reference

1. In Google Cloud / Google Auth Platform, create an OAuth client of type Web application.
2. Authorized JavaScript origin: https://swnt-end-game.vercel.app
3. Authorized redirect URI: https://muiwhmmcpghkazvrmafl.supabase.co/auth/v1/callback
4. Configure the consent screen with the game's name and home page. Privacy URL: https://swnt-end-game.vercel.app/privacy.html. Terms URL: https://swnt-end-game.vercel.app/terms.html. Use only basic identity scopes: openid, email, profile. While in Testing, add permitted test users.
5. In Supabase Authentication > Sign In / Providers > Google, enable Google and enter the OAuth Client ID and Client Secret directly in that dashboard. Do not paste the secret into chat or put it in frontend/VITE variables.
6. In Supabase Authentication > URL Configuration, set Site URL to https://swnt-end-game.vercel.app and add https://swnt-end-game.vercel.app/?login=google to Redirect URLs.
7. Enable manual identity linking in Supabase Auth settings if nickname-only players should upgrade to Google while preserving their player ID and scores. The game uses linkIdentity for that case.
8. Run the existing leaderboard setup SQL if it has not already been applied.
9. Open the game, choose Continue with Google, finish Google sign-in, and confirm the public player name. Then win a round and check that mode's leaderboard.

Google provider credentials and settings cannot be configured with the game's publishable key. To finish verification, open the live game in a regular browser, choose **Continue with Google**, sign in, confirm the public player name, and verify a new round on the leaderboard.

Reference: https://supabase.com/docs/guides/auth/social-login/auth-google
