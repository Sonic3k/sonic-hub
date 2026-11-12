/* ── Moves: every action the engine would accept right now, for the AI's candidates and the rule fuzzer ──
   Large choices (which cards to redraw, which cards pay for the Thieves' Den) come in a few sensible shapes instead of every subset. */
function cheapest(cards, k, keep) { return cards.filter(c => !keep || c.uid !== keep).slice().sort((a, b) => (a.cost || 0) - (b.cost || 0)).slice(0, k); }
function buildMoves(S, pid) {
  const P = S.players[pid], out = [];
  for (const card of P.hand) {
    for (const o of payOptions(S, pid, card)) {
      if (o.pay === 'gold' || o.pay === 'framework') out.push({ t: 'build', uid: card.uid, pay: o.pay });
      else if (o.pay === 'cards') {
        const cost = buildCost(P, card), need = Math.max(1, cost - P.gold);
        for (const k of [...new Set([need, o.max])]) if (k >= 1 && k <= o.max && cost - k <= P.gold) out.push({ t: 'build', uid: card.uid, pay: 'cards', cards: cheapest(P.hand, k, card.uid).map(c => c.uid) });
      } else if (o.pay === 'necropolis') {
        for (const e of P.city.slice().sort((a, b) => worth(a) - worth(b)).slice(0, 2)) out.push({ t: 'build', uid: card.uid, pay: 'necropolis', sacrifice: e.card.uid });
      } else if (o.pay === 'cardinal') {
        const from = S.players.filter(X => X !== P && X.gold >= o.short).sort((a, b) => b.gold - a.gold)[0];
        if (from) out.push({ t: 'build', uid: card.uid, pay: 'cardinal', from: from.id, give: cheapest(P.hand, o.short, card.uid).map(c => c.uid) });
      }
    }
  }
  return out;
}
function abilityMoves(S, pid) {
  const t = S.cur, P = S.players[pid], out = [];
  if (!abilityFree(S, pid)) return out;
  const others = S.players.filter(X => X !== P);
  switch (t.char) {
    case 'assassin': case 'witch': case 'thief': for (const c of namable(S, t.char)) out.push({ t: 'ability', char: c }); break;
    case 'magistrate': {
      const cs = namable(S, 'magistrate').filter(c => !S.sel.faceUp.includes(c));
      if (cs.length >= 3) { const three = cs.slice(0, 3); for (const s of three) out.push({ t: 'ability', chars: three, signed: s }); }
      break;
    }
    case 'blackmailer': {
      const cs = namable(S, 'blackmailer').filter(c => !S.sel.faceUp.includes(c));
      if (cs.length >= 2) for (let i = 0; i + 1 < cs.length; i += 2) out.push({ t: 'ability', chars: [cs[i], cs[i + 1]], real: cs[i] });
      break;
    }
    case 'spy': for (const X of others) for (const ty of TYPE_ORDER) out.push({ t: 'ability', target: X.id, type: ty }); break;
    case 'magician':
      for (const X of others) out.push({ t: 'ability', mode: 'swap', target: X.id });
      if (P.hand.length) out.push({ t: 'ability', mode: 'redraw', uids: P.hand.map(c => c.uid) }, { t: 'ability', mode: 'redraw', uids: cheapest(P.hand, Math.ceil(P.hand.length / 2)).map(c => c.uid) });
      break;
    case 'wizard': if (t.gathered) for (const X of others) out.push({ t: 'ability', target: X.id }); break;
    case 'seer': out.push({ t: 'ability' }); break;
    case 'emperor': for (const x of crownTargets(S, pid)) out.push({ t: 'ability', target: x, take: 'gold' }, { t: 'ability', target: x, take: 'card' }); break;
    case 'abbot': for (const x of richest(S, pid)) out.push({ t: 'ability', from: x }); break;
    case 'navigator': out.push({ t: 'ability', take: 'gold' }, { t: 'ability', take: 'cards' }); break;
    case 'scholar': out.push({ t: 'ability' }); break;
    case 'warlord': for (const o of warlordTargets(S, pid)) if (P.gold >= o.cost) out.push({ t: 'ability', target: o.target, uid: o.uid }); break;
    case 'marshal': for (const o of marshalTargets(S, pid)) if (P.gold >= o.cost) out.push({ t: 'ability', target: o.target, uid: o.uid }); break;
    case 'diplomat': for (const o of diplomatTargets(S, pid)) if (P.gold >= o.cost) out.push({ t: 'ability', mine: o.mine, target: o.target, uid: o.uid }); break;
    case 'artist': { const free = P.city.filter(e => !e.beau); if (free.length && P.gold >= 1) { out.push({ t: 'ability', uids: [free[0].card.uid] }); if (free.length > 1 && P.gold >= 2) out.push({ t: 'ability', uids: [free[0].card.uid, free[1].card.uid] }); } break; }
  }
  return out;
}
function districtMoves(S, pid) {
  const t = S.cur, P = S.players[pid], out = [];
  if (!districtOK(S, pid)) return out;
  if (has(P, 'laboratory') && !t.used.lab) for (const c of P.hand.slice(0, 2)) out.push({ t: 'lab', uid: c.uid });
  if (has(P, 'smithy') && !t.used.smithy && P.gold >= 2) out.push({ t: 'smithy' });
  if (has(P, 'museum') && !t.used.museum) for (const c of P.hand.slice(0, 1)) out.push({ t: 'museum', uid: c.uid });
  if (has(P, 'armory')) for (const o of armoryTargets(S, pid).slice(0, 4)) out.push({ t: 'armory', target: o.target, uid: o.uid });
  return out;
}
function legalMoves(S, pid) {
  const nd = S.need; if (!nd || nd.pid !== pid || S.over) return [];
  const P = S.players[pid], out = [];
  switch (nd.kind) {
    case 'pick': return nd.options.map(c => ({ t: 'pick', char: c }));
    case 'theater': out.push({ t: 'theater', target: null }); for (const X of S.players) if (X !== P && X.chars.length) out.push({ t: 'theater', target: X.id, give: P.chars[0] }); return out;
    case 'keep': return nd.cards.map(c => ({ t: 'keep', uids: [c.uid] }));
    case 'bribe': return [{ t: 'bribe', pay: true }, { t: 'bribe', pay: false }];
    case 'reveal': return [{ t: 'reveal', reveal: true }, { t: 'reveal', reveal: false }];
    case 'confiscate': return [{ t: 'confiscate', take: true }, { t: 'confiscate', take: false }];
    case 'wizard': for (const c of nd.cards) { out.push({ t: 'wizard', uid: c.uid, build: false }); if (c.id !== 'secret-vault' && P.gold >= buildCost(P, c)) out.push({ t: 'wizard', uid: c.uid, build: true }); } return out;
    case 'seer': { const gives = {}; nd.to.forEach((x, i) => { gives[x] = P.hand[i] && P.hand[i].uid; }); return nd.to.length <= P.hand.length ? [{ t: 'seer', gives }] : []; }
    case 'heir': return crownTargets(S, pid).map(x => ({ t: 'heir', target: x }));
    case 'turn': {
      if (canGather(S, pid)) out.push({ t: 'gather', take: 'gold' }, { t: 'gather', take: 'cards' });
      out.push(...buildMoves(S, pid), ...abilityMoves(S, pid), ...districtMoves(S, pid));
      const g = CHAR[S.cur.char].gain;
      if (g && !S.cur.gainDone && turnOpen(S, pid) && S.cur.mode !== 'witch') out.push(g.res === 'either' ? { t: 'gain', gold: gainCount(S, P, S.cur.char) } : { t: 'gain' });
      if (canEnd(S, pid)) out.push({ t: 'end' });
      return out;
    }
  }
  return out;
}
