/* Flat 507, the family home at Vạn Bảo, as it stood between 2005 and 2012 — rebuilt from the walk-through videos of
   June 2013 kept in Sonic Hub, with the machines of each year from the hub's desk. This file is the place as the
   engine sees it: where things are (plan.js), how it is lit, the walk of the tour, and how it is built. */
import { Builder } from '../../engine/kit.js';
import { chord } from '../../engine/sound.js';
import meta from './meta.js';
import * as P from './plan.js';
import { buildShell, buildDoors } from './shell.js';
import { buildLiving, buildKitchen, buildOutsideRooms } from './rooms_a.js';
import { buildBigRoom, buildParents } from './rooms_b.js';
import { buildEra, PIANO_FROM } from './era.js';
import { buildOutside } from './outside.js';
import { buildLife } from './life.js';
import { card, notes, sayYear } from './cards.js';

/* Two moments of a day: "chieu" — a June afternoon about half an hour before sunset, the sun low in the west and
   coming in through the balcony door, as on the 2013 video — and "toi", nine in the evening, the lamps and screens on. */
const E = P.EAST;        // the big room stands this much further east than its first numbers (see plan.js)
/* Everything in this file is in REAL metres. Where a position is still known by its place on the drawing's grid (the
   rooms south of the living room, and heights above 1.5 m), D(x, y, z) puts it through the survey of plan.js. */
const D = (x, y, z) => [x, P.sy(y), P.sz(z)];
const light = {
  sun: [1, -0.135, -0.05],                                   // from the west, 8° above the horizon, drifting a little north
  shadow: { center: [5.4, 1.45, -1.3], left: -11.8, right: 11.8, top: 3.6, bottom: -3.4, near: 6, far: 64 },   // the flat and the near half of the gallery
  lamps: { living: [3.4, 2.28, 1.4, 9], kitchen: [...D(3.0, 2.55, 5.8), 7.5], bath: [...D(0.92, 2.5, 6.6), 4.5], nook: [...D(4.7 + E, 2.45, 5.9), 6.5], big: [...D(8.5 + E, 2.5, 5.7), 8.5], parents: [8.1, 2.28, 1.4, 8], gallery: [...D(0.9, 2.55, -3.2), 9], screen: [...D(4.25 + E, 1.05, 4.3), 2.6] },
  hours: {
    chieu: {
      sky: { top: '#5d86c4', mid: '#c9b9c0', horizon: '#ffc98f', ground: '#6a6058', sun: '#fff1c8', glow: '#ff9a4a', stars: 0 },
      sun: ['#ffb066', 5.2], hemi: ['#c3cee4', '#b9a998', 0.7], room: ['#f4efe6', '#e6d9c8', '#bba894', '#ffd9a8'], env: 0.5, exposure: 1.0,
      // window bounce and the lamps that are off
      lamps: { living: ['#ffd7a8', 3.2], kitchen: ['#ffd9b0', 2.4], bath: ['#ffe2c0', 0.9], nook: ['#e9eefc', 1.6], big: ['#dfe8ff', 4.2], parents: ['#e8edff', 3.4], gallery: ['#fff1d8', 1.2], screen: ['#bcd2ff', 0.25] },
      lit: false,
    },
    toi: {
      sky: { top: '#0a1024', mid: '#141a33', horizon: '#3a2c3a', ground: '#0b0b10', sun: '#000000', glow: '#000000', stars: 1 },
      sun: ['#8fa6ff', 0], hemi: ['#28335c', '#0e0c0c', 0.25], room: ['#3a3530', '#2c2824', '#241a14', '#ffcf9a'], env: 0.1, exposure: 1.08,
      lamps: { living: ['#ffcf9a', 20], kitchen: ['#f2f5ff', 9], bath: ['#fff0dc', 4], nook: ['#eef3ff', 13], big: ['#eef3ff', 16], parents: ['#fff0dc', 13], gallery: ['#ffd9a0', 5], screen: ['#a9c4ff', 1.4] },
      lit: true,
    },
  },
};

