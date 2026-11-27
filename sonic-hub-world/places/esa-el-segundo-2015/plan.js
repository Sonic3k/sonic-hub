/* The plan of the place: the Extended Stay America at 1910 E Mariposa Ave, El Segundo, California, in August and
   September 2015 (the six weeks of the onsite at DirecTV), and the streets around it. Metres; x runs east, z runs
   south, y up; the origin is 33.92290 N, 118.39500 W, the frame of the OpenStreetMap data in osm.js. Ground at y = 0.
   EVIDENCE.md says which photograph each part rests on and what is guessed.

               E Mariposa Ave (6 lanes) ──────────────────────────── the drive in ▼ ───────────▶ Nash St, the Green Line
     Sepulveda    ┌ pad ┐   ╔══════════ MAIN WING ══════════════════════╗ lobby   ║ ║
     Blvd (PCH)   └─────┘   ╚═══════════════════════════════════════════╝ + sign  ║ ║ the drive goes on south
     8 lanes      ┌ Starbucks/Jersey Mike's ┐        ║ NORTH ║   12 rooms a side, two floors, walkways on both faces
                  └─────────────────────────┘  lot   ║ WING  ║◀── his room: upper floor, west face, just north of the south-west stairs
                       Ralphs' parking lot   fence   ╟ block ╢   (a low block at its south end, then a passage)
                  ┌──── RALPHS (1997) ────┐          ║ SOUTH ║   15 rooms a side
                  └───────────────────────┘          ║ WING  ║

   THE THREE WINGS. Each is a long two-storey block of studios back to back, with an open walkway along each long face
   on both floors (the photographs of 22/9/2015 and 17/8/2015). The roof outlines are LA County's footprints (osm.js
   keeps them out: they are built here), checked against the satellite picture. A wing's section, from a roof edge
   inward: 0.45 to the line of the terracotta columns and the white railing, a walkway to 2.0, the front wall (0.18),
   the studio (6.45 deep), the spine and its plumbing. Floor to floor 2.9; upper walkway 3.05; eaves 5.95; a hip roof
   of clay tile at 5½ in 12.
   HOW MANY ROOMS. 13 studios a side in the main wing, 12 in the north, 15 in the south: 160 doors on the walkways. The
   hotel lets 151 rooms; the others are the lobby and its office, the laundry, the housekeepers' and the stores. The
   sign on the main wing counts 25 rooms on its ground floor (103–127) and 27 above (151–177): 13 a side, one given to
   the lobby below and one more over it.
   ON EACH FACE: a stair tower near each end and, between the two, one gabled bay. A tower stands out from the walkway,
   open to the lot between two heavy terracotta columns under an arch; inside, the stair goes out to a landing at the
   tower's face and comes back (TOWER, below). The gabled bay is the same two columns and arch set on the walkway's own
   edge, with a small raised roof and nothing behind it. */

export const G1 = 0.15;          // the ground-floor walkway and rooms: a curb above the parking
export const G2 = 3.05;          // the upper walkway and the upper rooms
export const CEIL = 2.39;        // a studio's ceiling over its floor (7'10": the four photographs of 21/9/2015)
export const EAVE = 5.95;
export const PITCH = 0.46;        // 5½ in 12: the ridge stands about 10.1 m in the photograph of 17/8 from the lot (its camera fitted to the doors and windows)
export const COL = 0.45;         // from a roof edge to the line of columns and railing
export const FRONT = 2.0;        // from a roof edge to the front wall
export const WALL = 0.18;        // front wall
export const MOD = 3.85;         // one studio (3.63 wall to wall) and one party wall, along a wing
export const KERB = 0.25;        // from a roof edge in to the edge of the walkway's slab (and the ground walkway's kerb)

/* A wing: its roof outline as a rectangle (x0…x1, z0…z1), which way it runs, where its studios start and how many
   there are on each face, the stair towers (as the County drew their roofs, in the map's own x or z — but the one by
   the lobby, which the County has 1.65 m further west than the satellite picture and the hotel's photograph of it
   allow) and what else is particular to it.
   `hands`: for each studio of a face, N if its door is at the end nearer the wing's start (north or west), S if at
   the other; left out, studios alternate S N S N.
   `gables`: the middle of the gabled bay on each face. `cols`: where the plain columns of a face stand when a
   photograph says so (otherwise in equal bays between the towers and the gabled bay).
   `strip`: how wide the planting is between a face's walkway and the stalls' kerb (plan.js: LOT).
   `low`: single-storey parts under their own low tile roofs — the lean-tos on the wings' ends and the block at the
   north wing's south end (x0, z0, x1, z1 of the roof, and which way its door looks). */
