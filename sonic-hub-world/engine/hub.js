/* Where Sonic Hub lives, and how it names a moment: Vietnam wall-clock, "2007-06-15T18:05" (sonic-hub-web reads it
   as ?at= on /pc and /phone; a place reads the same ?at= to open on that year and hour). */
export const HUB = 'https://sonic-hub-web-production.up.railway.app';
export const pcAt = at => `${HUB}/pc?at=${at}`;
export const phoneAt = at => `${HUB}/phone?at=${at}`;

/** "2007-06-15T18:05" → { year: 2007, hour: 18 }, or null. A place far from Vietnam says how many hours its clocks
 *  stood from Vietnam's (tz: El Segundo in summer, −14); the moment is then read on its own clock. */
export function readMoment(s, tz = 0) {
  const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(s || '');
  if (!m) return null;
  const t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) + tz * 3600e3);
  return { year: t.getUTCFullYear(), hour: t.getUTCHours() };
}
