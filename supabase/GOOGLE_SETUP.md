# Google signup setup

Game: https://swnt-end-game.vercel.app/
Supabase project: fvylqtaiwzbhfpjkrwlo

1. In Google Cloud / Google Auth Platform, create an OAuth client of type Web application.
2. Authorized JavaScript origin: https://swnt-end-game.vercel.app
3. Authorized redirect URI: https://fvylqtaiwzbhfpjkrwlo.supabase.co/auth/v1/callback
4. Configure the consent screen with the game's name and home page. Privacy URL: https://swnt-end-game.vercel.app/privacy.html. Terms URL: https://swnt-end-game.vercel.app/terms.html. Use only basic identity scopes: openid, email, profile. While in Testing, add permitted test users.
5. In Supabase Authentication > Sign In / Providers > Google, enable Google and enter the OAuth Client ID and Client Secret directly in that dashboard. Do not paste the secret into chat or put it in frontend/VITE variables.
6. In Supabase Authentication > URL Configuration, set Site URL to https://swnt-end-game.vercel.app and add https://swnt-end-game.vercel.app/?login=google to Redirect URLs.
7. Enable manual identity linking in Supabase Auth settings if nickname-only players should upgrade to Google while preserving their player ID and scores. The game uses linkIdentity for that case.
8. Run the existing leaderboard setup SQL if it has not already been applied.
9. Open the game, choose Continue with Google, finish Google sign-in, and confirm the public player name. Then win a round and check that mode's leaderboard.

Google provider credentials and settings cannot be configured with the game's publishable key. Live OAuth completion still requires the provider setup and the user's Google login.

Reference: https://supabase.com/docs/guides/auth/social-login/auth-google
