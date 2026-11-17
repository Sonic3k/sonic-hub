# Commander Chess (Cờ Tư Lệnh): the rules as this game plays them

The game is by Nguyễn Quý Hải. This is the one set of rules used at every table of this game. `engine.js` is the
law: where this text and the engine differ, the engine is right, and the function to read is named in brackets.

## The board

Eleven files `a`–`k`, twelve ranks `1`–`12`. Pieces stand on the points, as in xiangqi. Red starts on ranks 1–5 and
moves first; Blue starts on ranks 8–12. The river runs between ranks 6 and 7.

| Ground | Where | Who may stand there |
|---|---|---|
| Sea (`WATER`) | files `a`, `b` | ships only (a plane may land on a friendly ship there) |
| Shore (`MIXED`) | file `c`, and the river mouth `d6 e6 d7 e7` | everything |
| Fords (`BRIDGE`) | `f6 f7 h6 h7` | everything but ships |
| Land (`LAND`) | everything else | everything but ships |

## The pieces

Ranges are in points. "Line" is along a file or a rank, "slant" is diagonal. A piece moves any number of points up
to its range, in one direction.

| Piece | Code | Each side | Moves | Takes | Points |
|---|---|---|---|---|---|
| Commander | C | 1 | any distance on a line | 1 on a line | 100 |
| Infantry | I | 2 | 1 on a line | same | 10 |
| Engineer | E | 2 (none in the short line-up) | 1 on a line | same | 10 |
| Militia | M | 1 | 1, line or slant | same | 10 |
| Anti-Air | G | 2 | 1 on a line | same | 10 |
| Tank | T | 2 | 2 on a line | same | 20 |
| Missile | S | 1 | 2 on a line, 1 on a slant | same | 20 |
| Artillery | A | 2 | 3, line or slant | same | 30 |
| Air Force | F | 2 | 4, line or slant | same | 40 |
| Navy | N | 2 | 4, line or slant, on sea and shore | 4 at a ship, 3 at anything else | 80 |
| Headquarters | H | 2 | does not move | does not take | 10 |

**What blocks a move** [`pathOK`]. Every point on the way has to be empty, except:

- A plane flies over everything. Air defence is what stops it (below).
- A ship needs sea or shore all the way, and only another ship in between stops it. It cannot cut the two corners
  of the river mouth (`c5`–`d6`, `c8`–`d7`).
- A land piece moving on a line passes over a ship that lies on a shore point (along a file: only when the whole
  way is shore).

**The river.** Artillery, Anti-Air and Missile (the heavy pieces) cross it by a plain move only along file `f` or
`h`, over the fords. They also cross anywhere by taking a piece on the far side, or on an Engineer's back (see
Riding). Everything else crosses anywhere.

## Taking

A move has one of these modes (`mMode`):

- `MOVE`: go to an empty point.
- `CAPTURE`: take the enemy on a point and stand there. The taker must be able to stand there, so nothing but a
  ship takes this way on the open sea.
- `STAY`: take without leaving one's place.
  - A plane may bomb anything except a plane and stay where it is (when it could also move in, it has the choice).
  - A Tank or a ship fires from its place when, and only when, it cannot go where the target is: a Tank at a ship
    out at sea, a ship at a piece inland.
  - Any other piece fires from its place only at a target standing on the sea.
  - The Commander never does.
- `SUICIDE`: a plane takes a target that stands inside enemy air defence and is lost with it.
- `INTERCEPT`: a plane flies at a target with other air defence on the way and is shot down before it gets there.
  The target lives. This is a legal move and almost always a blunder.
- `COMBINE`: go onto a friendly piece to make a stack (see Riding).
- `COMMIT`: end a deployment (see Riding).

**Line of fire** [`okAttack`]. Artillery and planes take over the heads of whatever stands in between. A ship's
missiles (at a ship, range 4) are stopped only by another ship in between; its guns (at anything else, range 3)
reach over everything. Everything else fires straight and is stopped by the first piece in the way, a Headquarters
included.

**A stack that is taken is lost whole**, carrier and riders.

## Air defence

Anti-Air guards every point within 1 of it, a Missile within 2, a ship within 1, its own point included (as the
crow flies: `dx² + dy² ≤ r²`) [`adMask`]. Only a piece standing by itself or carrying others defends; a piece
that is being carried does not. For an enemy plane [`airOutcome`]:

- A plain move may not end on a guarded point nor pass over one.
- Taking a piece on an unguarded point needs an unguarded way there, or the plane is shot down on the way
  (`INTERCEPT`).
