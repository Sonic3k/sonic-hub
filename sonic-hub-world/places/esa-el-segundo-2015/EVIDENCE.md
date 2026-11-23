# Extended Stay America, El Segundo — what the place rests on

Written in November 2026, when the place was first built; the studio's part was rewritten on 23 November 2026, after
its interior was measured again from the photographs (the first build had the counter wrong). Numbers are **metres in the place's own frame**: origin at
33.92290 N, 118.39500 W, x east, z south, y up (ground 0, the upper walkway 3.05). `plan.js` holds the hotel and the
studio as numbers; `osm.js` the streets and buildings around it.

## Sources

| What | Where in the archive | Camera |
|---|---|---|
| The studio, 21 Sept 2015 19:15 California time: the bed, taken from the chair at the counter (1773); the north wall — dresser, TV, mirror, counter — taken sitting on the bed (1774, 1775); the whole room from the door (1776) | Fsoft → [2015.08] Onsite 2015 → [2015.09.22] El Segundo, `IMG_1773`–`1776` | Canon compact, 4608 × 3456 |
| From the walkway rail toward Ralphs (1777), the corridor (1779), the lot with the brown Beetle and the mattress (1780), 22 Sept 09:47–09:48 | same album, `IMG_1777`–`1780` | same |
| The walk east, 22 Sept 09:52–09:59: Continental Blvd and Mariposa Ave with their fig trees (1783–1786), under the Green Line on Nash St (1787) | same album, `IMG_1783`–`1787` | same |
| iPhone: the hotel from the lot at dusk 17 Aug (0127), from the walkway 19 Aug (0130) and 2 Sept (0190–0191), the kitchen sink 30 Aug (0182–0185), the counter and kitchen from the west at night 18 Sept (0272), the door open on the walkway 25 Sept (0283, 0285: a person stands in them; only the door, the closet and the floor are used) | Onsite 2015 → onsite-iphone | iPhone, 3264 × 2448 |
| DirecTV contractor badge: name, FPT, VIETNAM, valid to 9/25/2015 6:00 PM | Onsite 2015 → Documents → `scan0185.jpg` | scan |
| The computer and the phone of that moment | Sonic Hub `/api/desk/at?at=2015-09-22T11:15`: Asus N56, Windows 8.1; iPhone 6s | |
| Streets (centre lines, lanes, one-way), building footprints and heights (LA County), the light rail and the station platform | OpenStreetMap, © OpenStreetMap contributors, ODbL; read in November 2026 by `data/osm2js.py` into `osm.js`. Buildings mapped as built after 2015 are left out (`LATER` there), and the hotel and the shopping centre's own buildings are drawn by hand (`HAND`) | |
| Layout of the lots, rows, planters, roofs, trees | satellite pictures (Google, Esri), looked at for reference only; nothing of them is in the page | |

