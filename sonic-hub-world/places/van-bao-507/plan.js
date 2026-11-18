/* The plan of flat 507. Metres; x runs east, z runs south, y up; the origin is the inner north-west corner of the
   living room, on the floor. Read off the two walk-through videos of 9 June 2013 and the photographs of 2009–2013;
   EVIDENCE.md says which frame or photograph each part rests on, which sizes were measured and which are guessed.

          ▲ the gallery (hành lang) runs north from the front door, along the west face of the block: 506, 505 … the stairs
          │                          (north of here: flat 506)
        ┌─[main door]────────────────────┬────────────────────────────────┐
   west │ LIVING   sofa N · TV on the E  │ wardrobe   PARENTS         [door]  the balcony
   balc.│ wall · fish tank on the S wall ├──┐  bed N · desk SE     (wide  ║ in its cage,
        │ [tank] ▪     (plain wall)      │LOBBY D2                 window)║ over the street
        ├──────┬─────[ opening ]─────────┴─D1─┴────────────────────────────────┐
        │WASH- ·                    ┃ desk       ║ wardrobes  BIG ROOM: books  │
        │ING   ·     KITCHEN        ┃ (his       ║ (face E)   and piano (N),   │ wide
        ├[door]┤ table W            ┃  corner)   ║            his sister's     │ window
        │ BATH │      fridge, sink, ┃ bed        ║ study      bed and desk (S) │
        │ WC S │      hob on E wall ┃            ║ desk                        │
        └[win]─┴─────[double door]──┸━━━━━━[win]━╩━[win]━━━━━━━━━━━━━━━━━━━━━━━┘   ← one straight south face
               │ LOGGIA (barred; from the kitchen's     │
               └ west wall to beside his window) ───────┘

   THE DRAWING AND THE SURVEY. The flat was first drawn by eye, and the re-measuring of 18 November 2026 — with things
   of known size in the pictures: a 1.2 m fluorescent tube, the kitchen counter, half-metre floor tiles, the sofa —
   showed the drawing too generous in two ways: the north strip (living room, lobby, parents' room, the two balconies)
   is 2.8 m deep, not 3.5, and the ceiling is nearer 2.65 than 2.75. Rather than move a few thousand numbers, the
   drawing keeps its grid and SURVEY below says where each drawn height and each drawn z really is; the builder
   (engine/kit.js) puts everything through it. So:
     · x in this file is real;
     · z and y in this file, in shell.js and in the rooms south of the living room are ON THE DRAWING'S GRID
       (sz(), sy() give the real value; dz(), dy() go the other way, to write a measured size into the drawing);
     · the living room and the parents' room were set out again from the measurements and are written in real metres
       (rooms_a.js buildLiving, rooms_b.js buildParents: `b.real = true`).
   ROOMS at the end of this file is the flat in real metres, for the plan on its card and for anyone reading. */

/* ── the survey: drawn → real ── */
function rising(knots, back = true) {   // piecewise linear through [drawn, real] pairs; beyond the ends it only shifts
  const f = v => {
    const n = knots.length;
    if (v <= knots[0][0]) return v - knots[0][0] + knots[0][1];
    if (v >= knots[n - 1][0]) return v - knots[n - 1][0] + knots[n - 1][1];
    for (let i = 1; i < n; i++) if (v <= knots[i][0]) { const [a, A] = knots[i - 1], [b, B] = knots[i]; return A + (v - a) * (B - A) / (b - a); }
    return v;
  };
  if (back) f.inverse = rising(knots.map(([a, b]) => [b, a]), false);
  return f;
}
export const SURVEY = {
  /* heights: up to 1.5 m as drawn; above, the drawn ceiling of 2.75 is taken as 2.65. Two readings that do not quite
     agree: the photograph of 22/9/2012 puts the ceiling 1.14 m above the lens (tube lamp as ruler) and the lens at
     1.34–1.5 (skirting, the dispenser, the people standing) — 2.5 to 2.65; the video frame at 4:51, looking at the whole
     balcony wall, makes the ceiling as high as that wall is wide or a little less — 2.6 to 2.8 */
  y: rising([[1.5, 1.5], [2.75, 2.65]]),
  /* across the floor: the gallery (z < 0) as drawn; the north strip 0…3.5 is really 0…2.8; everything south of it
     keeps its size and stands 0.7 further north */
  z: rising([[0, 0], [3.5, 2.8]]),
  rigid: 1.0,          // outside a frame, a thing up to this long (in z) moves whole instead of being squeezed
};
export const sy = SURVEY.y, sz = SURVEY.z;                    // drawn → real
export const dy = SURVEY.y.inverse, dz = SURVEY.z.inverse;    // real → drawn
/** a drawn rectangle of floor as it really is */
export const real = r => ({ ...r, z0: sz(r.z0), z1: sz(r.z1) });