- Taking a piece on a guarded point costs the plane (`SUICIDE`), unless a different defence, one that does not
  cover the target, lies on the way first: then it is shot down on the way (`INTERCEPT`).

## Riding (stacks)

A piece may move onto a friendly piece to ride with it (`COMBINE`); that is its move. A carrier takes two riders at
the most and nobody rides on a rider, so a stack is never more than three [`fits`, `carrierOf`].

| Carrier | May carry |
|---|---|
| Tank | Commander, Infantry, Militia |
| Air Force | Commander, Infantry, Militia, Tank (never two Tanks) |
| Navy | Commander, Infantry, Militia, Tank, Air Force (never two Tanks) |
| Engineer | one of Artillery, Anti-Air, Missile, and only to ferry it over the river: the two join on a river-bank point (ranks 6 and 7, off the fords and off the sea), and the loaded Engineer's only move is straight across to the other bank |
| Headquarters | the Commander |

A stack moves as its carrier moves and takes everyone along. A rider still threatens from where it rides: it can
give check from a stack, and become a hero there.

**Getting off (a deployment).** Pieces may leave a stack one after another in the same turn, each going or taking in
its own way, so a stack of three can strike three ways in one turn. A carrier may leave with some riders and without
others; a rider may leave by itself, or with another rider it can carry. One piece may also fire from the stack
without leaving it (`STAY`): that too opens a deployment, and is allowed only where every piece of the stack
could stand on that point by itself.

- The first move that leaves somebody behind opens the deployment. The same side then moves again, with pieces of
  that stack that have not acted yet, until it plays `COMMIT` or nobody is left to act [`play`, `commit`].
- Whatever stays behind must be able to stand on that point (riders cannot be left on the open sea without their
  ship), and what is left when the turn ends must make one valid stack.
- The Commander's safety (next section) is judged when the turn ends, not after each step. The two Commanders may
  not face each other after any step.

## The Commander

- The two Commanders may never face each other along an open file or rank. A move that leaves them so is illegal
  [`exposed`], and a Commander may not step onto or pass over a point the other looks straight at [`transitSafe`].
  A Commander that is riding (in a Tank, plane, ship or Headquarters) neither sees nor is seen.
- A side may not end its turn with its Commander where it could be taken [`inCheck`]. The Commander may pass over
  such a point on its way.
- Inside a Headquarters the Commander is safe from Infantry, Militia, Anti-Air and Missile: they cannot take that
  Headquarters. Everything else can.

## Heroes

When a turn ends, every piece of the side that moved that could now take the enemy Commander becomes a hero, for
the rest of the game [`promote`]. So does a side's last piece (the Commander not counted). A Commander is never a
hero. A hero:

- reaches one point further in every direction, slants included (a hero Infantry goes 2 on a line and 1 on a slant);
- defends the air one point wider;
- if a plane, is a stealth plane: no air defence touches it;
- if a Headquarters, moves and takes like a hero Infantry;
- is worth ten points more when taken.

## How a game ends

**Battles** (the usual game). A side has lost at once when [`lostBattle`]:

- its Commander is taken, or
- its last ship is gone, or
- its last plane is gone, or
- the last of its Infantry, Tanks and Artillery is gone.

If one move does this to both sides, the side that moved has won (a plane that goes down taking the last ship wins).

**Total war.** Only the Commander counts.

**In either game:**

- A Commander left with no piece at all has lost.
- A side with no legal move has lost, whether its Commander is attacked or not [`status`].
- After 100 quiet turns in a row (50 each) the game stops and the points decide [`onPoints`]. A turn is quiet when
  it is plain moves only: nothing taken, no stack joined, no new hero.
- When the same position, with the same side to move, stands for the third time at the end of a turn, the game
  stops and the points decide. The table keeps this count, not the engine.
- **On points:** each side scores the table's points for every enemy piece gone, ten more for a hero. More points
  wins; level points are a draw.

## Line-ups

Standard, 19 a side. Red (Blue is the same mirrored, rank `r` becoming `13 − r`):

    Commander g1 · Navy b2 c4 · Air Force e2 i2 · Headquarters f2 h2 · Artillery d3 j3 · Missile g3
    Anti-Air e4 i4 · Tank f4 h4 · Infantry c5 k5 · Engineer d5 j5 · Militia g5

The short line-up (`lineup: 'light'`), 17 a side, is the same without the Engineers. Some tables of the game use it.