/* The walk the tour takes, in the order of the 2013 video: his corner, the big room, living room, kitchen, loggia,
   the parents' room and its window over the street, then out to the gallery and back in by the front door.
   A key is { p: [x, y, z], h: heading, pitch, t: seconds to get there, cut?: jump instead of walking, label? }. */
const tour = [
  { p: D(4.8 + E, 1.22, 4.52), h: 266, pitch: -14, t: 0.01, cut: true, label: 'Góc máy tính' },
  { p: D(4.8 + E, 1.22, 4.52), h: 266, pitch: -14, t: 3.2 },
  { p: D(4.95 + E, 1.5, 5.3), h: 214, pitch: -18, t: 3.4 },
  { p: D(5.1 + E, 1.5, 6.3), h: 168, pitch: -6, t: 3.4 },
  { p: D(5.05 + E, 1.5, 6.1), h: 118, pitch: 8, t: 3.0 },
  { p: D(5.2 + E, 1.52, 4.42), h: 75, pitch: 0, t: 3.0 },
  { p: D(6.5 + E, 1.52, 4.42), h: 100, pitch: -4, t: 3.0, label: 'Phòng lớn' },
  { p: D(7.6 + E, 1.52, 4.7), h: 100, pitch: -6, t: 3.0 },
  { p: D(8.85 + E, 1.52, 5.3), h: 18, pitch: -5, t: 3.6 },
  { p: D(8.85 + E, 1.52, 5.4), h: 214, pitch: -12, t: 3.6 },
  { p: D(7.6 + E, 1.52, 4.7), h: 262, pitch: -3, t: 3.2 },
  { p: D(6.0 + E, 1.52, 4.42), h: 280, pitch: -2, t: 2.6 },
  { p: [5.72, 1.52, 3.62], h: 330, pitch: 0, t: 2.4 },                        // to his door, between the pushed-in chair and the open leaf
  { p: [5.61, 1.52, 3.0], h: 350, pitch: -2, t: 1.6 },
  { p: [5.58, 1.52, 2.36], h: 292, pitch: -2, t: 1.8 },                       // the lobby
  { p: [4.3, 1.52, 2.2], h: 296, pitch: -5, t: 3.0, label: 'Phòng khách' },
  { p: [2.75, 1.52, 2.1], h: 72, pitch: -2, t: 4.0 },
  { p: [2.35, 1.52, 2.0], h: 238, pitch: -4, t: 4.0 },
  { p: [2.75, 1.52, 2.5], h: 178, pitch: -6, t: 3.0 },
  { p: D(2.95, 1.52, 4.5), h: 172, pitch: -10, t: 3.2, label: 'Bếp' },
  { p: D(2.5, 1.52, 4.3), h: 252, pitch: -8, t: 2.6, label: 'Chỗ giặt, nhà tắm' },
  { p: D(1.25, 1.52, 4.6), h: 192, pitch: -7, t: 3.2 },
  { p: D(2.6, 1.52, 4.35), h: 140, pitch: -6, t: 3.0 },
  { p: D(3.05, 1.52, 6.4), h: 180, pitch: -4, t: 3.0 },
  { p: D(3.13, 1.52, 7.6), h: 182, pitch: -4, t: 2.2 },
  { p: D(3.2, 1.52, 8.9), h: 110, pitch: -6, t: 2.6, label: 'Lô gia' },
  { p: D(4.2, 1.52, 8.98), h: 92, pitch: -8, t: 3.0 },
  { p: D(5.0, 1.52, 8.98), h: 150, pitch: -14, t: 3.0 },
  { p: D(4.9, 1.52, 8.98), h: 262, pitch: -5, t: 3.4 },
  { p: D(3.3, 1.52, 8.95), h: 290, pitch: -4, t: 3.2 },
  { p: D(3.13, 1.52, 7.5), h: 355, pitch: -4, t: 2.6 },
  { p: D(3.0, 1.52, 6.2), h: 354, pitch: -4, t: 2.4 },
  { p: D(2.75, 1.52, 4.0), h: 2, pitch: -3, t: 3.2 },
  { p: [2.8, 1.52, 2.55], h: 40, pitch: -2, t: 2.0 },
  { p: [4.3, 1.52, 2.3], h: 82, pitch: -2, t: 2.6 },
  { p: [5.58, 1.52, 2.36], h: 88, pitch: -4, t: 2.4, label: 'Phòng bố mẹ' },
  { p: [6.5, 1.52, 2.42], h: 44, pitch: -8, t: 2.6 },
  { p: [8.62, 1.52, 2.46], h: 20, pitch: -10, t: 3.6 },
  { p: [8.8, 1.52, 1.4], h: 86, pitch: -3, t: 2.6 },
  { p: [9.85, 1.52, 1.36], h: 90, pitch: -6, t: 2.6, label: 'Cửa sổ nhìn xuống phố' },
  { p: [9.85, 1.52, 1.36], h: 128, pitch: -20, t: 3.4 },
  { p: [0.95, 1.52, -9.0], h: 180, pitch: -3, t: 0.01, cut: true, label: 'Hành lang tầng 5' },
  { p: [0.95, 1.52, -6.2], h: 178, pitch: -3, t: 4.2 },
  { p: [0.82, 1.52, -3.6], h: 255, pitch: -9, t: 4.0 },
  { p: [0.95, 1.52, -2.2], h: 184, pitch: -2, t: 3.4 },
  { p: [0.98, 1.52, -0.7], h: 180, pitch: -3, t: 2.8 },
  { p: [0.96, 1.52, 0.62], h: 150, pitch: -3, t: 2.8, label: 'Về nhà' },
  { p: [0.82, 1.52, 1.8], h: 100, pitch: -4, t: 2.4 },
  { p: [1.1, 1.52, 2.05], h: 62, pitch: -4, t: 1.6 },
];

