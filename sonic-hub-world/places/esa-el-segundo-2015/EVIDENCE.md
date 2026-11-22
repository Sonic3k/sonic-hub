# Extended Stay America, El Segundo — what the place rests on

Written in November 2026, when the place was first built. Numbers are **metres in the place's own frame**: origin at
33.92290 N, 118.39500 W, x east, z south, y up (ground 0, the upper walkway 3.05). `plan.js` holds the hotel and the
studio as numbers; `osm.js` the streets and buildings around it.

## Sources

| What | Where in the archive | Camera |
|---|---|---|
| The studio, 21 Sept 2015 19:15 California time: the bed (1773), dresser, TV, mirror and counter (1774), the kitchen past the bed (1775), the counter (1776) | Fsoft → [2015.08] Onsite 2015 → [2015.09.22] El Segundo, `IMG_1773`–`1776` | Canon compact, 4608 × 3456 |
| From the walkway rail toward Ralphs (1777), the corridor (1779), the lot with the brown Beetle and the mattress (1780), 22 Sept 09:47–09:48 | same album, `IMG_1777`–`1780` | same |
| The walk east, 22 Sept 09:52–09:59: Continental Blvd and Mariposa Ave with their fig trees (1783–1786), under the Green Line on Nash St (1787) | same album, `IMG_1783`–`1787` | same |
| iPhone: from the walkway 19 Aug (0130) and 2 Sept (0190–0191), the kitchen sink 30 Aug (0182–0185), the room at night 18 Sept (0272), the door open on the walkway 25 Sept | Onsite 2015 → onsite-iphone | iPhone, 3264 × 2448 |
| DirecTV contractor badge: name, FPT, VIETNAM, valid to 9/25/2015 6:00 PM | Onsite 2015 → Documents → `scan0185.jpg` | scan |
| The computer and the phone of that moment | Sonic Hub `/api/desk/at?at=2015-09-22T11:15`: Asus N56, Windows 8.1; iPhone 6s | |
| Streets (centre lines, lanes, one-way), building footprints and heights (LA County), the light rail and the station platform | OpenStreetMap, © OpenStreetMap contributors, ODbL; read in November 2026 by `data/osm2js.py` into `osm.js`. Buildings mapped as built after 2015 are left out (`LATER` there), and the hotel and the shopping centre's own buildings are drawn by hand (`HAND`) | |
| Layout of the lots, rows, planters, roofs, trees | satellite pictures (Google, Esri), looked at for reference only; nothing of them is in the page | |

**Clocks.** The Canon kept Vietnam time (UTC+7): its 23:47 is 09:47 in California (PDT, UTC−7), when the lot photos
are in morning sun from the south-east, as they should be; its 09:15 on the 22nd is 19:15 on Monday the 21st (the
laptop's lock screen in 1774 is too small to read; the place shows 7:15). Sonic Hub names moments on Vietnam's clock, so the place says `tz: -14`
(`meta.js`) and reads `?at=` on California's.

## The studio

- **Which one.** Upper floor, west face of the north wing, the sixth module from its north end (`HIS` in `plan.js`).
  From the rail in front of the door (1777) the two gables of Ralphs bear about 244°; 1779 looks down the walkway to
  the south-west stair tower, and its length fixes the door to within a module; 1780 stands at the foot of those stairs
  looking north. One module either way is possible.
- **Size.** A module is 4.25 m (the wings are 11, 12 and 13 modules on the satellite picture). The studio is 4.1 m
  wide inside and 6.8 m deep, the ceiling 2.55 m — from the queen bed (1.52 × 2.03), the entry door (0.9 × 2.03),
  the dresser and the counter (0.92 high) in the four photographs. Nobody measured it.
- **Layout.** Entry door and window on the walkway (west) wall; dresser with the LG TV and the lamp, the arched mirror,
  then the counter with two high leather chairs along the north wall (1774); the bed against the green south wall with
  the swing lamps, the nightstand, the recliner by the window, a carton and the shoes (1773); the kitchenette at the
  back (east) past the bed (1775); the bathroom box between. The photographs do not agree with each other to better
  than about 0.3 m on where the counter ends, where the bathroom door is and how deep the kitchen is; `IN` in
  `plan.js` is the arrangement that fits them best.
- **Not photographed:** the bathroom (drawn as this chain's studios have it), the ceiling fittings beyond what 1774 and
  1775 show.
- **On the counter** (1774, 1776): the laptop open toward the chair, the gallon of water, a red flask, bottles, a box of
  lemon tea, papers, the badge. The badge is drawn with its words only: no portrait, no logo.

## The hotel

- Three two-storey wings — along Mariposa (main, with the lobby at its east end) and two running south from it, the
  studio's (north) and the south wing — with open walkways on terracotta columns, white railings, yellow stucco, hip
  roofs of clay tile and stair towers with an arch at the top. Wings, towers and the lobby are rectangles in `WINGS`
  (`plan.js`), read off the satellite picture and checked against 1777, 1779, 1780, 0130 and 0190.
- The white picket fence and the planting strip west of the hotel's lot, the rows of stalls, the red-curbed island with
  the blue sign, the handicap stalls by the north-west tower, the lot lights (0130, 0190, 1777, 1780). The fence's
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
