/* The studio at the Extended Stay America in El Segundo, August–September 2015, and the streets around it: the place as
   the engine sees it — where things are (plan.js), how it is lit at three hours of a day, the tour, how it is built. */
import * as THREE from 'three';
import { Builder } from '../../engine/kit.js';
import meta from './meta.js';
import * as P from './plan.js';
import { buildWing } from './hotel.js';
import { buildRoom } from './room.js';
import { buildSite } from './site.js';
import { buildTown } from './town.js';
import { buildFleet } from './cars.js';
import { card, notes } from './cards.js';

const { ROOM, IN, G2 } = P;
const R = (u, y, v) => [ROOM.x0 + u, G2 + y, ROOM.z0 + v];

/* The sun of 22 September 2015 over El Segundo (33.92 N): at 09:47 PDT it stood at 119° (east-south-east), 36° up;
   at 18:20 at 263°, 8° up, low over Sepulveda and straight into his west window. Light travels away from the sun. */
const dir = (az, alt) => { const a = az * Math.PI / 180, e = alt * Math.PI / 180; return [-Math.sin(a) * Math.cos(e), -Math.sin(e), Math.cos(a) * Math.cos(e)]; };
const SUN = { sang: dir(119, 36), chieu: dir(263, 8) };

const light = {
  sun: SUN.sang,
  outdoor: true,
  shadow: { center: [ROOM.x0, 3, ROOM.z0], left: -62, right: 62, top: 62, bottom: -62, near: 1, far: 260, back: 120, follow: 24, bias: -0.0004, normalBias: 0.03 },
  lamps: {
    desk: [...R(3.2, 1.55, 0.45), 5.5], lamp: [...R(IN.dresser[0] + 0.2, 1.35, 0.42), 6], bed: [...R(IN.bed.u0 + 0.76, 1.65, ROOM.w - 1.1), 6.5],
    kitchen: [...R(5.5, 2.4, 1.05), 5.5], bath: [...R(5.6, 2.2, 3.1), 3.2],
    walk1: [13.0, G2 + 2.3, ROOM.z0 - 0.2, 7], walk2: [13.0, G2 + 2.3, ROOM.z1 + 4.2, 7],
    lot: [-2.5, 8.5, 22, 26],
  },
  hours: {
    sang: {
      sky: { top: '#7f9fc4', mid: '#b9c7d3', horizon: '#dfe2e0', ground: '#7d7a72', sun: '#fff6e0', glow: '#fff2d8', stars: 0, clouds: [0.62, '#eef0f0', '#a8adb2'] },
      sun: ['#fff1dc', 2.6], hemi: ['#d5e0ea', '#8f8676', 1.15], room: ['#c4bdb1', '#bdb3a2', '#6f6a62', '#ffffff'], env: 0.55, exposure: 1.0,
      fog: ['#d7dbdc', 140, 900],
      lamps: { desk: ['#ffe9c8', 0.8], lamp: ['#ffe9c8', 0.6], bed: ['#ffe9c8', 0.8], kitchen: ['#eef3ff', 1.6], bath: ['#fff2e0', 0.3] },
      lit: false,
    },
    chieu: {
      sky: { top: '#5f87c2', mid: '#b8b6c4', horizon: '#ffcf9e', ground: '#6a5f55', sun: '#fff0c8', glow: '#ffa45a', stars: 0, clouds: [0.28, '#ffe1c2', '#9a8f99'] },
      dir: SUN.chieu, sun: ['#ffb871', 3.6], hemi: ['#b9c6df', '#a08a74', 0.75], room: ['#c8b7a6', '#c4a98f', '#6b5d50', '#ffcf98'], env: 0.5, exposure: 1.02,
      fog: ['#e3cdb8', 160, 1000],
      lamps: { desk: ['#ffd9a8', 1.2], lamp: ['#ffd9a8', 1.6], bed: ['#ffd9a8', 1.0], kitchen: ['#eef3ff', 2.0], bath: ['#fff2e0', 0.4] },
      lit: false,
    },
    toi: {
      sky: { top: '#0b1226', mid: '#1d2439', horizon: '#57443f', ground: '#0c0b0d', sun: '#000000', glow: '#000000', stars: 0.55, clouds: [0.25, '#3a3540', '#16151c'] },
      dir: dir(200, 55), sun: ['#9fb4ff', 0.18], hemi: ['#3a4766', '#1f1914', 0.62], room: ['#2e2a28', '#262220', '#1b1612', '#ffc788'], env: 0.12, exposure: 1.22,
      fog: ['#1e2030', 120, 800],
      lamps: { desk: ['#ffcf92', 7], lamp: ['#ffcf92', 8], bed: ['#ffcf92', 7], kitchen: ['#f2f6ff', 7], bath: ['#fff0dc', 3], walk1: ['#fff0d0', 7], walk2: ['#fff0d0', 7], lot: ['#ffc070', 90] },
      lit: true,
    },
  },
};