export const WINGS = {
  north: { axis: 'z', x0: 12.3, x1: 30.4, z0: -4.1, z1: 46.8, start: -0.2, n: 12, hands: { A: 'NSNSNSNSSNSN' },
    towers: [{ side: 'A', a0: 2.2, a1: 6.9 }, { side: 'A', a0: 36.6, a1: 41.4 }, { side: 'B', a0: 1.3, a1: 6.0 }, { side: 'B', a0: 36.8, a1: 40.9 }],
    gables: { A: 20.8, B: 22.4 }, cols: { A: [27.15, 32.25] }, boxes: { A: [8] }, strip: { A: 1.85, B: 2.1 },
    low: [[18.1, -6.4, 24.1, -4.1, 'n'], [13.7, 46.8, 30.4, 52.6, 'w']] },
  south: { axis: 'z', x0: 12.3, x1: 30.4, z0: 57.3, z1: 115.8, start: 57.675, n: 15,
    towers: [{ side: 'A', a0: 62.6, a1: 66.9 }, { side: 'A', a0: 104.4, a1: 109.0 }, { side: 'B', a0: 64.0, a1: 68.8 }, { side: 'B', a0: 106.1, a1: 110.7 }],
    gables: { A: 87.75, B: 87.75 }, strip: { A: 1.85, B: 2.1 },
    low: [[18.5, 55.6, 24.2, 57.3, 'n'], [18.8, 115.8, 24.4, 117.6, 's']] },
  main: { axis: 'x', x0: -24.6, x1: 30.23, z0: -46.5, z1: -26.7, start: -24.575, n: 13,     // x1: the lobby's block is 4.45 m long on Mariposa (Street View; the County's outline has 30.1)
    towers: [{ side: 'A', a0: -19.6, a1: -15.3 }, { side: 'A', a0: 19.65, a1: 24.15, label: '1910' }, { side: 'B', a0: -18.5, a1: -14.3 }, { side: 'B', a0: 21.0, a1: 25.7 }],
    gables: { A: 3.2, B: 2.8 }, strip: { A: 1.35, B: 2.05 },
    low: [[-26.7, -39.1, -24.6, -33.4, 'w']], lobby: true },
};
/** is studio k's door at the end nearer the wing's start? */
export const doorAtStart = (key, side, k) => { const h = WINGS[key].hands?.[side]; return h ? h[k] === 'N' : k % 2 === 1; };
/* Side A of a north–south wing is its west face; of the main wing, its north face (Mariposa).
   A STAIR TOWER, as the photographs of 17/8 (from the lot, two of them), 2/9 (from the walkway) and 22/9 (from the
   drive) show it, and the hotel's own pictures of the one by the lobby: a body 3.9 wide standing 3.45 out from the
   wing's roof edge, its two side walls blank from the ground to its own eaves (half a metre over the wing's) under a
   steep little hipped roof; the face to the lot open between two terracotta columns 0.68 square whose white capitals
   sit at 3.78–4.30 (a little above the upper walkway's railing), a flat arch over them, a floodlight over the arch. In the opening, at the tower's
   face: the stair's landing with a white railing, eight risers up from the ground, and a post in the middle. From the
   ground walkway one flight goes OUT to the landing; the other comes BACK up nine risers to the upper walkway. Seen
   from the lot, the flight from the ground is on the left (the hotel's picture of the tower by the lobby). */
export const TOWER = {
  out: 3.45, w: 3.9, wall: 0.5, col: 0.68, proud: 0.1, cap: [3.78, 4.12, 4.30], arch: [4.85, 5.2], rise: 0.45, over: 0.35, pitch: 0.8, flood: 5.85,
  land: 1.25, tread: 0.28, risers: [8, 9], post: 0.32,
};
TOWER.step = (G2 - G1) / (TOWER.risers[0] + TOWER.risers[1]);          // one riser: 2.9 m in seventeen
TOWER.y = G1 + TOWER.risers[0] * TOWER.step;                           // the landing
/* THE GABLED BAY between a face's two towers: two of the same columns 2.3 apart on the walkway's edge, the same arch
   and floodlight, a little hipped roof raised over the eaves (the walkway photograph of 22/9: the two columns whose
   capitals stand at railing height; the photographs of 19/8 and 2/9, taken beside one; the satellite picture). */
