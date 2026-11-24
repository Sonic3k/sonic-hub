# Extended Stay America, El Segundo — what the place rests on

Written in November 2026, when the place was first built; the studio's part was rewritten on 23 November 2026, after
its interior was measured again from the photographs (the first build had the counter wrong). The bathroom's inside
keeps the first build's arrangement, which he found right; on 24 November its fixtures were redrawn after photographs
of this hotel's bathrooms found on the web. The same day, after he confirmed where the reception is, its inside was
drawn after the hotel's present pictures, the breakfast on its counter after a photograph of his own, and the room got
its number from the hotel's folio (see "The reception and the breakfast"). Numbers are **metres in the place's own frame**: origin at
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
| The breakfast taken from the reception, on the table in his room, 19 Aug 2015 07:10: coffee in the hotel's paper cup, a packet of instant oatmeal (apples and cinnamon), a muffin in its wrapper, a red apple — beside a bowl of his own instant noodles | Onsite 2015 → Onsite iphone, `IMG_0129` | iPhone |
| The hotel's folio and two taxi slips, scanned on 29 Sept 2015. Used: the room's number, the dates of arrival and departure, the folio's print time, the days of the two taxi rides. Nothing else on those papers is used or written down anywhere in this place | Onsite 2015 → Documents (the scanned receipts) | scan |
| The computer and the phone of that moment | Sonic Hub `/api/desk/at?at=2015-09-22T11:15`: Asus N56, Windows 8.1; iPhone 6s | |
| Streets (centre lines, lanes, one-way), building footprints and heights (LA County), the light rail and the station platform | OpenStreetMap, © OpenStreetMap contributors, ODbL; read in November 2026 by `data/osm2js.py` into `osm.js`. Buildings mapped as built after 2015 are left out (`LATER` there), and the hotel and the shopping centre's own buildings are drawn by hand (`HAND`) | |
| Layout of the lots, rows, planters, roofs, trees | satellite pictures (Google, Esri), looked at for reference only; nothing of them is in the page | |
| The bathroom's inside, which he did not photograph | travellers' photographs of this hotel (2024, 2026), the hotel's own (about 2021), guests' reviews of 2015 — see "The bathroom's inside"; looked at for reference only, nothing of them is in the page | |
| The reception's inside, which he did not photograph either | the hotel's own two pictures of its lobby and a traveller's of the desk, all of recent years — see "The reception and the breakfast"; looked at for reference only, nothing of them is in the page | |
| What the breakfast was | the chain's announcement of 17 Jan 2013 (a free breakfast to take away at its 610 hotels, every day from 6 to 9:30: instant oatmeal, fruit, muffins, drinks), as carried by Hotel Executive and Travel Weekly | |

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
  2.39 m (7 ft 10 in): 23.4 m² (252 sq ft) with the bathroom. A module along the wing is 3.85 m. Checked on 24 Nov
  2026 against the building: two rooms back to back with their walkways, walls and the plumbing spine come to 18.1 m,
  which is what the roof measures across on the satellite picture and in the County's footprint (see "The hotel").
