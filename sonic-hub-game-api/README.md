# sonic-hub-game-api: where the games keep their players, and their cast

One small service that every Sonic Hub game saves to, whichever repository and address the game lives at.

A game has a few **players** (three unless `PLAYERS_PER_GAME` says otherwise), each with a name and the game's own
save: any JSON object up to 64 KB, which the service never looks inside. The players are the game's own, as on the
machine an old game was installed on: whoever opens the game, on any device, sees the same players and picks theirs.
Nobody signs in, so anyone who can open a game can also rename, play or remove its players.

A game also has a **cast**: the characters a player meets in it. The game knows them, each by a key of its own
(`mina`, `celeste`). Here any of them can be given another name and a picture, which the game then shows in place
of its own. Everyone reads these; changing them takes the admin key (`ADMIN_KEY`), and a game brings its own page
for doing so (Keep It Down's is at `/admin` on the game's address).

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

For the cast, copy `client/sonic-cast.js` the same way (handed out at `/api/cast.js`):

```js
const cast = SonicCast({ api: 'https://<this service>', game: 'commander-chess', onChange: () => { /* draw them again */ } });
cast.name('mina');           // the name she was given, or null: the game's own stands
cast.photo('mina', 54);      // the address of her picture for a place 54 CSS pixels wide, or '' when she has none
cast.photo('mina', 'full');  // for looking at it as large as the screen
```

Pictures are handed out at five widths: 320, 640, 960, 1280 and 1920 pixels. The client asks for the one that fits
the place (half as much again on a screen with finer dots, then the next width up; looked at large, 1280 on a phone
and 1920 on a wider screen). What was last heard is kept in the browser, so names and pictures are there at once
the next time and stay when there is no connection.

## The API

All under `/api`. Every answer carries `X-Now` (the service's clock, ms) and is never cached.

| | |
|---|---|
| `GET /games/{game}/players` | `{ max, epoch, players: [{ id, name, data, version, createdAt, updatedAt, playedAt }] }`, oldest first |
| `PUT /games/{game}/players/{id}` | one write: `{ base, name?, data?, at? }` → the player as it now stands |
| `DELETE /games/{game}/players/{id}` | removes a player (204, also when already gone) |
| `GET /games/{game}/cast` | `{ cast: [{ id, name, photo }] }`: who was given a name (else `null`) or a picture (its version, else `null`) |
| `GET /games/{game}/cast/{id}/photo` | her picture, a WebP file. `?width=` how wide a place it is for (the next of the five widths up; 640 when left out); `?v=` its version |
| `PUT /games/{game}/cast/{id}` | 🔑 `{ name }`: the name she is to go by, at most 24 signs; `null` gives the game's own back |
| `PUT /games/{game}/cast/{id}/photo` | 🔑 the picture itself as the body: a JPEG, PNG or WebP file, with its kind as the `Content-Type` |
| `DELETE /games/{game}/cast/{id}/photo` | 🔑 takes her picture away |
| `GET /admin` | 🔑 `{ ok: true, photoBytes }`: is this the key, and how large a picture may be |
| `GET /client.js`, `GET /cast.js`, `GET /health` | the two browser clients; `{ ok: true }` |

🔑 needs the admin key in `X-Admin-Key`. Without it: `401 not_admin`; where the service has no `ADMIN_KEY`:
`503 no_admin`; after ten wrong keys from one address: `429 slow_down` for ten minutes, even with the right one.

`id` is a UUID the browser chooses, so a new player sent twice is one player. `base` is the version the write was
made from (0 for a new player): a write from an older version is refused with `409 { error: 'stale', player }`, the
player as it now stands. `at` is when the save was played. `epoch` names the database: one that was set up anew
has another, and a browser then sends what it still holds again instead of taking it for removed. Other refusals:
`404 gone` (with `epoch`), `409 full` (with `max`), `409 taken`, `400 invalid`, `413 too_big`, `429 slow_down`
(with `retryAfter`).

A picture is kept as copies of itself, one for each of the five widths up to its own (a picture narrower than 320
pixels is kept as it came), each drawn afresh: upright, whatever way the phone was held, and without what the file
said about itself (where it was taken, by what). An address that names the picture's version (`?v=`, as the cast
gives it) always leads to that picture and may be kept by a browser for good; a new picture has a new version. The
key is looked at before a single byte of a picture is read. What is refused: `415 not_a_picture` (not sent as a
picture), `400 not_a_picture` (not a JPEG, PNG or WebP file, damaged, or more than 100 megapixels), `413 too_big`.

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

`ADMIN_KEY` is what lets a cast be changed: at least 16 characters, sent by the page that keeps the cast as
`X-Admin-Key`. Left unset, casts are read as ever and changed by nobody.

Limits, all by environment: `PLAYERS_PER_GAME` 3, `GAMES` 50 (how many different games players are kept for),
`SAVE_BYTES` 65536, `REQUESTS_PER_MINUTE` 240 from one address, `PHOTO_BYTES` 16777216 (one picture as it is sent
up) and `CAST_PER_GAME` 200 (members of one game's cast with a name or a picture). `CORS_ORIGIN` is `*` unless set.

A caller's address is read from the header the proxy in front writes: `X-Real-IP` on Railway, where nothing needs
setting. Elsewhere `ADDRESS_HEADER` names it, and without one it is the address the connection came from. It must
never be a header a caller could send. An IPv6 caller is counted by its network (/64).

On Railway: the service `sonic-hub-game-api`, with this folder as its root, built by Railpack (`npm ci`,
`npm run build`, `npm start`), health check `/api/health`. A merge that touches this folder deploys it. Pictures
are resized with `sharp`, which brings its own library from npm: nothing has to be installed beside it.

## What it does not do

A save is taken as the browser sends it. A game whose results must be trusted (points that unlock something the
service itself hands out) will need its results checked here, by replaying the game from its moves.
