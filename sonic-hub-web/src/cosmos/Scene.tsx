/* The living sky behind everything. Static layers (nebula, galaxy, planet, moons) are
   painted once per theme; stars twinkle, the galaxy turns, shooting stars cross, and every
   layer leans with the cursor at its own depth. */
import { useEffect, useRef } from 'react';
import type { Theme } from './themes';
import { makeNoise, hex, mixRGB } from './noise';
import { paintPlanet } from './planet';
import { mulberry32 } from '../lib/rng';

interface Props { theme: Theme; showPlanet?: boolean; dim?: number }

const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
if (typeof window !== 'undefined') addEventListener('pointermove', (e) => { if (innerWidth < 860) return; mouse.tx = e.clientX / innerWidth * 2 - 1; mouse.ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });

interface Star { x: number; y: number; z: number; s: number; a: number; tw: number; ph: number; c: string }
interface Built { W: number; H: number; dpr: number; bg: HTMLCanvasElement; galaxy: HTMLCanvasElement; planet: HTMLCanvasElement | null; planetR: number; moons: { c: HTMLCanvasElement; x: number; y: number }[]; stars: Star[]; flares: Star[]; flare: HTMLCanvasElement }

export default function Scene({ theme, showPlanet = true, dim = 0 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null), built = useRef<Built | null>(null);

  useEffect(() => {
    let raf = 0, alive = true, angle = 0, last = performance.now(), shoot: { x: number; y: number; vx: number; vy: number; life: number } | null = null, nextShoot = last + 3000;
    const cv = ref.current!, ctx = cv.getContext('2d')!;
    const build = () => {
      const dpr = Math.min(1.5, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
      built.current = paint(theme, W, H, dpr, showPlanet);
    };
    build();
    let rt: number | undefined;
    const onResize = () => { clearTimeout(rt); rt = window.setTimeout(build, 180); };
    addEventListener('resize', onResize);

    const frame = (t: number) => {
      if (!alive) return;
      const B = built.current!; const dt = Math.min(64, t - last); last = t;
      mouse.x += (mouse.tx - mouse.x) * .04; mouse.y += (mouse.ty - mouse.y) * .04;
      const { W, H, dpr } = B, mx = mouse.x, my = mouse.y;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(B.bg, -12 - mx * 6, -12 - my * 4, W + 24, H + 24);
      // galaxy, slowly turning
      angle += reduce ? 0 : dt * .000012;
      const g = theme.galaxy, gs = Math.min(W, H) * g.r * 2.2;
      ctx.save(); ctx.translate(W * g.x - mx * 14, H * g.y - my * 9); ctx.scale(1, g.tilt); ctx.rotate(angle); ctx.globalAlpha = .9;
      ctx.drawImage(B.galaxy, -gs / 2, -gs / 2, gs, gs); ctx.restore(); ctx.globalAlpha = 1;
      // stars
      for (const s of B.stars) {
        const a = reduce ? s.a : s.a * (.6 + .4 * Math.sin(t / 1000 * s.tw + s.ph));
        ctx.fillStyle = `rgba(${s.c},${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(s.x - mx * s.z * 20, s.y - my * s.z * 13, s.s, 0, 6.283); ctx.fill();
      }
      for (const f of B.flares) {
        const k = reduce ? 1 : .7 + .3 * Math.sin(t / 900 * f.tw + f.ph), sz = f.s * k;
        ctx.globalAlpha = f.a * k; ctx.drawImage(B.flare, f.x - mx * 26 - sz / 2, f.y - my * 17 - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
      // the year's planet and its moons
      if (B.planet) {
        const p = theme.planetAt, bob = reduce ? 0 : Math.sin(t / 4200) * 4, sc = Math.min(W, H) * p.r / B.planetR;
        const pw = B.planet.width * sc, ph = B.planet.height * sc;
        ctx.drawImage(B.planet, W * p.x - pw / 2 - mx * 30, H * p.y - ph / 2 - my * 20 + bob, pw, ph);
        for (const m of B.moons) ctx.drawImage(m.c, m.x - mx * 40 - m.c.width / dpr / 2, m.y - my * 26 - m.c.height / dpr / 2 - bob * .6, m.c.width / dpr, m.c.height / dpr);
      }
      // a shooting star now and then
      if (!reduce) {
        if (!shoot && t > nextShoot) { shoot = { x: W * (.3 + Math.random() * .65), y: H * Math.random() * .35, vx: -(8 + Math.random() * 5), vy: 2.4 + Math.random() * 2.2, life: 0 }; nextShoot = t + 6000 + Math.random() * 9000; }
        if (shoot) {
          shoot.life++; shoot.x += shoot.vx; shoot.y += shoot.vy; const f = Math.max(0, 1 - shoot.life / 60);
          const gr = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 16, shoot.y - shoot.vy * 16);
          gr.addColorStop(0, `rgba(255,255,255,${.95 * f})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = gr; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(shoot.x - shoot.vx * 16, shoot.y - shoot.vy * 16); ctx.stroke();
          if (shoot.life > 60) shoot = null;
        }
      }
      if (dim > 0) { ctx.fillStyle = `rgba(3,2,12,${dim})`; ctx.fillRect(0, 0, W, H); }
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onVis = () => { if (document.hidden) cancelAnimationFrame(raf); else if (!reduce) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    document.addEventListener('visibilitychange', onVis);
    return () => { alive = false; cancelAnimationFrame(raf); removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis); clearTimeout(rt); };
  }, [theme.key, showPlanet, dim]); // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={ref} className="scene" aria-hidden="true" />;
}

/* ── painting the static layers ───────────────────────────────────────────── */
function paint(theme: Theme, W: number, H: number, dpr: number, showPlanet: boolean): Built {
  const R = mulberry32(theme.seed), N = makeNoise(theme.seed), m = Math.min(W, H);
  // background + nebula
  const bg = document.createElement('canvas'); bg.width = Math.round((W + 24) * dpr); bg.height = Math.round((H + 24) * dpr);
  const b = bg.getContext('2d')!; b.scale(dpr, dpr);
  const grd = b.createLinearGradient(0, 0, W * .3, H); grd.addColorStop(0, theme.bg[0]); grd.addColorStop(1, theme.bg[1]);
  b.fillStyle = grd; b.fillRect(0, 0, W + 24, H + 24);
  const nw = Math.ceil((W + 24) / 4), nh = Math.ceil((H + 24) / 4), neb = document.createElement('canvas'); neb.width = nw; neb.height = nh;
  const nc = neb.getContext('2d')!, img = nc.createImageData(nw, nh), d = img.data;
  const [c1, c2, c3] = theme.neb.map(hex), f = 3.2 / Math.max(nw, nh), ox = R() * 100, oy = R() * 100;
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    const X = x * f + ox, Y = y * f + oy;
    const n = N.fbm2(X, Y, 6), mm = N.fbm2(X * .7 + 40, Y * .7 + 40, 4), k = N.fbm2(X * 1.4 + 80, Y * 1.4, 3), lane = N.ridge2(X * 1.8 + 20, Y * 1.8, 4);
    let den = Math.max(0, (n - .38) * 2.3); den = Math.pow(Math.min(1, den), 1.35);
    den *= 1 - Math.min(.85, Math.max(0, (lane - .74) * 3.4));
    let col = mixRGB(c1, c2, Math.min(1, Math.max(0, (mm - .35) * 2)));
    col = mixRGB(col, c3, Math.min(1, Math.max(0, (k - .56) * 3)));
    const i = (y * nw + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = den * 235;
  }
  nc.putImageData(img, 0, 0);
  b.save(); b.globalCompositeOperation = 'screen'; b.filter = 'blur(10px)'; b.drawImage(neb, 0, 0, W + 24, H + 24); b.filter = 'blur(2px)'; b.globalAlpha = .45; b.drawImage(neb, 0, 0, W + 24, H + 24); b.restore();
  // bright cores inside the clouds
  b.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const x = R() * W, y = R() * H, rr = m * (.12 + R() * .2), col = theme.neb[i % 3], cg = b.createRadialGradient(x, y, 0, x, y, rr);
    cg.addColorStop(0, col + '40'); cg.addColorStop(1, col + '00'); b.fillStyle = cg; b.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  b.globalCompositeOperation = 'source-over';
  // galaxy
  const gs = Math.round(m * theme.galaxy.r * 2.2 * dpr), galaxy = document.createElement('canvas'); galaxy.width = gs; galaxy.height = gs;
  const gx = galaxy.getContext('2d')!, gc = gs / 2; gx.globalCompositeOperation = 'lighter';
  const core = gx.createRadialGradient(gc, gc, 0, gc, gc, gs * .2); core.addColorStop(0, 'rgba(255,248,230,.95)'); core.addColorStop(.3, `hsla(${theme.galaxy.hue},90%,75%,.45)`); core.addColorStop(1, 'rgba(0,0,0,0)');
  gx.fillStyle = core; gx.fillRect(0, 0, gs, gs);
  const arms = theme.galaxy.arms;
  for (let i = 0; i < 4200; i++) {
    const arm = i % arms, t = Math.pow(R(), .62), rad = t * gs * .46, spread = (R() - .5 + (R() - .5)) * (.45 * (1 - t) + .16);
    const th = arm * Math.PI * 2 / arms + t * 3.6 + spread, x = gc + Math.cos(th) * rad, y = gc + Math.sin(th) * rad;
    const l = 92 - t * 32; gx.fillStyle = `hsla(${(theme.galaxy.hue + t * 40) % 360},85%,${l}%,${(.5 - t * .3).toFixed(2)})`;
    gx.beginPath(); gx.arc(x, y, (.6 + R() * 1.1) * dpr, 0, 6.283); gx.fill();
  }
  const glowC = document.createElement('canvas'); glowC.width = glowC.height = gs; const gg = glowC.getContext('2d')!;
  gg.filter = `blur(${Math.max(3, gs / 70)}px)`; gg.drawImage(galaxy, 0, 0);
  gx.globalAlpha = .9; gx.drawImage(glowC, 0, 0); gx.globalAlpha = 1;
  // stars
  const tints = ['255,255,255', '255,255,255', '255,255,255', hex(theme.star).join(','), '255,236,200', '200,224,255'];
  const stars: Star[] = Array.from({ length: Math.round(W * H / 2600) }, () => { const z = Math.pow(R(), 1.7); return { x: R() * W, y: R() * H, z, s: .3 + z * 1.3, a: .25 + z * .7, tw: .4 + R() * 2.4, ph: R() * 6.28, c: tints[Math.floor(R() * tints.length)] }; });
  const flares: Star[] = Array.from({ length: 10 }, () => ({ x: R() * W, y: R() * H * .8, z: 1, s: 16 + R() * 26, a: .55 + R() * .45, tw: .5 + R(), ph: R() * 6.28, c: '' }));
  const flare = document.createElement('canvas'); flare.width = flare.height = 64; const fx = flare.getContext('2d')!;
  const fg = fx.createRadialGradient(32, 32, 0, 32, 32, 32); fg.addColorStop(0, 'rgba(255,255,255,1)'); fg.addColorStop(.12, 'rgba(255,255,255,.7)'); fg.addColorStop(.35, `rgba(${hex(theme.star).join(',')},.18)`); fg.addColorStop(1, 'rgba(0,0,0,0)');
  fx.fillStyle = fg; fx.fillRect(0, 0, 64, 64); fx.fillStyle = 'rgba(255,255,255,.8)'; fx.fillRect(31.4, 2, 1.2, 60); fx.fillRect(2, 31.4, 60, 1.2);
  // planet + moons
  let planet: HTMLCanvasElement | null = null, planetR = 1; const moons: Built['moons'] = [];
  if (showPlanet) {
    const pr = Math.min(320, m * theme.planetAt.r * dpr);
    planet = paintPlanet(theme.planet, pr); planetR = pr;
    const px = W * theme.planetAt.x, py = H * theme.planetAt.y;
    for (let i = 0; i < theme.moons; i++) {
      const mr = m * (.016 + R() * .014) * dpr, ang = -2.25 + R() * .6, dist = m * theme.planetAt.r * (1.3 + R() * .2);
      const mc = paintPlanet({ type: R() < .5 ? 'rocky' : 'ice', colors: ['#5A5A6E', '#9A9AB0', '#D8D8E8', '#F2F2F8'], seed: theme.seed + i * 101, atmo: '#C8C8E0' }, mr);
      moons.push({ c: mc, x: px + Math.cos(ang) * dist, y: py + Math.sin(ang) * dist });
    }
  }
  return { W, H, dpr, bg, galaxy, planet, planetR, moons, stars, flares, flare };
}
