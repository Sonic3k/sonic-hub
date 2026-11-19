# sonic-hub-game-api: where the games keep their players, and their cast

One small service that every Sonic Hub game saves to, whichever repository and address the game lives at.

A game has a few **players** (three unless `PLAYERS_PER_GAME` says otherwise), each with a name and the game's own
save: any JSON object up to 64 KB, which the service never looks inside. The players are the game's own, as on the
machine an old game was installed on: whoever opens the game, on any device, sees the same players and picks theirs.
Nobody signs in, so anyone who can open a game can also rename, play or remove its players.

A game also has a **cast**: the characters a player meets in it. The game knows them, each by a key of its own
(`mina`, `celeste`). Here any of them can be given another name and a picture, which the game then shows in place
of its own. As with players, nobody signs in: whoever opens the page a game brings for keeping its cast (Keep It
Down's is at `/admin` on the game's address) changes it. A name is kept here. A picture goes into the hub's bucket
as it came and is read through the hub's CDN, which hands it out at whatever width its address asks for.

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

A picture is not read from this service: the cast gives its address at the CDN, and the client asks there for the
width that fits the place, with `?width=`: one of the CDN's five (320, 640, 960, 1280, 1920), which is the place's
width, half as much again on a screen with finer dots, then the next one up; looked at large, 1280 on a phone and
1920 on a wider screen. What was last heard is kept in the browser, so names and pictures are there at once the
next time and stay when there is no connection.

## The API

All under `/api`. Every answer carries `X-Now` (the service's clock, ms) and is never cached.

| | |
|---|---|
| `GET /games/{game}/players` | `{ max, epoch, players: [{ id, name, data, version, createdAt, updatedAt, playedAt }] }`, oldest first |
| `PUT /games/{game}/players/{id}` | one write: `{ base, name?, data?, at? }` → the player as it now stands |
| `DELETE /games/{game}/players/{id}` | removes a player (204, also when already gone) |
| `GET /games/{game}/cast` | `{ cast: [{ id, name, photo }], photoBytes }`: who was given a name (else `null`) or a picture (its address at the CDN, else `null`); `photoBytes` is how large a picture may be, `null` where there is no bucket to keep one in |
| `PUT /games/{game}/cast/{id}` | `{ name }`: the name she is to go by, at most 24 signs; `null` gives the game's own back |
| `PUT /games/{game}/cast/{id}/photo` | the picture itself as the body: a JPEG, PNG or WebP file, with its kind as the `Content-Type` |
| `DELETE /games/{game}/cast/{id}/photo` | takes her picture away |
| `GET /client.js`, `GET /cast.js`, `GET /health` | the two browser clients; `{ ok: true }` |

`id` is a UUID the browser chooses, so a new player sent twice is one player. `base` is the version the write was
made from (0 for a new player): a write from an older version is refused with `409 { error: 'stale', player }`, the
player as it now stands. `at` is when the save was played. `epoch` names the database: one that was set up anew
has another, and a browser then sends what it still holds again instead of taking it for removed. Other refusals:
`404 gone` (with `epoch`), `409 full` (with `max`), `409 taken`, `400 invalid`, `413 too_big`, `429 slow_down`
(with `retryAfter`).

A picture is kept as it was sent: the file goes into the bucket under `games/{game}/cast/{id}/<name>.jpg` (`.png`,
`.webp`), and all that is looked at here is how it begins, which says what kind of file it is. Nothing is resized
here: that is the CDN's work. The file's name is made from the file itself, so another picture is at another
address, and an address can be kept for good by the CDN and by every browser; the file a new picture takes the
place of is removed from the bucket. What is refused: `415 not_a_picture` (not sent as a picture), `400
not_a_picture` (not a JPEG, PNG or WebP file), `413 too_big`, `409 full`, `503 no_storage` (the service has no
bucket) and `502 storage_failed` (the bucket did not take it: she keeps the picture she had).

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

Pictures go where the hub's other files are: `B2_KEY_ID` and `B2_APP_KEY` open the bucket (the same pair the
hub's other services have; `B2_BUCKET` is `sonic-hub`, `B2_ENDPOINT` `s3.us-east-005.backblazeb2.com` and
`B2_REGION` `us-east-005` unless set). They are kept in the folder `MEDIA_PREFIX` (`games`) and read at `CDN_BASE`
(`https://sonic-hub.b-cdn.net`). Without the pair, names are given as ever and a picture is turned away.

Limits, all by environment: `PLAYERS_PER_GAME` 3, `GAMES` 50 (how many different games players are kept for, and
as many a cast), `SAVE_BYTES` 65536, `REQUESTS_PER_MINUTE` 240 from one address, `PHOTO_BYTES` 16777216 (one
picture) and `CAST_PER_GAME` 200 (members of one game's cast with a name or a picture). `CORS_ORIGIN` is `*`
unless set.

A caller's address is read from the header the proxy in front writes: `X-Real-IP` on Railway, where nothing needs
setting. Elsewhere `ADDRESS_HEADER` names it, and without one it is the address the connection came from. It must
never be a header a caller could send. An IPv6 caller is counted by its network (/64).

On Railway: the service `sonic-hub-game-api`, with this folder as its root, built by Railpack (`npm ci`,
`npm run build`, `npm start`), health check `/api/health`. A merge that touches this folder deploys it.

## What it does not do

Nobody signs in: whoever can reach the service can change a game's players and its cast. How the hub is to sign
anyone in is not settled, and nothing here takes a side on it.

A save is taken as the browser sends it. A game whose results must be trusted (points that unlock something the
service itself hands out) will need its results checked here, by replaying the game from its moves.
