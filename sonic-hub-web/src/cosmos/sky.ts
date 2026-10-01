/* The approved demo's sky, ported verbatim: three-depth starfield with twinkle, slow drift,
   tinted stars, shooting stars, a gentle warp streak on travel; memory fragments; parallax. */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow = () => innerWidth < 860;

export const Sky = (() => {
  let cv: HTMLCanvasElement | null = null, ctx: CanvasRenderingContext2D | null = null;
  const COL: Record<string, string> = { white: '255,255,255', gold: '255,225,160', cyan: '170,236,255', rose: '255,190,230' };
  let W = 0, H = 0, mx = 0, my = 0, tmx = 0, tmy = 0, warp0 = 0, warp1 = 0, nextShoot = 2500, live = true, started = false;
  let stars: { x: number; y: number; z: number; s: number; a: number; tw: number; ph: number; c: string }[] = [];
  let shoot: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
  function build() {
    if (!cv || !ctx) return;
    const dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let seed = 1990; const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    stars = Array.from({ length: narrow() ? 170 : 380 }, () => { const z = r() ** 1.6, tint = r();
      return { x: r() * W, y: r() * H, z, s: .35 + z * 1.45, a: .22 + z * .78, tw: .4 + r() * 2.4, ph: r() * 6.283, c: tint < .07 ? 'gold' : tint < .13 ? 'cyan' : tint < .16 ? 'rose' : 'white' }; });
  }
  function draw(t: number) {
    if (!ctx) return;
    mx += (tmx - mx) * .035; my += (tmy - my) * .035;
    ctx.clearRect(0, 0, W, H);
    const k = t < warp1 ? Math.sin(Math.min(1, Math.max(0, (t - warp0) / (warp1 - warp0))) * Math.PI) : 0, cx = W * .52, cy = H * .48;
    for (const s of stars) {
      if (!reduce) { s.y -= .015 + s.z * .045; if (s.y < -4) { s.y = H + 4; s.x = Math.random() * W; } }
      const px = s.x - mx * s.z * 22, py = s.y - my * s.z * 14;
      const a = reduce ? s.a : s.a * (.62 + .38 * Math.sin(t / 1000 * s.tw + s.ph));
      if (k > .02) {
        const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1, len = k * (6 + s.z * 52) * (.4 + d / (W * .5));
        ctx.strokeStyle = `rgba(${COL[s.c]},${a * (.75 + k * .25)})`; ctx.lineWidth = s.s;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + dx / d * len, py + dy / d * len); ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(${COL[s.c]},${a})`; ctx.beginPath(); ctx.arc(px, py, s.s, 0, 6.283); ctx.fill();
        if (s.z > .82) { ctx.fillStyle = `rgba(${COL[s.c]},${a * .1})`; ctx.beginPath(); ctx.arc(px, py, s.s * 4.5, 0, 6.283); ctx.fill(); }
      }
    }
    if (!reduce) {
      if (!shoot && t > nextShoot) { shoot = { x: W * (.35 + Math.random() * .6), y: H * Math.random() * .4, vx: -(7 + Math.random() * 5), vy: 2.2 + Math.random() * 2, life: 0 }; nextShoot = t + 6500 + Math.random() * 9000; }
      if (shoot) {
        shoot.life++; shoot.x += shoot.vx; shoot.y += shoot.vy; const fade = Math.max(0, 1 - shoot.life / 65);
        const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 16, shoot.y - shoot.vy * 16);
        g.addColorStop(0, `rgba(255,255,255,${.95 * fade})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(shoot.x - shoot.vx * 16, shoot.y - shoot.vy * 16); ctx.stroke();
        if (shoot.life > 65) shoot = null;
      }
    }
  }
  function loop(t: number) { if (live) draw(t); if (!reduce) requestAnimationFrame(loop); }
  return {
    start(canvas: HTMLCanvasElement) {
      cv = canvas; ctx = canvas.getContext('2d'); build();
      if (started) return; started = true;
      addEventListener('resize', build); document.addEventListener('visibilitychange', () => { live = !document.hidden; });
      if (reduce) draw(0); else requestAnimationFrame(loop);
      if (!reduce) addEventListener('pointermove', (e) => {
        if (narrow()) return;
        const x = e.clientX / innerWidth * 2 - 1, y = e.clientY / innerHeight * 2 - 1, r = document.documentElement.style;
        r.setProperty('--mx', x.toFixed(3)); r.setProperty('--my', y.toFixed(3)); r.setProperty('--gx', e.clientX + 'px'); r.setProperty('--gy', e.clientY + 'px');
        tmx = x; tmy = y;
      }, { passive: true });
    },
    warp() { if (reduce) return; const t = performance.now(); warp0 = t; warp1 = t + 950; },
  };
})();

/* Your photos, drifting in the dark as memory fragments (cross-fade when the set changes). */
const SLOTS = [[3, 14, 190], [18, 62, 150], [66, 4, 180], [74, 40, 150], [56, 70, 210], [32, 82, 130], [44, 22, 120], [8, 38, 160], [80, 72, 130]];
export function setFragments(box: HTMLElement | null, srcs: string[]) {
  if (!box) return;
  const n = narrow() ? 4 : 9, pool = srcs.slice(0, n);
  [...box.children].forEach(el => { el.classList.add('out'); setTimeout(() => el.remove(), 1300); });
  pool.forEach((src, i) => {
    const [x, y, w] = SLOTS[i], f = document.createElement('figure'); f.className = 'frag';
    f.style.cssText = `left:${x}%;top:${y}%;width:${narrow() ? w * .7 : w}px;--d:${(.25 + ((i * 37) % 7) / 9).toFixed(2)};--dur:${38 + i * 6}s;--delay:${-i * 4.5}s;--r:${(i % 2 ? 1 : -1) * (2 + i % 4)}deg`;
    const img = document.createElement('img'); img.src = src; img.alt = ''; f.appendChild(img); box.appendChild(f);
    setTimeout(() => f.classList.add('in'), 120 + i * 140);
  });
}
