/* A match from the first spin of the bottle to the last blow: the turn order, the battles lane by lane with the
   Rose Window, running out of cards, and the end. Ported from the original's battle sequence; the parts the original
   left to animations and prefabs (who deals damage on a hit, a block, a counter) follow what its code shows.

   The page drives it: it calls the player's actions, asks for the next attack and gives back where the wheel
   stopped, and lets the AI take its steps one at a time so each can be drawn. Everything that happened is in
   match.gs.Log since the page last emptied it. */

/** The wheel for one attack, from the player's hero and the quest, as the original's SetUpRing: a hit zone and right
 *  after it a critical zone, at a random place on the ring. attacking: the player's own attack (else she defends).
 *  open: the lane in front is empty. Returns { hit:[start,end], crit:[start,end], spin } as fractions of a turn,
 *  and the time one turn takes, in seconds. */
function wheelZones(gs, leaderForm, quest, attacking, open) {
  let hit = attacking ? leaderForm.Ring_P1_HitAreaRange + (quest.p1Hit || 0) : leaderForm.Ring_P2_HitAreaRange + (quest.p2Hit || 0);
  let crit = attacking ? leaderForm.Ring_P1_CritAreaRange + (quest.p1Crit || 0) : leaderForm.Ring_P2_CritAreaRange + (quest.p2Crit || 0);
  if (attacking) { hit += hit * gs.HitAreaModifier; crit += crit * gs.CritAreaModifier; }
  else { hit += hit * gs.DefenseAreaModifier; crit += crit * gs.DefenseAreaCritModifier; }
  if (hit + crit > 1) hit = 1 - crit;
  if (attacking && open) hit = 1 - crit;
  const start = Random.RangeF(0, 1 - hit - crit);
  const spinFactor = quest.spinFactor || 1;
  const spin = Random.RangeF(leaderForm.TimeFor1SpinMin * spinFactor, leaderForm.TimeFor1SpinMax * spinFactor);
  return { hit: [start, start + hit], crit: [start + hit, start + hit + crit], spin };
}
/** where the needle stopped (0..1 of a turn) → 'Hit' | 'Crit' | 'Miss' */
function wheelResult(zones, at) {
  if (at >= zones.hit[0] && at <= zones.hit[1]) return 'Hit';
  if (at >= zones.crit[0] && at <= zones.crit[1]) return 'Crit';
  return 'Miss';
}

class Match {
  /* opts: { seed, user: { deck: Deck, leader: LeaderItem }, opponent: { deck, leader }, quest: { spinFactor, p1Hit,
     p1Crit, p2Hit, p2Crit, aiReshuffle }, first: 0 | 1 | undefined (the bottle decides) }
     Both decks are copied: the match never changes the ones it was given. */
  constructor(opts) {
    Random.seed(opts.seed >>> 0);
    const gs = this.gs = new GameState();
    this.quest = Object.assign({ spinFactor: 1, p1Hit: 0, p1Crit: 0, p2Hit: 0, p2Crit: 0, aiReshuffle: true }, opts.quest || {});
    const user = opts.user.deck.Clone(), opp = opts.opponent.deck.Clone();
    user.Leader = opts.user.leader; opp.Leader = opts.opponent.leader;
    gs.SetDecks(user, opp);
    gs.SetHealth(user.Leader.HP, opp.Leader.HP);
    gs.SetMinHealth(0, 0);
    gs.CritDamageMod = user.Leader.Form.CritDamageMod;
    user.Shuffle();
    gs.LeaderCooldown[0] = user.Leader.Form.Cooldown;
    for (let i = 0; i < PARAMS.CARDS_TO_DEAL; i++) gs.Hands[0].push(user.DealCard());
    opp.Shuffle(); opp.ShuffleLandscapes();
    gs.LeaderCooldown[1] = opp.Leader.Form.Cooldown;
    for (let i = 0; i < PARAMS.CARDS_TO_DEAL; i++) gs.Hands[1].push(opp.DealCard());
    for (let i = 0; i < 4; i++) gs.SetLandscape(PlayerType.Opponent, i, opp.GetLandscape(i));
    this.phase = 'landscapes';      // landscapes → (user|ai)-setup → (user|ai)-battle → … → over
    this.winner = null;
    this.firstChoice = opts.first;
    this.attackQueue = null; this.attack = null;
  }