export const GABLE = { span: 2.5, over: 0.3, back: 2.4 };

/* THE LOBBY, on the main wing's east end (the hotel's own pictures for what it looks like; Street View of May 2024 and
   the County's outline for its sizes outside; EVIDENCE.md has every number's source): past the last studio the wing
   is a two-storey block one module long, 4.45 m on Mariposa, out to the columns' line — a wide terracotta pier on each
   corner, "A" on the east one, a window on each floor, the word Lobby between them, the rooms' numbers on the corner
   by the walkway. East of the block, under a low tiled roof of its own: 1.5 m of cream wall set back half a metre
   (the entry bay, an air-conditioner's grille low in it), then the porch — a narrow arch in its north side, a flat
   arch to the drive between two stubby columns, the door behind them. South of that the sign tower, 3.6 m square and
   about 9 m to its eaves. That this is the reception he confirmed on 24 Nov 2026.
   INSIDE. None of his photographs shows it (all of the weeks' 1,500 were gone through: EVIDENCE.md). It is measured
   from pictures of today — the hotel's own and travellers' — each camera found from its own vanishing points and
   tied to the outside as Street View has it:
   THE ROOM under the block is 4.03 m long and 2.88 m wide, its ceiling at 2.55 m. Its east side is the block's end
   wall, of which the ground floor keeps only a stub by the window wall and A BEAM overhead (its underside at 2.28 m,
   level with the dropped ceiling over the desk, which it runs into).
   THE ENTRY BAY beyond the beam is 1.35 m deep, to the wall with the door in it: glass each side of the door, a row
   of lights over them. Its north wall stands 0.44 m back from the room's.
   THE DESK'S WALL, on the left as one comes in, starts IN the bay: it runs 4.96 m from a white-cased end 0.6 m short
   of the door wall to the room's south-west corner, where the office's door is. Past its end, by the door, a shallow
   nook with a shelf. All three doors are 7 ft ones (2.13 m).
   In the west wall, by the window wall, A BACK DOOR to the ground-floor walkway — his word, 24 Nov 2026: "nó còn có
   cửa sau thông ra hành lang đi lại phía sau"; the hotel's pictures have it from inside (half glazed, EXIT over it)
   and from outside (on the block's return wall, beside the pier).
   THE BREAKFAST stood right by the way in, on the right — his word again: "vào phát nhìn bên phải là thấy đồ ăn, chứ
   ko phải ở góc xa" — so it stands against the window wall where that wall begins, two steps from the door. (Today a
   long coffee counter runs under the whole window.) What was on it IS in a photograph of his: 19 Aug 2015, 07:10, on
   the table in his room, coffee in the hotel's paper cup, a packet of instant oatmeal, a wrapped muffin, a red apple.
   He checked in here on the evening of 17 Aug 2015 and out at 22:52 on 25 Sept (the folio's own print time).
   (Drawn wrongly twice on 24 Nov before this: first 7.65 m long through the last studio's ground floor, then 4.85 m
   long to a "cased opening" with the block stretched a metre to hold it. What was wrong the second time: the opening
   was put where the desk's wall ends; it is a beam 0.9 m short of that, under the block's own end wall.) */
