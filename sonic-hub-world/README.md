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
  Everything that needs the whole network is worked out there — the streets (below), signal poles, street trees,
  the cars in the lots, the piers of a viaduct (none in a road). `engine/world/tiles.js` holds the 5 × 5 squares
  round the eye; each is built in a Worker (`tilework.js`, a function with no outer names) into five meshes and a
  few instanced ones, and dropped 1.5 km on.
- **Streets.** One set of rules lays out every street of a world, the way California lays its streets out
  (`places/<id>/data/streets.py`; the rules are at its head): the lanes of each road from the map's `lanes` and
  `turn:lanes`; a double yellow line between opposite ways, the two-way left-turn lane's solid-and-broken pair,
  broken white lines between lanes going the same way (solid before a signal); where roads meet — several points on
  a divided road are one crossing — round corners, the crosswalks the map has (and one on each arm of a signal it
  has none for), a limit line before each, arrows in the lanes to turn from, the word STOP at a stop sign; kerb,
  gutter and a walk at the kerb, dropped to an apron at every driveway; a strip for parked cars along each kerb of
  a two-lane street where there is room (a quiet street is then 36 ft from kerb to kerb, with no line on it), and
  cars standing in it; between the two roadways of a divided road a raised median — one thing, laid from one of
  the two, open only where something crosses both, its ends round; between crossings, where a street goes on as a
  way with a lane more on one side, its yellow lines are led across to the next way's over some 24 m either side
  (a turn lane beginning), never broken off and begun again a lane's width away. What a place knows that the map
  does not goes in
  as a short list in `world.py`: `STRIPES` (a street's lanes, by stretch), `WIDTHS` (kerb to kerb, with its parking
  strips), `ISLANDS` (planted islands in a middle lane: the lane between an island's end and a crossing is then a
  pocket to turn left from), `CROSSWALKS` (one in mid-block), `DRIVES`, `TREES` and `TREE_KIND`, `MEDIAN_W` (by
  stretch). The script counts what must never be — a limit line inside a crosswalk, a corner whose outline crosses
  itself, a centre line that steps between two ways — and the checks hold the tiles to it.
- **Plants.** `engine/plants.js` builds every tree, palm, shrub and hedge of every place the way real-time worlds
  do: a crown is a dark core with cards round it that carry sprays of leaves cut out by alpha (alpha test; alpha
  to coverage where the screen is multisampled); the cards are lit as one rounded mass (the crown's dome's
  normals), darker inside and underneath (painted on the vertices), with a share of light coming through; one
  atlas drawn on a canvas (no photograph), whose mip levels are made cell by cell so that a spray keeps its cover
  from far; wind in the vertex shader; one material for all of it. Kinds: an Indian laurel fig, a round-headed
  street tree, a gum, a Mexican fan palm; shrubs and clipped hedges. In a world a street is planted with one kind
  (`TREE_KIND` where a place knows it); far trees are the tiles' cheap shapes, and within 105 m of the eye each
  is taken into a pool of its kind and drawn leaf by leaf (a palm gets its head of leaves) — some 40 k triangles
  and four draw calls at most.
- **Sites.** A place built by hand stands in a world whole, in a group of its own (`sites` in the world's
  `place.js`): the hotel of El Segundo with its lots, its buildings and the shops next door; and the parking
  structure at 940 N Nash St where the drive to work ends (`places/south-bay/garage.js` from the plan in
  `garage.json`, which says what each number rests on and what is guessed: how its floors climb). The map's own
  block for a site built by hand is left out of the tiles (`SITE_WAYS`). Its fine parts show only from near
  (`near`). The streets round a site are the world's own, there as everywhere:
  `esa-el-segundo-2015/town.js` draws no road, walk, line, crosswalk, median, street tree, light or signal. That
  holds on the place's own page too, where he walks: `world.py` lays the street layer a second time, cut to that
  place's ground and with nothing but streets in it, into `places/esa-el-segundo-2015/streets.js` (six squares, some
  45 kB, inlined in the page), and `tiles.js` builds those squares at once with the same builder — so the street
  walked along there is the street driven along in the world. The few cars of that page keep lanes written the same
  way (routes along Sepulveda and Mariposa: `LANES`), stop at a red light, decide once at a yellow one, and wait
  behind the car in front.
- **Routes and the car.** A route in `routes.json` is a path a car can drive, not a line on a map: the data script
  eases the map's roads into curves, plans the lane (least moving sideways), then drives a car along the lane's
  line (a wheelbase, a look ahead, hands that turn the wheel no faster than a turn a second) and stores what its
  back axle traces — a point every half metre to the millimetre, with its heading and curvature — beside the speed
  each stretch allows, the signals and stop signs, the turns, how far a hand on the wheel may stray, and where the
  street is straight. A route may climb: a part drawn by hand (`head`, `tail` with heights) takes the car through a
  gate (a control of its own: a full stop, the arm goes up) and up the floors of a parking structure; the path
  then carries a height for every point, and the car its height and the slope it stands on.
  `engine/world/drive.js` drives it (by itself by default) and takes heading, wheel and lean from
  that path; never from differences between points (that made the car twitch on a straight street). `camry.js` is
  the cabin of his black 2014 Camry, drawn in a pass of its own over the world; `headunit.js` the screen in the
  middle, which plays his own lists from Sonic Hub's music library.
- **Checks.** `places/<id>/checks.mjs`: each route driven end to end with the rules kept, and driven like a car — on
  a straight street the wheel, the nose and the body hold still; the wheel changes direction fewer than 12 times a
  minute (2° and more: the steering reversal rate); the foot does not hunt between the pedals — the wheels off the
  kerbs, the frame under the ceiling measured on his telephone (460 draw calls, 1.2 M triangles in view), both
  telephone layouts; and the streets themselves: their own rules kept, no face inside out, every round corner
  beginning where a walk's kerb ends, no centre line stepping between two ways, the car on the right of the line
  at the hotel's way in; the parking structure (a full stop at the gate and the arm's answer, the slope coming and
  going gently, a deck within 9 cm under every wheel, clear of the cars in the stalls); the plants (drawn leaf by
  leaf near the car, each once; the leaf pictures keeping their cover level by level). A picture cannot show
  a twitch: what moves is checked as a series in time.
  `tools/worldfeel.mjs` prints those figures for one drive; `tools/worldshot.mjs` photographs a world along a route;
  `tools/worldtop.mjs` photographs it from straight above (a plan of any spot, cut at any height: the way to see
  what the streets are); `tools/worldfree.mjs` from any point towards any other; `places/<id>/data/plot.py` draws
  the data as a map.

Not there yet: walking and the scooter in a world, the car seen from outside, other cars on the road (the hotel's
own page has a few, see Sites), more routes and sites, scenes far away (Point Vicente, Orange County), the layers of
years. Of the streets: six crossings where the two roadways of divided roads come in at an angle (El Segundo
Boulevard at Nash and at Isis, Pacific Coast Highway at Grand, none on a route yet) are paved out to their outermost
points and five corners there are left pointed (the script counts them): the corner between two such arms has to be
fitted on the pair's own axis. Of the parking structure: how its floors climb is guessed, its fourth to eleventh
floors are a shell. Of the plants: one street, one kind by lot where no picture says which; no date palms, pines or
jacarandas yet; the lawns are flat colour.

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