  /** the four landscapes of the player's deck, in the order she lays them on her lanes 0..3 */
  placeLandscapes(order) {
    if (this.phase !== 'landscapes') throw new Error('the landscapes are already down');
    const deck = this.gs.GetDeck(0), want = deck.Landscapes.slice().sort().join(), got = order.slice().sort().join();
    if (want !== got) throw new Error('those are not the landscapes of this deck');
    for (let i = 0; i < 4; i++) this.gs.SetLandscape(PlayerType.User, i, order[i]);
    /* the ketchup bottle: whoever it points at goes first, with the starting light */
    const first = this.firstChoice === 0 || this.firstChoice === 1 ? this.firstChoice : Random.Range(0, 2);
    this.gs.SetMagicPoints(first, PARAMS.Starting_Magic_Points);
    this.gs.FirstPlayer = first + 1;
    this.gs.Note({ t: 'first', p: first });
    this.beginTurn(first);
  }

  get turnPlayer() { return this.current; }
  get over() { return this.phase === 'over'; }

  /* ---------------------------------------------------------------- turns */

  beginTurn(p) {
    const gs = this.gs;
    this.current = p;
    gs.EndTurn(opp(p));
    const outOfCards = gs.StartTurn(p);
    gs.Note({ t: 'turn', p, turn: gs.Turn });
    if (outOfCards) this.outOfCards();
    if (p === PlayerType.Opponent && gs.GetDeck(p).CardCount() === 0 && this.quest.aiReshuffle) {
      gs.ReshuffleOpponentCards(p);   // as the original's AI does: hand and discard pile back in, five new cards
      gs.Note({ t: 'reshuffle', p });
    }
    this.settle();
    if (this.phase === 'over') return;
    this.phase = p === PlayerType.User ? 'user-setup' : 'ai-setup';
  }
  /* the player has no card left to draw: she loses as much health as her hero's rank, everything she has in play
     goes, and her hand and discard pile are shuffled into a new deck from which she draws five */
  outOfCards() {
    const gs = this.gs, P = PlayerType.User;
    gs.Note({ t: 'outOfCards', p: P });
    gs.DoResultBleed(P);
    this.settle();
    if (this.phase === 'over') return;
    const sweep = new DiscardTarget(); sweep.Data = new CardItem(new CardForm({ type: CardType.Spell, script: 'DiscardTarget' })); sweep.Owner = P; sweep.GameInstance = gs;
    sweep.Cast();
    const hand = gs.GetHand(P);
    while (hand.length > 0) { const c = hand[hand.length - 1]; gs.RemoveCardFromHand(P, c); gs.DiscardCard(P, c); }
    const pile = gs.GetDiscardPile(P), deck = gs.GetDeck(P);
    while (pile.length > 0) deck.AddCard(pile.shift());
    gs.Reshuffle(P);
    for (let i = 0; i < 5; i++) gs.DrawCard(P);
    gs.Note({ t: 'reshuffle', p: P });
  }
  /** after anything happens: the cards that watch the board, then whoever has fallen, then is it over? */
  settle() {
    this.gs.Update();
    const u = this.gs.GetHealth(0), o = this.gs.GetHealth(1);
    if (u <= 0 || o <= 0) {
      this.phase = 'over';
      this.winner = u > 0 ? PlayerType.User : PlayerType.Opponent;   // both at 0: the player has lost, as in the original
      this.gs.Note({ t: 'over', winner: this.winner });
    }
  }

  /* ---------------------------------------------------------------- what the player may do in her setup */

