/* Seeded value noise (2D/3D) + fractal sums. Small, fast, good enough to paint nebulae and planets. */
import { mulberry32 } from '../lib/rng';

export function makeNoise(seed: number) {
  const r = mulberry32(seed), P = new Uint8Array(512), V = new Float32Array(256);
  for (let i = 0; i < 256; i++) { P[i] = i; V[i] = r(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const s = (t: number) => t * t * (3 - 2 * t);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  function n2(x: number, y: number) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
    const a = V[P[P[X] + Y]], b = V[P[P[X + 1] + Y]], c = V[P[P[X] + Y + 1]], d = V[P[P[X + 1] + Y + 1]];
    const u = s(xf), v = s(yf);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }
  function n3(x: number, y: number, z: number) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
    const X = xi & 255, Y = yi & 255, Z = zi & 255, u = s(xf), v = s(yf), w = s(zf);
    const h = (i: number, j: number, k: number) => V[P[P[P[X + i] + Y + j] + Z + k]];
    return lerp(lerp(lerp(h(0, 0, 0), h(1, 0, 0), u), lerp(h(0, 1, 0), h(1, 1, 0), u), v),
                lerp(lerp(h(0, 0, 1), h(1, 0, 1), u), lerp(h(0, 1, 1), h(1, 1, 1), u), v), w);
  }
  return {
    fbm2(x: number, y: number, oct = 5) { let a = .5, f = 1, t = 0, n = 0; for (let i = 0; i < oct; i++) { t += a * n2(x * f, y * f); n += a; a *= .5; f *= 2.03; } return t / n; },
    fbm3(x: number, y: number, z: number, oct = 4) { let a = .5, f = 1, t = 0, n = 0; for (let i = 0; i < oct; i++) { t += a * n3(x * f, y * f, z * f); n += a; a *= .5; f *= 2.01; } return t / n; },
    ridge2(x: number, y: number, oct = 4) { let a = .5, f = 1, t = 0, n = 0; for (let i = 0; i < oct; i++) { t += a * (1 - Math.abs(n2(x * f, y * f) * 2 - 1)); n += a; a *= .5; f *= 2.1; } return t / n; },
  };
}

export const hex = (h: string): [number, number, number] => { const v = h.replace('#', ''); return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]; };
export const mixRGB = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** Sample a color ramp at t ∈ [0,1]. */
export function ramp(stops: number[][], t: number) {
  const x = Math.max(0, Math.min(.9999, t)) * (stops.length - 1), i = Math.floor(x);
  return mixRGB(stops[i], stops[i + 1] ?? stops[i], x - i);
}
