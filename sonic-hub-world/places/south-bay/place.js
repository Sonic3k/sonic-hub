/* South Bay, the country of his American years, as a world (engine/world): too wide to build at once, so its ground
   comes 500 m at a time as the car moves. What stands in it so far:
     · the tiles (world/, written by data/world.py from OpenStreetMap): the streets, buildings and lots of El Segundo
       for a kilometre round the first route;
     · one site built by hand, the hotel of 2015 with the streets round it (places/esa-el-segundo-2015), held whole;
     · two routes, there and back: Extended Stay ↔ the AT&T campus (DirecTV in 2015) on Imperial Highway.
   The brief, what his photographs and papers say, and what is still guessed: claude/south-bay-de-bai.md and
   claude/south-bay-lai-xe-thiet-ke.md in the Project. */
import * as THREE from 'three';
import meta from './meta.js';
import esa from '../esa-el-segundo-2015/place.js';
import { X, concTex } from '../esa-el-segundo-2015/mat.js';
import { API } from '../../engine/hub.js';
import music from './music.js';

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
  ],
  /* the tiles' streets wear the hotel place's own asphalt and sidewalk, so that a street runs on without a seam */
  paving: () => ({ road: X.asphalt('#363636', 9), walk: new THREE.MeshStandardMaterial({ map: concTex('#c6c2b8', 4, true), roughness: 0.9 }) }),
  /* his lists for the road, the one he kept longest first */
  music: { api: API, prefer: ['spotify-sonic3k-driving-1', 'spotify-sonic3k-driving-2', 'spotify-sonic3k-driving-vpop'], fallback: music },
  start: { route: 'esa-att', hour: 'sang' },
  /* on foot from the hotel's lot: the hotel place's own page */
  walk: 'esa-el-segundo-2015',
};
