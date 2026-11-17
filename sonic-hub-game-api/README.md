# sonic-hub-game-api: where the games keep their players

One small service that every Sonic Hub game saves to, whichever repository and address the game lives at.

A game has a few **players** (three unless `PLAYERS_PER_GAME` says otherwise), each with a name and the game's own
save: any JSON object up to 64 KB, which the service never looks inside. The players are the game's own, as on the
machine an old game was installed on: whoever opens the game, on any device, sees the same players and picks theirs.
Nobody signs in, so anyone who can open a game can also rename, play or remove its players.

## For a game

Copy `client/sonic-save.js` into the game (the service also hands it out at `/api/client.js`) and talk to the
service only through it. The file's first lines are its manual. In short:

```js
const save = SonicSave({ api: 'https://<this service>', game: 'commander-chess', onChange: what => { /* 'replaced' | 'players' | 'status' */ } });
save.players();  save.add(name, data);  save.choose(id);  save.current();
save.write(data);            // the current player's save, every time it changes
```

A game needs no entry anywhere: it picks its key (small letters, digits, dashes) and starts saving. Everything is
written to the browser first and sent a moment later, so a game never waits and plays on with no connection. The
browser remembers who played last, so the game can open on them.

When one player has been played in two places, the one played last stands and the other is told. A device that
was not in step when it began (it slept on an old copy while the player was played elsewhere) gives way instead.

## The API

All under `/api`. Every answer carries `X-Now` (the service's clock, ms) and is never cached.

| | |
|---|---|
| `GET /games/{game}/players` | `{ max, epoch, players: [{ id, name, data, version, createdAt, updatedAt, playedAt }] }`, oldest first |
| `PUT /games/{game}/players/{id}` | one write: `{ base, name?, data?, at? }` → the player as it now stands |
| `DELETE /games/{game}/players/{id}` | removes a player (204, also when already gone) |
| `GET /client.js`, `GET /health` | the browser client; `{ ok: true }` |

`id` is a UUID the browser chooses, so a new player sent twice is one player. `base` is the version the write was
made from (0 for a new player): a write from an older version is refused with `409 { error: 'stale', player }`, the
player as it now stands. `at` is when the save was played. `epoch` names the database: one that was set up anew
has another, and a browser then sends what it still holds again instead of taking it for removed. Other refusals:
`404 gone` (with `epoch`), `409 full` (with `max`), `409 taken`, `400 invalid`, `413 too_big`, `429 slow_down`
(with `retryAfter`).

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

After a backup has been put back, give the database a new epoch (`update service set epoch = gen_random_uuid()`)
and start the service again: browsers then send what the backup lacks, and where both hold a player, the save
played last stands. Without that, a player made after the backup is taken for removed.

Limits, all by environment: `PLAYERS_PER_GAME` 3, `GAMES` 50 (how many different games players are kept for),
`SAVE_BYTES` 65536, and `REQUESTS_PER_MINUTE` 240 from one address. `CORS_ORIGIN` is `*` unless set.

A caller's address is read from the header the proxy in front writes: `X-Real-IP` on Railway, where nothing needs
setting. Elsewhere `ADDRESS_HEADER` names it, and without one it is the address the connection came from. It must
never be a header a caller could send. An IPv6 caller is counted by its network (/64).

On Railway: the service `sonic-hub-game-api`, with this folder as its root, built by Railpack (`npm ci`,
`npm run build`, `npm start`), health check `/api/health`. A merge that touches this folder deploys it.

## What it does not do

A save is taken as the browser sends it. A game whose results must be trusted (points that unlock something the
service itself hands out) will need its results checked here, by replaying the game from its moves.
