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
const E = P.EAST;        // the east half of the flat stands this much further east than its first numbers (see plan.js)
const light = {
  sun: [1, -0.135, -0.05],                                   // from the west, 8° above the horizon, drifting a little north
  shadow: { center: [5.4, 1.45, -1.3], left: -11.8, right: 11.8, top: 3.6, bottom: -3.4, near: 6, far: 64 },   // the flat and the near half of the gallery
  lamps: { living: [2.75, 2.5, 1.75, 9], kitchen: [3.0, 2.55, 5.8, 7.5], bath: [0.92, 2.5, 6.6, 4.5], nook: [4.7 + E, 2.45, 5.9, 6.5], big: [8.5 + E, 2.5, 5.7, 8.5], parents: [7.6 + E, 2.5, 1.8, 8], gallery: [0.9, 2.55, -3.2, 9], screen: [4.25 + E, 1.05, 4.3, 2.6] },
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
   the parents' room and its balcony, then out to the gallery and back in by the front door.
   A key is { p: [x, y, z], h: heading, pitch, t: seconds to get there, cut?: jump instead of walking, label? }. */
const tour = [
  { p: [4.8 + E, 1.22, 4.52], h: 266, pitch: -14, t: 0.01, cut: true, label: 'Góc máy tính' },
  { p: [4.8 + E, 1.22, 4.52], h: 266, pitch: -14, t: 3.2 },
  { p: [4.95 + E, 1.5, 5.3], h: 214, pitch: -18, t: 3.4 },
  { p: [5.1 + E, 1.5, 6.3], h: 168, pitch: -6, t: 3.4 },
  { p: [5.05 + E, 1.5, 6.1], h: 118, pitch: 8, t: 3.0 },
  { p: [5.2 + E, 1.52, 4.42], h: 75, pitch: 0, t: 3.0 },
  { p: [6.5 + E, 1.52, 4.42], h: 100, pitch: -4, t: 3.0, label: 'Phòng lớn' },
  { p: [7.6 + E, 1.52, 4.7], h: 100, pitch: -6, t: 3.0 },
  { p: [8.85 + E, 1.52, 5.3], h: 18, pitch: -5, t: 3.6 },
  { p: [8.85 + E, 1.52, 5.4], h: 214, pitch: -12, t: 3.6 },
  { p: [7.6 + E, 1.52, 4.7], h: 262, pitch: -3, t: 3.2 },
  { p: [6.0 + E, 1.52, 4.42], h: 280, pitch: -2, t: 2.6 },
  { p: [5.1 + E, 1.52, 4.3], h: 345, pitch: 0, t: 2.4 },
  { p: [5.05 + E, 1.52, 3.2], h: 300, pitch: -2, t: 2.2 },
  { p: [4.2, 1.52, 2.25], h: 298, pitch: -5, t: 3.2, label: 'Phòng khách' },
  { p: [2.9, 1.52, 2.3], h: 72, pitch: -2, t: 4.2 },
  { p: [2.6, 1.52, 2.2], h: 240, pitch: -4, t: 4.2 },
  { p: [2.65, 1.52, 3.2], h: 178, pitch: -6, t: 3.0 },
  { p: [2.95, 1.52, 4.5], h: 172, pitch: -10, t: 3.2, label: 'Bếp' },
  { p: [2.5, 1.52, 4.3], h: 252, pitch: -8, t: 2.6, label: 'Chỗ giặt, nhà tắm' },
  { p: [1.25, 1.52, 4.6], h: 192, pitch: -7, t: 3.2 },
  { p: [2.6, 1.52, 4.35], h: 140, pitch: -6, t: 3.0 },
  { p: [3.05, 1.52, 6.4], h: 180, pitch: -4, t: 3.0 },
  { p: [3.13, 1.52, 7.6], h: 182, pitch: -4, t: 2.2 },
  { p: [3.2, 1.52, 8.9], h: 110, pitch: -6, t: 2.6, label: 'Lô gia' },
  { p: [4.2, 1.52, 8.98], h: 92, pitch: -8, t: 3.0 },
  { p: [5.0, 1.52, 8.98], h: 150, pitch: -14, t: 3.0 },
  { p: [4.9, 1.52, 8.98], h: 262, pitch: -5, t: 3.4 },
  { p: [3.3, 1.52, 8.95], h: 290, pitch: -4, t: 3.2 },
  { p: [3.13, 1.52, 7.5], h: 355, pitch: -4, t: 2.6 },
  { p: [3.0, 1.52, 6.2], h: 354, pitch: -4, t: 2.4 },
  { p: [2.7, 1.52, 3.9], h: 2, pitch: -3, t: 3.2 },
  { p: [3.9, 1.52, 2.92], h: 78, pitch: -2, t: 3.0 },
  { p: [5.15 + E, 1.52, 2.95], h: 86, pitch: -4, t: 3.0, label: 'Phòng bố mẹ' },
  { p: [6.2 + E, 1.52, 2.7], h: 42, pitch: -8, t: 3.0 },
  { p: [8.4 + E, 1.52, 2.42], h: 78, pitch: -3, t: 3.6 },
  { p: [9.0 + E, 1.52, 1.52], h: 88, pitch: -3, t: 2.6 },
  { p: [10.15 + E, 1.52, 1.5], h: 82, pitch: -8, t: 3.0, label: 'Ban công nhìn xuống phố' },
  { p: [10.15 + E, 1.52, 1.5], h: 128, pitch: -20, t: 3.4 },
  { p: [0.95, 1.52, -9.0], h: 180, pitch: -3, t: 0.01, cut: true, label: 'Hành lang tầng 5' },
  { p: [0.95, 1.52, -6.2], h: 178, pitch: -3, t: 4.2 },
  { p: [0.75, 1.52, -3.6], h: 255, pitch: -9, t: 4.0 },
  { p: [0.7, 1.52, -2.2], h: 186, pitch: -2, t: 3.4 },
  { p: [0.68, 1.52, -0.7], h: 180, pitch: -3, t: 2.8 },
  { p: [0.7, 1.52, 0.75], h: 150, pitch: -3, t: 2.8, label: 'Về nhà' },
  { p: [1.1, 1.52, 2.6], h: 62, pitch: -4, t: 3.2 },
];

export default {
  meta,
  views: P.VIEWS,
  start: 'phong-khach',
  /* how far the walker may go: the flat, its balconies and loggia, the gallery as far as the stairs */
  bounds: { x0: -1.14, x1: 10.56 + E, z0: -12.0, z1: 9.27 },
  light, tour, card, notes, sayYear,

  /** Builds the flat into the scene. `w` is what the engine lends: { scene, shared (the solids), ctx (what rooms hand
   *  back: bright dots, spots for the machines, lamp shades), renderer }. Returns what the engine may ask of it later. */
  build({ scene, shared, ctx }) {
    const b = new Builder(shared);
    buildShell(b, scene, shared);
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
