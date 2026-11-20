/* ── the places ──
   Eight of them: the house where the game was first played, and seven lands, one for each colour of ball. The rules
   are the same everywhere (engine/rules.js); a place is only how the game looks, moves and sounds there.

   A place is described by one object, and the files after this one (41 to 48) add theirs with place({...}):

     id, hue            its key, and the colour it wears on the map and on its buttons
     colour             which of the seven colours it is the land of (0 red … 6 violet); null for the house
     name, tag          { vi, en }
     dress              its table's own colours: ink, soft, panel, edge, accent, num
     inks               the seven colours as they are mixed there (the flying bits and the map use them)
     frame, ballR       how thick the board's frame is (a share of its side), how big a ball (a share of a square)
     lamps              true: its numbers are shown in lamps of seven bars (the house's are)
     voice              { kind, root, scale, wet }: what its notes are made of (30-audio.js)

   what it paints once:
     backdrop(c, w, h, box)   what is behind the table. box: where the board lies in it, so that nothing that could
                              be taken for a piece is painted there
     board(c, g)        the board. g: { S: its side, pad: the frame, cell: one square } in CSS pixels, and ox, oy:
                        where the board begins in the window
     ball(c, i, r)      a ball of colour i, centred on 0,0, of radius r
     seed(c, i, r)      how a ball to come is shown where it will come up (left out: the ball itself, small)
     emblem(c, r)       what stands for it on the map (left out: the ball of its own colour)

   what moves, painted every frame:
     air                what moves in the air there, or null: { make(w, h) → things, draw(c, things, t, dt, w, h, box) }
                        (box as for the backdrop: the board hides what is painted behind it)
     over(c, g, t)      what passes over the board and the balls alike (shade, light through water)
     under(c, x, y, cell, ms, i)   the mark under the ball that is picked, ms after it was (left out: a ring)
     floor(c, b, x, y, R, k, a)    what a ball throws on the ground beside its shade (the light through a marble)
     shadow             the shade under a ball: { a, w, h, y } in shares of its radius, or null
     glow               the light a ball gives off: { r, a }, or null
     pose(b, t, p)      how a ball holds itself at time t: fills p (dx, dy in squares; sx, sy; rot; lift in squares;
                        k: its size; a; glow). b.picked, b.pickT, b.moving, b.roll (squares gone), b.phase (0..1,
                        its own) say what it is doing
     leave(b, u, p)     how a ball that was taken goes, u from 0 to 1 over leaveMs (left out: it swells and is gone)

   the bits it throws (20-fx.js), each at x, y in the board's pixels:
     trail(x, y, i, cell, k, path)   what a moving ball leaves on square k of its way
     land(x, y, i, cell)             as it stops
     burst(x, y, i, cell, n)         as it is taken, one of n
     rise(x, y, i, cell)             as it comes up

   Colours go by number: 0 red, 1 orange, 2 yellow, 3 green, 4 blue, 5 indigo, 6 violet: the rainbow as it is
   counted in Vietnamese (đỏ, cam, vàng, lục, lam, chàm, tím). */
const PLACES = [];
const RAINBOW = ['#e23b3f', '#f58a1f', '#f6cf2e', '#3fae4a', '#30b6e6', '#3b4cc6', '#a84fd4'];
function place(def) {
  def.no = PLACES.length;
  def.frame = def.frame == null ? .03 : def.frame;
  def.ballR = def.ballR || .4;
  def.inks = def.inks || RAINBOW;
  if (def.shadow === undefined) def.shadow = { a: .3, w: .9, h: .26, y: .86 };
  def.pose = def.pose || hopPose();
  PLACES.push(def);
}
const placeById = id => PLACES.find(p => p.id === id) || PLACES[0];

/** A ball that hops on its square while it is picked: up, down, flat for a moment, up again.
 *  o: { ms: one hop, high: how high in squares, flat: how flat it lands, spin: turns a second while picked } */
function hopPose(o) {
  o = o || {};
  const ms = o.ms || 620, high = o.high == null ? .17 : o.high, flat = o.flat == null ? .2 : o.flat;
  return (b, t, p) => {
    if (!b.picked) return;
    const u = ((t - b.pickT) % ms) / ms;
    hop(u, high, flat, p);
    if (o.spin) p.rot = (t - b.pickT) / 1000 * o.spin * TAU;
  };
}
/** one hop, u from 0 to 1: the first tenth and the last it is on the ground, pressed flat; between them in the air */
function hop(u, high, flat, p) {
  const g = .16;
  if (u < g) { const k = Math.sin(u / g * Math.PI); p.sy = 1 - flat * k; p.sx = 1 + flat * .7 * k; return; }
  const a = (u - g) / (1 - g), up = 4 * a * (1 - a), fast = Math.abs(1 - 2 * a);
  p.lift = high * up; p.sy = 1 + flat * .45 * fast * fast; p.sx = 1 - flat * .3 * fast * fast;
}
