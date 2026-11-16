/* The eras of Sonic Hub: each stretch of his life has its own paper and ink (sonic-hub-web: lib/era.ts and
   styles/shell.css). A place wears the paper of the year it is showing. Data only: the build reads it too. */
export const ERAS = [
  { key: '1990', from: 1990, paper: '#E1EFE7', ink: '#2F6B4F', rule: '#BCD2C5' },
  { key: '1996', from: 1996, paper: '#D9E8F4', ink: '#4B4FA6', rule: '#B4C9DA' },
  { key: '2001', from: 2001, paper: '#EDF3E3', ink: '#1F4FA8', rule: '#C9D4BC' },
  { key: '2005', from: 2005, paper: '#D2EBE7', ink: '#0E5A78', rule: '#AFCFCA' },
  { key: '2008', from: 2008, paper: '#EAEEF8', ink: '#0F6A63', rule: '#C6CDE0' },
  { key: '2013', from: 2013, paper: '#F6F8F5', ink: '#A8385F', rule: '#D0D6D2' },
  { key: '2018', from: 2018, paper: '#0E1E2B', ink: '#8FD9CF', rule: '#25394A', text: '#EEF3F5', text2: '#B7C6CF', on: '#0E1E2B' },
  { key: '2023', from: 2023, paper: '#0A1620', ink: '#E9D48C', rule: '#25394A', text: '#EEF3F5', text2: '#B7C6CF', on: '#0A1620' },
];

/** the era a year falls in (anything before the first is the first) */
export function eraOf(year) {
  for (let i = ERAS.length - 1; i >= 0; i--) if (year >= ERAS[i].from) return ERAS[i];
  return ERAS[0];
}

/** the page's colours for each era, as CSS (the page carries all of them; the year picks one) */
export const eraCss = () => ERAS.map(e => `:root[data-era="${e.key}"] { --paper: ${e.paper}; --ink: ${e.ink}; --rule: ${e.rule};${e.text ? ` --text: ${e.text}; --text2: ${e.text2}; --on: ${e.on}; --wash: rgba(255,255,255,.08);` : ''} }`).join('\n');
