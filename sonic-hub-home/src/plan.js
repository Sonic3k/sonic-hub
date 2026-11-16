/* The plan of flat 507, read off the two walk-through videos of June 2013. Metres; x runs east, z runs south,
   y up; the origin is the inner north-west corner of the living room, on the floor.

          ▲ the gallery (hành lang) runs north from the front door, along the west face of the block: 506, 505 … the stairs
          │                          (north of here: flat 506)
        ┌─[main door]───────────────┬──────────────────────┐
   west │ LIVING                    │ PARENTS               │ east: balcony over the street
   balc.│ sofa N · TV E · fish tank D2  bed N · desk S      │
        ├────┬─[kitchen]──────┬─D1──┴──────────────────────┤
        │ WC │ KITCHEN        │ BIG ROOM: his corner (W), wardrobes, books and piano (N), │
        │ ut.│ counter E      │ sister's bed, wide window (E)                             │
        └────┴────────────────┴───────────────────────────────────────────────────────────┘
          south: loggia        his window
*/
export const H = 2.95;            // floor to ceiling
export const T = 0.22;            // outer wall
export const LIV = { x0: 0, x1: 5.6, z0: 0, z1: 3.5 };
export const PAR = { x0: 5.72, x1: 9.6, z0: 0, z1: 3.5 };
export const WC = { x0: 0, x1: 1.22, z0: 3.62, z1: 5.6 };
export const UTL = { x0: 0, x1: 1.22, z0: 5.72, z1: 7.15 };
export const KIT = { x0: 1.35, x1: 3.45, z0: 3.62, z1: 7.15 };
export const BIG = { x0: 3.6, x1: 10.6, z0: 3.62, z1: 7.15 };
export const LOG = { x0: 0, x1: 3.45, z0: 7.37, z1: 8.45 };
export const BW = { x0: -1.2, x1: -0.22, z0: 0.22, z1: 3.3 };
export const BE = { x0: 9.82, x1: 10.6, z0: 0.2, z1: 3.3 };
export const COR = { x0: -0.02, x1: 1.78, z0: -18, z1: -0.22 };   // the gallery: runs north from the front door

/* openings (a…b along the wall, y0…y1) */
export const MAIN_DOOR = { a: 0.35, b: 1.55, y1: 2.18 };          // in the north wall, along x
export const BALC_DOOR = { a: 0.45, b: 2.55, y1: 2.75, tr: 2.15 }; // in the west wall, along z (tr: where the transom starts)
export const D1 = { a: 4.65, b: 5.5, y1: 2.1 };                    // big room, in the wall z 3.5…3.62, along x
export const D2 = { a: 2.52, b: 3.4, y1: 2.1 };                    // parents, in the wall x 5.6…5.72, along z
export const KIT_OPEN = { a: 1.7, b: 3.3, y1: 2.35 };              // along x
export const UTL_OPEN = { a: 5.95, b: 6.8, y1: 2.1 };              // in the wall x 1.22…1.35, along z
export const WC_DOOR = { a: 0.32, b: 1.05, y1: 2.0 };              // in the wall z 5.6…5.72, along x
export const LOG_DOOR = { a: 1.5, b: 3.3, y1: 2.5, d0: 2.0, d1: 2.85 }; // glazed partition to the loggia, along x (d0…d1 its door)
export const NOOK_WIN = { a: 4.78, b: 5.72, y0: 0.95, y1: 2.25 };  // his window, in the south wall, along x
export const BIG_WIN = { a: 3.95, b: 6.3, y0: 0.88, y1: 2.32 };    // the wide window, in the east wall, along z
export const PAR_DOOR = { a: 1.12, b: 2.28, y1: 2.45 };            // to the east balcony, along z
export const WC_WIN = { a: 4.35, b: 4.95, y0: 1.75, y1: 2.25 };    // in the west wall, along z

/* the furniture line that cuts his corner off the big room */
export const PARTITION = { x0: 5.78, x1: 6.93, z0: 4.78, z1: 7.15 };

/** where each room is entered when picked from the list: x, z, heading (0 = north, 90 = east), pitch */
export const VIEWS = {
  'phong-khach': { name: 'Phòng khách', pose: [1.1, 1.52, 2.6, 62, -4] },
  'goc-may-tinh': { name: 'Góc máy tính', pose: [4.95, 1.4, 4.5, 267, -19] },
  'phong-lon': { name: 'Phòng có đàn piano', pose: [7.3, 1.52, 4.25, 96, -6] },
  'bep': { name: 'Bếp', pose: [2.55, 1.52, 3.95, 180, -8] },
  'lo-gia': { name: 'Lô gia', pose: [2.45, 1.52, 7.75, 256, -7] },
  'phong-bo-me': { name: 'Phòng bố mẹ', pose: [6.15, 1.52, 2.85, 62, -6] },
  'ban-cong': { name: 'Ban công', pose: [-0.62, 1.52, 1.25, 292, -10] },
  'hanh-lang': { name: 'Hành lang', pose: [0.95, 1.52, -4.6, 176, -5] },
};
