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

Supabase email/password accounts are optional; guests can play immediately. Signed-in players' new rounds are saved with retry-safe UUIDs. Rankings are separated by English difficulty, slang, and the two proverb play modes.

Run the database migration and configure Auth as described in [Supabase setup](supabase/README.md). The supplied publishable browser key cannot create database tables or change Auth settings.

Rankings are casual and client-reported. See the setup document for the security scope and production configuration.

## Production

https://swnt-end-game.vercel.app/