  get busy() { return !!this.gs.Pending; }
  canSummon(card, lane) {
    const gs = this.gs; if (this.phase !== 'user-setup' || this.busy) return false;
    if (card.Form.Type === CardType.Spell) return false;
    return gs.GetHand(0).includes(card) && card.Form.CanPlay(0, lane);
  }
  canCast(card) {
    if (this.phase !== 'user-setup' || this.busy) return false;
    return card.Form.Type === CardType.Spell && this.gs.GetHand(0).includes(card) && card.Form.CanPlay(0, -1);
  }
  canFloop(lane) {
    const gs = this.gs; if (this.phase !== 'user-setup' || this.busy) return false;
    const l = gs.GetLane(0, lane);
    return l.HasCreature() && gs.IsFloopingEnabled(0) && gs.CanFloopCard(0, l.GetCreature());
  }
  canUseHero() { return this.phase === 'user-setup' && !this.busy && this.gs.IsLeaderAbilityReady(0); }

  summon(card, lane) { if (!this.canSummon(card, lane)) throw new Error('cannot play that there'); this.gs.Summon(0, lane, card); this.settle(); }
  cast(card) { if (!this.canCast(card)) throw new Error('cannot cast that now'); this.gs.CastSpell(0, card); this.settle(); }
  floop(lane) { if (!this.canFloop(lane)) throw new Error('cannot glint that now'); this.gs.FloopCard(0, lane, CardType.Creature); this.settle(); }
  useHero() { if (!this.canUseHero()) throw new Error('the hero is not ready'); this.gs.UseLeaderAbility(0); this.settle(); }
  /** the card is waiting for a lane: the player gives it */
  chooseLane(i) {
    const pe = this.gs.Pending;
    if (!pe || pe.kind !== 'lane' || !pe.lanes.includes(i)) throw new Error('not a lane that can be chosen');
    this.gs.Pending = null;
    this.gs.SelectTarget(i);
    this.settle();
  }
  /** the card is waiting for a card from the discard pile */
  chooseCard(card) {
    const pe = this.gs.Pending;
    if (!pe || pe.kind !== 'discard' || !pe.cards.includes(card)) throw new Error('not a card that can be chosen');
    this.gs.Pending = null;
    pe.script.CardSelection(card);
    this.settle();
  }

  /** the player is done setting up: on to her battle (there is none on the game's very first turn) */
  endSetup() {
    if (this.phase !== 'user-setup' || this.busy) throw new Error('not now');
    this.startBattle(PlayerType.User);
  }

  /* ---------------------------------------------------------------- the AI's setup, one decision at a time */

  /** one decision of the AI, carried out; null when it has nothing worth doing and goes to battle */
  aiStep() {
    if (this.phase !== 'ai-setup') throw new Error('not the AI\'s setup');
    const gs = this.gs;
    const d = AIManager.MakeDecision();
    if (!d) { this.startBattle(PlayerType.Opponent); return null; }
    try {
      if (d.IsLeaderAbility) gs.UseLeaderAbility(PlayerType.Opponent);
      else if (d.IsFloop) gs.FloopCard(PlayerType.Opponent, d.LaneChoice.Index, CardType.Creature);
      else if (d.CardChoice.Form.Type === CardType.Spell) gs.CastSpell(PlayerType.Opponent, d.CardChoice);
      else gs.Summon(PlayerType.Opponent, d.LaneChoice.Index, d.CardChoice);
    } catch (e) {
      /* a card whose AI half finds no target where its weighing found one (a creature that returns buildings, aimed
         like one that returns creatures): the original's AI hung here. The glint is spent and fizzles. */
      AIManager.Faults.push((d.CardChoice ? d.CardChoice.Form.ID : 'hero') + ' (acting): ' + e.message);
      if (d.IsFloop && d.LaneChoice.HasCreature()) d.LaneChoice.GetCreature().Flooped = true;
      else if (d.IsLeaderAbility) gs.LeaderCooldown[PlayerType.Opponent] = gs.GetLeader(PlayerType.Opponent).Form.Cooldown;
      else throw e;
    }
    if (gs.Pending) throw new Error('the AI left a choice waiting: ' + (gs.Pending.script && gs.Pending.script.constructor.name));
    this.settle();
    return d;
  }

  /* ---------------------------------------------------------------- battle */