export const LOBBY = {
  porch: { x1: 32.55, z0: -45.66, z1: -40.7, eave: 3.8, pier: [0.4, 0.55], cap: [1.65, 2.08], arch: [2.15, 2.6], side: [0.69, 2.7] },   // x1: the columns' outer face; z0: the bay's north wall; pier: along x, along z; side: the arch in the north side, its width and its crown
  tower: { x0: 29.4, x1: 33.0, z0: -40.7, z1: -37.1, eave: 9.0, cap: [4.5, 5.0] },
  room: { w: 2.88, h: 2.55 },                          // from the north wall to the wall the desk is in; the ceiling. (Its length: to the beam, 4.03 m)
  beam: { t: 0.2, stub: 0.44, under: 2.28 },           // the block's end wall at the ground: its thickness, the stub left at the north, the beam's underside
  bay: { d: 1.35, n: 0.44, s: 3.25, wall: 0.18, h: 2.75 },    // the entry bay: from the beam to the door wall; its north wall and the nook's back (metres south of the room's north wall); the door wall; its ceiling
  entry: { door: [1.30, 2.215], side: 0.41, post: 0.14, h: 2.13, transom: [2.36, 2.645] },      // the door (metres south of the north wall), the glass each side, the lights over them
  back: { z: [0.25, 1.165], h: 2.13 },                 // the back door in the west wall, metres south of the north wall
  win: { x: [1.0, 2.83], sill: 0.64, head: 2.13 },     // the window to Mariposa, metres east of the west wall; above the floor. The one over it is the same
  /* the desk's wall, metres east of the west wall: the office's door, the opening, the low stretch of it where one
     signs, its cased east end; heights above the floor; the dropped ceiling over it — its underside, how far it
     stands out over the guest, and how far out it still is where it meets the beam (east of the beam it runs
     slantwise back to the wall's end) */
  desk: { wall: 0.14, door: [0.07, 0.985], doorH: 2.13, open: [1.16, 4.86], low: [1.85, 2.82], end: 4.96, sill: 0.875, ledge: 1.23, lowTop: 0.91, head: 2.28, drop: 0.8, clip: 0.43 },
  office: 2.03,                                        // its depth behind the desk's wall
  breakfast: { x: [2.5, 3.95], depth: 0.5, h: 0.92 },  // 2015: by the way in, on the right (metres east of the west wall)
  ac: [0.14, 1.07],                                    // the air-conditioner in the bay's north wall: from the block's face, its width
  yard: [31.1, -35.1, 32.7, -30.3],
};
LOBBY.east = WINGS.main.x1 - 0.3;                    // the block's end wall, outer face (the beam's)
{ const R = LOBBY.room, w = WINGS.main;
  R.x0 = w.start + w.n * MOD + 0.225; R.x1 = LOBBY.east - LOBBY.beam.t; R.z0 = w.z0 + 0.55; R.zp = R.z0 + R.w;      // x1: the beam's face to the room
  LOBBY.doorX = LOBBY.east + LOBBY.bay.d + LOBBY.bay.wall;                                    // the door wall's outer face
  LOBBY.door = [R.z0 + LOBBY.entry.door[0], R.z0 + LOBBY.entry.door[1]]; }                   // the door in the place's own z

/* THE LOT, measured on the satellite picture and then moved 1.2 m east and 1.2 m south into the frame of the County's
   footprints: the picture and the footprints do not lie on each other. Two checks give that shift — the wings' roofs
   on the picture against their outlines, and the photograph of 17/8, whose fitted camera puts the stalls' kerb 1.8 m
   from the walkway, as the picture does (EVIDENCE.md has the table). Good to about half a metre.
   West of the north and south wings, going out from the walkway: 1.85 m of planting, a row of stalls nose-in to it,
   the drive, a row nose-in to the fence's strip, the strip and its trees, the white fence. East of them: planting, a
   row of stalls, the drive, trees on the boundary. North of the main wing: planting, a row of stalls, the aisle, a
   hedge and a lawn, Mariposa's sidewalk. South of it: planting, a row of stalls, the aisle.
   THE WAY IN is at the north-east corner, off Mariposa: a two-lane drive between the island that carries the sign and
   the trees on the boundary. It runs south past the lobby's forecourt (a kerb round the wing's north-east corner) and
   on down the east side; the aisle north of the main wing leaves it to the west. */
