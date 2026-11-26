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
    look.js              another way of drawing the same place (for now: as an animated film would)
    nav.js               touch stick, drag to look, tap to walk, keys, collision, the tour's camera path
    ui.js  page.html     the slips over the picture (year, hour, rooms, cards) and the page they sit in
    eras.js  hub.js      the hub's eras (paper and ink by year) · the hub's address and how it names a moment
    sound.js
  places/
    van-bao-507/         flat 507, Vạn Bảo, 2005–2012 (the first place)
    esa-el-segundo-2015/ his studio at Extended Stay America, El Segundo, onsite 8–9/2015, and the streets around it
  site/                  the list of places (index.html), serve.json, favicon
  tools/                 photographs and checks, through headless Chrome
  build.mjs
```

## Addresses

| address | what |
|---|---|
| `/` | the list of places |
| `/places/<id>` | a place. `?at=2007-06-15T18:05` opens it on that year and hour (the hub's own way of naming a moment, as on `/pc?at=`); `#<room>` opens it in that room; `?look=hoat-hinh` opens it drawn that way (see Looks) |
| `/places.json` | the list as data (served with CORS): `sonic-hub-web`'s Portal reads it to show what is inside |

## What a place is

A folder under `places/` with two files the build looks for, and whatever else it needs.

**`meta.js`** — data only (the build reads it in Node): `id` (the folder's name), `title`, `sub`, `kind`, `where`,
`years { from, to, start }` (leave out for a place of one moment), `hours [{ id, from, label, name, say }]`, `intro`,
`blurb`, `aria`, `plan` (its rooms as rectangles, drawn on its card), and `tz` for a place abroad: the hours its clocks
stood from Vietnam's (Sonic Hub names moments on Vietnam's clock; `?at=` is then read on the place's own).

**`place.js`** — the default export:

```js
export default {
  meta,
  views: { 'bep': { name: 'Bếp', pose: [x, y, z, heading, pitch] }, … },   // the list of rooms; a key is also its #address
  start: 'phong-khach',
  bounds: { x0, x1, z0, z1 },                // how far the walker may go
  floor(x, z, y) → height,                   // optional: the floor under a walker standing about y (stairs, an upper storey)
  far, speed, tapRange,                      // optional: camera depth (m), walking pace (m/s), how far a tap may send him
  light: { sun, shadow, lamps, hours, outdoor? },  // see engine/light.js (an hour may bring its own sun: dir)
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

**A place measured after it was drawn.** `new Builder(shared, survey)` takes a survey — `{ y(y), z(z), rigid }`, two
rising functions from the drawing's grid to the measured place — and puts everything laid down through it: furniture
built inside a frame (`push`) moves whole with the frame's origin, walls are mapped point by point (`b.shell = true`),
heights are squeezed. `b.real = true` switches it off for code already written in measured metres; `b.at(x, y, z)` and
`b.spot(x, y, z)` give real positions to hand back through `ctx`. Flat 507 is built this way since its re-survey
(`places/van-bao-507/plan.js` tells the story); a place drawn to measure needs none of it.

### Adding a place

1. `places/<id>/meta.js` and `place.js` (start from `van-bao-507`; `plan.js` first — every room, door and window as numbers).
2. `npm run build`, then look: `PLACE=<id> node tools/shot.mjs look 1280 720 "<view>;<view>"`.
3. Its own checks, if it has things to check, in `places/<id>/checks.mjs` (`npm test` runs them, and walks its tour for walls).

Nothing else changes: the list, `places.json` and the door on the hub's Portal pick it up from the build.

### Not built yet

Places stand alone: each is one page. Streets that join them (walking out of the gallery of 507 and down the lane)
will need places to share one ground and the engine to load a neighbour while you walk — `outside.js` of
`van-bao-507` is the first sketch of that neighbourhood, seen only from the windows.

## Worlds

A world is a stretch of country too wide to build at load (the first: `south-bay`, El Segundo for a kilometre round
one drive). Its `meta.js` says `engine: 'world'`; `engine/world/app.js` runs it and `engine/world/page.html` is its
page. The rules it keeps (the Project's `claude/chuan-dung-the-gioi-3d.md`): nothing wider than a house is built at
load, and what a frame may cost is checked.

- **Tiles.** The ground comes 500 m at a time: `places/<id>/data/world.py` turns OpenStreetMap extracts into
  `places/<id>/world/` (`index.json`, `routes.json`, `tiles/<i>_<j>.json`; the build copies it to `dist/world/<id>/`).
  Everything that needs the whole network is worked out there — where a street's lines and sidewalks stop for a
  junction, the rounded corners, stop lines, signal poles, street trees, the cars in the lots, the piers of a
  viaduct (none in a road). `engine/world/tiles.js` holds the 5 × 5 squares round the eye; each is built in a Worker
  (`tilework.js`, a function with no outer names) into five meshes and a few instanced ones, and dropped 1.5 km on.
- **Sites.** A place built by hand stands in a world whole, in a group of its own (`sites` in the world's
  `place.js`): the hotel of El Segundo with its streets. Its fine parts show only from near (`near`). A place that
  can be a site reads `ctx.world`: `esa-el-segundo-2015/town.js` then leaves its sidewalks and lines open where the
  world's data says a junction is, draws no signals and no traffic (the world's signals change; its car obeys them).
- **Routes and the car.** `routes.json` holds the middle of the lane to keep, metre by metre, the speed each stretch
  allows, the signals and stop signs, the turns, and how far a hand on the wheel may stray. `engine/world/drive.js`
  drives it (by itself by default); `camry.js` is the cabin of his black 2014 Camry, drawn in a pass of its own over
  the world; `headunit.js` the screen in the middle, which plays his own lists from Sonic Hub's music library.
- **Checks.** `places/<id>/checks.mjs`: each route driven end to end with the rules kept, the wheels off the
  kerbs, the frame under the ceiling measured on his telephone (460 draw calls, 1.2 M triangles in view), both
  telephone layouts. `tools/worldshot.mjs` photographs a world along a route; `places/<id>/data/plot.py` draws the
  data as a map.

Not there yet: walking and the scooter in a world, the car seen from outside, other cars on the road, more
routes and sites, scenes far away (Point Vicente, Orange County), the layers of years.

## Looks

A place is built once, as it was: its surfaces, its lamps, its hours. A look (`engine/look.js`) is another way of
getting a frame of that same place to the screen; the two buttons under the hours switch between the plain way
(*Chân thực*) and the looks there are, and the address keeps the choice (`?look=<id>`). One look so far:

- `hoat-hinh` (*Hoạt hình*): as an animated film would draw it. Light from the sun and the lamps falls in three flat
  steps, softly joined; nothing shines or mirrors; carpet, wood and plaster lose most of their grain; every thing gets a soft outline
  in a darker shade of its own colour, full round its silhouette and lighter along its folds; what no lamp and no
  sun reaches leans toward plum; what is bright glows a little.

A place does nothing for a look, and a look changes nothing in a place. While a frame is drawn, each lit material
(`MeshStandardMaterial`) is stood in for by a toon material sharing its colour and pictures (not its relief), and is
back on its mesh when the frame is done, so whatever a place does to its materials through the hours keeps working.
What is drawn unlit (a lit screen, a lamp's glow, the sky, the bright dots) keeps its own material; the whole
picture then takes the hour's exposure and the renderer's tone curve together, so the few things the plain way
keeps out of that curve (`toneMapped: false`) come out a shade softer. The outlines are read from the picture's
depth: no second drawing of the place, a few passes over the screen. The surroundings an hour paints for
reflections (`light.js`) light a stand-in the way they light a matt surface, which keeps a look about as bright as
the plain picture without a setting per place; `tools/lookcheck.mjs` holds every place to that at every hour, and
to getting its own materials and its plain picture back. A tap on a look's button has the card build that look's
programs on the side while the page goes on, and turns when they are there.

A new look is an entry in `LOOKS` and its settings in `SET` (and, if it draws lines or light another way, its own
pass). A page can be made to open in a look when its address names none: `<html data-look="hoat-hinh">`.

## Build, run, test

```
npm install
npm run build              # → dist/  (--min to minify: node build.mjs --min)
npm start                  # serves dist on $PORT (3000)
npm test                   # build, then every check for every place
node tools/site.mjs http://127.0.0.1:3000     # the site as served: the list, a place opened from it
```

The tools need Playwright and Chrome (`PLAYWRIGHT`, `CHROME`, see tools/lib.mjs) and serve three.js from
`node_modules` in place of the CDN (a world's page is served from `dist/` under a made-up address, since it fetches
its data as it goes). `tools/shot.mjs` photographs a place from its views or from given poses;
`LOOK=hoat-hinh` draws it in a look, `DPR=2` as a dense phone screen shows it. A place's page is one self-contained
file (script inline, three.js 0.170.0 from cdnjs), so `dist/places/<id>.html` also works on its own, opened from
disk or published as a single page.

## Deploy

Its own Railway service, like the other folders: root directory `sonic-hub-world`, `railway.toml` here (build
`npm install && npm run build`, start `npm start`). `sonic-hub-web` finds it at `VITE_WORLD_URL`, or by default at
`https://sonic-hub-world-production.up.railway.app`.

## esa-el-segundo-2015: what it rests on

- The four photographs of the studio of 21/9/2015 at 19:15 California time, the walkway and lot at 09:47 the next
  morning, the walk east along Mariposa to the Green Line (09:52–09:59), and the iPhone pictures of August and September
  (Fsoft → [2015.08] Onsite 2015). The DirecTV badge from the trip's scanned documents. The desk of Sonic Hub for
  that moment: Asus N56 on Windows 8.1, iPhone 6s.
- Streets, footprints and heights from OpenStreetMap (© OpenStreetMap contributors, ODbL; `data/osm2js.py` →
  `osm.js`), the lots and roofs from satellite pictures looked at but not copied. No logos: shop names are plain words.
- The studio's inside is measured, not eyeballed: a camera was fitted to each photograph and every edge carried back
  onto the plane it lies in (`plan.js`: `IN`; the story is in `EVIDENCE.md`). To stand a render beside the photograph
  it should match, give the screenshot tool the lens: `FOV=54.43 PLACE=esa-el-segundo-2015 node tools/shot.mjs cmp 1200
  900 phong toi` (54.43° is the Canon's 4:3 frame at its widest; the views `phong`, `tu-guong`, `giuong`, `hanh-lang`
  and `bai-xe` stand where photographs were taken).
- `places/esa-el-segundo-2015/EVIDENCE.md` says which photograph each part rests on and what is a guess (the bathroom's
  inside; the closet; small things on the counter; the fence's north end; the corner pad; the second girder north of
  the station). Cars are instanced (`cars.js`), street trees merged in bands of x so that what is behind the walker is
  not drawn; inside the studio the far plane comes in whenever neither the door nor the window is in view (`place.js`:
  `sight`); `node tools/stats.mjs` (with `PLACE=`) prints the triangles per part.

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
