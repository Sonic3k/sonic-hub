# Sonic Hub

A personal monorepo: the memory vault and its portal, the admin, and the smaller sites the portal links to.
Each app is its own Railway service built from its folder; a merge to `main` deploys.

| Folder | What it is |
|--------|------------|
| `angels-islands-api/` | The backend (Spring Boot 3, Java 17, PostgreSQL): media and collections, people, memories, journal, money, music, games, the computer and phone of a moment (`/api/desk`, `/api/social`) |
| `angels-islands-admin/` | Admin for everything in `angels-islands-api` (React, Vite, TypeScript) |
| `sonic-hub-web/` | The portal (React, Vite, TypeScript), mobile-friendly: reading, albums, memories, and `/pc`, `/phone` — Facebook, Yahoo, SMS, Zalo… as they were |
| `sonic-hub-game/` | Game portal, shareable with friends |
| `sonic-hub-game-api/` | Players and saves for every game, whichever repository the game lives in |
| `sonic-hub-learn/` | Ôn Bài — learning and quiz portal (`api/` and `web/`) |
| `sonic-hub-world/` | Nơi chốn — places of a life rebuilt in 3D |
| `sonic-hub-pages/` | Static demo pages and import scripts |

Rules for changing `angels-islands-api` and the apps that read it: see `CLAUDE.md`.

Media files live in Backblaze B2 behind Bunny CDN (`sonic-hub.b-cdn.net`). On the shared Postgres,
`angels-islands-api` uses the default database; `sonic-hub-game-api` and `sonic-hub-learn` create their own.

The first version of the hub — `sonic-hub-api` (tasks, todos, problems), `sonic-hub-admin`, `sonic-hub-companion`
and the Telegram `sonic-hub-connector` — was removed on 2026-11-26; it is in the git history before that date.
