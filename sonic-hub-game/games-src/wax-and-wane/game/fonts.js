/* The two typefaces, for a page that is to need nothing beside it: carried in the page when their packages are
   installed (npm install), and asked of Google Fonts when they are not. Used by game/build.js and kit/build.js. */
const fs = require('fs'), path = require('path');
const FACES = [['Marcellus', 'marcellus', 400], ['Jost', 'jost', 400], ['Jost', 'jost', 500], ['Jost', 'jost', 600]];

/** root: the folder node_modules is in. Returns { html: what goes in the page's head, carried: whether the faces are in it }. */
module.exports = function typefaces(root) {
  const fontFile = ([, pkg, weight]) => path.join(root, 'node_modules', '@fontsource', pkg, 'files', `${pkg}-latin-${weight}-normal.woff2`);
  const carried = FACES.every(f => fs.existsSync(fontFile(f)));
  return { carried, html: carried
    ? '<style>\n  /* Marcellus: Copyright 2012 Brian J. Bonislawsky DBA Astigmatic (AOETI). Jost: Copyright 2020 The Jost Project Authors (https://github.com/indestructible-type/Jost).\n     Both typefaces are carried here under the SIL Open Font License, Version 1.1: https://openfontlicense.org */\n' + FACES.map(f => `  @font-face { font-family: "${f[0]}"; font-style: normal; font-weight: ${f[2]}; font-display: swap; src: url(data:font/woff2;base64,${fs.readFileSync(fontFile(f)).toString('base64')}) format("woff2"); }`).join('\n') + '\n</style>'
    : '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600&family=Marcellus&display=swap" rel="stylesheet">' };
};