- **Which one.** Upper floor, west face of the north wing, the tenth studio from the wing's north end (`HIS`: module
  9), with the south-west stair tower beside it. Three photographs fix that:
  - 1779 (22 Sept 09:47:46), on the walkway a step south of his own door, which is at its right edge: his door and
    the next make a pair with a lamp between them, then that studio's window, a fire-extinguisher cabinet, doors on
    to the wall with a door that ends the walkway. That end door stands 185–190 px high in the frame (2.03 m at
    f = 3360 px): 36–37 m away, which is where the row's north end lies if nine studios stand north of his. They can
    be counted, too: a mat lies before every door, and beyond the neighbour's there are eight, at about 8.0, 12.6,
    14.6, 18.8, 22.5, 27.1, 29.8 and 34.3 m from the camera (the place's doors would put them at 8.2, 13.1, 15.9, 20.8,
    23.6, 28.5, 31.3 and 36.2). *This file said "150 px … 45 m" until 24 Nov 2026: a misreading of the frame, found
    when the picture was measured again; nine studios it was and is.* Nothing of the stair tower shows at the frame's
    left edge, so its wall was level with the camera or behind it.
  - 0127 (17 Aug, from the lot at dusk), its camera fitted to door heads, window heads and sills on both floors
    (phone lens f = 1509 px at 1600 wide; residual about 4 px): window, door, lamp, door, window — and the tower's
    north wall coming to the walkway at that last window, 0.6 m (± 0.4) past his door. The first fit of this place
    put the tower 1.7 m further south, clear of his room; this photograph had not been fitted then.
  - Both put the plain columns in bays of about 4.9 m and the gabled bay half-way between the towers, where the
    satellite picture has its roof.
  **Its number is 271**: the hotel's folio is headed "Room: 271" (arrival 8/17/2015, departure 9/26/2015). No
  photograph shows a number on any door, so the number cannot be used to check which door was his; it does not speak
  against the photographs either. The sign by the lobby gives the main wing the rooms 103–127 and 151–177, so 2xx is
  another building and x51 upward its upper floor; if the wings are counted from Mariposa this one is the second,
  and if its west face runs 262–273 from the north end, the tenth door is 271. That is a guess about the numbering, not
  evidence for the door. The small plate reading 271 by his door is an addition: what the real one looked like is not
  known.
  So the row starts at z = −0.2 (the County's roof starts at −4.1: a closed end bay, as on the main wing's west end)
  and the tower's north wall crosses the walkway at his window. 1777 (09:47:21, toward Ralphs) was taken from the
  railing a few steps north of his door: the tower's shadow lies in its lower left corner and the tower is out of
  frame. 1780 (09:48:14) was taken in the drive, looking north past the island with the tree and the two handicap
  stalls to the north-west tower. The room's number is not known.
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
  cream slab in the north face with a lever on a round rose and a double hook on its inside (0272), is hinged on the
  east and opens out toward the kitchen (open in 0272, shut in 1776). Shut, it stops the walker. The inside was not
  photographed: see "The bathroom's inside" below. The door stands 9 cm west of where 0272 alone would put it (same section).
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
- **Guessed or approximate:** that the bathroom's fixtures and colours in 2015 looked as later photographs show them
  (below; where they stand is as he remembers); what the closet holds beyond its rail; the exact places of the small
  things on the counter and the dresser; the badge lying on the counter (no photograph shows where it was — it is drawn
  with its words only, no portrait, no logo); the mirror shows a painted reflection, not a real one.

### The bathroom's inside

None of his photographs shows it (0272 looks along its door wall; the open leaf hides the doorway).

**Where things stand is his own word.** The first build guessed an arrangement: the tub across the far end, against
the back wall, on the left of the door; the pan on the party wall, facing the door, towels over it; the basin to the
right, in the far corner against the wall that carries the print. He looked at it and found it right (24 November
2026). It stands, and nothing below moves a fixture.

**A wrong turn, kept here so that it is not taken again.** On 23 November the inside was rebuilt from a traveller's
photograph of another studio's bathroom in this building. That studio is the other hand of his (in the same
traveller's pictures its door, window, bed and kitchen are his mirrored), so the bathroom was mirrored with it: the tub
went against the print's wall, the basin and the pan to the back wall. He saw at once that it was wrong. A photograph
of another room says what the fixtures of this hotel look like; it does not say where they stand in his room, and it
was not what he had asked for, which was to check the things in the arrangement he had already found right.

**What each thing looks like** is after pictures of bathrooms in this same building, found on the web on 23 November
2026 and used for reference only:

| What it shows | Whose, when |
|---|---|
| A standard studio's bathroom from its door: the tub's end with its taps and tiles, the curtain, the towel shelf, the paper holder, the pan, a corner of the basin's top | a traveller's photograph on TripAdvisor, 2026 |
| The basin close up: a flecked cultured-marble top with the bowl cast in it, a splash, one chrome tap with a lever; a white cabinet with a dark wooden pull strip; a wood-look floor and a dark base (perhaps an accessible room) | a traveller's two photographs on TripAdvisor, 2024 |
| An accessible room's bathroom: a one-piece tub with a curved chrome rod and a white curtain, the same chrome towel shelf, a dark-framed mirror over the basin, ochre walls | the hotel's own pictures as a booking site shows them, about 2021 |
| Words: the tub's finish and "the grout around the tub" (a guest, September 2015); "shower/tub combination", hair dryer | guests' reviews and the listings' lists of amenities |

