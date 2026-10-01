/* Procedural planets, painted once per spec and cached: lit sphere with a real surface
   (gas bands with a storm, rock, ocean & land, ice, lava), glowing atmosphere, and rings
   that pass behind and in front of the body. */
import { makeNoise, hex, ramp, mixRGB } from './noise';

export type PlanetType = 'gas' | 'rocky' | 'ocean' | 'ice' | 'lava';
export interface PlanetSpec { type: PlanetType; colors: string[]; seed: number; atmo: string; ring?: { colors: string[]; tilt: number }; spot?: boolean }

const cache = new Map<string, HTMLCanvasElement>();

/** Returns a canvas; the planet body has radius `r` and sits at the canvas center. Ring/glow fit around it. */
export function paintPlanet(spec: PlanetSpec, r: number): HTMLCanvasElement {
  const key = JSON.stringify(spec) + '|' + Math.round(r);
  const hit = cache.get(key); if (hit) return hit;
  const pad = spec.ring ? 2.35 : 1.45, W = Math.ceil(r * 2 * pad), H = Math.ceil(r * 2 * (spec.ring ? 1.25 : pad));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!, cx = W / 2, cy = H / 2;

  // atmosphere halo behind the body
  const atmo = hex(spec.atmo);
  const halo = g.createRadialGradient(cx, cy, r * .9, cx, cy, r * 1.32);
  halo.addColorStop(0, `rgba(${atmo},.55)`); halo.addColorStop(.35, `rgba(${atmo},.18)`); halo.addColorStop(1, `rgba(${atmo},0)`);
  g.fillStyle = halo; g.beginPath(); g.arc(cx, cy, r * 1.32, 0, Math.PI * 2); g.fill();

  if (spec.ring) drawRing(g, cx, cy, r, spec.ring, 'back');
  g.drawImage(surface(spec, r), cx - r, cy - r);

  // limb light: a thin bright rim on the lit side
  const rim = g.createRadialGradient(cx - r * .25, cy - r * .2, r * .2, cx, cy, r * 1.01);
  rim.addColorStop(.86, 'rgba(255,255,255,0)'); rim.addColorStop(.985, `rgba(${atmo},.55)`); rim.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rim; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();

  if (spec.ring) drawRing(g, cx, cy, r, spec.ring, 'front');
  cache.set(key, c);
  return c;
}