/* The tour, as he would have walked it on the morning of 22/9: the studio, out of the door, along the walkway to the
   railing (the photograph toward Ralphs), down the south-west stairs, across the lot, out to Mariposa, along to
   Sepulveda, Starbucks and Ralphs; then a jump east along Mariposa to the fig trees and the Green Line. */
const tour = [
  { p: R(0.6, 1.5, 2.2), h: 92, pitch: -8, t: 0.01, cut: true, label: 'Phòng tầng 2' },
  { p: R(0.6, 1.5, 2.2), h: 92, pitch: -8, t: 3.2 },
  { p: R(1.4, 1.5, 1.8), h: 138, pitch: -12, t: 3.4 },
  { p: R(2.0, 1.5, 1.6), h: 178, pitch: -14, t: 3.4, label: 'Giường' },
  { p: R(1.75, 1.5, 1.45), h: 330, pitch: -10, t: 3.6 },
  { p: R(3.3, 1.5, 1.55), h: 70, pitch: -10, t: 3.6, label: 'Bếp nhỏ' },
  { p: R(3.85, 1.5, 1.35), h: 40, pitch: -14, t: 3.0 },
  { p: R(2.4, 1.5, 1.35), h: 262, pitch: -4, t: 3.6 },
  { p: R(0.7, 1.52, 1.25), h: 268, pitch: -3, t: 2.8, label: 'Ra hành lang' },
  { p: R(-0.6, 1.52, 1.25), h: 262, pitch: -4, t: 2.0 },
  { p: R(-1.1, 1.52, 1.6), h: 238, pitch: -6, t: 2.4 },
  { p: R(-1.15, 1.52, 2.2), h: 248, pitch: -8, t: 3.6, label: 'Nhìn sang Ralphs' },
  { p: R(-1.25, 1.52, 5.0), h: 186, pitch: -3, t: 3.2 },
  { p: [13.2, G2 + 1.52, 31.5], h: 180, pitch: -3, t: 4.0 },
  { p: [13.25, G2 + 1.52, 36.3], h: 348, pitch: -2, t: 3.0, label: 'Hành lang' },
  { p: [13.3, G2 + 1.52, 38.7], h: 182, pitch: -6, t: 2.6 },
  { p: [12.2, G2 + 1.52, 38.8], h: 270, pitch: -22, t: 2.0, label: 'Cầu thang' },
  { p: [9.3, (G2 + 0.15) / 2 + 1.52, 38.8], h: 270, pitch: -10, t: 3.0 },
  { p: [9.2, (G2 + 0.15) / 2 + 1.52, 37.5], h: 90, pitch: -12, t: 2.0 },
  { p: [12.3, 1.67, 37.5], h: 90, pitch: -6, t: 3.0 },
  { p: [12.9, 1.67, 37.3], h: 0, pitch: 0, t: 1.2 },
  { p: [12.9, 1.67, 35.8], h: 300, pitch: 0, t: 1.6 },
  { p: [3.0, 1.52, 30.0], h: 350, pitch: 2, t: 4.6, label: 'Bãi xe' },
  { p: [1.0, 1.52, 8.0], h: 0, pitch: 0, t: 6.0 },
  { p: [-2.0, 1.52, -17.5], h: 280, pitch: 0, t: 5.0 },
  { p: [-27.3, 1.52, -17.5], h: 340, pitch: 0, t: 7.0 },
  { p: [-27.3, 1.52, -52.0], h: 10, pitch: 0, t: 9.0 },
  { p: [-23.0, 1.52, -67.5], h: 128, pitch: 2, t: 5.0, label: 'Cổng ra Mariposa' },
  { p: [-30.0, 1.52, -68.5], h: 270, pitch: 0, t: 3.0 },
  { p: [-96.0, 1.52, -68.5], h: 262, pitch: 0, t: 12.0 },
  { p: [-96.0, 1.52, -45.0], h: 180, pitch: 0, t: 6.0, label: 'Sepulveda' },
  { p: [-96.0, 1.52, -0.3], h: 160, pitch: 0, t: 9.0 },
  { p: [-67.0, 1.52, -0.3], h: 80, pitch: 0, t: 7.0 },
  { p: [-66.5, 1.52, -2.6], h: 262, pitch: 2, t: 2.0, label: 'Starbucks' },
  { p: [-61.0, 1.52, 4.0], h: 170, pitch: 0, t: 3.0 },
  { p: [-61.0, 1.52, 50.0], h: 180, pitch: 2, t: 10.0 },
  { p: [-62.0, 1.52, 59.6], h: 190, pitch: 8, t: 3.4, label: 'Ralphs' },
  { p: [250.0, 1.52, -64.0], h: 92, pitch: 2, t: 0.01, cut: true, label: 'Mariposa, hàng si' },
  { p: [300.0, 1.52, -64.0], h: 96, pitch: 3, t: 8.0 },
  { p: [655.0, 1.52, -65.5], h: 76, pitch: 8, t: 0.01, cut: true, label: 'Green Line, ga Mariposa' },
  { p: [676.0, 1.52, -65.5], h: 110, pitch: 16, t: 6.0 },
  { p: [690.5, 1.52, -76.0], h: 10, pitch: 10, t: 5.0 },
  { p: [691.2, 1.52, -112.0], h: 356, pitch: 12, t: 9.0 },
];

