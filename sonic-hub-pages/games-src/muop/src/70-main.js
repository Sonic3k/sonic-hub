/* ── Game: state machine, save data, sizing, loop ── */
const SAVE_KEY = 'muop-12-den.v1';
let ART = null;
class Game {
  constructor(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.audio = new Audio(); this.input = new Input();
    this.save = this.load(); this.applySound();
    this.screens = { title: new TitleScreen(this), howto: new HowToScreen(this), map: new MapScreen(this), clear: new ClearScreen(this), ending: new EndingScreen(this) };
    this.pauseMenu = new PauseMenu(this);
    this.state = 'title'; this.level = null; this.paused = null; this.automap = false; this.fade = null; this.t = 0;
    this.input.onAny = () => { this.audio.init(); if (!this.audio.want) this.audio.music('title'); };
  }
  freshSave() { return { v: 1, unlocked: 1, abilities: { wall: false, dash: false }, levels: {}, sfx: true, music: true }; }
  load() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 1) return Object.assign(this.freshSave(), s); } catch (e) { } return this.freshSave(); }
  persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch (e) { } }
  hasProgress() { return this.save.unlocked > 1 || Object.keys(this.save.levels).length > 0; }
  resetSave() { const keep = { sfx: this.save.sfx, music: this.save.music }; this.save = Object.assign(this.freshSave(), keep); this.persist(); }
  applySound() { this.audio.setSfx(this.save.sfx); this.audio.setMusic(this.save.music); }
  go(state, arg) {
    if (this.fade) return;
    this.fade = { t: 0, mid: () => {
      this.state = state; this.paused = null; this.automap = false;
      if (state === 'map') { this.level = null; this.screens.map.enter(arg); }
      if (state === 'title') { this.screens.title.sel = 0; this.screens.title.confirmNew = false; this.audio.music('title'); }
      if (state === 'howto') this.screens.howto.t = 0;
      if (state === 'ending') this.screens.ending.enter();
    } };
  }
  startLevel(id) {
    if (this.fade) return;
    this.fade = { t: 0, mid: () => {
      const def = LEVELS[id - 1];
      this.level = new Level(this, def); this.state = 'play'; this.paused = null; this.automap = false;
      this.audio.music(def.music || THEMES[def.theme].music); this.audio.duck(false);
    } };
  }
  levelComplete(L) {
    const S = this.save, id = L.def.id, prev = S.levels[id] || {};
    const first = !prev.done;
    const stars = [0, 1, 2].map(i => !!((prev.stars || [])[i] || L.stats.stars[i]));
    S.levels[id] = { done: true, stars, best: prev.best ? Math.min(prev.best, L.stats.time) : L.stats.time, flies: Math.max(prev.flies || 0, L.stats.flies) };
    S.unlocked = Math.max(S.unlocked, Math.min(12, id + 1));
    this.persist();
    this.state = 'clear'; this.screens.clear.enter(L, first);
    this.audio.music('title');
  }
  afterClear(L) {
    const id = L.def.id;
    if (id === 12 && !this.save.sawEnding) { this.save.sawEnding = true; this.persist(); this.go('ending'); return; }
    this.go('map', Math.min(11, id));
    const M = this.screens.map; setTimeout(() => { M.lightAnim = { i: id - 1, t: 0 }; }, 300);
  }
  ghostControls() {
    if (!this.input.usingTouch) return;
    const L = this.level, els = this._tBtns || (this._tBtns = [...document.querySelectorAll('#touch [data-btn]')]);
    let px = -1e4, py = -1e4;
    if (this.state === 'play' && L) { const r = this.cv.getBoundingClientRect(); px = r.left + (L.player.cx - L.cam.x) / V.W * r.width; py = r.top + (L.player.cy - L.cam.y) / V.H * r.height; }
    for (const el of els) {
      const b = el.getBoundingClientRect(), near = px > b.left - 24 && px < b.right + 24 && py > b.top - 30 && py < b.bottom + 20;
      el.style.opacity = near ? '0.28' : '';
    }
  }
  update(inp) {
    this.t++;
    if (this.fade) {
      this.fade.t++;
      if (this.fade.t === 14) this.fade.mid();
      if (this.fade.t >= 28) this.fade = null;
      inp = { ...inp, taps: [] };
      if (this.fade) return;
    }
    const b = document.body;
    if (this.state === 'play') {
      const L = this.level;
      if (this.paused) { this.pauseMenu.update(inp); }
      else if (this.automap) { this.mapT++; if (inp.mapPressed || inp.pausePressed || inp.backPressed || inp.confirm || inp.taps.length) { this.automap = false; this.audio.sfx('back'); } }
      else if (inp.pausePressed && (L.state === 'run')) { this.paused = true; this.pauseMenu.sel = 0; this.audio.duck(true); this.audio.sfx('select'); }
      else if (inp.mapPressed && L.def.maze && L.state === 'run') { this.automap = true; this.mapT = 0; this.audio.sfx('map'); }
      else L.update(inp);
      if (this.level) {
        b.classList.toggle('playing', !this.paused && !this.automap && this.level.state !== 'clear');
        b.classList.toggle('maze', !!this.level.def.maze);
      }
    } else {
      b.classList.remove('playing');
      this.screens[this.state].update(inp);
    }
    b.classList.toggle('has-dash', !!this.save.abilities.dash);
    b.classList.toggle('at-title', this.state === 'title');
  }
  draw() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    if (this.state === 'play' && this.level) {
      const L = this.level;
      L.draw(ctx);
      if (L.state !== 'clear') { drawHUD(ctx, L); drawSign(ctx, L); if (!this.paused && !this.automap && L.state !== 'banner') drawTitleCard(ctx, L); }
      if (L.state === 'banner') drawBanner(ctx, L);
      if (this.automap) drawAutomap(ctx, L, this.mapT);
      if (this.paused) this.pauseMenu.draw(ctx);
    } else this.screens[this.state].draw(ctx);
    this.ghostControls();
    if (this.fade) { const k = this.fade.t < 14 ? this.fade.t / 14 : 1 - (this.fade.t - 14) / 14; ctx.fillStyle = `rgba(11,8,18,${clamp(k, 0, 1)})`; ctx.fillRect(0, 0, V.W, V.H); }
  }
}
function boot() {
  const cv = document.getElementById('game');
  ART = { hero: buildHero(), enemies: buildEnemies(), items: buildItems() };
  const game = window.game = new Game(cv);
  const stage = document.getElementById('stage');
  let cssScale = 1;
  const resize = () => {
    const vv = window.visualViewport, vw0 = vv ? vv.width : innerWidth, vh0 = vv ? vv.height : innerHeight;
    const cs = getComputedStyle(document.getElementById('safe')), pad = k => parseFloat(cs['padding' + k]) || 0;
    const sl = pad('Left'), sr = pad('Right'), st = pad('Top'), sb = pad('Bottom');
    const vw = vw0 - sl - sr, vh = vh0 - st - sb;
    const coarse = game.input.usingTouch || matchMedia('(pointer: coarse)').matches;
    const portrait = coarse && vh > vw * 1.05;
    const aw = vw, ah = portrait ? Math.max(200, vh - 250) : vh;
    stage.style.padding = portrait ? '' : `${st}px ${sr}px ${sb}px ${sl}px`;
    let w = Math.round(clamp(VIEW_H * aw / ah, 320, 560)); if (w % 2) w++;
    V.W = w; V.H = VIEW_H;
    cssScale = Math.min(aw / V.W, ah / V.H);
    if (cv.width !== V.W) cv.width = V.W;
    if (cv.height !== V.H) cv.height = V.H;
    cv.style.width = Math.floor(V.W * cssScale) + 'px'; cv.style.height = Math.floor(V.H * cssScale) + 'px';
    document.body.classList.toggle('portrait', portrait);
    UI.s = cssScale < 2.3 ? 2 : 1;
    game.draw();
  };
  addEventListener('resize', resize);
  if (window.visualViewport) visualViewport.addEventListener('resize', resize);
  addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' && !game.input.usingTouch) { game.input.setTouchMode(true); resize(); } }, true);
  const toGame = (x, y) => { const r = cv.getBoundingClientRect(); const gx = (x - r.left) / r.width * V.W, gy = (y - r.top) / r.height * V.H; return gx >= 0 && gy >= 0 && gx <= V.W && gy <= V.H ? { x: gx, y: gy } : { x: -1, y: -1 }; };
  game.input.bindTouch(document.getElementById('touch'), cv, toGame);
  resize();
  { const h = document.getElementById('home'); if (h && (!/game-muop\.html$/.test(location.pathname) || /claude/.test(location.hostname))) h.remove(); }
  let last = performance.now(), acc = 0;
  const STEP = 1000 / 60;
  const loop = now => {
    requestAnimationFrame(loop);
    acc += Math.min(100, now - last); last = now;
    let n = 0;
    while (acc >= STEP && n < 4) { game.update(game.input.frame()); acc -= STEP; n++; }
    if (n === 4) acc = 0;
    if (n) game.draw();
  };
  requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'play' && game.level && game.level.state === 'run' && !game.paused) { game.paused = true; game.pauseMenu.sel = 0; } if (game.audio.ctx) { if (document.hidden) game.audio.ctx.suspend(); else game.audio.ctx.resume(); } });
}