export const H = 2.75;       // floor to ceiling ON THE DRAWING; really CEILING (two readings, 2.5–2.65 and 2.6–2.8: see SURVEY)
export const CEILING = sy(H);   // 2.65
export const T = 0.22;       // outer wall thickness

/* rooms (inner faces) */
export const LIV = { x0: 0, x1: 5.25, z0: 0, z1: 3.5 };      // really 5.25 × 2.8 (width 2.77 by the tube lamp, 2.75 by the counter and the sofa)
/* The lobby: at the living room's south-east corner the east wall steps back, under a lowered ceiling (2.2 m), and
   the two bedroom doors open off that recess — the parents' straight ahead, the big room's on the right. Its depth:
   0.54 by the foot of the parents' door, about 0.7 by the big room's door frame, which fills its south side; 0.7 drawn.
   EAST is older history: the big room's builder (rooms_b.js buildBigRoom) is written in numbers 0.8 smaller than the
   real x, and works inside a frame moved that much east. */
export const EAST = 0.8;
export const LOBBY = { x0: LIV.x1, x1: LIV.x1 + 0.7, z0: 2.3, z1: 3.5, soffit: dy(2.23) };
export const NICHE = { x0: LIV.x1 + 0.12, x1: LOBBY.x1 + 0.12, z0: 0, z1: 2.18 };   // the parents' room runs on behind the TV wall: wardrobe and shelves stand here
export const PAR = { x0: LOBBY.x1 + 0.12, x1: 10.2, z0: 0, z1: 3.5 };                 // really 4.13 × 2.8; its east wall is a guess tied to the cage's depth
/* south of the living room's west half: the washing alcove behind the fish-tank wall (open to the kitchen on its east side
   as far as ALC_MOUTH), the bathroom south of it, and the kitchen; the loggia is outside the kitchen and runs on east.
   The kitchen is 2.75 wide (video 2:10: a fridge 0.75 deep stands against its west wall with its front 2.0 m from the
   east wall; the table, the chair and the walk past them say the same), which leaves the alcove and the bathroom 1.25 */
export const ALC = { x0: 0, x1: 1.25, z0: 3.62, z1: 5.6 };
export const ALC_MOUTH = 4.9;     // the kitchen's west wall (x 1.25…1.35) starts here and runs south: it hides the bathroom door from the table
export const WC = { x0: 0, x1: ALC.x1, z0: 5.72, z1: 8.0 };
export const KIT = { x0: ALC.x1 + 0.1, x1: 4.1, z0: 3.62, z1: 8.0 };
export const KIT_WALL = 4.4;      // the wall between kitchen and big room runs from KIT.x1 to here (thick: a guess, see EVIDENCE.md)
export const BIG = { x0: KIT_WALL, x1: 10.6 + EAST, z0: 3.62, z1: 8.0 };   // as deep as the kitchen: their south walls are one line
export const LOG = { x0: KIT.x0, x1: 4.94 + EAST, z0: 8.22, z1: 9.3 };      // hung on the south face: from the kitchen's west wall to beside his window
export const BW = { x0: -1.2, x1: -0.22, z0: 0.22, z1: 3.42 };    // the west balcony: as long as the room is wide, less its two cheeks
export const BE = { x0: PAR.x1 + T, x1: 10.6 + EAST, z0: 0.1, z1: 3.3 };            // the parents' balcony, closed in by a steel cage: about a metre deep (video 3:58, 4:29)
export const COR = { x0: -0.02, x1: 1.78, z0: -18, z1: -0.22 };   // the gallery: runs north from the front door

