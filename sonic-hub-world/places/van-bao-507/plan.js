/* The plan of flat 507. Metres; x runs east, z runs south, y up; the origin is the inner north-west corner of the
   living room, on the floor. Read off the two walk-through videos of 9 June 2013 and the photographs of 2009–2013;
   EVIDENCE.md says which frame or photograph each part rests on, which sizes were measured and which are guessed.

          ▲ the gallery (hành lang) runs north from the front door, along the west face of the block: 506, 505 … the stairs
          │                          (north of here: flat 506)
        ┌─[main door]────────────────────┬────────────────────────────────┐
   west │ LIVING   sofa N · TV on the E  │ wardrobe   PARENTS             │ east balcony,
   balc.│ wall · fish tank on the S wall ├──┐  bed N · desk SE            │ over the street
        │ [tank] ▪     (plain wall)      │LOBBY D2                        │
        ├─────────┬──[ opening ]─────────┴─D1─┴────────────────────────────────┐
        │ WASHING ·                 ┃ desk       ║ wardrobes  BIG ROOM: books  │
        │ basin W ·  KITCHEN        ┃ (his       ║ (face E)   and piano (N),   │ wide
        ├─[door]──┤  table W        ┃  corner)   ║            his sister's     │ window
        │ BATH    │  fridge, sink,  ┃ bed        ║ study      bed and desk (S) │
        │ WC S    │  hob on E wall  ┃            ║ desk                        │
        └[window]─┴──[glazed door]──┸━━━━━━[win]━╩━[win]━━━━━━━━━━━━━━━━━━━━━━━┘   ← one straight south face
                  │ LOGGIA (barred; from the kitchen's  │
                  └ west wall to beside his window) ────┘
*/
export const H = 2.75;       // floor to ceiling, read off two photographs (22/9/2012: 2.64–2.74 · 25/5/2013: 2.7–2.9); see EVIDENCE.md
export const T = 0.22;       // outer wall thickness

/* rooms (inner faces) */
export const LIV = { x0: 0, x1: 5.6, z0: 0, z1: 3.5 };
/* The lobby: at the living room's south-east corner the east wall steps back, under a lowered ceiling, and the two
   bedroom doors open off that recess — the parents' straight ahead, the big room's on the right. Everything east of the
   TV wall therefore stands EAST further east than a plain rectangle would put it; rooms_b.js is written in the east
   half's own measure (x there = x here − EAST). */
export const EAST = 0.8;
export const LOBBY = { x0: 5.6, x1: 5.6 + EAST, z0: 2.3, z1: 3.5, soffit: 2.4 };
export const PAR = { x0: 5.72 + EAST, x1: 9.6 + EAST, z0: 0, z1: 3.5 };
export const NICHE = { x0: 5.72, x1: 5.72 + EAST, z0: 0, z1: 2.18 };   // the parents' room runs on behind the TV wall: wardrobe and shelves stand here
/* south of the living room's west half: the washing alcove behind the fish-tank wall (open to the kitchen on its east side
   as far as ALC_MOUTH), the bathroom south of it, and the kitchen; the loggia is outside the kitchen and runs on east */
export const ALC = { x0: 0, x1: 1.85, z0: 3.62, z1: 5.6 };
export const ALC_MOUTH = 4.9;     // the kitchen's west wall (x 1.85…1.95) starts here and runs south: it hides the bathroom door from the table
export const WC = { x0: 0, x1: 1.85, z0: 5.72, z1: 8.0 };
export const KIT = { x0: 1.95, x1: 4.1, z0: 3.62, z1: 8.0 };
export const KIT_WALL = 4.4;      // the wall between kitchen and big room runs from KIT.x1 to here (thick: a guess, see EVIDENCE.md)
export const BIG = { x0: KIT_WALL, x1: 10.6 + EAST, z0: 3.62, z1: 8.0 };   // as deep as the kitchen: their south walls are one line
export const LOG = { x0: 1.95, x1: 4.94 + EAST, z0: 8.22, z1: 9.3 };        // hung on the south face: from the kitchen's west wall to beside his window
export const BW = { x0: -1.2, x1: -0.22, z0: 0.22, z1: 3.3 };
export const BE = { x0: 9.82 + EAST, x1: 10.6 + EAST, z0: 0.2, z1: 3.3 };
export const COR = { x0: -0.02, x1: 1.78, z0: -18, z1: -0.22 };   // the gallery: runs north from the front door

