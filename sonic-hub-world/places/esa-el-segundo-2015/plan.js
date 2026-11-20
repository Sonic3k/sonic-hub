/* The plan of the place: the Extended Stay America at 1910 E Mariposa Ave, El Segundo, California, in August and
   September 2015 (the six weeks of the onsite at DirecTV), and the streets around it. Metres; x runs east, z runs
   south, y up; the origin is 33.92290 N, 118.39500 W, the frame of the OpenStreetMap data in osm.js. Ground at y = 0.
   EVIDENCE.md says which photograph each part rests on and what is guessed.

               E Mariposa Ave (6 lanes) ─────────────────────────────────────────────────────────▶ Nash St, the Green Line
     Sepulveda    ┌ pad ┐   ╔══════════ MAIN WING (lobby at its east end) ══════════╗
     Blvd (PCH)   └─────┘   ╚═══════════════════════════════════════════════════════╝
     8 lanes      ┌ Starbucks/Jersey Mike's ┐        ║ NORTH ║   12 rooms a side, two floors, walkways on both faces
                  └─────────────────────────┘  lot   ║ WING  ║◀── his room: upper floor, west face, 6th from the north end
                       Ralphs' parking lot   fence   ║       ║
                  ┌──── RALPHS (1997) ────┐          ║ SOUTH ║
                  └───────────────────────┘          ║ WING  ║

   THE THREE WINGS. Each is a long two-storey block of studios back to back, with an open walkway along each long face
   on both floors (the photographs of 22/9/2015 and 17/8/2015); 150 rooms in all. The roof outlines are LA County's
   footprints (osm.js keeps them out: they are built here). A wing's section, from a roof edge inward: 0.45 to the line
   of the terracotta columns and the white railing, a walkway to 2.0, the front wall (0.18), the studio (6.8 deep),
   half the spine wall. Floor to floor 2.9; upper walkway 3.05; eaves 5.95; a hip roof of clay tile at 4 in 12. */

export const G1 = 0.15;          // the ground-floor walkway and rooms: a curb above the parking
export const G2 = 3.05;          // the upper walkway and the upper rooms
export const CEIL = 2.55;        // a studio's ceiling over its floor
export const EAVE = 5.95;
export const PITCH = 1 / 3;
export const COL = 0.45;         // from a roof edge to the line of columns and railing
export const FRONT = 2.0;        // from a roof edge to the front wall
export const WALL = 0.18;        // front wall
export const MOD = 4.25;         // one studio and one party wall, along a wing

/* A wing: its roof outline as a rectangle (x0…x1, z0…z1), which way it runs, where its studios start and how many
   there are on each face, and the stair towers (as the County drew them) and small end bays. */
export const WINGS = {
  north: { axis: 'z', x0: 12.3, x1: 30.4, z0: -4.1, z1: 52.6, start: -4.1, n: 12,
    towers: [{ side: 'A', a0: 2.2, a1: 6.9, stair: true }, { side: 'A', a0: 36.6, a1: 41.4, stair: true }, { side: 'B', a0: 1.3, a1: 6.0 }, { side: 'B', a0: 36.8, a1: 40.9 }],
    bumps: [[18.1, -6.4, 24.1, -4.1]] },
  south: { axis: 'z', x0: 12.3, x1: 30.4, z0: 57.3, z1: 115.8, start: 57.3, n: 13,
    towers: [{ side: 'A', a0: 62.6, a1: 66.9, stair: true }, { side: 'A', a0: 104.4, a1: 109.0, stair: true }, { side: 'B', a0: 64.0, a1: 68.8 }, { side: 'B', a0: 106.1, a1: 110.7 }],
    bumps: [[18.5, 55.6, 24.2, 57.3], [18.8, 115.8, 24.4, 117.6]] },
  main: { axis: 'x', x0: -24.6, x1: 25.5, z0: -46.5, z1: -26.7, start: -24.6, n: 11,
    towers: [{ side: 'A', a0: -19.6, a1: -15.3 }, { side: 'A', a0: 18.0, a1: 22.5 }, { side: 'B', a0: -18.5, a1: -14.3, stair: true }, { side: 'B', a0: 21.0, a1: 25.7, stair: true }],
    lobby: [25.5, -46.6, 31.8, -27.7], bumps: [[-26.7, -39.1, -24.6, -33.4]] },
};
/* Side A of a north–south wing is its west face; of the main wing, its north face (Mariposa). A tower stands outside
   the walkway, 3.9 m deep; `stair` ones hold the stairs up (the photograph of 22/9 09:48 was taken by the south-west one
   of the north wing, a few seconds after coming down it). */