export const LOT = {
  stall: 2.7,
  westKerb: 10.7, westTail: 5.4, fenceTail: -3.1, fenceKerb: -8.5, fence: -11.6,           // x, west of the two wings
  eastKerb: 32.25, eastTail: 37.55, eastEdge: 43.5,                                        // x, east of them
  northKerb: -47.6, northTail: -53.0, northEdge: -59.5, walk: -66.6,                       // z, north of the main wing; the sidewalk's back edge (the street's own frame)
  southKerb: -24.9, southTail: -19.6, southEdge: -13.0,                                    // z, south of it
  westDrive: [-30.3, -27.0],                                                               // x, round the main wing's west end
  drive: [28.5, 37.5],                                                                     // x, the way in from Mariposa
  island: [15.5, -66.4, 28.5, -60.0], sign: [23.9, -63.7],                                 // the sign's island (x0, z0, x1, z1) and the sign
  court: { x0: 17.8, z0: -53.4, cx: 29.2, cz: -45.3, r: 8.1, x1: 37.3 },                   // the forecourt's kerb: straight, a quarter round, straight
  trees: { west: [[20.0, 23.4], [86.1, 89.4]], east: [[18.8, 23.4], [86.2, 89.5]], north: [0.6, 4.6], south: [-1.1, 4.7], fence: [51.8, 66.8] },   // the islands with a tree, along their rows (fence: where that row breaks for the way through)
  driveLine: 32.6,                                                                         // x, the white line between the drive's two lanes: in on its west, out on its east (satellite picture)
  gate: [54.6, 63.6],                                                                      // z, the way through the fence to the shops' lot, level with Ralphs' front (satellite picture, ± 1 m)
  bed: [-40.0, -7.3, -3.0],                                                                // the planted bed that shuts the lot's north-west corner: its west edge x; its kerb z and its far side z (satellite picture)
};

/* HIS STUDIO: the north wing, upper floor, west face, the tenth studio from the wing's north end (module 9, counting
   from 0), with the south-west stair tower beside it. Three photographs fix that:
   · the walkway looking north on 22/9 (09:47:46), taken a step south of his own door, which is at the right edge: his
     door and the next are a pair with a lamp between them, then that studio's window, a fire-extinguisher cabinet,
     doors on to the wall with a door that ends the walkway — nine studios' length away by that door's size in the
     picture; and nothing of the stair tower in the left of the frame, so its wall stood level with the camera or behind;
   · the wing from the lot at dusk on 17/8, its camera fitted to the doors and windows: window, door, lamp, door, window
     — and the tower's north wall coming to the walkway at the last window, 0.6 m (± 0.4) past his door;
   · both put the gabled bay half-way between the two towers, where the satellite picture has its roof, and the plain
     columns in equal bays of about 4.9 m.
   So the row of studios starts at z = −0.2 and the tower's north wall crosses the walkway at his window. (The first
   build had the rooms 1.7 m further north, clear of the tower; the photograph of 17/8 was not fitted then.)
   The photograph toward Ralphs of 09:47:21 was taken from the railing a few steps north of his door (the tower's
   shadow lies in its lower left corner, the tower itself out of frame); the one of 09:48:14 in the drive, looking north
   past the island with the tree and the two handicap stalls to the north-west tower. */
/* The room's number is 271: the hotel's folio (scanned with his receipts on 29 Sept 2015; "Room: 271, Arrival 8/17/2015,
   Departure 9/26/2015"). No photograph shows a number on a door, so which door carries it rests on the photographs
   above, not on the number; the two agree if this face is numbered 262–273 from its north end (EVIDENCE.md). */
export const HIS = { wing: 'north', module: 9, room: 271 };
const w = WINGS.north;
export const ROOM = {
  x0: w.x0 + FRONT + WALL,                           // the inner face of the front wall (west)
  z0: w.start + HIS.module * MOD + 0.11,             // the north party wall's inner face
  d: 6.45, w: 3.63,                                  // east–west, north–south: measured off the photographs (see below)
  y: G2,
};
ROOM.x1 = ROOM.x0 + ROOM.d;                          // (the spine's plumbing wall takes the 0.4 m beyond it)
ROOM.z1 = ROOM.z0 + ROOM.w;
/* INSIDE THE STUDIO. u runs east from the front wall, v south from the north wall, heights from the floor; metres.
   Every number below was measured off the photographs with a fitted camera for each (four Canon pictures of 21/9/2015
   19:15: from the door looking east, the bed from the counter, and two of the north wall; the iPhone picture of 18/9
   from the west; the walkway of 22/9 for the door and window). The scale comes from the things that have a standard
   size: counter tops at 36 in (0.914), the bathroom door at 80 in (2.03); the ceiling then comes out at 2.39, the room
   at 3.63 wall to wall and about 6.45 deep. Positions along the north wall are good to a few centimetres; depths
   toward the kitchen to about 0.1 m. The bed's side of the room is seen in two pictures (from the door, and from the
   chair at the counter): the second camera was fitted together with the bed, its runner and the headboard so that
   both agree, and the lamp shade they both show then meets within 2 cm. EVIDENCE.md has the table.

        west (walkway)                                                                              east
        ┌─ closet ──┬┬── dresser+TV ──┬ mirror ┬─ counter ─┬ panel ┬──────── fridge ┐  v = 0  (north wall)
        │ (rail)    ││ lamp   LG 32"  │        │ ▓cupboard │       │        ┌───────┤
     ── door ──     └┘                   chair →  laptop║  ← chair          │ sink  │
        │                                      └────────╨──┘                │ hob   │
        │                                                           door ╲  └───────┤  v = 2.0
     ══ window ══        ┌──────────────┐                 ┌──────────────────╲──────┤
        │  (curtains)    │  bed (full)  │                 │ print │    bathroom      │
        │   recliner     │  head south  │ night-          │       │                  │
        └────────────────┴──[headboard]─┴─stand───────────┴───────┴──────────────────┘  v = 3.63 (green wall)  */
