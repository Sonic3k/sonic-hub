/* The typefaces, for a page that is to need nothing beside it. Alegreya and Alegreya Sans are carried in the page
   when their packages are installed (npm install), and asked of Google Fonts when they are not. The few Chinese
   characters the page shows come from LXGW WenKai TC, cut down to just those (game/fonts/make-kai.py), and are always
   carried. Used by game/build.js and kit/build.js. */
const fs = require('fs'), path = require('path');
const FACES = [['Alegreya', 'alegreya', 700, 'normal'], ['Alegreya', 'alegreya', 800, 'italic'], ['Alegreya', 'alegreya', 500, 'italic'],
  ['Alegreya Sans', 'alegreya-sans', 400, 'normal'], ['Alegreya Sans', 'alegreya-sans', 500, 'normal'], ['Alegreya Sans', 'alegreya-sans', 700, 'normal']];
const KAI = [400, 700];

/** root: the folder node_modules is in. Returns { html: what goes in the page's head, carried: whether the faces are in it }. */
module.exports = function typefaces(root) {
  const fontFile = ([, pkg, weight, style]) => path.join(root, 'node_modules', '@fontsource', pkg, 'files', `${pkg}-latin-${weight}-${style}.woff2`);
  const kaiFile = weight => path.join(__dirname, 'fonts', `kai-${weight}.woff2`);
  const face = (family, weight, style, file) => `  @font-face { font-family: "${family}"; font-style: ${style}; font-weight: ${weight}; font-display: swap; src: url(data:font/woff2;base64,${fs.readFileSync(file).toString('base64')}) format("woff2"); }`;
  const kai = KAI.map(w => face('Lantern Kai', w, 'normal', kaiFile(w))).join('\n');
  const carried = FACES.every(f => fs.existsSync(fontFile(f)));
  const note = '  /* Alegreya and Alegreya Sans: Copyright 2011 The Alegreya Project Authors (https://github.com/huertatipografica/Alegreya).\n     LXGW WenKai TC (the few Chinese characters, as "Lantern Kai"): Copyright 2024 The LXGW WenKai Project Authors (https://github.com/lxgw/LxgwWenkaiTC).\n     All are carried here under the SIL Open Font License, Version 1.1: https://openfontlicense.org */';
  return { carried, html: carried
    ? '<style>\n' + note + '\n' + FACES.map(f => face(f[0], f[2], f[3], fontFile(f))).join('\n') + '\n' + kai + '\n</style>'
    : '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,700;1,500;1,800&family=Alegreya+Sans:wght@400;500;700&display=swap" rel="stylesheet">\n<style>\n' + note + '\n' + kai + '\n</style>' };
};