export const TOWER_D = 3.9;

/* HIS STUDIO: the north wing, upper floor, west face, the 6th studio from the north end (module 5, counting from 0).
   Read off three photographs of 22/9/2015 taken one after the other on the morning walk to work: the view from the
   railing over the parking to the gables of Ralphs (09:47:21; the two gables bear 234° and 241°, which puts the camera
   at z ≈ 20 on the west walkway), the walkway looking north (09:47:46, taken two doors further south, by the stairs)
   and the lot at the foot of those stairs (09:48:14). His door is the north one of a pair. */
export const HIS = { wing: 'north', module: 5 };
const w = WINGS.north;
export const ROOM = {
  x0: w.x0 + FRONT + WALL,                           // the inner face of the front wall (west)
  x1: (w.x0 + w.x1) / 2 - 0.075,                     // the spine wall
  z0: w.start + HIS.module * MOD + 0.075,            // the north party wall's inner face
  z1: w.start + (HIS.module + 1) * MOD - 0.075,
  y: G2,
};
ROOM.d = ROOM.x1 - ROOM.x0;                          // 6.8 deep (east–west)
ROOM.w = ROOM.z1 - ROOM.z0;                          // 4.1 wide (north–south)
/* Inside the studio, u runs east from the front wall, v south from the north wall (both from 0). The photographs of
   21/9/2015 19:15 (bed, dresser and TV, the kitchen seen past the bed) and the iPhone ones of August–September give it:
   the door on the north part of the front wall and the window on its south part (seen from inside facing west: window
   left, door right, dresser along the right wall); the bed's head on the south wall, painted green; the bathroom in the
   south-east corner as a box whose west face carries the framed red doorway, its door on its north face; the
   kitchenette in the north-east corner, against the back wall; a short counter with two high chairs off the north wall. */
export const IN = {
  door: [0.8, 1.7], doorH: 2.03,                     // v along the front wall; hinged at its north jamb, opens in
  win: [2.3, 3.85], sill: 0.85, head: 2.15,
  bath: { u0: 4.15, v0: 2.2 },                       // the bathroom box: u 4.05…d, v 2.2…w (its outer faces)
  bathDoor: [4.27, 5.02],                            // on the box's north face, hinged at the west
  dresser: [0.2, 1.66], dresserD: 0.48, dresserH: 0.77,
  mirror: [1.8, 2.38],
  counter: { u0: 2.3, u1: 4.0, v0: 0.62, v1: 1.18, h: 0.92 },   // a bar along the north wall, deeper at its east end
  bed: { u0: 2.02, w: 1.52, l: 2.03 },               // a queen; head against the south wall
  stand: [3.6, 4.1],
  fridge: [0.0, 0.62], kitchen: 2.2,                 // the kitchen alcove runs v 0…2.2
};
/** the counter's front edge: v at u (it swells toward the kitchen) */
export const counterEdge = u => { const c = IN.counter, t = Math.min(1, Math.max(0, (u - c.u0) / (c.u1 - c.u0))); return c.v0 + (c.v1 - c.v0) * t * t; };

/* VIEWS: the rooms list. Poses [x, y, z, heading, pitch]. Heading: degrees clockwise from north. */
const R = (u, v) => [ROOM.x0 + u, ROOM.z0 + v];
const at = (u, v, y, h, p) => { const [x, z] = R(u, v); return [x, G2 + y, z, h, p]; };
export const ROOMPT = R;
export const VIEWS = {
  'phong': { name: 'Phòng (nhìn vào bếp)', pose: at(0.3, 2.0, 1.5, 88, -8) },
  'giuong': { name: 'Giường', pose: at(2.75, 0.75, 1.5, 178, -10) },
  'bep': { name: 'Bếp nhỏ', pose: at(3.4, 1.55, 1.52, 72, -10) },
  'ban': { name: 'Bàn, gương, tủ', pose: at(1.6, 1.9, 1.45, 352, -6) },
  'cua': { name: 'Cửa phòng', pose: at(1.9, 1.35, 1.55, 268, -3) },
  'hanh-lang': { name: 'Hành lang tầng 2', pose: [13.25, G2 + 1.52, 29.2, 352, -2] },
  'lan-can': { name: 'Lan can nhìn sang Ralphs', pose: [13.0, G2 + 1.52, 19.4, 244, -6] },
  'cau-thang': { name: 'Cầu thang', pose: [12.5, G2 + 1.52, 38.8, 268, -24] },
  'bai-xe': { name: 'Bãi xe trong khách sạn', pose: [1.0, 1.52, 29.0, 4, 2] },
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