const D = ROOM.d;
export const IN = {
  door: [0.82, 1.73], doorH: 2.03,                   // v along the front wall; hinged at its north jamb, opens in
  win: [2.15, 3.31], sill: 0.66, head: 2.20,
  louvre: [2.2, 2.5],                                // outside, low on the wall under the window's end nearer the door
  closet: { u1: 1.54, wing: [1.54, 1.65], v1: 0.80 },                    // the open closet in the corner, its wing wall
  dresser: { u0: 1.785, u1: 3.235, d: 0.56, h: 0.752, rail: 0.777 },     // two drawers wide, two high, knotty pine
  tvLamp: { u: 1.91, v: 0.36 }, tv: { u0: 2.435, u1: 3.23, v: 0.46, y0: 0.805, y1: 1.33 },
  mirror: { u0: 3.276, u1: 3.928, y0: 0.92, y1: 1.872, crown: 1.985 },
  alarm: { u: 3.765, y: 2.0 }, jack: { u: 4.013, y: 1.0 },
  /* the counter he worked at: a white top out from the north wall, round at its free corners; a cupboard under its
     wall end, and from the cupboard's east side a white panel raked back to the floor */
  counter: { u0: 3.975, u1: 4.845, v1: 1.155, h: 0.914, t: 0.037, r: 0.16 },
  cab: { u0: 3.995, u1: 4.435, v1: 0.52 }, leg: { u0: 4.435, u1: 4.455, foot: 0.68, top: 1.11 },      // a panel raked 2 : 1
  apron: { u0: 4.231, u1: 4.659, v0: 1.11, v1: 1.13, y0: 0.759 },      // a board across the leg's head, its ends cut in an ogee
  laptop: { u: 4.105, v: 0.79, ry: 91 },                               // square with the west edge, its screen to the chair
  chairs: [{ u: 4.12, v: 0.87, face: 88, jacket: true }, { u: 4.70, v: 0.95, face: 270 }],    // pushed in from either side
  wallLamp: { u: 4.436, y: 1.31, du: 0.034, out: 0.27, su: 4.47, sv: 0.27 },      // its plate, and where its shade hangs
  outlet: { u: 4.563, y: 1.007 }, panel: { u0: 5.05, u1: 5.42, y0: 1.295, y1: 1.805 }, thermostat: { u: 5.535, y: 1.63 },
  vinyl: 4.445,                                      // carpet west of this line, wood-look vinyl east of it
  kitchen: { v0: 0.62, v1: 1.95, front: D - 0.60, top: D - 0.635, upper: D - 0.32, y0: 1.675, y1: 2.085,
    sink: [0.67, 0.99], faucet: 0.84, hob: [1.36, 1.94], split: 1.41, mw: { v0: 0.60, v1: 1.19, y0: 1.385, y1: 1.63, front: D - 0.36 }, hood: { v0: 1.20, v1: 1.94, y0: 1.49, y1: 1.62, front: D - 0.48 },
    doors: [0.60, 0.897, 1.195, 1.57, 1.95], outlet: { v: 1.24, y: 1.09 } },
  fridge: { v0: 0.03, v1: 0.63, front: D - 0.70, h: 1.548, split: 1.07 },
  /* the box's west and north faces; its door is hinged at the east jamb and opens out. 0272 puts that jamb at 5.78 ± 0.06
     (by its height in the picture); it is drawn 9 cm west of that, where it clears the tub he remembers across the far
     end — a 30-inch tub and the door cannot both stand where the picture alone would put them */
  bath: { u0: 3.96, v0: 2.0 }, bathDoor: [4.925, 5.685],
  bathSwitch: { u: 4.135, y: 1.18 }, detector: { u: 4.765, y: 2.25 },
  /* INSIDE THE BATHROOM. None of his photographs shows it. WHERE things stand is as he remembers it (the first build, which
     he found right): the tub across the far end against the back wall, the pan on the party wall facing the door with
     the towel shelf over it, the basin against the print's wall in the far right corner. The HEIGHTS and sizes come off a
     traveller's photograph of 2026 of a bathroom in this building, by its rows of six-inch tiles (EVIDENCE.md, "The
     bathroom's inside"). tub: its width · rim: over the floor · pan: u of its middle · paper: on the party wall ·
     vanity.v0: its free end; from there it runs to the party wall */
  bathIn: {
    wall: '#b48a42', tub: 0.76, rim: 0.31, tile: { top: 1.86, size: 0.152 }, valve: 0.78, spout: 0.42, rose: 1.98, rod: 2.03,
    pan: 5.25, shelf: { w: 0.49, y: 1.70 }, paper: { u: 4.84, y: 0.6 },
    vanity: { v0: 2.6, depth: 0.57, h: 0.83 },
  },
  print: { v0: 2.27, v1: 2.97, y0: 0.93, y1: 1.94 },                 // on the box's west face
  /* a full (double) bed, its head to the south wall: the mattress; its covers stand 3 cm proud of it all round. The
     runner's two edges across the bed, and how wide its dark borders are */
  bed: { u0: 1.80, u1: 3.19, v0: 1.58, v1: 3.57, top: 0.63, runner: [1.66, 2.345], border: 0.051 },
  headboard: { u0: 1.77, u1: 3.295, top: 1.556, panel: [0.79, 1.458], pw: 0.622 },                  // 6 cm thick, two tan panels 9 cm apart
  stand: { u0: 3.34, u1: 3.88, v0: 3.135, h: 0.63 },
  bedLamps: [{ u: 3.46, du: 0.07, out: 0.26 }, { u: 1.60, du: -0.13, out: 0.23 }], bedLampY: 1.065,     // their plates 17 cm clear of the headboard's ends; arms swung away from the bed
  recliner: { u: 0.85, v: 2.94, ry: 32 },            // in the south-west corner, turned toward the TV
  curtainEnd: 3.41,                                  // where the curtains stop short of the green wall
  ceiling: { supply: [3.375, 1.83], ret: [4.69, 0.55], tube: [D - 0.98, 1.02], sprinkler: [4.485, 1.87] },
};

