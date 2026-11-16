/* Where Sonic Hub lives, and how it names a moment: Vietnam wall-clock, "2007-06-15T18:05" (sonic-hub-web reads it
   as ?at= on /pc and /phone; a place reads the same ?at= to open on that year and hour). */
export const HUB = 'https://sonic-hub-web-production.up.railway.app';
export const pcAt = at => `${HUB}/pc?at=${at}`;
export const phoneAt = at => `${HUB}/phone?at=${at}`;

/** "2007-06-15T18:05" → { year: 2007, hour: 18 }, or null */
export function readMoment(s) {
  const m = /^(\d{4})-\d\d-\d\dT(\d\d):\d\d/.exec(s || '');
  return m ? { year: +m[1], hour: +m[2] } : null;
}
