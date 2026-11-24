/* The plan of the place: the Extended Stay America at 1910 E Mariposa Ave, El Segundo, California, in August and
   September 2015 (the six weeks of the onsite at DirecTV), and the streets around it. Metres; x runs east, z runs
   south, y up; the origin is 33.92290 N, 118.39500 W, the frame of the OpenStreetMap data in osm.js. Ground at y = 0.
   EVIDENCE.md says which photograph each part rests on and what is guessed.

               E Mariposa Ave (6 lanes) ─────────────────────────────────────────────────────────▶ Nash St, the Green Line
     Sepulveda    ┌ pad ┐   ╔══════════ MAIN WING (lobby at its east end) ══════════╗
     Blvd (PCH)   └─────┘   ╚═══════════════════════════════════════════════════════╝
     8 lanes      ┌ Starbucks/Jersey Mike's ┐        ║ NORTH ║   14 rooms a side, two floors, walkways on both faces
                  └─────────────────────────┘  lot   ║ WING  ║◀── his room: upper floor, west face, just north of the south-west stairs
                       Ralphs' parking lot   fence   ║       ║
                  ┌──── RALPHS (1997) ────┐          ║ SOUTH ║
                  └───────────────────────┘          ║ WING  ║

   THE THREE WINGS. Each is a long two-storey block of studios back to back, with an open walkway along each long face
   on both floors (the photographs of 22/9/2015 and 17/8/2015); 150 rooms in all. The roof outlines are LA County's
   footprints (osm.js keeps them out: they are built here). A wing's section, from a roof edge inward: 0.45 to the line
   of the terracotta columns and the white railing, a walkway to 2.0, the front wall (0.18), the studio (6.45 deep),
   the spine and its plumbing. Floor to floor 2.9; upper walkway 3.05; eaves 5.95; a hip roof of clay tile at 4 in 12. */

export const G1 = 0.15;          // the ground-floor walkway and rooms: a curb above the parking
export const G2 = 3.05;          // the upper walkway and the upper rooms
export const CEIL = 2.39;        // a studio's ceiling over its floor (7'10": the four photographs of 21/9/2015)
export const EAVE = 5.95;
export const PITCH = 1 / 3;
export const COL = 0.45;         // from a roof edge to the line of columns and railing
export const FRONT = 2.0;        // from a roof edge to the front wall
export const WALL = 0.18;        // front wall
export const MOD = 3.85;         // one studio (3.63 wall to wall) and one party wall, along a wing

/* A wing: its roof outline as a rectangle (x0…x1, z0…z1), which way it runs, where its studios start and how many
   there are on each face, and the stair towers (as the County drew them, in the map's own x or z) and small end bays.
   `hands`: for each studio of a face, N if its door is at the end nearer the wing's start (north or west), S if at
   the other; left out, studios alternate S N S N. */
export const WINGS = {
  north: { axis: 'z', x0: 12.3, x1: 30.4, z0: -4.1, z1: 52.6, start: -1.9, n: 14, hands: { A: 'NSNSNSNSSNSNSN' },
    towers: [{ side: 'A', a0: 2.2, a1: 6.9, stair: true }, { side: 'A', a0: 36.6, a1: 41.4, stair: true }, { side: 'B', a0: 1.3, a1: 6.0 }, { side: 'B', a0: 36.8, a1: 40.9 }],
    boxes: { A: [8] },
    bumps: [[18.1, -6.4, 24.1, -4.1]] },
  south: { axis: 'z', x0: 12.3, x1: 30.4, z0: 57.3, z1: 115.8, start: 57.675, n: 15,
    towers: [{ side: 'A', a0: 62.6, a1: 66.9, stair: true }, { side: 'A', a0: 104.4, a1: 109.0, stair: true }, { side: 'B', a0: 64.0, a1: 68.8 }, { side: 'B', a0: 106.1, a1: 110.7 }],
    bumps: [[18.5, 55.6, 24.2, 57.3], [18.8, 115.8, 24.4, 117.6]] },
  main: { axis: 'x', x0: -24.6, x1: 25.5, z0: -46.5, z1: -26.7, start: -24.575, n: 13,
    towers: [{ side: 'A', a0: -19.6, a1: -15.3 }, { side: 'A', a0: 18.0, a1: 22.5 }, { side: 'B', a0: -18.5, a1: -14.3, stair: true }, { side: 'B', a0: 21.0, a1: 25.7, stair: true }],
    lobby: [25.5, -46.6, 31.8, -27.7], bumps: [[-26.7, -39.1, -24.6, -33.4]] },
};
/** is studio k's door at the end nearer the wing's start? */
export const doorAtStart = (key, side, k) => { const h = WINGS[key].hands?.[side]; return h ? h[k] === 'N' : k % 2 === 1; };
/* Side A of a north–south wing is its west face; of the main wing, its north face (Mariposa). A tower stands outside
   the walkway, 3.9 m deep; `stair` ones hold the stairs up. */