**Heights and sizes, measured off the first picture.** Its far wall carries ten rows of square tiles between the tub's
rim and their top. Six-inch tiles are the only standard size that leaves the towel shelf within reach and the tiles'
top under the ceiling (the roll of paper then comes out 11.8 cm wide, which a roll is). The rows give a scale up that
wall and the wall's foot its zero; the picture hangs 3.8° off level and is levelled first. So: the tub's rim 0.31 m
over the floor (low: a 14-inch tub with the floor built up round it), the tiles' top 1.86, the valve 0.78, the spout
0.42, the towel shelf 0.49 wide with its rails at 1.70, the basin's top 0.83 high and 0.57 deep (`plan.js`,
`IN.bathIn`).

**Checked for sense** (`checks.mjs` holds it): nothing stands in the doorway; the tub, the pan and the basin stand
apart; from the pan's middle it is 0.44 m to the tub and 0.60 m to the basin; there is 0.79 m of floor before it; the
shelf is over its tank, a hand from the tub; the taps are on the party wall, where the next studio's bathroom backs
on. One thing did not fit: a 30-inch tub against the back wall reaches to 5.69 m, and 0272 puts the hinge jamb of the
door at about 5.78 (± 0.06, by the leaf's height in the picture) — inside the tub. The door is drawn 9 cm west of
that, its jamb flush with the tub's edge; set beside 0272 the difference cannot be seen.

**Where that photograph and his room part.** In the traveller's picture the pan stands in the corner beside the
basin, its tank under an arm of the basin's top, and the wall facing the door carries only the towel shelf and the
paper. Here the pan is where he found it right: on that wall, facing the door, the shelf over it.

**Likely, not seen:** that the look of 2015 was this one. For it: the bedroom in the same traveller's pictures of 2026
still has the green wall, the headboard and the lamps of his photographs, so the refit he lived in was still standing;
and a guest of September 2015 writes of the tub and of the grout round it — a tiled tub, as here. Against: the floor in
the 2026 picture is a later grey board (the 2024 picture has brown ones like his kitchen's, which are what is drawn)
and its base a dark teal (drawn brown, like the room's). The ochre of the walls, the curved rod, the mirror and its
frame are known only from 2021 and after; the light is a white wraparound cover seen in one corner of a 2026 picture
and is put over the mirror; the shower's rose, the fan's grille and what lies on the shelves are after the usual. The
mirror shows a painted reflection.

## The hotel

Rebuilt on 24 Nov 2026, when he asked whether the sizes were right and said the stairs made no sense and that he could
find neither the way in for cars nor the reception. He was right on all three.

### What was wrong

| | the build before | what the evidence says |
|---|---|---|
| stair towers | closed on three sides, a small arch at the upper floor, the stair in one corner behind a wall; six of the twelve had no stair at all | open to the lot between two heavy columns under an arch, the landing with its railing at the tower's face (0125, 0127, 1780, 0191); all twelve alike on the satellite picture |
| the north wing | 14 studios a side under one roof 56.7 m long | 12 a side under a roof 50.9 m long; south of it a lower block 5.8 m long under its own roof |
| rooms in all | 168 doors | 160 doors; the hotel lets 151 rooms |
| the lot west of the wings | stalls against the walkway, the fence 22.5 m from the roof's edge | 1.85 m of planting between walkway and stalls; the fence 23.9 m from the roof's edge |
| the way in | a sign at the north-west, no drive | a two-lane drive at the north-east corner, the sign on its island |
| the lobby | a box at the main wing's east end | the wing's own end block, a porch on its east face, a sign tower south of the porch |
| the roofs | 4 in 12 | about 5½ in 12 (the ridge at 10.1 m in 0127); the towers' own steeper |

### The wings' sizes

Roof outlines are LA County's building footprints as OpenStreetMap carries them (ways 233384215, 233386980,
233386985). The satellite picture was laid on them and the tile roofs found by their colour along some twenty lines.

**The picture and the footprints do not lie on each other.** Everything on the picture sits about 1.2 m west and
1.2 m north of where the footprints have it:

| check | on the picture | County | shift |
|---|---|---|---|
| north wing, west eaves (five lines) | x 11.05–11.2 | 12.3 | +1.1…1.25 |
| main wing, west end | x −25.6 | −24.6 | +1.0 |
| main wing, its north-west tower | x −20.6…−16.7 | −19.6…−15.3 | +1.2 |
| main wing, north and south eaves | z −47.35, −28.5 | −46.5, −26.7 | +0.85, +1.8 |
| the towers' sunlit ends, north wing | z 5.5, 39.4 | 6.9, 41.4 | +1.4, +2.0 |
| the stalls' kerb west of the north wing | x 9.5 | 10.5–10.9 by the photograph of 17 Aug, whose camera is fitted to the building | +1.0…1.4 |
| the gabled bay, north wing's west face | z 19.25 | 20.8 by 0127 and 1779 | +1.55 |

The last two matter most: they tie the ground to the building without either map. So what is measured on the picture
is moved 1.2 m east and 1.2 m south before it is built (`LOT` and `LOBBY` in `plan.js` hold the moved numbers). The
first build after his question mixed the two frames and drew three metres of planting between walkway and stalls; the
photograph of 17 Aug shows under two. Good to about half a metre.

Where the County and the picture still disagree after the move, the picture is followed: the main wing ends 1.15 m
further east than the County draws it (its east end is drawn as steps there), and its north-east stair tower stands
1.65 m further east, a short bay from the lobby's block as in the hotel's own photograph.

| | roof outline (m) | long × wide | studios a side |
|---|---|---|---|
| main, along Mariposa | x −24.6…30.1, z −46.5…−26.7 | 54.7 × 19.8 | 13 |
| north (his) | x 12.3…30.4, z −4.1…46.8 | 50.9 × 18.1 | 12 |
| the low block south of it | x 13.7…30.4, z 46.8…52.6 | 5.8 × 16.7, one storey | — |
| south | x 12.3…30.4, z 57.3…115.8 | 58.5 × 18.1 | 15 |

- Across a wing: 0.45 to the columns, the walkway to 2.0, the front wall, a studio 6.45 deep, the spine: 2 × (2.0 +
  0.18 + 6.45) + 0.84 = 18.1. His room's depth, measured from inside, fits the building measured from above. (The
  main wing is 1.7 m wider by the County's outline; its rooms are drawn the same and its spine takes the difference.)
- Along a wing: 3.85 a module. The main wing's sign by the lobby reads, as far as its small letters can be made out in
  the hotel's picture, "Rooms 151–177, 103–127": 25 below and 27 above, which is 13 a side with one module given to
  the lobby below and the block's own room over it. The north wing's 12 rest on 1779 and 0127 (see "Which one"); the
  south wing's 15 only on its length.
- 160 doors on the walkways against the 151 rooms the booking sites give: the rest must be the laundry, the stores and
  the fitness room. Which doors those are is not known; every door is drawn as a room's.
- The lean-tos on the wings' ends and the low block are single-storey on the satellite picture (their roofs lie in the
  wings' shadows) and in 0127, which shows the block's eaves at 2.6 m and a door in its west wall.

### The stair towers

Seen in 0125 and 0127 (17 Aug, from the lot), 0191 (2 Sept, from the walkway beside one), 1780 (22 Sept, from the
drive) and, for the one by the lobby, the hotel's own pictures. Heights are read off 0127 with its fitted camera, on
the plane of the tower's face.

| | drawn | read off 0127 |
|---|---|---|
| the tower's face from the wing's roof edge | 3.45 | the County's footprint: 3.4–3.9 |
| its width | 3.9 | 4.1 between the columns' outer faces |
| the two columns | 0.68 square, shafts to 3.78 | shafts to 3.7–3.9 |
| their capitals | 3.78–4.30 | tops at 4.4 (± 0.15) |
| the arch | springs 4.85, crown 5.2 | 4.9, 5.2 |
| the floodlight | 5.85 | 6.1 |
| its eaves | 6.4 | 6.35–6.6 |
| the roof's point | 8.25 | 8.2–8.4 |
| the landing's floor | 1.51 | 1.7 (± 0.15) |
| its railing's cap | 2.58 | 2.7 |

- The landing is the half-way stop of a stair that goes out from the building and comes back: eight risers of 0.17 up
  to it from the ground walkway, nine more back to the upper walkway (2.9 m in seventeen). In the hotel's picture of
  the tower by the lobby the flight from the ground is on the left as one faces the tower; all are drawn so.
- **Not seen:** the inside of a tower. The treads, the wall between the two flights, the handrails and the steel
  strings are what such a stair needs, not what a photograph shows. No photograph of his looks down these stairs.
- The same two columns and arch stand once more on each face, half-way between the towers, on the walkway's own edge
  under a small raised roof (1779: the two columns whose capitals come at railing height; 0190 and 0191, taken beside
  them; a small hip on the satellite picture). On the north wing's west face it is drawn at z = 20.8, where 0127 and
  1779 put it; the picture, moved, has it at 20.45.
- Plain columns: at 27.15 and 32.25 on his stretch (0127), otherwise in equal bays of about 4.9 m.

### The lot, the way in, the lobby

Measured on the satellite picture (taken years after 2015; kerbs do not move, stripes and planting may have) and
moved into the footprints' frame as above.

| | m |
|---|---|
| west of the wings: planting 10.7…12.55 · stalls 5.4…10.7 · drive · stalls −8.5…−3.1 · strip · fence | fence at x = −11.6 |
| east of them: planting · stalls 32.25…37.55 · drive · trees | boundary kerb at x = 43.5 |
| north of the main wing: planting · stalls z −53.0…−47.6 · aisle · hedge and lawn · sidewalk | hedge kerb at −59.5; the walk's back at −66.4 (the street's own frame) |
| south of it: planting · stalls −24.9…−19.6 · aisle | to −13.0 |
| the drive in from Mariposa | x 28.5…37.5 |
| the sign's island | x 15.5…28.5, z −66.4…−60.0 |
| the forecourt's kerb | from (17.8, −53.4) east, a quarter round of 8.1 m, south along x = 37.3 |
| the lobby's porch | x 29.8…32.85, z −45.4…−40.7 |
| the sign tower | x 29.4…33.0, z −40.7…−37.1 |

- From the photograph of 17 Aug, with its fitted camera: the stalls' kerb at x = 10.5–10.9, their painted lines 2.4–2.5 m
  apart and ending at x ≈ 5.7–6.5, the red kerb of the tower's island at 5.8–6.1. A clipped hedge stands right behind
  the kerb, small round-headed trees behind it with their heads at the upper walkway's floor.
- 0190, 0191, 1777 and 1780 show the west side as drawn: the planting with its small round-headed trees, stalls with
  wheel stops, the two handicap stalls with their blue signs, the red-kerbed island with the bigger tree, the fence
  row, the strip with its trees and lot lights, the white picket fence. On the morning of 22 Sept the fence row stood
  empty and the brown Beetle was at its north end; the blue mattress leaned on the north-west tower's south face.
- **The way in** is what the satellite picture shows: a kerb cut at the lot's north-east corner, arrows and a centre
  line on the asphalt, a hatched crossing to the forecourt. None of his photographs shows it — he walked out the other
  way, past the shops.
- **The lobby from outside** follows the hotel's present pictures: the block with a window on each floor and "Lobby"
  between them, "A" on its corner, the porch with a flat arch to the drive and a narrow one in its north side, "Lobby"
  and "1910" over the arch, a glazed door with a transom, the tower with a gridded panel to the drive and the name on
  its face to Mariposa, gravel and agaves where 2015 may have had lawn. The tower is 3.6 m square on the satellite
  picture; its height (9 m to the eaves) is taken from those pictures by the ratio to the porch.
- **Guesses:** the lobby's inside as it was in 2015 (it is drawn as it is today: see below); both signs' faces (plain lettering on a dark cabinet; no photograph of 2015 shows them, and no logo is
  drawn); the planting of every bed but the west side's; the picnic table's place.

### The reception and the breakfast

**That this is the reception** he confirmed on 24 Nov 2026 ("số 2 đúng là lễ tân": the block at the main wing's east
end, its door under the porch on the drive).

**What his photographs have of it: nothing.** That day every picture of those weeks in the archive was gone through
for it: 1,533 files dated 13 Aug–29 Sept 2015 (all there is between 10 Aug and 2 Oct) — 1,508 in the trip's albums
(159 from the phone, the 15 of the El Segundo album, nine albums of days out with 30 to 318 each, two in the trip's own
folder) and 25 elsewhere (the five scanned receipts; the rest are not of the trip). None carries a position. They were
looked at as contact sheets, and at full size wherever there was a counter, a doorway, a porch, a sign or food: none
shows the reception, its porch, the sign tower or the way in from Mariposa. Ten of the files are videos, all in the
albums of days out and between photographs of those outings; their frames were not looked at. The folder of visa
papers was not opened.

**What they do have is what the reception gave out.** `IMG_0129` (the phone, 19 Aug 2015, 07:10, on the table in his
room): coffee in the hotel's paper cup, a packet of instant oatmeal (apples and cinnamon), a muffin in its wrapper and
a red apple, beside a bowl of his own instant noodles. The chain had been giving a breakfast to take away at all its
hotels since January 2013, every day from 6 to 9:30 — instant oatmeal, fruit, muffins, drinks (its announcement of
17 Jan 2013). So the counter in the place carries pump pots, cups, a basket of red apples, a basket of wrapped muffins,
packets of oatmeal and a card with the hours. The cups are plain (the real ones bore the hotel's name), the packets
plain colours.

Two other pictures of a red apple are **not** of the hotel: `IMG_0286`–`0287`, on a glass table by a window. The phone
stamps them 26 Sept 15:18, still on California's clock; he had left the hotel at about eleven the
night before, and `0288`–`0289`, taken there seventeen minutes later by the world's clock, are stamped 27 Sept 06:35 —
the phone had meanwhile taken the local time of the airport where he changed planes.

**What the folio adds.** Room 271; arrival 17 Aug 2015 (a taxi slip of that day is for the ride from the airport, and
his first photographs of the hotel, `0125`–`0127`, are of 19:45 that evening); the folio was printed at the desk at
10:52 PM on 25 Sept, and a second taxi slip of that day is for the ride back to the airport, a night earlier than the
departure the folio has. The place's cards say so; nothing else of those papers is used.

**The inside** follows the hotel's two pictures of its lobby and a traveller's of the desk, all of recent years; in 2015
it may have looked different. One of the hotel's pictures (taken from the room's west end) was fitted: the floor's and
the desk's lines meet at one point and the entrance door gives the scale (2.03 m), which puts its camera 1.2 m up,
1.75 m from the desk's wall, a hand from the west wall, turned 24° south of east. From it, in the place's frame:

| | m |
|---|---|
| the room | 7.65 long (x 21.9…29.55): the last studio's ground floor and the block's north part; 2.7 wide at its west end, 4.35 at the door |
| the wall the desk is in (its face to the guest) | z = −41.6 |
| the entrance door, in the east wall | z −43.35…−42.45 (the picture: −43.47…−42.52), glass with blinds each side, lights over it |
| a narrow shelf of pale wood | in the corner between the door's glass and the desk's wall; 0.3 square, 1.55 high |
| the desk's opening | from x = 24.0 to the east wall; cream wall to 0.85 m, a black front and ledge to 1.19 m, notched to 0.91 m over x 24.93…25.8, where one signs |
| the office's door, white, six panels | x 22.88…23.78, a lever on its east edge |
| the office behind | 2 m deep; its back wall red, a framed picture of a door mat 1.9 × 0.86 m on it toward the east end; a dark screen on its east wall; dark green cabinets under a black top |
| the ceiling | drops to 2.42 m over the desk and 0.85 m out from it, lights in the drop; a white moulding at the walls' heads |
| the counter | under the window at the west end of the north wall, 2 m long; two armchairs east of it |

Checked by rendering the place from that camera and setting it under the picture: the door, the shelf, the screen, the
red wall and its frame, the notch and the office's door fall where the picture has them, within about two hand-widths.
Not from the pictures: the framed mat is drawn plainly (a brown mat, the word WELCOME), the screens are blank, and the
walls carry no notices. The office's east end is lined 0.28 m in from the end wall: the sign tower, 3.6 m square on the
satellite picture, stands that far into the block in the place's frame, and the lining hides it.

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
not in the page; nor are the photographs of the bathroom found on the web: its tiles, stone and fittings are drawn
after their kind. Nor are the pictures of the lobby: the room is drawn after them plainly, the mat in its frame is a
brown mat with one word on it, the paper cups are blank. The receipts are not in the page, and of what they say only
the room's number and the days and hours of arriving and leaving are written anywhere.