export default {
  meta,
  views: P.VIEWS,
  start: 'phong',
  bounds: { x0: -250, x1: 760, z0: -250, z1: 240 },
  far: 1400, speed: 1.6, tapRange: 30,
  floor: (x, z, y) => floorWithDoors(x, z, y),
  light, tour, card, notes,
  sayYear: () => '',

  build({ scene, shared, ctx }) {
    const b = new Builder(shared);
    const lamps = [];
    for (const key of ['north', 'south', 'main']) lamps.push(...buildWing(b, key, ctx, { detailRail: key === 'north' }).lamps);
    b.build(scene);
    const room = buildRoom(scene, shared, ctx);
    doors.room = room;
    const site = buildSite(scene, shared, ctx);
    const town = buildTown(scene, shared, ctx);
    buildFleet(scene);
    let night = false;
    return {
      setHour(hour) {
        night = hour === 'toi';
        room.setHour(night); site.setHour(hour); town.setHour(hour);
      },
      touch(id) { const r = room.toggle(id); if (r !== undefined) return r; return town.touch ? town.touch(id) : undefined; },
      animate(dt, clock, camera) { town.animate(dt, clock, camera); site.animate(dt, clock, camera); },
    };
  },
};

/* the doorway of his studio is a wall when the door is shut (the walker cannot pass a closed door) */
const doors = { room: null };
function floorWithDoors(x, z, y) {
  const f = P.floorAt(x, z, y);
  if (doors.room && !doors.room.entryOpen()) {
    if (x > ROOM.x0 - 0.3 && x < ROOM.x0 + 0.1 && z > ROOM.z0 + IN.door[0] && z < ROOM.z0 + IN.door[1] && Math.abs(y - G2) < 0.6) return 99;
  }
  return f;
}