  startBattle(p) {
    const gs = this.gs;
    if (gs.Turn <= 1) { this.endBattle(p); return; }
    let any = false;
    for (let i = 0; i < 4; i++) if (gs.LaneHasCreature(p, i)) { gs.GetCreature(p, i).DamageLastTurn = 0; any = true; }
    this.attackQueue = [];
    if (any) for (let j = 0; j < 4; j++) this.attackQueue.push(p === PlayerType.User ? j : 3 - j);
    this.phase = p === PlayerType.User ? 'user-battle' : 'ai-battle';
    this.attacker = p;
  }
  /** the next creature to attack, or null when the battle is over. Returns { p, lane, zones, forced }: forced is the
   *  result the wheel does not get a say in ('Miss' when nothing can be done), else the wheel is spun and its
   *  result given to strike() */
  nextAttack() {
    const gs = this.gs, p = this.attacker;
    while (this.attackQueue && this.attackQueue.length) {
      const lane = this.attackQueue.shift();
      if (!gs.LaneHasCreature(p, lane)) continue;
      const cr = gs.GetCreature(p, lane), front = cr.CurrentLane.OpponentLane;
      let forced = null;
      if (!front.HasCreature() && p === PlayerType.Opponent) forced = 'Miss';      // nothing stands in its way: no block
      else if (cr.ATK === 0) forced = 'Miss';
      const zones = wheelZones(gs, gs.GetLeader(PlayerType.User).Form, this.quest, p === PlayerType.User, !front.HasCreature());
      this.attack = { p, lane, zones, forced };
      return this.attack;
    }
    this.attack = null;
    this.endBattle(p);
    return null;
  }
  /** the wheel stopped: 'Hit' | 'Crit' | 'Miss'. On her own attack a hit strikes and a critical strikes harder; when
   *  she defends a hit is a block, a critical a counter, and a miss lets the blow through. */
  strike(result) {
    const gs = this.gs, a = this.attack;
    if (!a) throw new Error('no attack is waiting');
    if (a.forced) result = a.forced;
    gs.WheelResult = result;
    const p = a.p, cr = gs.GetCreature(p, a.lane);
    gs.Note({ t: 'strike', p, lane: a.lane, result });
    if (cr) {
      const frontLane = cr.CurrentLane.OpponentLane;
      const enemy = frontLane.HasCreature() ? frontLane.GetCreature() : null;
      const stopped = enemy ? (enemy.Protected || cr.CantAttack) : cr.CantAttack;
      if (!stopped) {
        if (p === PlayerType.User) { if (result !== 'Miss') this.dealDamage(p, a.lane); }
        else if (result === 'Miss') this.dealDamage(p, a.lane);
        else if (result === 'Crit' && enemy && !enemy.Helpless) this.dealDamage(PlayerType.User, enemy.CurrentLane.Index);
      }
    }
    this.attack = null;
    this.settle();
    if (this.phase !== 'over' && gs.GetHealth(opp(p)) === 0) this.endBattle(p);
  }
  /** CreatureBattleScript.DealDamage: the creature in that lane hits whatever is in front of it */
  dealDamage(p, lane) {
    const gs = this.gs, cr = gs.GetCreature(p, lane);
    if (!cr) return;
    const front = cr.CurrentLane.OpponentLane;
    if (front.HasCreature() && !front.GetCreature().Helpless) {
      let atk = cr.ATK;   // the factions' rock-paper-scissors table is all zeros in this data
      if (atk < 0) atk = 0;
      if (gs.WheelResult === 'Crit' && p === PlayerType.User && this.phase === 'user-battle') atk = Math.trunc(Math.fround(atk * gs.CritDamageMod));
      front.GetCreature().TakeDamage(cr, atk);
    } else {
      gs.DealDamage(opp(p), cr.ATK - gs.GetATKPenalty(p), cr.CurrentLane.Index);
    }
  }
  endBattle(p) {
    const gs = this.gs;
    this.attackQueue = null; this.attack = null;
    if (this.phase === 'over') return;
    gs.Turn++;
    if (p === PlayerType.User) { gs.HitAreaModifier = 0; gs.CritAreaModifier = 0; }
    else { gs.DefenseAreaModifier = 0; gs.DefenseAreaCritModifier = 0; }
    this.beginTurn(opp(p));
  }
}
