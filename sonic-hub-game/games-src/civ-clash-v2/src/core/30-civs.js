/* ── Civilizations: a deck is a list of units and how many of each; the Imperial Age adds a few more.
   hp2: starting HP in a duel, hp4: at a 3–4 player table (both tuned by AI-vs-AI simulation, see tune.js).
   age: the symbols the Imperial Age card itself resolves when played.
   Each region file (31–42) adds its own units and civilizations; 44-roster.js puts the roster together.
   A new civilization is one entry in its region file: its units (if it has any of its own) and its deck. ── */
const CIVS = {};
const REGIONS = ['East Asia', 'Southeast Asia', 'South Asia', 'Steppe', 'Middle East', 'Caucasus', 'Eastern Europe', 'Southern Europe',
  'Central & North Europe', 'Western Europe', 'Africa', 'Americas'];