/* openings (a…b along the wall, y0…y1) */
export const MAIN_DOOR = { a: 0.1, b: 1.3, y1: 2.3, leaf: 0.42 };  // in the north wall, along x, hard by the corner (video 4:52–4:56): a narrow west leaf kept shut (`leaf` wide) and the leaf with the handle
export const BALC_DOOR = { a: dz(0.56), b: dz(2.68), y1: dy(2.31), tr: dy(2.06) };   // in the west wall, along z (tr: where the transom starts): really 2.1 wide and 2.3 high, from 0.1 off the fish-tank corner (video 4:51)
export const D1 = { a: LIV.x1 + 0.02, b: LOBBY.x1, y1: 2.04 };     // big room, in the wall z 3.5…3.62, along x: it fills the lobby's south side, its frame starting at the TV wall's line
export const D2 = { a: dz(2.0), b: dz(2.7), y1: 2.04 };           // parents, in the lobby's east wall (x LOBBY.x1 … PAR.x0), along z; the doors here are narrow, 0.7, their frames 2.05 high
export const KIT_OPEN = { a: 2.05, b: 3.45, y1: 2.1 };             // living room → kitchen, in the wall z 3.5…3.62, along x: 1.4 wide, its head level with the door frames (2.05)
export const WC_DOOR = { a: 0.4, b: 1.1, y1: 2.0 };                // bathroom, in the wall z 5.6…5.72, along x (hinged on the east jamb, opens in); a third of a metre of tiled wall west of it (video 2:27)
/* the door to the loggia, in the south wall (z 8.0…8.22), along x: two leaves in an opening a metre wide. Its east post is
   0.95 m from the east wall — the counter, then a third of a metre of white tiles (video 2:10) — and it reaches to where
   the 2013 fridge stood, 0.7 m short of the west wall */
export const LOG_DOOR = { a: 2.08, b: 3.12, y1: dy(2.1) };
/* the big room's south window: the row of wardrobes stands against its middle, so one pair of leaves lights his corner
   and the other his sister's side (in the south wall, along x) */
export const S_WIN_W = { a: 5.12 + EAST, b: 5.83 + EAST, y0: 0.95, y1: 2.25 };
export const S_WIN_E = { a: 6.31 + EAST, b: 7.02 + EAST, y0: 0.95, y1: 2.25 };
export const BIG_WIN = { a: 4.1, b: 6.9, y0: 0.88, y1: 2.2 };       // the wide window, in the east wall, along z
/* the parents' east wall, along z. From the north corner: the DOOR to the balcony (the owner: "phòng bố mẹ phải có cửa
   đi ra ban công ngoài"; in the 2013 video a long curtain hangs before it and only a strip of its glass shows beside the
   window frame, 3:53), a post, then the WINDOW of three leaves on a sill, and half a metre of wall to the south corner */
export const PAR_DOOR = { a: dz(0.18), b: dz(0.88), y1: dy(2.2), tr: dy(2.02) };   // tr: where its fanlight starts
export const PAR_WIN = { a: dz(0.95), b: dz(2.33), y0: 0.85, y1: dy(2.2) };
export const WC_WIN = { a: 0.45, b: 1.05, y0: 1.55, y1: 2.2 };     // high in the bathroom's south wall (z 8.0…8.22), an outside wall; along x: over the toilet and east of it (video 2:27)

/* the row of wardrobes that cuts his corner off the big room: one unit deep, doors to the east, the study desk in a
   niche at its south end */
export const PARTITION = { x0: 5.78 + EAST, x1: 6.36 + EAST, z0: 4.68, z1: 8.0 };

/** where each room is entered when picked from the list: x, y, z (real), heading (0 = north, 90 = east), pitch */
export const VIEWS = {
  'phong-khach': { name: 'Phòng khách', pose: [1.1, 1.52, 2.05, 62, -4] },
  'goc-may-tinh': { name: 'Góc máy tính', pose: [4.95 + EAST, 1.4, sz(4.5), 267, -19] },
  'phong-lon': { name: 'Phòng lớn', pose: [7.3 + EAST, 1.52, sz(4.25), 96, -6] },
  'bep': { name: 'Bếp', pose: [2.75, 1.52, 2.6, 172, -8] },
  'cho-giat': { name: 'Chỗ giặt, nhà tắm', pose: [1.62, 1.52, sz(4.3), 236, -9] },
  'lo-gia': { name: 'Lô gia', pose: [3.42, 1.52, sz(8.98), 92, -8] },
  'phong-bo-me': { name: 'Phòng bố mẹ', pose: [6.45, 1.52, 2.42, 58, -6] },
  'ban-cong-dong': { name: 'Ban công phòng bố mẹ', pose: [10.9, 1.52, 0.56, 118, -16] },
  'ban-cong': { name: 'Ban công', pose: [-0.62, 1.52, 1.0, 292, -10] },
  'hanh-lang': { name: 'Hành lang', pose: [0.95, 1.52, -4.6, 176, -5] },
};

/** The flat in real metres: each room's floor (inner faces), for the plan on its card and for reading. */
export const ROOMS = {
  living: real(LIV), lobby: real(LOBBY), niche: real(NICHE), parents: real(PAR), kitchen: real(KIT), big: real(BIG),
  alcove: real(ALC), bath: real(WC), loggia: real(LOG), westBalcony: real(BW), cage: real(BE),
};
