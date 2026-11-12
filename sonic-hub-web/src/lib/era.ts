/* The eras of the portal. Each stretch of his life has its own paper tint and ink (styles/shell.css: .era-1990 …):
   the big year, the tiles and the rules of a page take their colour from the era of the moment it shows.
   The cuts are where his life turned (school after school, onthi, work, the years away), so they are kept here. */
export interface Era { key: string; from: number; to: number | null; dark?: boolean }

export const ERAS: Era[] = [
  { key: '1990', from: 1990, to: 1996 },
  { key: '1996', from: 1996, to: 2001 },
  { key: '2001', from: 2001, to: 2005 },
  { key: '2005', from: 2005, to: 2008 },
  { key: '2008', from: 2008, to: 2013 },
  { key: '2013', from: 2013, to: 2018 },
  { key: '2018', from: 2018, to: 2023, dark: true },
  { key: '2023', from: 2023, to: null, dark: true },
];

/** the era a year falls in (anything before the first is the first: his family's years before him) */
export function eraOf(year: number): Era {
  for (let i = ERAS.length - 1; i >= 0; i--) if (year >= ERAS[i].from) return ERAS[i];
  return ERAS[0];
}
export const eraClass = (year: number) => `era-${eraOf(year).key}`;
export const eraRange = (e: Era) => `${e.from} – ${e.to ?? 'nay'}`;
/** is this year inside the era ("to" not included; the first era also holds what came before it) */
export const inEra = (e: Era, year: number) => eraOf(year).key === e.key;