export default {
  meta,
  views: P.VIEWS,
  start: 'phong-khach',
  /* how far the walker may go: the flat, its balconies and loggia, the gallery as far as the stairs */
  bounds: { x0: -1.14, x1: 10.56 + E, z0: -12.0, z1: P.sz(9.27) },
  light, tour, card, notes, sayYear,

  /** Builds the flat into the scene. `w` is what the engine lends: { scene, shared (the solids), ctx (what rooms hand
   *  back: bright dots, spots for the machines, lamp shades), renderer }. Returns what the engine may ask of it later. */
  build({ scene, shared, ctx }) {
    const b = new Builder(shared, P.SURVEY);            // what is laid down on the drawing's grid lands where it was measured (plan.js)
    b.shell = true; buildShell(b, scene, shared); b.shell = false;
    buildLiving(b, ctx); buildKitchen(b, ctx); buildOutsideRooms(b, ctx);
    buildBigRoom(b, ctx); buildParents(b, ctx);
    b.build(scene);
    buildDoors(scene, shared);
    const era = buildEra(scene, shared, ctx), outside = buildOutside(scene, ctx), life = buildLife(scene, ctx);
    return {
      setYear: y => era.setYear(y),
      setHour(hour) {
        const night = hour === 'toi';
        era.setHour(hour); outside.setHour(hour);
        if (ctx.water) ctx.water.emissiveIntensity = night ? 1.5 : 0.5;
        life.setClocks(night ? 21 : 18, night ? 0 : 5);
        if (night !== era.state.tv) era.setTv(night);      // the television is on in the evening
      },
      /** a bright dot was touched; what comes back goes to the card as `extra` */
      touch(id) { if (id === 'tv') return era.toggleTv(); if (id === 'piano' && era.state.year >= PIANO_FROM) chord(); return undefined; },
      animate: (dt, clock) => life.animate(dt, clock),
    };
  },
};
