# sonic-hub-game-api: where the games keep their players

One small service that every Sonic Hub game saves to, whichever repository and address the game lives at. A game
keeps a few **players** (three unless `PLAYERS_PER_GAME` says otherwise), each with a name and the game's own save,
which is any JSON object up to 64 KB. The service never looks inside a save.

Nobody signs in. The players of one person are kept under a **code** (`K7QM-2XPD-9RBT`): the service hands one out
the first time a browser has something to keep, and whoever has the code has the players, in every game. Only the
code's SHA-256 is stored, so a code that is lost cannot be looked up.

## For a game

Copy `client/sonic-save.js` into the game (the service also hands it out at `/api/client.js`) and talk to the
service only through it. The file's first lines are its manual. In short:

```js
const save = SonicSave({ api: 'https://<this service>', game: 'commander-chess', onChange: what => { /* 'replaced' | 'players' | 'status' */ } });
save.players();  save.add(name, data);  save.choose(id);  save.current();
save.write(data);            // the current player's save, every time it changes
save.code();  save.useCode(typed);  save.link(url);
```

A game needs no entry anywhere: it picks its key (small letters, digits, dashes) and starts saving. Everything is
written to the browser first and sent a moment later, so a game never waits and plays on with no connection.

When one player has been played in two places, the one played last stands and the other is told. A device that
was not in step when it began (it slept on an old copy while the player was played elsewhere) gives way instead.

A link from one site of the family to another can carry the code as `#code=…` (`save.link(url)`); the client on
the other side takes it up if that browser has none, and wipes it off the address either way.

## The API

All under `/api`. Every answer carries `X-Now` (the service's clock, ms) and is never cached.

| | |
|---|---|
| `POST /codes` | a new code: `{ code }`. Given this once. |
| `GET /games/{game}/players` | `{ max, players: [{ id, name, data, version, createdAt, updatedAt, playedAt }] }`, oldest first |
| `PUT /games/{game}/players/{id}` | one write: `{ base, name?, data?, at? }` → the player as it now stands |
| `DELETE /games/{game}/players/{id}` | removes a player (204, also when already gone) |
| `GET /client.js`, `GET /health` | the browser client; `{ ok: true }` |

All but the first and the last line need `Authorization: Bearer <code>`. `id` is a UUID the browser chooses, so a
new player sent twice is one player. `base` is the version the write was made from (0 for a new player): a write
from an older version is refused with `409 { error: 'stale', player }`, the player as it now stands. `at` is when
the save was played. Other refusals: `401 unknown_code`, `404 gone`, `409 full` (with `max`), `409 taken`,
`400 invalid`, `413 too_big`, `429 slow_down` (with `retryAfter`).

## Run it

```
npm install
npm run build
DATABASE_URL=postgresql://… npm start        # PORT, default 3200; migrations run at the start
TEST_DATABASE_URL=postgresql://postgres:…@localhost:5432/postgres npm test
```

On the shared Postgres it makes its own role and database at the start, as Ôn Bài does: give it
`DATABASE_ADMIN_URL` (the server's own connection string) and `GAME_DB_PASSWORD` instead of `DATABASE_URL`
(`GAME_DB_NAME` and `GAME_DB_USER` default to `game_saves` and `game_saves_app`; `DATABASE_SSL=no-verify` on Railway).

Limits, all by environment: `PLAYERS_PER_GAME` 3, `GAMES_PER_CODE` 24, `SAVE_BYTES` 65536, and by address
`REQUESTS_PER_MINUTE` 240, `NEW_CODES_PER_HOUR` 10, `WRONG_CODES_PER_HOUR` 30. `CORS_ORIGIN` is `*` unless set.

On Railway: a service with this folder as its root, built by Railpack (`npm ci`, `npm run build`, `npm start`),
health check `/api/health`.

## What it does not do yet

A save is taken as the browser sends it. A game whose results must be trusted (points that unlock something the
service itself hands out) will need its results checked here, by replaying the game from its moves.
