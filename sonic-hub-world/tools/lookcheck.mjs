// Draws a place in every look (engine/look.js) at every hour, and checks that a look changes only how the place is drawn:
//   - the look draws (no shader error), and what it draws has outlines the plain picture has not
//   - it is about as bright as the plain picture (a look is not another exposure)
//   - after a frame in a look the place's own materials are on its meshes again, and the frame had no program left to build
//   - back to plain, the picture is the plain picture again
//   - the look's button turns it on and the address keeps it; a page opened with ?look=<id> opens in it
import { launch, open, PLACE } from './lib.mjs';

const browser = await launch();
const { page, logs } = await open(browser, { width: 480, height: 300 });
const out = await page.evaluate(async () => {
  const H = window.__world, $ = id => document.getElementById(id); H.hideIntro();
  const canvas = $('scene'), c2 = document.createElement('canvas'), g = c2.getContext('2d', { willReadFrequently: true });
  // the picture as the screen gets it (read in the same turn it was drawn), as brightness per pixel
  const grab = () => {
    H.renderOnce(); H.renderOnce();
    const w = c2.width = canvas.width, h = c2.height = canvas.height; g.drawImage(canvas, 0, 0);
    const d = g.getImageData(0, 0, w, h).data, l = new Float32Array(w * h);
    for (let i = 0; i < l.length; i++) l[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
    return { w, h, l };
  };
  const mean = p => p.l.reduce((s, v) => s + v, 0) / p.l.length;
  // thin dark strokes: the pixels darker than what lies three pixels to both sides, across or down
  const strokes = ({ w, h, l }) => {
    const m = new Uint8Array(w * h);
    for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++) {
      const i = y * w + x, v = l[i] + 22;
      if ((v < l[i - 3] && v < l[i + 3]) || (v < l[i - 3 * w] && v < l[i + 3 * w])) m[i] = 1;
    }
    return m;
  };
  // the share of pixels that are strokes in one picture where the other has none, there or next to it
  const added = (a, b, w) => { let n = 0; for (let i = w + 1; i < a.length - w - 1; i++) if (a[i] && !(b[i] || b[i - 1] || b[i + 1] || b[i - w] || b[i + w] || b[i - w - 1] || b[i - w + 1] || b[i + w - 1] || b[i + w + 1])) n++; return n / a.length; };
  const apart = (a, b) => { let s = 0, far = 0; for (let i = 0; i < a.l.length; i++) { const d = Math.abs(a.l[i] - b.l[i]); s += d; if (d > 30) far++; } return [s / a.l.length, far / a.l.length]; };
  const mats = () => { const a = []; H.scene().traverse(o => { if (o.material) a.push(o.material); }); return a; };

  const hours = [...$('hours').children].map(b => b.id.slice(2)), looks = [...$('looks').children].map(b => b.id.slice(2)).filter(id => id !== 'plain');
  const rows = [], bad = [];
  for (const look of looks) for (const hour of hours) {
    H.setHour(hour); H.setLook('');
    const own = mats(), plain = grab();
    H.setLook(look);
    const built = H.info().programs, drawn = grab(), after = mats(), late = H.info().programs - built;
    H.setLook('');
    const again = grab();
    const row = { look, hour, plain: +mean(plain).toFixed(1), drawn: +mean(drawn).toFixed(1), lines: +(added(strokes(drawn), strokes(plain), plain.w) * 100).toFixed(2), back: apart(plain, again).map(v => +v.toFixed(3)) };
    rows.push(row);
    const say = t => bad.push(`${look} at ${hour}: ${t}`);
    if (H.look() !== '') say('the look is still on after going back to plain');
    if (own.length !== after.length || own.some((m, i) => m !== after[i])) say('a mesh was left with a material that is not its own');
    if (late) say(`${late} program(s) were still to build when the first frame was drawn`);
    if (Math.abs(row.drawn - row.plain) > 0.2 * row.plain) say(`brightness ${row.drawn} against ${row.plain} plain (more than a fifth apart)`);
    if (row.lines < 0.5) say(`hardly an outline that plain has not (${row.lines}% of pixels)`);
    if (row.back[0] > 2 || row.back[1] > 0.01) say(`plain is not the same picture afterwards (mean difference ${row.back[0]}, ${(row.back[1] * 100).toFixed(2)}% of pixels far off)`);
  }
  // the buttons: a tap turns the look on as soon as the card has its programs
  const turned = want => new Promise(done => { const t0 = performance.now(); (function wait() { if (H.look() === want || performance.now() - t0 > 30000) done(); else setTimeout(wait, 20); })(); });
  for (const look of looks) {
    $('l-' + look).click(); await turned(look);
    if (H.look() !== look || $('l-' + look).getAttribute('aria-pressed') !== 'true') bad.push(`the button of ${look} does not turn it on`);
    if (new URLSearchParams(location.search).get('look') !== look) bad.push(`the address does not keep ${look}`);
  }
  if (looks.length) { $('l-plain').click(); await turned(''); if (H.look() !== '' || new URLSearchParams(location.search).has('look')) bad.push('the plain button does not turn the look off, or the address keeps it'); }
  return { rows, bad, looks };
});
for (const r of out.rows) console.log(`${PLACE} · ${r.look} at ${r.hour}: brightness ${r.drawn} (plain ${r.plain}) · outlines of its own on ${r.lines}% of pixels · back to plain: off by ${r.back[0]}`);
const bad = [...out.bad, ...logs];

// opened in a look
for (const look of out.looks) {
  const o = await open(browser, { width: 320, height: 200, query: '?look=' + look });
  const on = await o.page.evaluate(id => { window.__world.renderOnce(); return window.__world.look() === id && document.getElementById('l-' + id).getAttribute('aria-pressed') === 'true'; }, look);
  if (!on) bad.push(`a page opened with ?look=${look} does not open in it`);
  bad.push(...o.logs);
  await o.ctx.close();
}
console.log(PLACE, '· looks:', out.looks.join(', ') || 'none', '·', bad.length ? `${bad.length} wrong` : 'all as it should be');
for (const b of bad) console.log('  ' + b);
await browser.close();
if (bad.length) process.exit(1);