/* VIEWS: the rooms list. Poses [x, y, z, heading, pitch]. Heading: degrees clockwise from north. `phong`, `hanh-lang`,
   `lan-can`, `chan-cau-thang` and `bai-xe` stand where the camera stood for a photograph; `ban`, `tu-guong` and `giuong` a step from where it did
   (he took those three sitting on the bed and on the chair at the counter, where a walker cannot stand). `nha-tam`
   stands inside the bathroom, to the right of its door, and looks across to the pan and the tub. */
const R = (u, v) => [ROOM.x0 + u, ROOM.z0 + v];
const at = (u, v, y, h, p) => { const [x, z] = R(u, v); return [x, G2 + y, z, h, p]; };
export const ROOMPT = R;
const doorZ = ROOM.z0 + (IN.door[0] + IN.door[1]) / 2;
/* the stair tower next to his studio (the south-west one of the north wing's west face): its middle along the wing */
export const STAIR = { z: (w.towers[1].a0 + w.towers[1].a1) / 2 };
export const VIEWS = {
  'phong': { name: 'Phòng 271 (từ cửa nhìn vào)', pose: at(0.5, 1.44, 1.47, 97, -7.5) },
  'ban': { name: 'Bàn làm việc', pose: at(1.1, 1.6, 1.49, 79, -5) },
  'tu-guong': { name: 'Tủ, tivi, gương', pose: at(3.62, 2.72, 1.38, 345, -5) },
  'giuong': { name: 'Giường', pose: at(3.6, 0.62, 1.36, 212, -13.5) },
  'bep': { name: 'Bếp nhỏ', pose: at(4.2, 1.62, 1.5, 62, -9) },
  'nha-tam': { name: 'Nhà tắm', pose: at(4.5, 2.34, 1.5, 112, -20) },
  'cua': { name: 'Cửa phòng', pose: at(2.5, 1.3, 1.5, 266, -3) },
  'hanh-lang': { name: 'Hành lang tầng 2', pose: [ROOM.x0 - WALL - 0.86, G2 + 1.5, doorZ + 1.57, 353, -3.5] },   // where the photograph of 09:47:46 was taken
  'lan-can': { name: 'Lan can nhìn sang Ralphs', pose: [13.05, G2 + 1.52, doorZ - 5.8, 248, -5] },               // and that of 09:47:21, a few steps north
  'cau-thang': { name: 'Cầu thang', pose: [12.95, G2 + 1.52, STAIR.z + 0.75, 262, -30] },                          // at the head of the flight down
  'chan-cau-thang': { name: 'Chân cầu thang', pose: [-1.88, 1.6, 22.6, 130, 6] },                                 // where the photograph of 17/8 was taken, in the lot
  'bai-xe': { name: 'Bãi xe trong khách sạn', pose: [1.2, 1.52, 30.6, 6, 2] },          // about where the photograph of 09:48:14 was taken
  'le-tan': { name: 'Lễ tân', pose: [41.0, 1.6, -44.3, 268, 10] },
  'bua-sang': { name: 'Đồ ăn sáng ở lễ tân', pose: [30.95, G1 + 1.5, -44.25, 303, -17] },          // inside, just past the door: the table on the right, beyond the beam
  'cua-sau': { name: 'Cửa sau lễ tân (hành lang tầng trệt)', pose: [22.95, G1 + 1.52, -45.3, 92, -2] },      // on the ground-floor walkway, facing the block's west wall
  'loi-xe-vao': { name: 'Lối xe vào (Mariposa)', pose: [40.2, 1.6, -67.35, 240, 3] },          // on Mariposa's sidewalk, east of the drive
  'starbucks': { name: 'Starbucks', pose: [-58.0, 1.52, -6.0, 262, 0] },
  'ralphs': { name: 'Ralphs', pose: [-43.0, 1.52, 33.0, 204, 7] },
  'sepulveda': { name: 'Đại lộ Sepulveda', pose: [-96.2, 1.52, -40.0, 200, 0] },
  'mariposa': { name: 'Đường Mariposa, hàng si', pose: [250.0, 1.52, -66.6, 92, 0] },
  'green-line': { name: 'Dưới đường ray Green Line', pose: [690.6, 1.52, -112.0, 356, 12] },
};

