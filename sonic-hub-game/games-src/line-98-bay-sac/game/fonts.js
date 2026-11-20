/* The two typefaces, for a page that is to need nothing beside it: carried in the page when their packages are
   installed (npm install), and asked of Google Fonts when they are not. Both have the Vietnamese letters, which
   come as a file of their own beside the Latin ones. */
const fs = require('fs'), path = require('path');
// family, package, weight, style
const FACES = [['Fraunces', 'fraunces', 600, 'normal'], ['Fraunces', 'fraunces', 500, 'italic'], ['Be Vietnam Pro', 'be-vietnam-pro', 400, 'normal'], ['Be Vietnam Pro', 'be-vietnam-pro', 600, 'normal']];
// what each file holds, as Google Fonts cuts them
const PARTS = [
  ['vietnamese', 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB'],
  ['latin', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
];

/** root: the folder node_modules is in. Returns { html: what goes in the page's head, carried: whether the faces are in it }. */
module.exports = function typefaces(root) {
  const file = ([, pkg, weight, style], part) => path.join(root, 'node_modules', '@fontsource', pkg, 'files', `${pkg}-${part}-${weight}-${style}.woff2`);
  const carried = FACES.every(f => PARTS.every(([part]) => fs.existsSync(file(f, part))));
  if (!carried) return { carried, html: '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600&family=Fraunces:ital,wght@0,600;1,500&display=swap" rel="stylesheet">' };
  const rules = [];
  for (const f of FACES) for (const [part, range] of PARTS)
    rules.push(`  @font-face { font-family: "${f[0]}"; font-style: ${f[3]}; font-weight: ${f[2]}; font-display: swap; src: url(data:font/woff2;base64,${fs.readFileSync(file(f, part)).toString('base64')}) format("woff2"); unicode-range: ${range}; }`);
  return { carried, html: '<style>\n  /* Fraunces: Copyright 2020 The Fraunces Project Authors (github.com/undercasetype/Fraunces). Be Vietnam Pro: Copyright 2021 The Be Vietnam Pro Project Authors\n     (github.com/bettergui/BeVietnamPro). Both typefaces are carried here under the SIL Open Font License, Version 1.1: https://openfontlicense.org */\n' + rules.join('\n') + '\n</style>' };
};
