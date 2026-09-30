/* ── Input: keyboard + touch + gamepad merged into one state per frame ── */
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'jump', KeyK: 'jump', KeyX: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash', KeyJ: 'dash', KeyC: 'dash',
  Enter: 'confirm', Escape: 'pause', KeyP: 'pause', KeyM: 'map', Tab: 'map', Backspace: 'back',
};
class Input {
  constructor() {
    this.keys = {}; this.latch = {}; this.touch = {}; this.pad = {};
    this.prev = {}; this.state = {}; this.touchLatch = {}; this.taps = []; this.usingTouch = false; this.lastKind = 'key';
    addEventListener('keydown', e => {
      const k = KEYMAP[e.code];
      if (k) { if (!e.repeat) this.latch[k] = true; this.keys[k] = true; e.preventDefault(); this.lastKind = 'key'; if (this.usingTouch) this.setTouchMode(false); }
      this.onAny && this.onAny();
    }, { passive: false });
    addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) this.keys[k] = false; });
    addEventListener('blur', () => { this.keys = {}; this.touch = {}; });
  }
  bindTouch(root, canvas, toGame) {
    this.root = root; this.touchLatch = {};
    const ptrs = new Map();
    const zoneOf = (x, y) => {
      for (const el of root.querySelectorAll('[data-btn]')) {
        if (el.hidden || el.offsetParent === null) continue;
        const r = el.getBoundingClientRect(), pad = 14;
        if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) {
          if (el.dataset.btn === 'pad') return x < r.left + r.width / 2 ? 'left' : 'right';
          return el.dataset.btn;
        }
      }
      return null;
    };
    const recompute = () => {
      const t = {};
      for (const z of ptrs.values()) if (z) t[z] = true;
      this.touch = t;
      for (const el of root.querySelectorAll('[data-btn]')) {
        const b = el.dataset.btn;
        el.classList.toggle('on', b === 'pad' ? !!(t.left || t.right) : !!t[b]);
        if (b === 'pad') { el.classList.toggle('l', !!t.left); el.classList.toggle('r', !!t.right); }
      }
    };
    const down = e => {
      if (e.pointerType === 'mouse') return;
      this.setTouchMode(true); this.lastKind = 'touch';
      this.onAny && this.onAny();
      const z = zoneOf(e.clientX, e.clientY);
      if (z) { ptrs.set(e.pointerId, z); this.touchLatch[z] = true; e.preventDefault(); recompute(); }
      else { const g = toGame(e.clientX, e.clientY); if (g) this.taps.push(g); }
    };
    const move = e => { if (!ptrs.has(e.pointerId)) return; const z = zoneOf(e.clientX, e.clientY); const old = ptrs.get(e.pointerId); if (old === 'left' || old === 'right') { if (z === 'left' || z === 'right') ptrs.set(e.pointerId, z); } recompute(); e.preventDefault(); };
    const up = e => { if (ptrs.delete(e.pointerId)) recompute(); };
    root.addEventListener('pointerdown', down, { passive: false });
    root.addEventListener('pointermove', move, { passive: false });
    root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up); root.addEventListener('lostpointercapture', up);
    // mouse / pen clicks on the canvas act as taps for menus
    canvas.addEventListener('click', e => { const g = toGame(e.clientX, e.clientY); if (g) this.taps.push(g); this.onAny && this.onAny(); });
    root.addEventListener('contextmenu', e => e.preventDefault());
  }
  setTouchMode(on) { this.usingTouch = on; document.body.classList.toggle('touch', on); }
  pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = {};
    for (const gp of pads) {
      if (!gp) continue;
      const b = i => gp.buttons[i] && gp.buttons[i].pressed, ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (ax < -0.4 || b(14)) p.left = true; if (ax > 0.4 || b(15)) p.right = true;
      if (ay < -0.5 || b(12)) p.up = true; if (ay > 0.5 || b(13)) p.down = true;
      if (b(0)) p.jump = true; if (b(2) || b(1) || b(5) || b(7)) p.dash = true;
      if (b(9)) p.pause = true; if (b(8)) p.map = true; if (b(1)) p.back = true;
      if (Object.keys(p).length) { this.lastKind = 'pad'; if (this.usingTouch) this.setTouchMode(false); }
    }
    this.pad = p;
  }
  frame() {
    this.pollPad();
    const s = {};
    for (const k of ['left', 'right', 'up', 'down', 'jump', 'dash', 'confirm', 'pause', 'map', 'back'])
      s[k] = !!(this.keys[k] || this.latch[k] || this.touch[k] || this.touchLatch[k] || this.pad[k]);
    for (const k of Object.keys(s)) s[k + 'Pressed'] = s[k] && !this.prev[k];
    s.confirm = s.confirmPressed || s.jumpPressed;          // menus accept either
    s.taps = this.taps; this.taps = []; this.latch = {}; this.touchLatch = {};
    this.prev = Object.fromEntries(Object.keys(s).filter(k => !k.endsWith('Pressed')).map(k => [k, s[k]]));
    this.prev.confirm = !!(this.keys.confirm || this.touch.confirm || this.pad.confirm);
    this.state = s;
    return s;
  }
}