/* For the plan on the list of places: the studio and the hotel's three wings (rectangles, metres). */
export const PLAN = [
  { x0: WINGS.main.x0, z0: WINGS.main.z0, x1: WINGS.main.x1, z1: WINGS.main.z1 },
  { x0: w.x0, z0: w.z0, x1: w.x1, z1: w.z1 },
  { x0: WINGS.south.x0, z0: WINGS.south.z0, x1: WINGS.south.x1, z1: WINGS.south.z1 },
  { x0: ROOM.x0, z0: ROOM.z0, x1: ROOM.x1, z1: ROOM.z1 },
];

/* ── where one stands: the ground, the walkways, the stairs, his studio ────────────────────────────────────────── */
const SURF = [];
/** a flat floor (x0…x1, z0…z1) at height y */
export const flat = (x0, z0, x1, z1, y) => SURF.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y });
/** a flight of stairs as a ramp: rising from y0 at (a0) to y1 at (a1) along x or z */
export const ramp = (x0, z0, x1, z1, axis, a0, a1, y0, y1) => SURF.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), f: (x, z) => { const a = axis === 'x' ? x : z, t = Math.min(1, Math.max(0, (a - a0) / (a1 - a0))); return y0 + (y1 - y0) * t; } });
/** what the walker stands on at (x, z) with its feet at y now: the highest floor there that is at most half a metre up */
export function floorAt(x, z, y) {
  let best = 0;
  for (const s of SURF) {
    if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
    const h = s.f ? s.f(x, z) : s.y;
    if (h <= y + 0.5 && h > best) best = h;
  }
  return best;
}
export const surfaces = () => SURF;