export const TOWER_D = 3.9;

/* HIS STUDIO: the north wing, upper floor, west face, the first studio north of the south-west stair tower (module 9,
   counting from 0). The photographs of 22/9/2015, taken one after the other on the way to work, say so: from the
   railing in front of the door to Ralphs (09:47:21); then the walkway looking north, taken two steps south of his own
   door, which is at the right edge (09:47:46: his door and the next are a pair with a lamp between them, then that
   studio's window, a fire-extinguisher cabinet on the wall, and the next door a module further on); and 28 seconds
   later the drive 16 m south of the north-west tower (09:48:14) — down the south-west stairs and north through the
   lot. The iPhone picture of 17/8, taken from the lot to the north-west, shows the same stretch running into the stair
   tower: window, door, lamp, door, window, cabinet, door. */
export const HIS = { wing: 'north', module: 9 };
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

/* VIEWS: the rooms list. Poses [x, y, z, heading, pitch]. Heading: degrees clockwise from north. `phong`, `hanh-lang`
   and `bai-xe` stand where the camera stood for a photograph; `ban`, `tu-guong` and `giuong` a step from where it did
   (he took those three sitting on the bed and on the chair at the counter, where a walker cannot stand). `nha-tam`
   stands inside the bathroom, to the right of its door, and looks across to the pan and the tub. */
const R = (u, v) => [ROOM.x0 + u, ROOM.z0 + v];
const at = (u, v, y, h, p) => { const [x, z] = R(u, v); return [x, G2 + y, z, h, p]; };
export const ROOMPT = R;
const doorZ = ROOM.z0 + (IN.door[0] + IN.door[1]) / 2;
export const VIEWS = {
  'phong': { name: 'Phòng (từ cửa nhìn vào)', pose: at(0.5, 1.44, 1.47, 97, -7.5) },
  'ban': { name: 'Bàn làm việc', pose: at(1.1, 1.6, 1.49, 79, -5) },
  'tu-guong': { name: 'Tủ, tivi, gương', pose: at(3.62, 2.72, 1.38, 345, -5) },
  'giuong': { name: 'Giường', pose: at(3.6, 0.62, 1.36, 212, -13.5) },
  'bep': { name: 'Bếp nhỏ', pose: at(4.2, 1.62, 1.5, 62, -9) },
  'nha-tam': { name: 'Nhà tắm', pose: at(4.5, 2.34, 1.5, 112, -20) },
  'cua': { name: 'Cửa phòng', pose: at(2.5, 1.3, 1.5, 266, -3) },
  'hanh-lang': { name: 'Hành lang tầng 2', pose: [ROOM.x0 - WALL - 0.86, G2 + 1.5, doorZ + 1.95, 353, -3.5] },   // where the photograph of 09:47:46 was taken
  'lan-can': { name: 'Lan can nhìn sang Ralphs', pose: [13.05, G2 + 1.52, doorZ, 248, -5] },
  'cau-thang': { name: 'Cầu thang', pose: [12.5, G2 + 1.52, 38.8, 268, -24] },
  'bai-xe': { name: 'Bãi xe trong khách sạn', pose: [3.7, 1.52, 22.2, 2, 2] },          // where the photograph of 09:48:14 was taken
  'cong': { name: 'Cổng trên Mariposa', pose: [-23.0, 1.52, -67.5, 128, 2] },
  'starbucks': { name: 'Starbucks', pose: [-58.0, 1.52, -6.0, 262, 0] },
  'ralphs': { name: 'Ralphs', pose: [-43.0, 1.52, 33.0, 204, 7] },
  'sepulveda': { name: 'Đại lộ Sepulveda', pose: [-97.5, 1.52, -40.0, 200, 0] },
  'mariposa': { name: 'Đường Mariposa, hàng si', pose: [250.0, 1.52, -64.0, 92, 0] },
  'green-line': { name: 'Dưới đường ray Green Line', pose: [691.2, 1.52, -112.0, 356, 12] },
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
