# Nhà Vạn Bảo 2005–2012 — source

Flat 507 (fifth floor, last door of the gallery) of the Vạn Bảo block in Hà Nội, rebuilt as a 3D page you can walk
through, with the machines of each year from Sonic Hub's desk.

The page that runs is `dist/index.html`: one self-contained file (its script inline, three.js
0.170.0 loaded from cdnjs), built from `src/`. It is also published as a private claude.ai artifact; no Railway service serves this folder yet.

## Build and test

```
npm install                # three@0.170.0, esbuild@0.24.0
node build.mjs             # src/main.js + src/index.template.html → dist/index.html   (--min to minify)
node tools/shot.mjs <name> [w] [h] "pose;pose" [chieu|toi] [year] [intro|rooms|notes|card:<id>]
node tools/tourshots.mjs <name> [every-seconds] [w] [h]      # the guided tour, photographed
node tools/tourcheck.mjs   # does the tour path cross a wall or a piece of furniture?
node tools/interact.mjs    # mouse, keys and touch against every control
```

The tools drive headless Chrome through Playwright (software WebGL) and serve three.js from `node_modules` in place
of the CDN. A pose is a key of `VIEWS` in `src/plan.js` or `x,y,z,heading,pitch`.
If you patch `dist/index.html` by hand, make the same change in `src/` — the next build overwrites it.

## Where things are

| file | what |
|---|---|
| `src/plan.js` | the floor plan: every room, door and window as numbers; the named viewpoints |
| `src/shell.js` | floors, walls with their openings, doors, balconies, the gallery and the rest of the block |
| `src/rooms_a.js` | living room, kitchen, WC, loggia, what stands on the balconies and in the gallery |
| `src/rooms_b.js` | the big room (his corner, books, piano, his sister's side) and the parents' room |
| `src/furn.js` | furniture prefabs (wardrobe, bed, desk, chairs, fans, the carved sofa set…) |
| `src/era.js` | what changes with the year: computers, phone, TV, calendar; the links to the hub |
| `src/photos.js` | the one real picture: his own bus-27 photo, the wallpaper of 2011–2012 |
| `src/outside.js` | the neighbourhood seen from the windows (generic, not portraits of real houses) |
| `src/light.js` | sky, sun, lamps; the two hours: `chieu` 18:05 and `toi` 21:00 |
| `src/nav.js` | walking: touch stick, drag to look, tap to walk, keys, collision, the tour's camera path |
| `src/ui.js` | the slips over the picture: year, hour, rooms, cards, the list of guesses |
| `src/kit.js`, `src/tex.js` | geometry builder (merged per material, plain colours as vertex colours) and drawn textures |
| `src/main.js` | wiring, the tour's keyframes (`TOUR`), the frame loop, the test hooks (`window.__house`) |

Coordinates: metres; x east, z south, y up; the origin is the inner north-west corner of the living room.
A heading is in degrees clockwise from north. The gallery runs north from the front door (`COR` in `plan.js`).

## What it rests on

- Two walk-through videos of June 2013 in the hub's archive (Hydrocity → [2013.06] Van Bao Home): the flat, and the
  gallery with the stairs. Photos of 22/9/2012 and of Tết 2009 (fish tank, the Di Lặc statue).
- The desk of Sonic Hub (`/api/desk/at`, read for 15 June of each year): PC Win XP until 9/2008, Fujitsu FMV 10/2005–9/2008,
  HP Pavilion from 9/2008 (Vista in 2009, Windows 7 from 2010), Nokia Series 40 from 2006, and the wallpapers.

## Guesses (the page lists them too, under "Chỗ nào là đoán")

Room sizes (estimated from the footage, never measured); the 2013 arrangement used for all of 2005–2012; the old XP
tower on the parents' desk in 2006–2008; the year the flat TV replaced the tube set (2010); which room and which side
was whose; the compass direction (set from the evening sun pattern on the TV wall); the neighbours' houses.
