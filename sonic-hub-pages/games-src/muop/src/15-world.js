/* ── World: tiles + dynamic tile state. No DOM here (the solvability checker runs it in Node). ── */
const LEGEND = {
  '#': T.SOLID, '=': T.ONEWAY, '_': T.ICE, '^': T.SPIKE_U, 'v': T.SPIKE_D, '<': T.SPIKE_L, '>': T.SPIKE_R,
  'C': T.CRUMBLE, 'X': T.BREAK, 'H': T.FAKE, '?': T.BONUS, '+': T.BONUS_HEART, 'T': T.SWITCH,
  'a': T.SUN, 'b': T.MOON, 'K': T.DOOR_GOLD, 'J': T.DOOR_TEAL, '%': T.ALT,
};
/* Build the row array of a level from either a single map or horizontal chunks. */
function levelRows(def) {
  if (def.map) {
    const rows = def.map.replace(/^\n/, '').replace(/\n\s*$/, '').split('\n');
    const w = Math.max(...rows.map(r => r.length));
    return rows.map(r => r.padEnd(w, ' '));
  }
  const H = def.height;
  const out = Array.from({ length: H }, () => '');
  for (const ch of def.chunks) {
    const lines = ch.replace(/^\n/, '').replace(/\n\s*$/, '').split('\n');
    const w = Math.max(...lines.map(l => l.length));
    const pad = H - lines.length;
    if (pad < 0) throw new Error('chunk taller than level ' + def.id + ': ' + lines.length + ' > ' + H);
    for (let y = 0; y < H; y++) out[y] += (y < pad ? '' : lines[y - pad]).padEnd(w, ' ');
  }
  return out;
}
class World {
  constructor(def) {
    this.def = def;
    const rows = levelRows(def);
    this.rows = rows;
    this.h = rows.length; this.w = rows[0].length;
    this.tiles = new Uint8Array(this.w * this.h);
    this.ents = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const ch = rows[y][x] || ' ';
      if (LEGEND[ch] !== undefined) this.tiles[y * this.w + x] = LEGEND[ch];
      else if (ch !== ' ' && ch !== '.') { this.ents.push({ ch, x, y }); if (ch === 'r' || ch === 'R') this.tiles[y * this.w + x] = T.TURRET; }
    }
    this.pw = this.w * TILE; this.ph = this.h * TILE;
    this.sw = 0;                      // 0: sun blocks solid, 1: moon blocks solid
    this.crumble = new Map();         // idx -> {t, state: 0 shaking,1 fallen}
    this.ghost = new Set();           // switch blocks the player overlapped at toggle time
    this.platforms = [];
    this.swCooldown = 0;
  }
  idx(tx, ty) { return ty * this.w + tx; }
  code(tx, ty) {
    if (tx < 0 || tx >= this.w) return T.SOLID;
    if (ty < 0 || ty >= this.h) return T.EMPTY;
    return this.tiles[ty * this.w + tx];
  }
  isSolid(tx, ty, forPlayer) {
    if (tx < 0 || tx >= this.w) return true;
    if (ty < 0) return false;
    if (ty >= this.h) return false;
    const i = ty * this.w + tx, c = this.tiles[i];
    switch (c) {
      case T.SOLID: case T.ICE: case T.ALT: case T.BREAK: case T.BONUS: case T.BONUS_HEART: case T.USED:
      case T.SWITCH: case T.DOOR_GOLD: case T.DOOR_TEAL: case T.TURRET: return true;
      case T.CRUMBLE: { const s = this.crumble.get(i); return !s || s.state === 0; }
      case T.SUN: return this.sw === 0 && !(forPlayer && this.ghost.has(i));
      case T.MOON: return this.sw === 1 && !(forPlayer && this.ghost.has(i));
      default: return false;
    }
  }
  isOneWay(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h && this.tiles[ty * this.w + tx] === T.ONEWAY; }
  isIce(tx, ty) { return this.code(tx, ty) === T.ICE; }
  /* permanently solid (safe to respawn on) */
  isStable(tx, ty) { const c = this.code(tx, ty); return c === T.SOLID || c === T.ICE || c === T.ALT || c === T.ONEWAY; }
  isSpike(c) { return c >= T.SPIKE_U && c <= T.SPIKE_R; }
  /* spike hitboxes are smaller than the tile so grazing a corner is forgiven */
  spikeHit(x, y, w, h) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.01) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.01) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = this.code(tx, ty);
      if (!this.isSpike(c)) continue;
      let r;
      const bx = tx * TILE, by = ty * TILE;
      if (c === T.SPIKE_U) r = [bx + 2, by + 9, 12, 7];
      else if (c === T.SPIKE_D) r = [bx + 2, by, 12, 7];
      else if (c === T.SPIKE_L) r = [bx + 9, by + 2, 7, 12];
      else r = [bx, by + 2, 7, 12];
      if (x < r[0] + r[2] && x + w > r[0] && y < r[1] + r[3] && y + h > r[1]) return true;
    }
    return false;
  }
  toggleSwitch(player) {
    if (this.swCooldown > 0) return false;
    this.sw ^= 1; this.swCooldown = 16;
    // blocks that turn solid on top of the player become ghosts until he leaves them
    this.ghost.clear();
    if (player) {
      const x0 = Math.floor(player.x / TILE), x1 = Math.floor((player.x + player.w - 0.01) / TILE);
      const y0 = Math.floor(player.y / TILE), y1 = Math.floor((player.y + player.h - 0.01) / TILE);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
        const c = this.code(tx, ty);
        if ((c === T.SUN && this.sw === 0) || (c === T.MOON && this.sw === 1)) this.ghost.add(this.idx(tx, ty));
      }
    }
    return true;
  }
  updateGhosts(player) {
    if (!this.ghost.size) return;
    for (const i of [...this.ghost]) {
      const tx = i % this.w, ty = (i / this.w) | 0;
      const bx = tx * TILE, by = ty * TILE;
      if (!(player.x < bx + TILE && player.x + player.w > bx && player.y < by + TILE && player.y + player.h > by)) this.ghost.delete(i);
    }
  }
  /* door group: all connected door tiles of the same colour */
  doorGroup(tx, ty) {
    const c = this.code(tx, ty), out = [], seen = new Set(), st = [[tx, ty]];
    while (st.length) {
      const [x, y] = st.pop(), i = this.idx(x, y);
      if (seen.has(i) || this.code(x, y) !== c) continue;
      seen.add(i); out.push(i);
      st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return out;
  }
  stepTiles(onCrumbleFall) {
    if (this.swCooldown > 0) this.swCooldown--;
    for (const [i, s] of this.crumble) {
      s.t++;
      if (s.state === 0 && s.t >= 32) { s.state = 1; s.t = 0; if (onCrumbleFall) onCrumbleFall(i); }
      else if (s.state === 1 && s.t >= 200) { s.pendingRestore = true; }
    }
  }
  touchCrumble(tx, ty) {
    if (this.code(tx, ty) !== T.CRUMBLE) return;
    const i = this.idx(tx, ty);
    if (!this.crumble.has(i)) this.crumble.set(i, { t: 0, state: 0 });
  }
  restoreCrumbles(player) {
    for (const [i, s] of this.crumble) {
      if (!s.pendingRestore) continue;
      const tx = i % this.w, ty = (i / this.w) | 0, bx = tx * TILE, by = ty * TILE;
      if (player && player.x < bx + TILE && player.x + player.w > bx && player.y < by + TILE && player.y + player.h > by) continue;
      this.crumble.delete(i);
    }
  }
  snapshot() {
    const doors = [];
    for (let i = 0; i < this.tiles.length; i++) if (this.tiles[i] === T.DOOR_GOLD || this.tiles[i] === T.DOOR_TEAL) doors.push([i, this.tiles[i]]);
    return { sw: this.sw, doors };
  }
  restore(snap) {
    // close every door that was closed at the checkpoint
    for (const [i, c] of snap.doors) this.tiles[i] = c;
    this.sw = snap.sw; this.ghost.clear(); this.crumble.clear();
  }
}
