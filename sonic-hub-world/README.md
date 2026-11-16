# sonic-hub-world — Nơi chốn

The places of a life — a home, a school, the streets around the house, a homestay — each rebuilt in 3D to walk
through, in the years it was lived in. One site of its own, like Huyền học and Bóng đá: Sonic Hub's Portal page
points here, and each place points back into the hub (the computer and the phone of the moment it is showing).

```
sonic-hub-world/
  engine/                what every place shares
    app.js               runs a place: renderer, walking, the bright dots, the frame loop
    kit.js  tex.js       geometry builder (merged per material) and drawn textures / materials
    walls.js  furn.js    walls with openings, doors, windows, bars · furniture
    light.js             sky, sun, lamps, the hours of a day
    nav.js               touch stick, drag to look, tap to walk, keys, collision, the tour's camera path
    ui.js  page.html     the slips over the picture (year, hour, rooms, cards) and the page they sit in
    eras.js  hub.js      the hub's eras (paper and ink by year) · the hub's address and how it names a moment
    sound.js
  places/
    van-bao-507/         flat 507, Vạn Bảo, 2005–2012 (the first place)
  site/                  the list of places (index.html), serve.json, favicon
  tools/                 photographs and checks, through headless Chrome
  build.mjs
```

## Addresses

| address | what |
|---|---|
| `/` | the list of places |
| `/places/<id>` | a place. `?at=2007-06-15T18:05` opens it on that year and hour (the hub's own way of naming a moment, as on `/pc?at=`); `#<room>` opens it in that room |
| `/places.json` | the list as data (served with CORS): `sonic-hub-web`'s Portal reads it to show what is inside |

## What a place is

A folder under `places/` with two files the build looks for, and whatever else it needs.

**`meta.js`** — data only (the build reads it in Node): `id` (the folder's name), `title`, `sub`, `kind`, `where`,
`years { from, to, start }` (leave out for a place of one moment), `hours [{ id, from, label, name, say }]`, `intro`,
`blurb`, `aria`, `plan` (its rooms as rectangles, drawn on its card).

**`place.js`** — the default export:

```js
export default {
  meta,
  views: { 'bep': { name: 'Bếp', pose: [x, y, z, heading, pitch] }, … },   // the list of rooms; a key is also its #address
  start: 'phong-khach',
  bounds: { x0, x1, z0, z1 },                // how far the walker may go
  light: { sun, shadow, lamps, hours },      // see engine/light.js
  tour: [{ p: [x, y, z], h, pitch, t, cut?, label? }, …],                   // optional
  card(id, { year, hour, extra }) → { title, body } | null,                // what a bright dot opens
  notes: { title, body },                    // what is real and what is guessed — every place says so
  sayYear(year) → 'a few words',
  build({ scene, shared, ctx, renderer }) → { setYear(y), setHour(id), touch(id), animate(dt, clock) },
};
```

`build` puts the place into the scene with a `Builder` (engine/kit.js) and registers what is solid. While it builds
it hands things back through `ctx`: `ctx.hot.push({ id, pos, r })` for a bright dot, `ctx.lampMat(colour, strength)`
for a shade that glows when the hour is lit, `ctx.spots` for places where something changes with the year.

Coordinates: metres; x east, z south, y up. A heading is in degrees clockwise from north.

### Adding a place

1. `places/<id>/meta.js` and `place.js` (start from `van-bao-507`; `plan.js` first — every room, door and window as numbers).
2. `npm run build`, then look: `PLACE=<id> node tools/shot.mjs look 1280 720 "<view>;<view>"`.
3. Its own checks, if it has things to check, in `places/<id>/checks.mjs` (`npm test` runs them, and walks its tour for walls).

Nothing else changes: the list, `places.json` and the door on the hub's Portal pick it up from the build.

### Not built yet

Places stand alone: each is one page. Streets that join them (walking out of the gallery of 507 and down the lane)
will need places to share one ground and the engine to load a neighbour while you walk — `outside.js` of
`van-bao-507` is the first sketch of that neighbourhood, seen only from the windows.

## Build, run, test

```
npm install
npm run build              # → dist/  (--min to minify: node build.mjs --min)
npm start                  # serves dist on $PORT (3000)
npm test                   # build, then every check for every place
node tools/site.mjs http://127.0.0.1:3000     # the site as served: the list, a place opened from it
```

The tools need Playwright and Chrome (`PLAYWRIGHT`, `CHROME`, see tools/lib.mjs) and serve three.js from
`node_modules` in place of the CDN. A place's page is one self-contained file (script inline, three.js 0.170.0 from
cdnjs), so `dist/places/<id>.html` also works on its own, opened from disk or published as a single page.

## Deploy

Its own Railway service, like the other folders: root directory `sonic-hub-world`, `railway.toml` here (build
`npm install && npm run build`, start `npm start`). `sonic-hub-web` finds it at `VITE_WORLD_URL`, or by default at
`https://sonic-hub-world-production.up.railway.app`.

## van-bao-507: what it rests on

- Two walk-through videos of June 2013 in the hub's archive (Hydrocity → [2013.06] Van Bao Home): the flat, and the
  gallery with the stairs. Photos of 22/9/2012, 25/5/2013 and of Tết 2009 (fish tank, the Di Lặc statue). The TV
  reportage about onthi.com (2007-2017 → onthi.com → `onthi_vcd.mp4`), filmed in the big room on 23/4/2008.
  `places/van-bao-507/EVIDENCE.md` goes through the plan part by part: which frame or photograph each wall, door and
  piece of furniture rests on, how the sizes were measured, what is still a guess. Read it before moving a wall.
- The desk of Sonic Hub (`/api/desk/at`, read for 15 June of each year): PC Win XP until 9/2008, Fujitsu FMV
  10/2005–9/2008, HP Pavilion from 9/2008 (Vista in 2009, Windows 7 from 2010), Nokia Series 40 from 2006, and the
  wallpapers. One picture in it is real: his own bus-27 photograph, the wallpaper of 2011–2012 (`photos.js`).

Guesses (the page lists them too, under "Chỗ nào là đoán"): the sizes of the two bedrooms (the living room, kitchen, wet rooms
and the ceiling height were measured off the pictures in the review of November 2026, to about ±0.3 m, and the south
side was set right by the owner);
the 2012–2013 arrangement used for all of 2005–2012 (before 2009 the archive has only the reportage of April 2008, in the big room); the old XP tower on the parents' desk in 2006–2008; the year the flat
TV replaced the tube set (2010); which room and which side was whose; the compass direction (set from the evening sun
on the TV wall); the neighbours' houses.
