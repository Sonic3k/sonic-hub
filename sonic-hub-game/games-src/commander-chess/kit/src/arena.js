/* ── arena: the table, for Node ──
     node arena.js check my-ai.js                    is the file a valid player? every level, both colours, both games, both line-ups
     node arena.js my-ai.js sample-ai.js             a match between two files
     node arena.js ladder my-ai.js                   each level against the level below it
     node arena.js show fault-my-ai-1.json           the position of a kept game, as text
   Options: --games N   --level A or A:B   --ms T   --seed N   --game battles|total|both   --lineup standard|light|both
            --max-turns N   --at N (show: stop after N moves)   --quiet */
(() => {
  'use strict';
  if (typeof require === 'undefined' || typeof module === 'undefined' || require.main !== module) return;
  const fs = require('fs'), path = require('path'), vm = require('vm');
  const CC = require('./engine.js'), T = makeTable(CC);
  const out = s => process.stdout.write(s + '\n');
  /* a turn that never comes back is cut off here, so that a player that hangs loses the game and not the whole run */
  const guard = (fn, ms) => { globalThis.__ccCall = fn; try { return vm.runInThisContext('__ccCall()', { timeout: Math.ceil(ms) }); } finally { globalThis.__ccCall = null; } };

  function usage(msg) {
    if (msg) out(msg + '\n');
    out(['node arena.js check <ai.js>                 is the file a valid player?',
      'node arena.js <a.js> <b.js>                 a match between two files',
      'node arena.js ladder <ai.js>                each level against the level below it',
      'node arena.js show <record.json>            the position of a kept game, as text',
      '',
      'options: --games N  --level A|A:B  --ms T  --seed N  --game battles|total|both  --lineup standard|light|both',
      '         --max-turns N  --at N  --quiet'].join('\n'));
    process.exit(msg ? 2 : 0);
  }
  function args(argv) {
    const o = { _: [] };
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (a === '--quiet') o.quiet = true;
      else if (a.startsWith('--')) { if (i + 1 >= argv.length) usage('missing value for ' + a); o[a.slice(2)] = argv[++i]; }
      else o._.push(a);
    }
    return o;
  }
  const whole = (v, name, min, max, dflt) => { if (v === undefined) return dflt; const n = Number(v); if (!Number.isInteger(n) || n < min || n > max) usage('--' + name + ' has to be a whole number from ' + min + ' to ' + max); return n; };
  function setups(o) {
    const games = o.game === 'both' ? ['battles', 'total'] : [o.game === 'total' ? 'total' : 'battles'], lineups = o.lineup === 'both' ? ['standard', 'light'] : [o.lineup === 'light' ? 'light' : 'standard'];
    const list = []; for (const lineup of lineups) for (const game of games) list.push({ game, lineup });
    return list;
  }
  function source(file) {
    let text; try { text = fs.readFileSync(file, 'utf8'); } catch (e) { usage('cannot read ' + file); }
    const label = path.basename(file);
    return { file, label, make: () => T.loadAI(text, label) };
  }
  const setupText = s => (s.game === 'total' ? 'total war' : 'battles') + ', ' + s.lineup + ' line-up';
  const add = (a, b) => { a.turns += b.turns; a.ms += b.ms; a.late += b.late; if (b.max > a.max) a.max = b.max; };
  const timeText = (st, ms) => 'avg ' + (st.turns ? Math.round(st.ms / st.turns) : 0) + ' ms, longest ' + Math.round(st.max) + ' ms of ' + ms + (st.late ? ', LATE on ' + st.late + ' of ' + st.turns + ' turns' : ', never late');

  function playGame(red, blue, o) {
    const ais = [red.src.make(), blue.src.make()];
    const M = T.newMatch({ setup: o.setup, timeMs: o.ms, seed: o.seed, maxTurns: o.maxTurns, levels: [red.level, blue.level], names: [ais[0].name, ais[1].name] });
    while (!M.result) T.takeAnswer(M, T.ask(ais[M.S.turn], M.S, T.request(M), guard));
    return M;
  }
  let kept = 0;
  function keepFault(M, id) {
    const file = 'fault-' + id + '-' + (++kept) + '.json';
    try { fs.writeFileSync(file, JSON.stringify(T.record(M))); return file; } catch (e) { return null; }
  }
  /** games between a and b ({src, level}), colours changing every game. o.first: the number of the first game, for
   *  the choice of setup and seed. */
  function series(a, b, o) {
    const t = { a: 0, b: 0, d: 0, faults: [], stats: [{ turns: 0, ms: 0, max: 0, late: 0 }, { turns: 0, ms: 0, max: 0, late: 0 }] };
    for (let g = 0; g < o.games; g++) {
      const n = (o.first || 0) + g, swap = g % 2 === 1, setup = o.setups[(n >> 1) % o.setups.length], aSide = swap ? 1 : 0;
      const M = playGame(swap ? b : a, swap ? a : b, { setup, ms: o.ms, seed: o.seed + n, maxTurns: o.maxTurns });
      const w = M.result.winner;
      if (w < 0) t.d++; else if (w === aSide) t.a++; else t.b++;
      add(t.stats[0], M.stats[aSide]); add(t.stats[1], M.stats[1 - aSide]);
      let note = '';
      if (M.result.why === 'fault') { const who = M.result.fault.side === aSide ? 'a' : 'b', file = keepFault(M, (who === 'a' ? a : b).src.label.replace(/\.js$/, '')); t.faults.push({ who, M, file, setup }); note = file ? '\n      kept as ' + file + '  (node arena.js show ' + file + ')' : ''; }
      if (!o.quiet) out('  game ' + String(g + 1).padStart(2) + '  ' + (o.tag || '') + (swap ? 'as Blue' : 'as Red ') + ', ' + setupText(setup) + ', ' + M.turns + ' turns: ' + T.resultText(M) + note);
    }
    return t;
  }

  function cmdMatch(o) {
    const A = source(o._[0]), B = source(o._[1]);
    const lv = String(o.level === undefined ? '5' : o.level).split(':'), la = whole(lv[0], 'level', 1, 5), lb = whole(lv[1] === undefined ? lv[0] : lv[1], 'level', 1, 5);
    let ma, mb; try { ma = A.make(); mb = B.make(); } catch (e) { out('LOAD FAILED: ' + e.message); process.exit(1); }
    const ms = whole(o.ms, 'ms', 20, 60000, 1000), games = whole(o.games, 'games', 1, 1000, 10);
    out('Commander Chess AI kit ' + CC.KIT + ': ' + ma.name + ' (' + A.label + ', level ' + la + ') against ' + mb.name + ' (' + B.label + ', level ' + lb + '), ' + games + ' games, ' + ms + ' ms a turn');
    const t = series({ src: A, level: la }, { src: B, level: lb }, { games, ms, seed: whole(o.seed, 'seed', 0, 2147483647, 1), setups: setups(o), maxTurns: whole(o['max-turns'], 'max-turns', 10, 100000, 400), quiet: o.quiet, tag: ma.name + ' ' });
    out('\n' + ma.name + ' won ' + t.a + ', ' + mb.name + ' won ' + t.b + ', drawn ' + t.d + (t.faults.length ? '   (' + t.faults.length + ' decided by a fault)' : ''));
    out('time a turn   ' + ma.name + ': ' + timeText(t.stats[0], ms) + '\n              ' + mb.name + ': ' + timeText(t.stats[1], ms));
  }

  function cmdCheck(o) {
    const A = source(o._[1]), sample = source(path.join(__dirname, 'sample-ai.js'));
    out('Commander Chess AI kit ' + CC.KIT + ': check of ' + A.label);
    let meta; try { meta = A.make(); } catch (e) { out('  LOAD FAILED: ' + e.message + '\nRESULT: FAIL'); process.exit(1); }
    out('  loaded: ' + meta.name + ' (' + meta.id + ') by ' + meta.author + '\n  about: ' + meta.about);
    const ms = whole(o.ms, 'ms', 20, 60000, 300), games = whole(o.games, 'games', 1, 100, 2), all = setups({ game: 'both', lineup: 'both' });
    out('  ' + games + ' games at each level against the sample player, ' + ms + ' ms a turn\n');
    let faults = 0, late = 0, turns = 0;
    for (let level = 1; level <= 5; level++) {
      const t = series({ src: A, level }, { src: sample, level: 5 }, { games, ms, seed: whole(o.seed, 'seed', 0, 2147483647, 1), first: (level - 1) * games, setups: all, maxTurns: whole(o['max-turns'], 'max-turns', 10, 100000, 300), quiet: o.quiet, tag: 'level ' + level + ' ' });
      const mine = t.faults.filter(f => f.who === 'a'); faults += mine.length; late += t.stats[0].late; turns += t.stats[0].turns;
      out('  level ' + level + ': won ' + t.a + ', lost ' + t.b + ', drawn ' + t.d + '   ' + timeText(t.stats[0], ms) + '   faults ' + mine.length);
      for (const f of mine) out('    FAULT [' + f.M.result.fault.kind + '] turn ' + f.M.result.fault.turn + ', as ' + T.SIDE[f.M.result.fault.side] + ', ' + setupText(f.setup) + ': ' + f.M.result.fault.detail.split('\n').join('\n      ') + (f.file ? '\n      kept as ' + f.file : ''));
      for (const f of t.faults.filter(x => x.who === 'b')) out('    (the sample player was at fault in a game: that is a fault of the kit, please report it) ' + f.M.result.fault.detail);
      if (!o.quiet) out('');
    }
    out('RESULT: ' + (faults ? 'FAIL, ' + faults + ' game' + (faults > 1 ? 's' : '') + ' lost by a fault' : late ? 'PASS, but late on ' + late + ' of ' + turns + ' turns (a turn has to stay inside ctx.timeMs)' : 'PASS, no fault in ' + turns + ' turns'));
    process.exit(faults ? 1 : 0);
  }

  function cmdLadder(o) {
    const A = source(o._[1]), sample = source(path.join(__dirname, 'sample-ai.js'));
    let meta; try { meta = A.make(); } catch (e) { out('LOAD FAILED: ' + e.message); process.exit(1); }
    const ms = whole(o.ms, 'ms', 20, 60000, 500), games = whole(o.games, 'games', 2, 1000, 10);
    out('Commander Chess AI kit ' + CC.KIT + ': ladder of ' + meta.name + ' (' + A.label + '), ' + games + ' games a step, ' + ms + ' ms a turn\n');
    const rows = [], base = { games, ms, seed: whole(o.seed, 'seed', 0, 2147483647, 1), setups: setups(o), maxTurns: whole(o['max-turns'], 'max-turns', 10, 100000, 400), quiet: o.quiet };
    for (let level = 1; level <= 5; level++) {
      const low = level === 1 ? { src: sample, level: 5 } : { src: A, level: level - 1 }, what = 'level ' + level + ' against ' + (level === 1 ? 'the sample player' : 'level ' + (level - 1));
      if (!o.quiet) out(what);
      const t = series({ src: A, level }, low, Object.assign({ tag: 'level ' + level + ' ' }, base));
      rows.push(what.padEnd(34) + 'won ' + String(t.a).padStart(2) + ', lost ' + String(t.b).padStart(2) + ', drawn ' + String(t.d).padStart(2) + '   ' + timeText(t.stats[0], ms) + (t.faults.length ? '   FAULTS ' + t.faults.length : ''));
      if (!o.quiet) out('');
    }
    out(rows.join('\n'));
  }

  function cmdShow(o) {
    let rec; try { rec = JSON.parse(fs.readFileSync(o._[1], 'utf8')); } catch (e) { usage('cannot read ' + o._[1] + ' as a game record'); }
    let M; try { M = T.fromRecord(rec, o.at === undefined ? undefined : whole(o.at, 'at', 0, 100000)); } catch (e) { out(e.message); process.exit(1); }
    const S = M.S, pts = CC.points(S);
    out(setupText(M.setup) + '   Red: ' + M.names[0] + ' (level ' + M.levels[0] + ')   Blue: ' + M.names[1] + ' (level ' + M.levels[1] + ')   seed ' + M.seed + ', ' + M.timeMs + ' ms a turn');
    out('after ' + M.moves.length + ' moves (' + M.turns + ' turns)\n');
    for (const l of M.lines.slice(-12)) out(String(l.n).padStart(4) + '. ' + T.SIDE[l.side].padEnd(5) + l.text);
    out('\n' + T.ascii(S) + '\n');
    out('points  Red ' + pts[0] + ', Blue ' + pts[1] + '      ships / planes / infantry+tanks+artillery   Red ' + CC.arms(S, 0).join(' / ') + ', Blue ' + CC.arms(S, 1).join(' / ') + '      quiet turns ' + S.half + ' of 100');
    if (M.result) out('over: ' + T.resultText(M));
    else {
      const legal = CC.legalMoves(S);
      out(T.SIDE[S.turn] + ' to move' + (S.dOrg >= 0 ? ', in a deployment from ' + CC.sqName(S.dOrg) : '') + (CC.inCheck(S, S.turn) ? ', Commander attacked' : '') + '. ' + legal.length + ' legal moves:');
      out('  ' + legal.map(m => (CC.mMode(m) === CC.COMMIT ? 'done' : CC.moveText(S, m)) + '=' + m).join('  '));
    }
    if (rec.result && rec.result.why === 'fault' && !M.result && o.at === undefined) out('\nthe game ended here by a fault of ' + T.SIDE[rec.result.fault.side] + ' [' + rec.result.fault.kind + ']: ' + rec.result.fault.detail);
  }

  const o = args(process.argv.slice(2));
  if (!o._.length || o._[0] === 'help') usage();
  if (o._[0] === 'check') { if (o._.length !== 2) usage('check takes one file'); cmdCheck(o); }
  else if (o._[0] === 'ladder') { if (o._.length !== 2) usage('ladder takes one file'); cmdLadder(o); }
  else if (o._[0] === 'show') { if (o._.length !== 2) usage('show takes one record'); cmdShow(o); }
  else if (o._.length === 2) cmdMatch(o);
  else usage('two files make a match');
})();