**Clocks.** The Canon kept Vietnam time (UTC+7): its 23:47 is 09:47 in California (PDT, UTC−7), when the lot photos
are in morning sun from the south-east, as they should be; its 09:15 on the 22nd is 19:15 on Monday the 21st (the
laptop's lock screen in 1774 is too small to read; the place shows 7:15). Sonic Hub names moments on Vietnam's clock, so the place says `tz: -14`
(`meta.js`) and reads `?at=` on California's.

## The studio

- **How it was measured.** A pinhole camera was fitted to each photograph — where it stood, its heading, pitch and
  roll; the Canon's lens at its widest is 3360 px for the 4608 px frame, the iPhone 4S's 3077 px for 3264 — from lines
  whose place follows from the room's box: the north wall, the ceiling, the counter tops, the bathroom door. With the
  cameras fixed, each edge of the furniture was carried back from its pixels onto the plane it lies in. The scale comes
  from standard sizes — a kitchen counter at 36 in (0.914 m), the bathroom door at 80 in (2.03 m) — and is borne out by
  things that were not used to set it: the laptop (a 15.6 in Asus N56, 380 × 255 mm; its diagonal measures 0.45 m),
  the bed (its covers 1.45 m across: a full), the 32 in TV (0.80 m wide, its screen 0.715 × 0.394). `IN` in `plan.js`
  holds the result. A number there is good to about 3 cm along the north wall, 5 cm elsewhere, 10 cm in depth toward
  the kitchen.
- **The bed's side, measured twice.** The first reading took the bed, its headboard and lamps from 1773 alone, with a
  camera fitted to the far wall only. That camera stood 0.39 m from where the picture was really taken, and what was
  read from it came out too far east: the bed by 13 cm, the west lamp by 18, the nightstand by 6. On 23 November 2026 the camera of 1773 was fitted again together with the things both it and
  1776 show — the two borders of the runner (traced along their length in both pictures), the edges of the cover, the
  headboard's corners and panels, the lamps' cord covers, the room's south-west corner and its ceiling line — with the
  camera of 1776 held fixed: 139 measurements, 7 px rms, none worse than 19 px. A check that was not in the fit: the
  east lamp's shade, sighted from both pictures, meets within 2 cm. The front wall comes out 2–5 cm further west than
  the plan has it (the room 6.47–6.50 m deep, not 6.45); the plan was left as it is.
- **Size.** 3.63 m between the party walls, about 6.45 m from the front wall to the kitchen's back wall, the ceiling at
  2.39 m (7 ft 10 in). A module along the wing is 3.85 m; the wings hold 14, 15 and 13 a side (the hotel has 150
  rooms; some modules must be laundry and stores).
- **Which one.** Upper floor, west face of the north wing, the first studio north of the south-west stair tower
  (`HIS`: module 9). 1779 (09:47:46) was taken on the walkway two steps south of his own door, which is at its right
  edge: his door and the next make a pair with a lamp between them, then that studio's window, a fire-extinguisher
  cabinet, the next door. The iPhone picture of 17 Aug (0127), taken from the lot to the north-west, shows the same
  stretch running into the stair tower: window, door, lamp, door, window, cabinet, door. Twenty-eight seconds after
  1779 he stood in the drive 16 m south of the north-west tower (1780): down the south-west stairs and north through
  the lot. The room's number is not known.
- **The counter he worked at** — what the first build had wrong (an east–west bar set off the wall). It is a dining
  peninsula for two that stands out from the north wall: a white laminate top 0.87 wide × 1.155 long, 0.914 high,
  37 mm thick, its two free corners rounded (r ≈ 0.16); under its wall end a white cupboard (0.44 × 0.52) with an oak
  pull strip, opening west; from the cupboard's east side a white panel runs on under the middle of the top, its front
  edge raked 2 : 1 from the floor up to a 12 cm apron board with ogee ends under the south end. That leaves knee room
  on both sides. On 21 Sept one high chair (dark leather on walnut legs, seat 0.58, back 0.95) was pushed in from the
  west, his grey jacket over its back, and the other from the east. The laptop stood square at the west edge, its
  screen to the west chair; behind it, against the wall and along the east edge: a box of lemon tea, a water bottle, a
  steel flask, a clear bottle, the gallon jug, the red flask, a spectacle case. (1774 and 1775 from the bed, 1776 from
  the door, 0272 of 18 Sept from the west, when the chairs stood further out.)
- **Along the north wall**, from the front: the open closet behind the entry door (a rail with green hangers, a shelf
  with the iron: 0285) and its wing wall; the pine dresser (1.45 wide, two drawers by two) with the verdigris jar
  lamp and the LG 32 in TV; the arched mirror with the fire-alarm horn over it; the phone jack; the swing lamp and an
  outlet over the counter; the breaker panel; the thermostat; the fridge in the corner.
- **Kitchenette** on the back wall (1776, 0272): fridge with a top freezer, bar sink, two-ring hob, four wall cupboards
  with the microwave and the hood under them; white laminate, a white band under the top, then an oak strip along the
  top of each door and drawer. A fluorescent fitting with a wraparound lens over it; a supply diffuser and a return
  grille in the ceiling (there is no unit under the window).
- **Bathroom box** in the south-east corner: its west face carries the framed print and faces the bed; its door, a flat
  slab with a round knob in the north face, is hinged on the east and opens out toward the kitchen (open in 0272, shut
  in 1776). The inside was not photographed: it is drawn as this chain's studios have it.
- **Bed** against the green south wall (1773, and 1776 from the door): a full — its covers 1.45 m across, their foot
  2.08 m from the wall, their top 0.63 high; an espresso headboard 1.53 wide, 1.56 high and 6 cm thick with two tan
  panels 0.62 wide; a white quilt stitched in diamonds, turned back in a fold before three pillows; a tan runner 0.69
  wide with dark borders of 5 cm, its nearer edge 1.23 m from the headboard; a swing lamp either side, their plates
  17 cm clear of the headboard's ends and 1.07 high, their arms turned away from the bed (the east shade 0.26 off the
  wall; the west one's distance off the wall is a guess); a pine nightstand 0.54 wide, 0.63 high, with the phone, the
  clock radio and two remotes. The leather recliner in the south-west corner, its back 0.96 high, turned toward the
  TV; a carton by the wall, shoes just inside the door. The curtains stop 0.22 m short of the green wall.
- **Front wall**: the entry door 0.82–1.73 m from the north wall (hinged north, opening in across the closet), the
  window 2.15–3.31, plaid curtains from a track at the ceiling down to 0.45 above the floor, two white wands. Door and
  window are the mean of what 1779, 0127 and the inside pictures give (±5 cm).
- **Guessed or approximate:** the bathroom's inside; what the closet holds beyond its rail; the exact places of the small
  things on the counter and the dresser; the badge lying on the counter (no photograph shows where it was — it is drawn
  with its words only, no portrait, no logo); the mirror shows a painted reflection, not a real one.

## The hotel

- Three two-storey wings — along Mariposa (main, with the lobby at its east end) and two running south from it, the
  studio's (north) and the south wing — with open walkways on terracotta columns, white railings, yellow stucco, hip
  roofs of clay tile and stair towers with an arch at the top. Wings, towers and the lobby are rectangles in `WINGS`
  (`plan.js`), read off the satellite picture and checked against 1777, 1779, 1780, 0127, 0130 and 0190.
- A studio's front is a door, 0.42 m of wall, a window, with a louvre low under the window's near end and the room's
  number by the latch. Studios are handed in pairs, so doors meet at a wall lamp and windows at a globe in the soffit
  (`hands` in `WINGS` for the stretch the photographs show; elsewhere simply alternating, which is a guess). The
  walkway's columns stand at the stair towers' corners and in equal bays of about 5.9 m between them: 1779 fits that
  to within half a metre.
- The white picket fence and the planting strip west of the hotel's lot, the rows of stalls, the red-curbed island with
  the blue sign, the lot lights (0130, 0190, 1777, 1780). From 1780, taken in the drive at z ≈ 22 looking north: the
  two handicap stalls and the red-curbed island south of the north-west tower, the blue mattress leaning on that
  tower's south face, the brown Beetle nose-in to the fence at the lot's north end, the fence row empty. The fence's
  north end (z = −12.6) is a guess: it leaves the drive round the main wing's west end open into the lot, which the
  satellite picture suggests and which a hotel's cars need.
- The monument sign by the entrance on Mariposa is a guess (place and shape); its words are plain lettering.

## The streets

- Roads from the OSM centre lines and lane counts; Sepulveda's median with palms, Mariposa's lawn parkways and fig
  trees, Continental's curve (1783–1786). Street lights, signals and the moving cars are for life, not record.
- **Ralphs**: footprint from the map; the two gabled pavilions on its north front from 1777 and the two red gable roofs
  on the satellite picture. The arcade, windows and balconies are generic.
- **Starbucks / Jersey Mike's**: the pad's footprint from the satellite picture; tile mansard and the patio generic.
  **In-N-Out** across Mariposa: footprint from the map, the dress generic. The pad on the corner of Sepulveda and
  Mariposa is drawn as an octagon — a guess.
- **Hacienda Hotel** across Sepulveda: its top floor wrapped in green netting, as in 1777 and 0130.
- **The Green Line**: the map's bridge lines and the island platform of Mariposa station. The map stops the east track
  at the station's north end; 1787, taken under the viaduct on Nash St, shows two girders side by side, so the east one
  runs on north beside the other. Girder, piers and parapets are generic.
- Everything beyond the first row of buildings is a box with a drawn front.

## Hours

| | moment (California) | sun | from |
|---|---|---|---|
| Sáng | 22 Sept 09:47 | az 119°, 36° up | the lot photographs; marine layer breaking up |
| Chiều | 21 Sept 18:20 | az 263°, 8° up | computed; straight down the walkway and in at the west window |
| Tối | 21 Sept 21:30 | — | set; a little moonlight so the streets read |

## What is not copied

No logo anywhere: shop names are plain words in common typefaces. The badge has no portrait and no logo. The
bed-cover, curtains and the print on the bathroom wall are drawn after their kind, not copied. Satellite pictures are
not in the page.