/* openings (a…b along the wall, y0…y1) */
export const MAIN_DOOR = { a: 0.35, b: 1.55, y1: 2.18 };          // in the north wall, along x
export const BALC_DOOR = { a: 0.45, b: 2.55, y1: 2.55, tr: 2.08 }; // in the west wall, along z (tr: where the transom starts)
export const D1 = { a: 4.65 + EAST, b: 5.5 + EAST, y1: 2.1 };      // big room, in the wall z 3.5…3.62, along x: the lobby's south side
export const D2 = { a: 2.52, b: 3.4, y1: 2.1 };                    // parents, in the lobby's east wall (x LOBBY.x1 … PAR.x0), along z
export const KIT_OPEN = { a: 1.85, b: 3.45, y1: 2.3 };             // living room → kitchen, in the wall z 3.5…3.62, along x
export const WC_DOOR = { a: 0.42, b: 1.12, y1: 2.0 };              // bathroom, in the wall z 5.6…5.72, along x (hinged on the east jamb, opens in)
export const LOG_DOOR = { a: 2.7, b: 3.52, y1: 2.5 };              // glazed door to the loggia, in the south wall (z 8.0…8.22), along x
/* the big room's south window: the row of wardrobes stands against its middle, so one pair of leaves lights his corner
   and the other his sister's side (in the south wall, along x) */
export const S_WIN_W = { a: 5.12 + EAST, b: 5.83 + EAST, y0: 0.95, y1: 2.25 };
export const S_WIN_E = { a: 6.31 + EAST, b: 7.02 + EAST, y0: 0.95, y1: 2.25 };
export const BIG_WIN = { a: 4.1, b: 6.9, y0: 0.88, y1: 2.2 };       // the wide window, in the east wall, along z
export const PAR_DOOR = { a: 1.12, b: 2.28, y1: 2.45 };            // to the east balcony, along z
export const WC_WIN = { a: 0.95, b: 1.55, y0: 1.55, y1: 2.2 };     // high in the bathroom's south wall (z 8.0…8.22), an outside wall; along x

/* the row of wardrobes that cuts his corner off the big room: one unit deep, doors to the east, the study desk in a
   niche at its south end */
export const PARTITION = { x0: 5.78 + EAST, x1: 6.36 + EAST, z0: 4.68, z1: 8.0 };

/** where each room is entered when picked from the list: x, z, heading (0 = north, 90 = east), pitch */
export const VIEWS = {
  'phong-khach': { name: 'Phòng khách', pose: [1.1, 1.52, 2.6, 62, -4] },
  'goc-may-tinh': { name: 'Góc máy tính', pose: [4.95 + EAST, 1.4, 4.5, 267, -19] },
  'phong-lon': { name: 'Phòng lớn', pose: [7.3 + EAST, 1.52, 4.25, 96, -6] },
  'bep': { name: 'Bếp', pose: [2.55, 1.52, 3.4, 168, -8] },
  'cho-giat': { name: 'Chỗ giặt, nhà tắm', pose: [1.5, 1.52, 4.3, 218, -9] },
  'lo-gia': { name: 'Lô gia', pose: [3.2, 1.52, 8.98, 92, -8] },
  'phong-bo-me': { name: 'Phòng bố mẹ', pose: [6.15 + EAST, 1.52, 2.85, 62, -6] },
  'ban-cong': { name: 'Ban công', pose: [-0.62, 1.52, 1.25, 292, -10] },
  'hanh-lang': { name: 'Hành lang', pose: [0.95, 1.52, -4.6, 176, -5] },
};