function surface(spec: PlanetSpec, r: number): HTMLCanvasElement {
  const S = Math.ceil(r * 2), c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d')!, img = g.createImageData(S, S), d = img.data;
  const N = makeNoise(spec.seed), cols = spec.colors.map(hex);
  const L = [-.56, -.46, .69], night = [8, 6, 22];
  const tilt = .35, ct = Math.cos(tilt), st = Math.sin(tilt);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const nx = (x + .5) / r - 1, ny = (y + .5) / r - 1, dd = nx * nx + ny * ny;
    if (dd > 1) continue;
    const nz = Math.sqrt(1 - dd);
    // tilt the sphere so bands lean like a real world
    const tx = nx * ct - ny * st, ty = nx * st + ny * ct;
    let col: number[];
    switch (spec.type) {
      case 'gas': {
        const turb = N.fbm3(tx * 2.2, ty * 2.2, nz * 2.2, 4);
        const v = .5 + .5 * Math.sin(ty * 9.5 + turb * 6.5 + N.fbm3(tx * 6, ty * 14, nz * 6, 3) * 2);
        col = ramp(cols, v);
        if (spec.spot) { const sx = (tx - .32) / .26, sy = (ty - .18) / .12, sd = sx * sx + sy * sy; if (sd < 1) col = mixRGB(col, mixRGB(cols[cols.length - 1], [255, 255, 255], .25), (1 - sd) * .75); }
        break;
      }
      case 'ocean': {
        const h = N.fbm3(tx * 2.4 + 3, ty * 2.4, nz * 2.4, 5);
        col = h < .5 ? mixRGB(cols[0], cols[1], Math.max(0, (h - .25) / .25)) : ramp([cols[2], cols[3] ?? cols[2], [235, 235, 225]], (h - .5) / .38);
        const cloud = N.fbm3(tx * 4 + 9, ty * 4, nz * 4, 4); if (cloud > .58) col = mixRGB(col, [250, 250, 255], Math.min(1, (cloud - .58) * 3.2) * .85);
        break;
      }
      case 'ice': {
        const h = N.fbm3(tx * 3, ty * 3, nz * 3, 5), cr = 1 - Math.abs(N.fbm3(tx * 7 + 4, ty * 7, nz * 7, 3) * 2 - 1);
        col = ramp(cols, h); if (cr > .86) col = mixRGB(col, cols[cols.length - 1], (cr - .86) * 5);
        break;
      }
      case 'lava': {
        const h = N.fbm3(tx * 3, ty * 3, nz * 3, 5), cr = 1 - Math.abs(N.fbm3(tx * 5 + 2, ty * 5, nz * 5, 4) * 2 - 1);
        col = mixRGB(cols[0], cols[1], h);
        if (cr > .8) col = mixRGB(col, cr > .9 ? [255, 236, 170] : cols[2], Math.min(1, (cr - .8) * 6));
        break;
      }
      default: {
        const h = N.fbm3(tx * 2.6, ty * 2.6, nz * 2.6, 5); col = ramp(cols, h);
        const crater = N.fbm3(tx * 9, ty * 9, nz * 9, 2); if (crater > .66) col = mixRGB(col, [0, 0, 0], (crater - .66) * 1.4);
      }
    }
    // lighting: soft terminator + faint ambient + specular on water
    const lam = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
    const lit = Math.pow(lam, .85), shade = .07 + .93 * lit;
    let rr = col[0] * shade + night[0] * (1 - shade), gg = col[1] * shade + night[1] * (1 - shade), bb = col[2] * shade + night[2] * (1 - shade);
    if (spec.type === 'ocean' || spec.type === 'ice') { const sp = Math.pow(Math.max(0, 2 * lam * nz - L[2]), 26) * .55; rr += 255 * sp; gg += 255 * sp; bb += 255 * sp; }
    const i = (y * S + x) * 4, edge = Math.min(1, (1 - Math.sqrt(dd)) * r * .9);
    d[i] = Math.min(255, rr); d[i + 1] = Math.min(255, gg); d[i + 2] = Math.min(255, bb); d[i + 3] = 255 * edge;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function drawRing(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, ring: { colors: string[]; tilt: number }, half: 'back' | 'front') {
  g.save();
  g.beginPath();
  if (half === 'back') g.rect(0, 0, g.canvas.width, cy); else g.rect(0, cy, g.canvas.width, g.canvas.height - cy);
  g.clip();
  g.translate(cx, cy); g.rotate(-.18); g.scale(1, ring.tilt);
  const cols = ring.colors.map(hex), inner = r * 1.28, outer = r * 2.1, bands = 46;
  for (let k = 0; k < bands; k++) {
    const t = k / bands, rad = inner + (outer - inner) * t, col = ramp(cols, (t * 3.7) % 1);
    const a = (.18 + .5 * Math.abs(Math.sin(t * 23.0)) * (1 - Math.abs(t - .45) * 1.1)) * (t > .62 && t < .67 ? .15 : 1);
    g.strokeStyle = `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${Math.max(0, a).toFixed(3)})`;
    g.lineWidth = (outer - inner) / bands * 1.15; g.beginPath(); g.arc(0, 0, rad, 0, Math.PI * 2); g.stroke();
  }
  g.restore();
  // the body's shadow falling across the back ring
  if (half === 'front') return;
  g.save(); g.globalCompositeOperation = 'source-atop';
  const sh = g.createLinearGradient(cx, cy - r, cx + r * 1.6, cy + r * .4); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(.55, 'rgba(0,0,0,.0)'); sh.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = sh; g.fillRect(cx, 0, g.canvas.width - cx, cy); g.restore();
}
