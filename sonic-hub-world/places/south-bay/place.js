/* South Bay, the country of his American years, as a world (engine/world): too wide to build at once, so its ground
   comes 500 m at a time as the car moves. What stands in it so far:
     · the tiles (world/, written by data/world.py from OpenStreetMap): the streets, buildings and lots of El Segundo
       for a kilometre round the first route;
     · two sites built by hand: the hotel of 2015 with the streets round it (places/esa-el-segundo-2015), held whole,
       and the parking structure at 940 N Nash St where he left the car on working days (garage.js);
     · two routes, there and back: Extended Stay ↔ level 3 of that parking structure, by the AT&T campus (DirecTV in
       2015) on Imperial Highway.
   The brief, what his photographs and papers say, and what is still guessed: claude/south-bay-de-bai.md and
   claude/south-bay-lai-xe-thiet-ke.md in the Project. */
import * as THREE from 'three';
import meta from './meta.js';
import esa from '../esa-el-segundo-2015/place.js';
import { X, concTex } from '../esa-el-segundo-2015/mat.js';
import { API } from '../../engine/hub.js';
import music from './music.js';
import { buildGarage } from './garage.js';
import G from './garage.json';

export default {
  meta,
  far: 1500,
  /* the sky and sun of the hotel place: the same mornings and evenings over the same streets */
  light: esa.light,
  data: '../world/south-bay/',
  sites: [
    /* the hotel place whole: its streets and the buildings along them show from a kilometre off; the hotel itself, its
       lot, the cars in it and the room only from within 700 m */
    { id: 'esa-el-segundo-2015', at: [250, -10], reach: 1250, build: o => esa.build(o),
      near: { at: [10, 20], reach: 700, far: /^(ground|greenery|buildings|shops|metro|street )/ } },
    /* the parking structure: its shell and decks are a landmark of the campus from afar; what is inside (beams, lines,
       lamps, the cars in the stalls, the gates and their signs) only from within 300 m */
    { id: 'garage-940-nash', at: [(G.x0 + G.x1) / 2, (G.z0 + G.z1) / 2], reach: 950, build: o => buildGarage(o),
      near: { at: [(G.x0 + G.x1) / 2, (G.z0 + G.z1) / 2], reach: 300, far: /^garage shell/ } },
  ],
  /* the tiles' streets wear the hotel place's own asphalt and sidewalk, so that a street runs on without a seam */
  paving: () => ({ road: X.asphalt('#363636', 9), walk: new THREE.MeshStandardMaterial({ map: concTex('#c6c2b8', 4, true), roughness: 0.9 }) }),
  /* his lists for the road, the one he kept longest first */
  music: { api: API, prefer: ['spotify-sonic3k-driving-1', 'spotify-sonic3k-driving-2', 'spotify-sonic3k-driving-vpop'], fallback: music },
  start: { route: 'esa-att', hour: 'sang' },
  /* on foot from the hotel's lot: the hotel place's own page */
  walk: 'esa-el-segundo-2015',
};
