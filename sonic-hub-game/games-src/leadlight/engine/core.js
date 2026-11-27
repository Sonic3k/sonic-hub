/* Leadlight engine core: a line-by-line port of the original mobile game's battle code (GameState, CardScript and
   its four kinds, Lane, Deck, the AI). Member names stay as they were, PascalCase, because the card scripts in
   scripts.js were converted from the originals and call this API exactly as they called the old one.

   One match at a time is GameState.Instance. Nothing here draws: what happened is told through GameState.Log, and
   whatever has to be chosen by the player (a lane, a card in the discard pile) waits in GameState.Pending. */

/* ---------------------------------------------------------------- what the converted C# expects to find */

(function addListMethods() {
  const def = (name, value) => { if (!Object.prototype.hasOwnProperty.call(Array.prototype, name)) Object.defineProperty(Array.prototype, name, value); };
  def('Add', { value(x) { this.push(x); } });
  def('AddRange', { value(xs) { for (const x of xs) this.push(x); } });
  def('Remove', { value(x) { const i = this.indexOf(x); if (i < 0) return false; this.splice(i, 1); return true; } });
  def('RemoveAt', { value(i) { this.splice(i, 1); } });
  def('Insert', { value(i, x) { this.splice(i, 0, x); } });
  def('Contains', { value(x) { return this.indexOf(x) >= 0; } });
  def('IndexOf', { value(x) { return this.indexOf(x); } });
  def('Clear', { value() { this.length = 0; } });
  def('ToArray', { value() { return this.slice(); } });
  def('Count', { get() { return this.length; } });
  def('Length', { get() { return this.length; } });
})();

/* C# Math.Round rounds a half to the even neighbour */
function roundHalfEven(x) {
  const f = Math.floor(x), d = x - f;
  if (d > 0.5) return f + 1;
  if (d < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}
Math.Min = Math.min; Math.Max = Math.max; Math.Abs = Math.abs; Math.Floor = Math.floor; Math.Ceiling = Math.ceil;
Math.Round = roundHalfEven; Math.Sign = Math.sign;
const Mathf = { Min: Math.min, Max: Math.max, Abs: Math.abs, Floor: Math.floor, Ceil: Math.ceil, Round: roundHalfEven, Clamp: (v, a, b) => Math.min(Math.max(v, a), b) };

/* The match's dice. Unity's Random.Range(int, int) leaves out its top; Range(float, float) includes it. */
const Random = {
  next: Math.random,
  seed(s) {
    let a = s >>> 0;   // mulberry32
    this.next = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  },
  Range(a, b) { return b <= a ? a : a + Math.floor(this.next() * (b - a)); },
  RangeF(a, b) { return a + this.next() * (b - a); },
};

const opp = p => (p === 0 ? 1 : 0);
/* A card's own reaction to something on the board. Where one of the original's reactions throws (a building
   reacting to a creature that has just left its lane, say), the original lost that reaction and went on; so does
   this. Each such time is noted in AIManager.Faults, which the simulations read. */
function hook(what, fn) { try { fn(); } catch (e) { AIManager.Faults.push(what + ': ' + e.message); } }
function IDIV(a, b) { if (b === 0) throw new Error('integer division by zero'); return Math.trunc(a / b); }
function newArray(n, fill) { return new Array(n).fill(fill); }
/* Nullable<T>.Value */
function NV(x) { if (x === null || x === undefined) throw new Error('Nullable object must have a value'); return x; }
const Debug = { Log() {}, LogWarning() {}, LogError() {} };
const VOManager = { Instance: { PlayEvent() {} } };
const VOEvent = new Proxy({}, { get: (t, k) => k });
/* what a card's own prompt says while the player picks; the page puts these into words */
const L10N = key => key;

/* ---------------------------------------------------------------- enums, as in the original */

const PlayerType = { User: 0, Opponent: 1 };
const CardType = { Creature: 0, Building: 1, Spell: 2, Dweeb: 3, None: 4 };
const LandscapeType = { Corn: 0, Plains: 1, Swamp: 2, Cotton: 3, Sand: 4, None: 5 };
const Faction = { Corn: 0, Plains: 1, Swamp: 2, Cotton: 3, Sand: 4, Universal: 5 };
const Quality = { Standard: 0, Gold: 1, Obsidian: 2, Halloween: 3, Christmas: 4, Mirror: 5 };
const SelectionType = { Creature: 0, Building: 1, Landscape: 2 };

const PARAMS = { Starting_Magic_Points: 2, Max_Magic_Points: 10, CARDS_TO_DEAL: 5, MAX_HAND: 7 };

/* ---------------------------------------------------------------- small structures */

class StatMod {
  constructor() { this.ATK = 0; this.DEF = 0; this.EmptyLaneScore = 0; }
  Reset() { this.ATK = 0; this.DEF = 0; this.EmptyLaneScore = 0; }
}

class CWList extends Array {
  static get [Symbol.species]() { return Array; }
  RandomItem() { return this.length <= 0 ? null : this[Random.Range(0, this.length)]; }
}

class WeightedList {
  constructor() { this.ItemCollection = []; this.TotalWeight = 0; }
  Add(item, weight) {
    if (weight < 0) weight = 0;
    this.ItemCollection.push({ Weight: this.TotalWeight + weight, Item: item });
    this.TotalWeight += weight;
  }
  AddSorted(item, weight) {
    const w = { Weight: weight, Item: item };
    for (let i = 0; i < this.ItemCollection.length; i++) {
      if (w.Weight >= this.ItemCollection[i].Weight) { this.ItemCollection.splice(i, 0, w); return; }
    }
    this.ItemCollection.push(w);
  }
  TopCandidate() {
    if (this.ItemCollection.length <= 0) return null;
    const top = this.ItemCollection[0].Weight, list = new CWList();
    for (const w of this.ItemCollection) { if (w.Weight !== top) break; list.push(w.Item); }
    return list.RandomItem();
  }
  TopWeight() { return this.ItemCollection.length > 0 ? this.ItemCollection[0].Weight : 0; }
  IsEmpty() { return this.ItemCollection.length <= 0; }
  Clear() { this.TotalWeight = 0; this.ItemCollection.length = 0; }
  GetTotalWeight() { return this.TotalWeight; }
  RandomItem() {
    if (this.ItemCollection.length <= 0) return null;
    const r = Random.Range(0, this.TotalWeight);
    for (const w of this.ItemCollection) if (r < w.Weight) return w.Item;
    return null;
  }
}

/* ---------------------------------------------------------------- cards, heroes, decks */

/* A card's printed self. From the data: { id, type, faction, quality, rarity, cost, floop, atk, def, v1, v2,
   sale, script }. */
class CardForm {
  constructor(d) {
    d = d || {};
    this.ID = d.id || ''; this.Name = d.name || ''; this.Type = d.type ?? CardType.Spell;
    this.Faction = d.faction ?? Faction.Universal; this.Quality = d.quality ?? Quality.Standard;
    this.Rarity = d.rarity ?? 1; this.Cost = d.cost ?? 0; this.FloopCost = d.floop ?? 0;
    this.BaseATK = d.atk ?? 0; this.BaseDEF = d.def ?? 0; this.BaseVal1 = d.v1 ?? 0; this.BaseVal2 = d.v2 ?? 0;
    this.BaseSalePrice = d.sale ?? 0; this.ScriptName = d.script || ''; this.ScriptVizName = this.ScriptName;
    this.RawDescription = '';
  }
  GetScriptClass() {
    const cls = SCRIPTS[this.ScriptName];
    if (cls) return cls;
    return this.Type === CardType.Creature ? CreatureScript : this.Type === CardType.Building ? BuildingScript : this.Type === CardType.Spell ? SpellScript : CardScript;
  }
  CanPlay(player, lane) { return this.GetScriptClass().CanPlay(player, lane, this); }
  DetermineCost(player) { return this.GetScriptClass().DetermineCost(player, this); }
  InstanceScript() { const C = this.GetScriptClass(); return new C(); }
}
const SpellCard = function () { return new CardForm({ type: CardType.Spell }); };

class CardItem {
  constructor(form, level = 1) {
    this.Form = form; this.Level = level;
    this.DropRate = 0; this.DropLevel = 1; this.CoinDropRate = 0; this.CoinReward = 0; this.StaticDropWeight = 0;
  }
  get ATK() { return this.Level * this.Form.BaseATK; }
  get DEF() { return this.Level * this.Form.BaseDEF; }
  get Val1() { return this.Level * this.Form.BaseVal1; }
  get Val2() { return this.Level * this.Form.BaseVal2; }
  get SalePrice() { return this.Level * this.Form.BaseSalePrice; }
  EvaluateLanePlacement(player, lane) { return this.Form.GetScriptClass().EvaluateLanePlacement(player, lane, this); }
}

/* A hero as the data has her: { id, hp, cooldown, v1, v2, script, forFaction, forLandscape, forCardType, ring } */
class LeaderForm {
  constructor(d) {
    this.ID = d.id; this.Name = d.name || d.id; this.BaseHP = d.hp; this.Cooldown = d.cooldown;
    this.BaseVal1 = d.v1 ?? 0; this.BaseVal2 = d.v2 ?? 0; this.ScriptName = d.script;
    this.forFaction = d.forFaction ?? null; this.forLandscape = d.forLandscape ?? null; this.forCardType = d.forCardType ?? null;
    const r = d.ring || {};
    this.Ring_P1_HitAreaRange = r.p1Hit; this.Ring_P1_CritAreaRange = r.p1Crit;
    this.Ring_P2_HitAreaRange = r.p2Hit; this.Ring_P2_CritAreaRange = r.p2Crit;
    this.TimeFor1SpinMin = r.spinMin; this.TimeFor1SpinMax = r.spinMax; this.CritDamageMod = r.crit;
    this.Desc = d.desc || '';
  }
}
class LeaderItem {
  constructor(form, rank = 1) { this.Form = form; this.Rank = rank; }
  get HP() { return this.Rank * 5 + this.Form.BaseHP; }
  get Description() { return this.Form.Desc.replace('<val1>', String(this.Form.BaseVal1)).replace('<val2>', String(this.Form.BaseVal2)); }
  GetScriptClass() { return SCRIPTS[this.Form.ScriptName] || LeaderScript; }
  CanPlay(player) { return this.GetScriptClass().CanPlay(player, -1, null); }
  InstanceScript() { const C = this.GetScriptClass(); return new C(); }
  EvaluateLeaderAbility(player) { return this.GetScriptClass().EvaluateLanePlacement(player, null, null); }
}

class Deck {
  constructor(name = '') { this.Name = name; this.Leader = null; this.Cards = []; this.Landscapes = []; }
  Clone() {
    const d = new Deck(this.Name); d.Leader = this.Leader; d.Landscapes = this.Landscapes.slice();
    d.Cards = this.Cards.map(c => { const n = new CardItem(c.Form, c.Level); Object.assign(n, { DropRate: c.DropRate, DropLevel: c.DropLevel, CoinDropRate: c.CoinDropRate, CoinReward: c.CoinReward, StaticDropWeight: c.StaticDropWeight }); return n; });
    return d;
  }
  AddLandscape(l) { this.Landscapes.push(l); }
  SetLandscape(i, l) { this.Landscapes[i] = l; }
  GetLandscape(i) { return this.Landscapes[i]; }
  GetLandscapeCount() { return this.Landscapes.length; }
  AddCard(c) { this.Cards.push(c); }
  RemoveCard(c) { this.Cards.Remove(c); }
  CardCount() { return this.Cards.length; }
  GetCards() { return this.Cards; }
  GetCard(i) { return this.Cards[i]; }
  Shuffle() {
    for (let n = this.Cards.length * 7; n > 0; n--) {
      const i = Random.Range(0, this.Cards.length), j = Random.Range(0, this.Cards.length);
      const v = this.Cards[i]; this.Cards[i] = this.Cards[j]; this.Cards[j] = v;
    }
  }
  ShuffleLandscapes() {
    const n = this.Landscapes.length;
    for (let k = n * 7; k > 0; k--) {
      const i = Random.Range(0, n), j = Random.Range(0, n);
      const v = this.Landscapes[i]; this.Landscapes[i] = this.Landscapes[j]; this.Landscapes[j] = v;
    }
  }
  DealCard() { return this.Cards.length > 0 ? this.Cards.shift() : null; }
  PlaceCard(item) { this.Cards.unshift(item); }
  GetWeightedCard() { const w = new WeightedList(); for (const c of this.Cards) w.Add(c, c.StaticDropWeight); return w.RandomItem(); }
}

/* ---------------------------------------------------------------- the board */

class Lane {
  constructor() {
    this.Scripts = [null, null]; this.AdjacentLanes = [null, null]; this.OpponentLane = null;
    this.Type = LandscapeType.None; this.Flipped = false; this.Index = 0; this.AbilitiesBlocked = false;
    this.Disabled = false; this.FloopMod = 0; this.RarityGate = 2147483647;
  }
  get IsOuterLane() { return this.AdjacentLanes[0] == null || this.AdjacentLanes[1] == null; }
  HasCreature() { return this.Scripts[0] != null; }
  HasBuilding() { return this.Scripts[1] != null; }
  HasCard(type) { return this.Scripts[type] != null; }
  IsEmpty() { return !this.HasCreature(); }
  GetCreature() { return this.Scripts[0]; }
  GetBuilding() { return this.Scripts[1]; }
  GetScript(type) { return this.Scripts[type]; }
  IsCreatureFresh() { return this.HasCreature() ? this.GetCreature().Fresh : false; }
  GetInnerLane() {
    if (this.AdjacentLanes[0] == null) return this.AdjacentLanes[1];
    if (this.AdjacentLanes[1] == null) return this.AdjacentLanes[0];
    return this;
  }
  IsAdjacentTo(lane) { return this.AdjacentLanes[0] === lane || this.AdjacentLanes[1] === lane; }
}

/* ---------------------------------------------------------------- cards in play */

class CardScript {
  constructor() {
    this.TargetScript = null; this.TargetList = [];
    this.isProtected = false; this.cantAttack = false; this.isHelpless = false; this.isFloopBlocked = false;
    this.FloopDisabled = false;
    this.Data = null; this.CurrentLane = null; this.Owner = 0;
    this.Flooped = false; this.Flooping = false; this.IsSummoning = false; this.Moved = false; this.Fresh = false;
    this.Used = false; this.CardSelected = false;
    this.GameInstance = GameState.Instance;
  }
  get Protected() { return this.isProtected; }
  set Protected(v) { this.isProtected = v; }
  get CantAttack() { return this.cantAttack; }
  set CantAttack(v) { this.cantAttack = v; }
  get FloopBlocked() { return this.isFloopBlocked; }
  set FloopBlocked(v) { this.isFloopBlocked = v; }
  get Helpless() { return this.isHelpless; }
  set Helpless(v) { this.isHelpless = v; }

  static DetermineCost(player, card) {
    let n = card.Cost - GameState.Instance.GetDiscount(player, card);
    return n < 0 ? 0 : n;
  }
  DetermineFloopCost() {
    const mod = this.GameInstance.GetFloopCostMod(this.Owner) + this.CurrentLane.FloopMod;
    let n = this.Data.Form.FloopCost + mod;
    const flat = this.GameInstance.GetFlatFloopCost(this.Owner);
    if (flat >= 0) n = flat + mod;
    return n < 0 ? 0 : n;
  }
  static CanPlay(player, lane, card) {
    const gs = GameState.Instance;
    if (!gs.CanPlayCards(player)) return false;
    if (!gs.IsCastingEnabled(player, card.Type)) return false;
    if (lane >= 0) {
      const l = gs.GetLane(player, lane);
      if ((card.Type === CardType.Creature || card.Type === CardType.Building) && (l.Disabled || card.Rarity > l.RarityGate)) return false;
    }
    if (card.Faction === Faction.Universal || gs.IsLaneOfLandscapeType(player, lane, card.Faction)) {
      if (gs.GetMagicPoints(player) >= card.DetermineCost(player)) return true;
    }
    return false;
  }
  static EvaluateLanePlacement(player, candidate, item) {
    return GameState.Instance.ScoreBoard() - item.Form.DetermineCost(player) * 1;
  }
  PopulateLaneMods() {}
  EvaluateAbility() {
    CardScript.ResetMods();
    this.PopulateLaneMods();
    CardScript.APMods[this.Owner] = -this.DetermineFloopCost();
    return CardScript.ScoreBoard(this.Owner);
  }
  static ScoreBoard(player) { return GameState.Instance.ScoreBoard(player, CardScript.LaneMods, CardScript.HealthMods, CardScript.APMods); }

  /* the player picks a lane: the match waits on GameState.Pending until the page calls SelectTarget */
  StartTargetSelection(player, targetType, instruction) {
    this.Flooping = true;
    const gs = GameState.Instance;
    let any = false; const lanes = [];
    for (let i = 0; i < 4; i++) { if (this.SelectionFilter(gs.GetLane(player, i))) { any = true; lanes.push(i); } }
    gs.SetTargetingListener(player, this);
    if (!any) { this.EndTargetSelection(); return; }
    gs.Pending = { kind: 'lane', side: player, lanes, selection: targetType, prompt: instruction, script: this };
  }
  AITargetSelection(player, targetType) {
    const out = new CWList(), gs = GameState.Instance;
    for (let i = 0; i < 4; i++) { const l = gs.GetLane(player, i); if (this.SelectionFilter(l)) out.push(l); }
    return out;
  }
  SelectionFilter(candidate) { return false; }
  OnTargetSelected(target) {}
  EndTargetSelection() {
    this.Flooping = false;
    const gs = GameState.Instance;
    if (gs.Pending && gs.Pending.script === this && gs.Pending.kind === 'lane') gs.Pending = null;
    gs.ClearHighlights();
  }
  OpenDiscardPile() {
    const gs = GameState.Instance;
    const cards = gs.GetDiscardPile(this.Owner).filter(c => this.CardFilter(c));
    gs.Pending = { kind: 'discard', side: this.Owner, cards, script: this };
    this.CardSelected = false;
  }
  CloseDiscardPile() {
    const gs = GameState.Instance;
    if (gs.Pending && gs.Pending.script === this && gs.Pending.kind === 'discard') gs.Pending = null;
    this.CardSelected = true;
  }
  CardFilter(item) { return false; }
  CardSelection(item) {}
  CanFloop() { return false; }
  CancelFloop() { this.EndTargetSelection(); }
  OnSummon() { this.IsSummoning = true; }
  Update() {}
  FinishSummoning() { this.IsSummoning = false; GameState.Instance.FinishSummoning(this); }
  OnCardLeftPlay(script) {}
  OnCardEnterPlay(script) {}
  Floop() {}
  StartTurn() {}
  OnOpponentStartTurn() {}
  OnCreatureDied(deadCard) {}
  DoEffect() { CWFloopActionManager.GetInstance().DoEffect(this, this.TargetList.ToArray()); this.TargetList.length = 0; }
  DoResult(target) { return true; }
  EndVFX(context) {}
  EndAllVFX() {}
  /* ---- the AI's helpers for choosing a target, converted from CardScript.cs as they stand */

  static LanesToCreatures(Lanes) {
    let list = [];
    for (const Lane of Lanes) {
        if(Lane.HasCreature()) {
            let creature = Lane.GetCreature();
            list.Add(creature);
        }
    }
    return list;
  }
  static LanesToBuildings(Lanes) {
    let list = [];
    for (const Lane of Lanes) {
        if(Lane.HasBuilding()) {
            let building = Lane.GetBuilding();
            list.Add(building);
        }
    }
    return list;
  }
  static GetCreaturesWithinHealthThreshold(Candidates, threshold) {
    let list = [];
    for (const Candidate of Candidates) {
        switch(threshold) {
            case - 1 : list.Add(Candidate);
            continue;
            case - 2 : if(Candidate.Health <= Candidate.ATK) {
                list.Add(Candidate);
                continue;
            }
            break;
        }
        if(threshold == - 3 && Candidate.Health <= Candidate.Damage) {
            list.Add(Candidate);
        }
        else if(Candidate.Health <= threshold) {
            list.Add(Candidate);
        }
    }
    return list;
  }
  static GetCreaturesWithinHealthThresholdOfEnemy(Candidates, threshold) {
    let list = [];
    for (const Candidate of Candidates) {
        if(threshold == - 1) {
            list.Add(Candidate);
            continue;
        }
        let num = 0;
        if(Candidate.Enemy != null) {
            num = Candidate.Enemy.ATK;
        }
        if(threshold == - 2 && Candidate.Health <= Candidate.ATK + num) {
            list.Add(Candidate);
        }
        else if(threshold == - 3 && Candidate.Health <= Candidate.Damage + num) {
            list.Add(Candidate);
        }
        else if(Candidate.Health <= threshold + num) {
            list.Add(Candidate);
        }
    }
    return list;
  }
  static BestCandidateForAttack(Candidates, amount) {
    let list = CardScript.LanesToCreatures(Candidates);
    let creaturesWithinHealthThreshold = CardScript.GetCreaturesWithinHealthThreshold(list, amount);
    let creaturesWithinHealthThresholdOfEnemy = CardScript.GetCreaturesWithinHealthThresholdOfEnemy(list, amount);
    let list2 = [];
    let list3 = null;
    let creatureScript = null;
    if(creaturesWithinHealthThreshold.Count > 0) {
        for (const item of creaturesWithinHealthThreshold) {
            if(item.CanWin) {
                list2.Add(item);
            }
        }
    }
    list3 = ((list2.Count > 0) ? list2 : ((creaturesWithinHealthThreshold.Count > 0) ? creaturesWithinHealthThreshold : ((creaturesWithinHealthThresholdOfEnemy.Count <= 0) ? list : creaturesWithinHealthThresholdOfEnemy)));
    for (const item2 of list3) {
        if(creatureScript == null || item2.Health > creatureScript.Health) {
            creatureScript = item2;
        }
    }
    return creatureScript;
  }
  GetCreaturesInDanger(Candidates) {
    let list = [];
    for (const Candidate of Candidates) {
        if(Candidate.InDanger) {
            list.Add(Candidate);
        }
    }
    return list;
  }
  static BestCandidateForHealing(Candidates, amount, capDEF) {
    let list = CardScript.LanesToCreatures(Candidates);
    let list2 = [];
    let list3 = [];
    let list4 = null;
    let creatureScript = null;
    let creatureScript2 = null;
    for (const item of list) {
        let num = amount;
        switch(amount) {
            case - 1 : num = item.Damage;
            break;
            case - 2 : num = item.ATK;
            break;
        }
        let num2 = item.Health + num;
        if(capDEF) {
            num2 = Math.Min(num2, item.DEF);
        }
        if(item.Enemy != null && item.InDanger && !item.Enemy.InDanger) {
            if(num2 > item.Enemy.ATK) {
                list2.Add(item);
            }
            else {
                list3.Add(item);
            }
        }
    }
    list4 = ((list2.Count <= 0) ? list : list2);
    for (const item2 of list4) {
        if(!list3.Contains(item2) && (creatureScript == null || item2.ATK > creatureScript.ATK)) {
            creatureScript = item2;
        }
        if(creatureScript2 == null || item2.ATK > creatureScript2.ATK) {
            creatureScript2 = item2;
        }
    }
    if(creatureScript == null) {
        creatureScript = creatureScript2;
    }
    return creatureScript;
  }
  MaximizeAdjacentTargets(BestTarget, SecondTarget) {
    let innerLane = BestTarget.CurrentLane.GetInnerLane();
    if(innerLane.HasCreature()) {
        BestTarget = innerLane.GetCreature();
    }
    if(SecondTarget != null && !SecondTarget.CurrentLane.IsAdjacentTo(BestTarget.CurrentLane)) {
        let creatureScript = null;
        let adjacentLanes = SecondTarget.CurrentLane.AdjacentLanes;
        for (const lane of adjacentLanes) {
            let adjacentLanes2 = BestTarget.CurrentLane.AdjacentLanes;
            for (const lane2 of adjacentLanes2) {
                if(lane != null && lane == lane2 && lane.HasCreature()) {
                    creatureScript = lane.GetCreature();
                }
            }
        }
        if(creatureScript != null) {
            BestTarget = creatureScript;
        }
    }
    return BestTarget;
  }
  BestCandidateForCrippling(Candidates, amount) {
    let list = CardScript.LanesToCreatures(Candidates);
    let list2 = [];
    let list3 = [];
    let list4 = [];
    let creatureScript = null;
    let creatureScript2 = null;
    for (const item of list) {
        if(item.CanWin && item.ATK - amount < this.GameInstance.GetHealth(this.Owner)) {
            list2.Add(item);
        }
        if(item.Enemy != null && item.Enemy.InDanger && !item.InDanger) {
            if(item.ATK - amount < item.Enemy.Health) {
                list3.Add(item);
            }
            else {
                list4.Add(item);
            }
        }
    }
    let list5 = null;
    list5 = ((list2.Count > 0) ? list2 : ((list3.Count <= 0) ? list : list3));
    for (const item2 of list5) {
        if(!list4.Contains(item2) && (creatureScript == null || creatureScript.ATK < item2.ATK)) {
            creatureScript = item2;
        }
        if(creatureScript2 == null || creatureScript2.ATK < item2.ATK) {
            creatureScript2 = item2;
        }
    }
    if(creatureScript == null) {
        creatureScript = creatureScript2;
    }
    return creatureScript;
  }
  BestCandidateForATKBonus(Candidates, amount) {
    let list = CardScript.LanesToCreatures(Candidates);
    let list2 = [];
    let list3 = [];
    let list4 = [];
    let list5 = null;
    let creatureScript = null;
    for (const item of list) {
        if(item.Enemy == null) {
            list4.Add(item);
        }
        else if(!item.Enemy.InDanger && item.InDanger && item.ATK + amount >= item.Enemy.Health) {
            list3.Add(item);
        }
        else if(!item.Enemy.InDanger && item.ATK + amount >= item.Enemy.Health) {
            list2.Add(item);
        }
    }
    list5 = ((list3.Count > 0) ? list3 : ((list2.Count > 0) ? list2 : ((list4.Count <= 0) ? list : list4)));
    for (const item2 of list5) {
        if(creatureScript == null || item2.ATK > creatureScript.ATK) {
            creatureScript = item2;
        }
    }
    return creatureScript;
  }
  BestCandidateForReset(Candidates) {
    let list = CardScript.LanesToCreatures(Candidates);
    let creatureScript = null;
    let num = 0;
    for (const item of list) {
        CardScript.ResetMods();
        CardScript.LaneMods[this.Owner][item.CurrentLane.Index].ATK = - item.ATKMod;
        CardScript.LaneMods[this.Owner][item.CurrentLane.Index].DEF = item.Damage - item.DEFMod;
        let num2 = CardScript.ScoreBoard(this.Owner);
        if(creatureScript == null || num2 > num) {
            creatureScript = item;
            num = num2;
        }
    }
    return creatureScript;
  }
  static BestSacrifice(Candidates) {
    let list = CardScript.LanesToCreatures(Candidates);
    let list2 = [];
    let list3 = [];
    let list4 = [];
    let list5 = null;
    for (const item of list) {
        if(item.Enemy != null) {
            if(item.InDanger && !item.Enemy.InDanger) {
                list2.Add(item);
            }
            else {
                list4.Add(item);
            }
        }
        else {
            list3.Add(item);
        }
    }
    let creatureScript = null;
    list5 = ((list3.Count > 0) ? list3 : ((list2.Count <= 0) ? list4 : list2));
    for (const item2 of list5) {
        if(creatureScript == null) {
            creatureScript = item2;
        }
        else if(item2.Enemy != null) {
            if(item2.Enemy.ATK < creatureScript.Enemy.ATK) {
                creatureScript = item2;
            }
        }
        else if(item2.ATK < creatureScript.ATK) {
            creatureScript = item2;
        }
    }
    return creatureScript;
  }
  static BestBuildingSacrifice(Candidates) {
    let list = CardScript.LanesToBuildings(Candidates);
    let num = 0;
    let buildingScript = null;
    for (const item of list) {
        item.StopTriggerEffects();
        item.OnCardLeftPlay(item);
        item.ResumeTriggerEffects();
        let num2 = GameState.Instance.ScoreBoard();
        item.StopTriggerEffects();
        item.OnCardEnterPlay(item);
        item.ResumeTriggerEffects();
        if(buildingScript == null) {
            buildingScript = item;
            num = num2;
        }
        else if(num2 > num) {
            buildingScript = item;
            num = num2;
        }
    }
    return buildingScript;
  }
  static BestDoubleBuildingSacrifice(player, Candidates) {
    let num = 0;
    let lane = null;
    for (const Candidate of Candidates) {
        CardScript.ResetMods();
        if(Candidate.HasBuilding()) {
            let building = Candidate.GetBuilding();
            building.StopTriggerEffects();
            building.OnCardLeftPlay(building);
            building.ResumeTriggerEffects();
        }
        if(Candidate.OpponentLane.HasBuilding()) {
            let building2 = Candidate.OpponentLane.GetBuilding();
            building2.StopTriggerEffects();
            building2.OnCardLeftPlay(building2);
            building2.ResumeTriggerEffects();
        }
        if(Candidate.HasCreature()) {
            let creature = Candidate.GetCreature();
            CardScript.LaneMods[creature.Owner][Candidate.Index].DEF = - creature.Health;
        }
        if(Candidate.OpponentLane.HasCreature()) {
            let creature2 = Candidate.OpponentLane.GetCreature();
            CardScript.LaneMods[creature2.Owner][Candidate.OpponentLane.Index].DEF = - creature2.Health;
        }
        let num2 = CardScript.ScoreBoard(player);
        if(Candidate.HasBuilding()) {
            let building3 = Candidate.GetBuilding();
            building3.StopTriggerEffects();
            building3.OnCardEnterPlay(building3);
            building3.ResumeTriggerEffects();
        }
        if(Candidate.OpponentLane.HasBuilding()) {
            let building4 = Candidate.OpponentLane.GetBuilding();
            building4.StopTriggerEffects();
            building4.OnCardEnterPlay(building4);
            building4.ResumeTriggerEffects();
        }
        if(lane == null) {
            lane = Candidate;
            num = num2;
        }
        else if(num2 > num) {
            lane = Candidate;
            num = num2;
        }
    }
    return lane;
  }
  static ResetMods() {
    for (let i = 0; i < 2; i++) {
      CardScript.HealthMods[i] = 0; CardScript.APMods[i] = 0;
      for (let j = 0; j < 4; j++) CardScript.LaneMods[i][j].Reset();
    }
  }
}
CardScript.LaneMods = [[new StatMod(), new StatMod(), new StatMod(), new StatMod()], [new StatMod(), new StatMod(), new StatMod(), new StatMod()]];
CardScript.HealthMods = [0, 0];
CardScript.APMods = [0, 0];

class CreatureScript extends CardScript {
  constructor() {
    super();
    this.Damage = 0; this.DamageLastTurn = 0; this.ATKMod = 0; this.DEFMod = 0; this.MarkedForDeath = false;
    this.DamageReduction = 0; this.DamageFactor = 1; this.HealingFactor = 1; this.ATKFactor = 1; this.DEFFactor = 1;
  }
  get ATK() {
    let n = Math.trunc((this.Data.ATK + this.ATKMod) * this.ATKFactor);
    if (n < 0) { this.ATKMod = -this.Data.ATK; n = 0; }
    return n;
  }
  get DEF() { return Math.trunc((this.Data.DEF + this.DEFMod) * this.DEFFactor); }
  get Health() { const n = this.DEF - this.Damage; return n < 0 ? 0 : n; }
  get InDanger() { const e = this.Enemy; return e != null && e.ATK > this.Health && this.ATK < e.Health; }
  get Enemy() { return this.CurrentLane.OpponentLane.GetCreature(); }
  get CanWin() { return this.Enemy == null && this.ATK >= this.GameInstance.GetHealth(opp(this.Owner)); }
  static EvaluateLanePlacement(player, lane, item) { return GameState.Instance.ScoreBoard(player, item, lane); }
  GetHealthPct() { return this.Health / this.DEF; }
  Heal(amount) {
    amount = Math.trunc(roundHalfEven(Math.fround(amount * this.HealingFactor)));
    this.Damage -= amount;
    if (this.Damage < 0) this.Damage = 0;
    GameState.Instance.Note({ t: 'heal', p: this.Owner, lane: this.CurrentLane.Index, amount });
  }
  TakeDamage(source, amount) {
    let n = amount - this.DamageReduction;
    n = Math.trunc(n * this.DamageFactor);
    if (n < 0) n = 0;
    this.Damage += n;
    this.DamageLastTurn = n;
    GameState.Instance.Note({ t: 'hurt', p: this.Owner, lane: this.CurrentLane.Index, amount: n });
    if (this.Health <= 0 && source instanceof CreatureScript && source.CurrentLane.HasBuilding()) { const b = source.CurrentLane.GetBuilding(); hook(b.Data.Form.ID + ' won', () => b.OnCreatureWon()); }
  }
}

class BuildingScript extends CardScript {
  constructor() { super(); this.trigger = true; }
  OnCreatureFlooped() {}
  OnCreatureWon() {}
  OnCreatureDied(creature) {}
  StopTriggerEffects() { this.trigger = false; }
  ResumeTriggerEffects() { this.trigger = true; }
  ModifyATK(script, value) { script.ATKMod += value; }
  ModifyDEF(script, value) { script.DEFMod += value; }
  TriggerEffects() { if (this.trigger) GameState.Instance.Note({ t: 'building', p: this.Owner, lane: this.CurrentLane.Index }); }
}

class SpellScript extends CardScript {
  Cast() { CWFloopActionManager.GetInstance().DoEffectHero(this, this.Owner); }
}

class LeaderScript extends SpellScript {
  constructor() {
    super();
    this.Leader = null;
    this.GameInstance = GameState.Instance;
    this.Data = new CardItem(new CardForm({ type: CardType.Spell, faction: Faction.Universal, cost: 0 }));
  }
  static CanPlay(player, lane, card) { return GameState.Instance.GetLeaderCooldown(player) <= 0; }
  static EvaluateLanePlacement(player, candidate, item) { return GameState.Instance.ScoreBoard(); }
}

/* the out-of-cards sweep: everything the player has in play goes to the discard pile */
class DiscardTarget extends SpellScript {
  Cast() {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) {
      const lane = GameState.Instance.GetLane(this.Owner, j);
      if (lane.HasCard(i)) this.TargetList.push(lane.GetScript(i));
    }
    this.DoEffect();
  }
  DoResult(target) {
    this.GameInstance.RemoveCardFromPlay(target.Owner, target.CurrentLane.Index, target.Data.Form.Type);
    this.GameInstance.DiscardCard(target.Owner, target.Data);
    return true;
  }
}

/* ---------------------------------------------------------------- effects resolve here, all at once */

const CWFloopActionManager = {
  GetInstance() { return this; },
  /* card → its targets: DoResult on each, then whatever died goes */
  DoEffect(source, targets) {
    const gs = GameState.Instance;
    gs.Note({ t: 'effect', ...describe(source), targets: targets.map(describe) });
    let resume = true;
    /* a lane with nothing in it can end up among the targets (healing around an empty lane): the original's effect
       stopped dead there and the match hung; here that target is passed over */
    for (const t of targets) { if (t == null) { AIManager.Faults.push(describe(source).id + ': empty target'); continue; } resume = source.DoResult(t) && resume; }
    gs.AfterEffect(source, resume);
  },
  DoEffectNeutral(source, targets) { this.DoEffect(source, targets); },
  /* card → a hero: DoResult(null) */
  DoEffectHero(source, player) {
    const gs = GameState.Instance;
    gs.Note({ t: 'effect', ...describe(source), hero: player });
    const resume = source.DoResult(null);
    gs.AfterEffect(source, resume);
  },
  /* a lane marked for the rest of the turn: shown, nothing resolves */
  DoEffectLane(source, lane) {
    GameState.Instance.Note({ t: 'effect', ...describe(source), blockLane: lane, side: opp(source.Owner) });
  },
  RemoveVFX() {}, RemovePersistantVFX() {},
};
function describe(s) {
  if (!s) return {};
  const lane = s.CurrentLane ? s.CurrentLane.Index : null;
  return { p: s.Owner, lane, kind: s instanceof LeaderScript ? 'hero' : s.Data && s.Data.Form ? s.Data.Form.Type : null, id: s.Data && s.Data.Form ? s.Data.Form.ID : null };
}

/* ---------------------------------------------------------------- the match state */

class GameState {
  constructor() {
    GameState.Instance = this;
    this.Log = []; this.Pending = null;
    this.Decks = [null, null]; this.Hands = [[], []]; this.DiscardPiles = [[], []]; this.SummonedCards = [{}, {}];
    this.Lanes = [[], []];
    this.MagicPoints = [0, 0]; this.BonusPoints = [0, 0]; this.SpellPoints = [0, 0];
    this.FloopCountTurn = [0, 0]; this.FloopCountGame = [0, 0];
    this.SpellsCast = [0, 0]; this.CreaturesSummoned = [0, 0]; this.CreaturesRemoved = [0, 0];
    this.CanCast = [[true, true], [true, true], [true, true]]; this.CanFloop = [true, true]; this.CanPlay = [true, true];
    this.Health = [25, 25]; this.MaxHealth = [25, 25]; this.MinHealth = [0, 0]; this.LeaderCooldown = [0, 0];
    this.Attacked = [false, false]; this.OverrideLandscapes = [LandscapeType.None, LandscapeType.None];
    this.FakeLandscapes = [[], []]; this.RandomizeSummon = [false, false];
    this.SpellsInEffect = [[], []]; this.PersistentSpellsInEffect = [[], []];
    this.Discounts = [[], []]; this.FloopCostMods = [0, 0]; this.FlatFloopCost = [-1, -1]; this.ATKPenalty = [0, 0];
    this.TargetingListener = null; this.SelectionSide = 0; this.Stealing = false; this.ReplacedScript = null;
    this.HitAreaModifier = 0; this.DefenseAreaModifier = 0; this.DefenseAreaCritModifier = 0; this.CritAreaModifier = 0;
    this.CurrentMagicPoints = PARAMS.Starting_Magic_Points; this.ExtraMagicPoints = 0;
    this.FirstPlayer = 1; this.Turn = 1; this.Phase = 'setup';
    this.WheelResult = '';            // the last wheel's result: a hero hit while it reads Crit is doubled
    this.CritDamageMod = 2;
    /* what the stars of a quest are judged on */
    this.Stats = { turns: 0, hpLost: 0, lost: 0, defeated: 0, floops: 0, types: [0, 0, 0], factions: [0, 0, 0, 0, 0, 0], apTotal: 0, apMaxCard: 0,
      used(form) { this.types[form.Type]++; this.factions[form.Faction]++; this.apTotal += form.Cost; if (form.Cost > this.apMaxCard) this.apMaxCard = form.Cost; } };
    for (let i = 0; i < 2; i++) {
      let prev = null;
      for (let j = 0; j < 4; j++) {
        const lane = new Lane(); this.Lanes[i][j] = lane; lane.Index = j;
        lane.AdjacentLanes[0] = prev; if (prev) prev.AdjacentLanes[1] = lane;
        const other = this.Lanes[opp(i)][3 - j];
        if (other) { lane.OpponentLane = other; other.OpponentLane = lane; }
        prev = lane;
      }
    }
  }
  Note(e) { this.Log.push(e); }
  ResetAreaModifiers() { this.CritAreaModifier = 0; this.DefenseAreaCritModifier = 0; this.DefenseAreaModifier = 0; this.HitAreaModifier = 0; }
  ResetExtraMagicPoints() { this.ExtraMagicPoints = 0; }

  SetDecks(user, opponent) { this.Decks[0] = user; this.Decks[1] = opponent; }
  SetHealth(user, opponent) { this.Health[0] = this.MaxHealth[0] = user; this.Health[1] = this.MaxHealth[1] = opponent; }
  GetMaxHealth(p) { return this.MaxHealth[p]; }
  SetMinHealth(a, b) { this.MinHealth[0] = a; this.MinHealth[1] = b; }
  GetMinHealth(p) { return this.MinHealth[p]; }
  GetLeader(p) { const d = this.Decks[p]; return d ? d.Leader : null; }
  GetLeaderCooldown(p) { return this.LeaderCooldown[p]; }
  IsLeaderAbilityReady(p) { return this.GetLeader(p).CanPlay(p); }
  EvaluateLeaderAbility(p) { return this.GetLeader(p).EvaluateLeaderAbility(p); }
  UseLeaderAbility(p) {
    const leader = this.GetLeader(p);
    const s = leader.InstanceScript();
    s.Owner = p; s.Leader = leader;
    s.Data.Form.Name = leader.Form.Name; s.Data.Form.ScriptName = leader.Form.ScriptName; s.Data.Form.ScriptVizName = leader.Form.ScriptName;
    s.Data.Form.RawDescription = leader.Description;
    this.Note({ t: 'hero', p });
    s.Cast();
    this.LeaderCooldown[p] = leader.Form.Cooldown;
  }

  WasAttacked(p) { return this.Attacked[p]; }
  GetLane(p, lane) { return this.Lanes[p][lane]; }
  DealDamage(p, damage, lane) {
    if (this.WheelResult === 'Crit') damage = Math.trunc(Math.fround(damage * this.CritDamageMod));
    this.Health[p] -= damage;
    if (p === PlayerType.User && damage > 0) this.Stats.hpLost += damage;
    if (this.Health[p] < this.MinHealth[p]) this.Health[p] = this.MinHealth[p];
    if (this.Health[p] > this.MaxHealth[p]) this.Health[p] = this.MaxHealth[p];
    this.Note({ t: 'heroHurt', p, amount: damage, lane: lane === undefined ? null : lane });
  }
  GetHealth(p) { return this.Health[p]; }
  SetMaxHealth(p) { this.Health[p] = this.MaxHealth[p]; }
  SetMagicPoints(p, n) { this.MagicPoints[p] = n; }
  GetMagicPoints(p) { return this.MagicPoints[p]; }
  AddMagicPoints(p, n) { this.MagicPoints[p] += n; if (n) this.Note({ t: 'mp', p, amount: n }); }
  GetFloopCountTurn(p) { return this.FloopCountTurn[p]; }
  GetFloopCountGame(p) { return this.FloopCountGame[p]; }
  AddBonusPoints(p, n) { this.BonusPoints[p] += n; }
  GetSpellPoints(p) { return this.SpellPoints[p]; }
  SetSpellPoints(p, n) { this.SpellPoints[p] = n; }
  AddSpellPoints(p, n) { this.SpellPoints[p] += n; }
  CanPlayCard(p) {
    const hand = this.GetHand(p);
    for (let i = 0; i < hand.length; i++) {
      const form = hand[i].Form;
      for (let j = 0; j < 4; j++) {
        const lane = this.GetLane(p, j);
        if ((form.Type !== CardType.Creature || !lane.HasCreature()) && (form.Type !== CardType.Building || !lane.HasBuilding()) && form.CanPlay(p, j)) return true;
      }
    }
    return false;
  }
  CanFloopCreature(p) {
    for (let i = 0; i < 4; i++) { const lane = this.GetLane(p, i); if (lane.HasCreature() && this.CanFloopCard(p, lane.GetCreature())) return true; }
    return false;
  }
  HasLegalMove(p) { return this.CanPlayCard(p) || this.CanFloopCreature(p); }
  GetHand(p) { return this.Hands[p]; }
  GetCardInHand(p, i) { return i < this.Hands[p].length ? this.Hands[p][i] : null; }
  GetCardsInHand(p) { return this.Hands[p].length; }
  DrawCard(p) {
    const deck = this.Decks[p], hand = this.Hands[p];
    if (hand.length >= PARAMS.MAX_HAND || deck.CardCount() <= 0) return;
    const c = deck.DealCard(); hand.push(c);
    this.Note({ t: 'draw', p, card: c });
  }
  PopCard(p) { return this.Decks[p].DealCard(); }
  PushCard(p, item) { this.Decks[p].PlaceCard(item); }
  Reshuffle(p) { this.Decks[p].Shuffle(); }
  GetDeck(p) { return this.Decks[p]; }
  PlaceCardInHand(p, card) {
    /* a card that brings back a card of a kind the discard pile has none of hands over nothing: the original put a
       null into the hand and broke it; here nothing is added */
    if (card == null) { AIManager.Faults.push('nothing to hand over'); return; }
    this.Hands[p].push(card); this.Note({ t: 'toHand', p, card });
  }
  RemoveCardFromHand(p, card) { this.Hands[p].Remove(card); }
  RemoveCardFromPlay(p, lane, type) {
    const s = this.Lanes[p][lane].Scripts[type];
    s.Flooped = false;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) if (this.LaneHasCard(p, i, j)) { const o = this.GetScript(p, i, j); hook(o.Data.Form.ID + ' left', () => o.OnCardLeftPlay(s)); }
    this.Lanes[p][lane].Scripts[type] = null;
    if (type === CardType.Creature) this.CreaturesRemoved[p]++;
    this.Note({ t: 'leave', p, lane, type, card: s.Data });
  }
  GetCardsInDeck(p) { return this.Decks[p].GetCards(); }
  DiscardCard(p, card) { this.DiscardPiles[p].unshift(card); }
  GetDiscardPile(p) { return this.DiscardPiles[p]; }
  RemoveCardFromDiscardPile(p, card) { this.DiscardPiles[p].Remove(card); }
  ReturnCardToHand(p, type) {
    const list = this.DiscardPiles[p].filter(c => c.Form.Type === type);
    if (list.length > 0) this.PlaceCardInHand(p, list[Random.Range(0, list.length)]);
  }
  DiscardPileContains(p, type) { return this.DiscardPiles[p].some(c => c.Form.Type === type); }
  GetCard(p, lane, type) { return this.Lanes[p][lane].Scripts[type].Data; }
  GetCardForm(p, lane, type) { return this.GetCard(p, lane, type).Form; }
  HasCreaturesInPlay(p) { for (let i = 0; i < 4; i++) if (this.LaneHasCreature(p, i)) return true; return false; }
  HasCardTypeInPlay(p, type) { for (let i = 0; i < 4; i++) if (this.LaneHasCard(p, i, type)) return true; return false; }
  LaneHasCreature(p, lane) { return this.Lanes[p][lane].HasCreature(); }
  LaneHasBuilding(p, lane) { return this.Lanes[p][lane].HasBuilding(); }
  LaneHasCard(p, lane, type) { return this.Lanes[p][lane].HasCard(type); }
  GetLanes(p) { return this.Lanes[p].slice(); }

  /* a creature at 0 health goes to the discard pile at once and leaves the board after its fall: here, straight away */
  CheckForDeaths() {
    const dying = [];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) {
      if (!this.LaneHasCreature(i, j)) continue;
      const c = this.GetCreature(i, j);
      if (c.Health <= 0 && !c.MarkedForDeath) {
        this.DiscardCard(i, c.Data);
        c.MarkedForDeath = true;
        if (i === PlayerType.User) this.Stats.lost++; else this.Stats.defeated++;
        dying.push(c);
      }
    }
    for (const c of dying) this.DeathActions(c);
  }
  DeathActions(c) {
    const p = c.Owner, lane = c.CurrentLane.Index;
    if (!this.LaneHasCreature(p, lane) || this.GetCreature(p, lane) !== c) return;
    this.Note({ t: 'death', p, lane, card: c.Data });
    if (this.OnCreatureDeath) this.OnCreatureDeath(c);       // the match drops its loot here
    const dying = c.Data;
    this.RemoveCardFromPlay(p, lane, CardType.Creature);
    if (this.LaneHasBuilding(p, lane)) { const b = this.GetBuilding(p, lane); hook(b.Data.Form.ID + ' died', () => b.OnCreatureDied(dying)); }
    const l = this.GetLane(p, lane);
    if (l.OpponentLane.HasCreature()) { const o = l.OpponentLane.GetCreature(); hook(o.Data.Form.ID + ' died', () => o.OnCreatureDied(dying)); }
  }
  IsMarkedForDeath(p, lane) { return this.LaneHasCreature(p, lane) ? this.GetCreature(p, lane).MarkedForDeath : false; }
  MoveCard(a, b, c, d, e) {
    if (e === undefined) {   // MoveCard(player, source, dest, type): within one side
      const p = a, type = d, from = this.Lanes[p][b], to = this.Lanes[p][c];
      const s1 = from.Scripts[type], s2 = to.Scripts[type];
      to.Scripts[type] = s1; from.Scripts[type] = s2;
      if (s1 != null) { s1.OnCardLeftPlay(s1); s1.CurrentLane = to; s1.OnCardEnterPlay(s1); }
      if (s2 != null) { s2.OnCardLeftPlay(s2); s2.CurrentLane = from; s2.OnCardEnterPlay(s2); }
      this.Note({ t: 'move', p, from: b, to: c, type });
      return;
    }
    const victim = a, source = b, thief = c, dest = d, type = e;   // MoveCard(victim, source, thief, dest, type)
    const from = this.Lanes[victim][source], to = this.Lanes[thief][dest];
    const s1 = from.Scripts[type], s2 = to.Scripts[type];
    to.Scripts[type] = s1; from.Scripts[type] = s2;
    if (s1 != null) { s1.Owner = thief; s1.CurrentLane = to; }
    if (s2 != null) { s2.Owner = victim; s2.CurrentLane = from; }
    this.Note({ t: 'steal', victim, source, thief, dest, type });
  }
  CastSpell(p, card) {
    if (!this.Stealing) {
      const cost = card.Form.DetermineCost(p), left = this.SpellPoints[p] - cost;
      if (left >= 0) this.AddSpellPoints(p, -cost);
      else { this.SetSpellPoints(p, 0); this.AddMagicPoints(p, left); }
      this.RemoveCardFromHand(p, card);
    } else { this.RemoveCardFromHand(opp(p), card); this.Stealing = false; }
    this.DiscardCard(p, card);
    const s = card.Form.InstanceScript();
    s.Owner = p; s.Data = card; s.GameInstance = this;
    this.SpellsCast[p]++;
    if (p === PlayerType.User) this.Stats.used(card.Form);
    this.Note({ t: 'spell', p, card });
    s.Cast();
  }
  AddSpellEffect(p, s) { this.SpellsInEffect[p].push(s); }
  EndSpellEffect(p, s) { this.SpellsInEffect[p].Remove(s); }
  AddPersistentSpellEffect(p, s) { this.PersistentSpellsInEffect[p].push(s); }
  EndPersistentSpellEffect(p, s) { this.PersistentSpellsInEffect[p].Remove(s); }
  Summon(p, lane, card) {
    const type = this.Lanes[p][lane].Type;
    (this.SummonedCards[p][card.Form.ID] = this.SummonedCards[p][card.Form.ID] || []).push(type);
    this.DoResultSummon(p, lane, card);
  }
  DoResultSummon(p, lane, card) {
    this.AddMagicPoints(p, -card.Form.DetermineCost(p));
    this.RemoveCardFromHand(p, card);
    const l = this.Lanes[p][lane];
    if (l.HasCard(card.Form.Type)) {
      const old = l.GetScript(card.Form.Type);
      this.DiscardCard(p, old.Data);
      this.RemoveCardFromPlay(p, l.Index, card.Form.Type);
    }
    const s = card.Form.InstanceScript();
    l.Scripts[card.Form.Type] = s;
    s.Data = card; s.CurrentLane = l; s.Owner = p; s.GameInstance = this; s.Fresh = true;
    this.Note({ t: 'summon', p, lane, type: card.Form.Type, card });
    s.OnSummon();
    if (card.Form.Type === CardType.Creature) this.CreaturesSummoned[p]++;
    if (p === PlayerType.User) this.Stats.used(card.Form);
    s.FinishSummoning();   // its arrival is drawn afterwards; the rules go on now
  }
  IsSummoning(p, lane, type) {
    if (lane === undefined) { for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) if (this.LaneHasCard(p, i, j) && this.GetScript(p, i, j).IsSummoning) return true; return false; }
    return this.Lanes[p][lane].Scripts[type].IsSummoning;
  }
  GetSummoning(p, lane) {
    if (p === undefined) { for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 2; k++) { const s = this.Lanes[i][j].Scripts[k]; if (s && s.IsSummoning) return s; } return null; }
    let r = null; for (let i = 0; i < 2; i++) { const s = this.Lanes[p][lane].Scripts[i]; if (s && s.IsSummoning) r = s; } return r;
  }
  FinishSummoning(script) {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      if (this.LaneHasCard(script.Owner, i, j)) { const s = this.GetScript(script.Owner, i, j); if (!s.IsSummoning) hook(s.Data.Form.ID + ' entered', () => s.OnCardEnterPlay(script)); }
    }
  }
  CanFloopCard(p, s) {
    return !s.Flooped && !s.FloopDisabled && !s.FloopBlocked && this.GetMagicPoints(p) >= s.DetermineFloopCost() && s.CanFloop();
  }
  FloopCard(p, lane, type) {
    const s = this.Lanes[p][lane].Scripts[type];
    this.AddMagicPoints(p, -s.DetermineFloopCost());
    this.FloopCountTurn[p]++; this.FloopCountGame[p]++;
    this.Note({ t: 'floop', p, lane, card: s.Data });
    s.Floop();
    s.Flooped = true;
    if (s.CurrentLane.HasBuilding()) { const b = s.CurrentLane.GetBuilding(); hook(b.Data.Form.ID + ' flooped', () => b.OnCreatureFlooped()); }
    if (p === PlayerType.User) this.Stats.floops++;
  }
  UnfloopCard(p, lane, type) { this.Lanes[p][lane].Scripts[type].Flooped = false; }
  IsFlooping(p) {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) if (this.LaneHasCard(p, i, j) && this.GetScript(p, i, j).Flooping) return true;
    return this.SpellsInEffect[p].some(s => s.Flooping) || this.PersistentSpellsInEffect[p].some(s => s.Flooping);
  }
  CancelFloop(p) { for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) if (this.LaneHasCard(p, i, j)) { const s = this.GetScript(p, i, j); if (s.Flooping) s.CancelFloop(); } }
  /* Unity ran this every frame; here it runs after every step of play */
  Update() {
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 4; j++) for (let k = 0; k < 2; k++) { const s = this.Lanes[i][j].Scripts[k]; if (s != null) hook(s.Data.Form.ID + ' update', () => s.Update()); }
      for (const s of this.SpellsInEffect[i].slice()) hook('spell update', () => s.Update());
      for (const s of this.PersistentSpellsInEffect[i].slice()) hook('spell update', () => s.Update());
    }
    this.CheckForDeaths();
  }
  FloopCount(p, type) { let n = 0; for (let i = 0; i < 4; i++) if (this.LaneHasCard(p, i, type) && this.Lanes[p][i].Scripts[type].Flooped) n++; return n; }
  SetLandscape(p, lane, type) { this.Lanes[p][lane].Type = type; }
  GetLandscapeType(p, lane) { return this.Lanes[p][lane].Type; }
  SetOverrideLandscape(p, type) { this.OverrideLandscapes[p] = type; }
  GetOverrideLandscape(p, lane) { return this.OverrideLandscapes[p]; }
  AddFakeLandscape(p, type) { this.FakeLandscapes[p].push(type); }
  RemoveFakeLandscape(p, type) { this.FakeLandscapes[p].Remove(type); }
  IsLaneOfLandscapeType(p, lane, type) {
    /* the original reads Lanes[player, -1] for a spell's lane and throws: a non-Prism spell is never asked about */
    return this.Lanes[p][lane].Type === type || this.OverrideLandscapes[p] === type;
  }
  LandscapeCount(a, b) {
    const count = p => {
      let n = 0;
      for (const f of this.FakeLandscapes[p]) if (f === type) n++;
      for (let j = 0; j < 4; j++) { const l = this.Lanes[p][j]; if ((l.Type === type || this.OverrideLandscapes[p] === type) && !l.Flipped) n++; }
      return n;
    };
    let type;
    if (b === undefined) { type = a; return count(0) + count(1); }
    type = b; return count(a);
  }
  LandscapeTypeCount(p) {
    const seen = new Array(6).fill(false); let n = 0;
    if (p === undefined) {
      for (let i = 0; i < 4; i++) {
        const l = this.Lanes[PlayerType.User][i];
        if (!seen[l.Type]) { seen[l.Type] = true; n++; }
        if (!seen[l.OpponentLane.Type]) { seen[l.OpponentLane.Type] = true; n++; }
      }
      return n;
    }
    if (this.OverrideLandscapes[p] !== LandscapeType.None) { seen[this.OverrideLandscapes[p]] = true; n++; }
    for (const f of this.FakeLandscapes[p]) if (!seen[f]) { seen[f] = true; n++; }
    for (let j = 0; j < 4; j++) { const t = this.Lanes[p][j].Type; if (!seen[t]) { seen[t] = true; n++; } }
    return n;
  }
  FlippedLandscapeCount(p) { let n = 0; for (let i = 0; i < 4; i++) if (this.Lanes[p][i].Flipped) n++; return n; }
  CreatureFactionCount(p, faction) {
    if (faction === undefined) {
      const seen = new Array(6).fill(false); let n = 0;
      for (let i = 0; i < 4; i++) { const l = this.Lanes[p][i]; if (l.HasCreature()) { const f = l.GetCreature().Data.Form.Faction; if (!seen[f]) { seen[f] = true; n++; } } }
      return n;
    }
    let n = 0; for (let i = 0; i < 4; i++) { const l = this.Lanes[p][i]; if (l.HasCreature() && l.GetCreature().Data.Form.Faction === faction) n++; } return n;
  }
  CreatureCount(p) { let n = 0; for (let i = 0; i < 4; i++) if (this.Lanes[p][i].HasCreature()) n++; return n; }
  BuildingCount(p) { let n = 0; for (let i = 0; i < 4; i++) if (this.Lanes[p][i].HasBuilding()) n++; return n; }
  CardCount(p, type) { let n = 0; for (let i = 0; i < 4; i++) if (this.Lanes[p][i].HasCard(type)) n++; return n; }
  EmptyLaneCount(p) { let n = 0; for (let i = 0; i < 4; i++) if (this.Lanes[p][i].IsEmpty()) n++; return n; }
  FloopedCardCount(p) { let n = 0; for (let i = 0; i < 4; i++) { const l = this.Lanes[p][i]; if (l.HasCreature() && l.GetCreature().Flooped) n++; } return n; }
  GetLandscapeInDeck(p, lane) { return this.Decks[p].GetLandscape(lane); }
  GetCreature(p, lane) { return this.Lanes[p][lane].GetCreature(); }
  GetBuilding(p, lane) { return this.Lanes[p][lane].GetBuilding(); }
  GetScript(p, lane, type) { return this.Lanes[p][lane].Scripts[type]; }
  DiscardCount(p, type) { return type === undefined ? this.DiscardPiles[p].length : this.DiscardPiles[p].filter(c => c.Form.Type === type).length; }
  GetDiscount(p, form) {
    let n = 0;
    for (const d of this.Discounts[p]) {
      if (d.FactionRequired) { if ((d.forType === CardType.None || form.Type === d.forType) && form.Faction === d.forFaction) n += d.Discount; }
      else if (d.forType === CardType.None || form.Type === d.forType) n += d.Discount;
    }
    return n;
  }
  SetDiscount(p, type, discount, factionReq = false, factionType = Faction.Universal) {
    this.Discounts[p].push({ forType: type, FactionRequired: factionReq, forFaction: factionType, Discount: discount });
  }
  GetFloopCostMod(p) { return this.FloopCostMods[p]; }
  AddFloopCostMod(p, n) { this.FloopCostMods[p] += n; }
  GetFlatFloopCost(p) { return this.FlatFloopCost[p]; }
  SetFlatFloopCost(p, cost) { this.FlatFloopCost[p] = cost; this.FloopCostMods[p] = 0; }
  GetATKPenalty(p) { return this.ATKPenalty[p]; }
  SetATKPenalty(p, n) { this.ATKPenalty[p] = n; }
  GetSpellsCast(p) { return this.SpellsCast[p]; }
  ClearSummonedCards() { this.SummonedCards = [{}, {}]; }
  GetSummonedCards(p) { return this.SummonedCards[p]; }
  GetSummonedCardCount(p, id) { return (this.SummonedCards[p][id] || []).length; }
  GetCreaturesSummoned(p) { return this.CreaturesSummoned[p]; }
  GetCreaturesRemoved(p) { return this.CreaturesRemoved[p]; }
  EnableCasting(p, type, flag) { this.CanCast[type][p] = flag; }
  IsCastingEnabled(p, type) { return this.CanCast[type][p]; }
  EnableFlooping(p, flag) { this.CanFloop[p] = false; }   // as in the original: it only ever turns flooping off
  RandomizeSummoning(p, flag) { this.RandomizeSummon[p] = flag; }
  CanPlayCards(p) { return this.CanPlay[p]; }
  IsFloopingEnabled(p) { return this.CanFloop[p]; }
  FlipLandscape(p, lane, flip) { this.Lanes[p][lane].Flipped = flip; this.Note({ t: 'flip', p, lane, flip }); }
  IsLandscapeFlipped(p, lane) { return this.Lanes[p][lane].Flipped; }
  HighlightLandscape() {}
  UnhighlightLandscape() {}
  ClearHighlights() {}
  SetTargetingListener(side, script) { this.SelectionSide = side; this.TargetingListener = script; }
  SelectTarget(idx) { const lane = this.GetLane(this.SelectionSide, idx); this.TargetingListener.OnTargetSelected(lane); }
  StealFrom(p) { if (p === PlayerType.Opponent) this.Stealing = true; }

  StartTurn(p) {
    this.SpellsCast[p] = 0; this.CreaturesSummoned[p] = 0; this.CreaturesRemoved[p] = 0;
    this.OverrideLandscapes[p] = LandscapeType.None;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      if (this.LaneHasCard(p, i, j)) {
        const s = this.GetScript(p, i, j);
        s.Moved = false; s.Flooped = false; s.Helpless = false; s.Protected = false; s.Fresh = false; s.Used = false;
        hook(s.Data.Form.ID + ' start', () => s.StartTurn());
      }
    }
    let guard = 0;
    while (this.PersistentSpellsInEffect[opp(p)].length > 0) {
      this.PersistentSpellsInEffect[opp(p)][0].OnOpponentStartTurn();
      if (++guard > 50) throw new Error('a lasting spell did not end at its turn');
    }
    if (this.Decks[p].CardCount() !== 0) { this.DrawCard(p); return false; }
    return p === PlayerType.User;   // the player is out of cards: the match deals with it
  }
  DoResultBleed(p) { if (p === PlayerType.User) this.DealDamage(p, this.GetLeader(p).Rank); }
  ReshuffleOpponentCards(p) {
    const hand = this.GetHand(p);
    while (hand.length > 0) this.DiscardCard(p, hand.shift());
    const pile = this.GetDiscardPile(p), deck = this.GetDeck(p);
    while (pile.length > 0) deck.AddCard(pile.shift());
    this.Reshuffle(p);
    for (let i = 0; i < 5; i++) this.DrawCard(p);
  }
  ResetCasting(p) { this.CanCast[0][p] = true; this.CanCast[1][p] = true; this.CanCast[2][p] = true; }
  EndTurn(p) {
    if (this.FirstPlayer - 1 === p) {
      this.CurrentMagicPoints++;
      if (this.CurrentMagicPoints > PARAMS.Max_Magic_Points) this.CurrentMagicPoints = PARAMS.Max_Magic_Points;
    }
    this.MagicPoints[p] = this.CurrentMagicPoints + this.BonusPoints[p];
    this.BonusPoints[p] = 0; this.FloopCountTurn[p] = 0; this.Discounts[p] = [];
    this.FloopCostMods[p] = 0; this.FlatFloopCost[p] = -1; this.ATKPenalty[p] = 0;
    this.ResetCasting(p);
    this.CanPlay[p] = true; this.CanFloop[p] = true; this.RandomizeSummon[p] = false;
    this.SpellsInEffect[p] = [];
    if (this.LeaderCooldown[p] > 0) this.LeaderCooldown[p]--;
    for (let i = 0; i < 4; i++) {
      const lane = this.GetLane(p, i);
      lane.Disabled = false;
      for (let j = 0; j < 2; j++) if (this.LaneHasCard(p, i, j)) { const s = this.GetScript(p, i, j); s.FloopBlocked = false; s.CantAttack = false; }
    }
    if (p === PlayerType.User) this.Stats.turns++;
  }

  /* ---- how the AI weighs a board: unchanged from the original */
  GetCreaturesInDanger(p) { return this.GetLanes(p).filter(l => l.HasCreature() && l.GetCreature().InDanger).map(l => l.GetCreature()); }
  GetCreaturesWithinHealthThreshold(p, t) { return this.GetLanes(p).filter(l => l.HasCreature() && l.GetCreature().Health <= t).map(l => l.GetCreature()); }
  GetCreaturesWithinHealthThresholdOfEnemy(p, t) {
    const out = [];
    for (const l of this.GetLanes(p)) {
      if (!l.HasCreature()) continue;
      const c = l.GetCreature(); const e = c.Enemy != null ? c.Enemy.ATK : 0;
      if (c.Health <= t + e) out.push(c);
    }
    return out;
  }
  ScoreHealth(p, b, c) {
    if (b === undefined) {
      let n = 0;
      for (const l of this.GetLanes(opp(p))) if (l.HasCreature()) { const cr = l.GetCreature(); if (cr.Enemy == null) n += cr.ATK; }
      const h = this.GetHealth(p);
      return n <= 0 ? h : Math.max(0, h - n);
    }
    if (Array.isArray(b)) {   // (player, LaneMods, mod)
      const mods = b, mod = c; let n = 0;
      for (const l of this.GetLanes(opp(p))) if (l.HasCreature()) { const cr = l.GetCreature(); if (cr.Enemy == null) n += Math.max(0, cr.ATK + mods[opp(p)][l.Index].ATK); }
      const h = this.GetHealth(p) + mod;
      return n <= 0 ? h : Math.max(0, h - n);
    }
    const item = b, target = c; let n = 0;   // (player, CardItem, Lane)
    for (const l of this.GetLanes(opp(p))) {
      if (l === target && !target.OpponentLane.HasCreature()) n += item.ATK;
      else if (l.HasCreature()) { const cr = l.GetCreature(); if (cr.Enemy == null && l.OpponentLane !== target) n += cr.ATK; }
    }
    const h = this.GetHealth(p);
    return n <= 0 ? h : Math.max(0, h - n);
  }
  ScoreActionPoints(p) { return this.GetMagicPoints(p) * 1; }
  ScoreCardsInHand(p) { return this.Hands[p].length * 3; }
  ScoreLane(a, b, c) {
    if (b === undefined) {   // (Lane)
      const lane = a;
      if (lane.HasCreature()) { const cr = lane.GetCreature(); return cr.Enemy != null ? cr.ATK + Math.max(0, cr.Health - cr.Enemy.ATK) : cr.ATK + cr.Health; }
      if (lane.OpponentLane.HasCreature()) return -lane.OpponentLane.GetCreature().ATK;
      return 0;
    }
    if (Array.isArray(a)) {   // (StatMod[] mods, int enemyHPMod, Lane)
      const mods = a, lane = c;
      if (lane.HasCreature()) {
        const cr = lane.GetCreature();
        if (cr.Enemy != null) {
          const atk = Math.max(0, cr.ATK + mods[0].ATK), hp = Math.max(0, cr.Health + mods[0].DEF), eatk = Math.max(0, cr.Enemy.ATK + mods[1].ATK);
          return hp <= 0 ? -eatk : atk + Math.max(0, hp - eatk);
        }
        const hp = Math.max(0, cr.Health + mods[0].DEF), atk = Math.max(0, cr.ATK + mods[0].ATK);
        return hp > 0 ? atk + hp : 0;
      }
      if (lane.OpponentLane.HasCreature()) { const e = lane.OpponentLane.GetCreature(); return -Math.max(0, e.ATK + mods[1].ATK) + mods[0].EmptyLaneScore; }
      return mods[0].EmptyLaneScore;
    }
    const item = b, lane = c;   // (player, CardItem, Lane)
    if (lane.OpponentLane.HasCreature()) { const e = lane.OpponentLane.GetCreature(); return item.ATK + Math.max(0, item.DEF - e.ATK); }
    return item.ATK + item.DEF;
  }
  ScoreLaneDefender(item, lane) {
    if (lane.HasCreature()) { const cr = lane.GetCreature(); return cr.ATK + Math.max(0, cr.Health - item.ATK); }
    return -item.ATK;
  }
  ScoreBoard(p, b, c, d) {
    if (p === undefined) return this.ScoreBoard(PlayerType.Opponent) - this.ScoreBoard(PlayerType.User);
    if (b === undefined) {
      let n = 0;
      for (const l of this.GetLanes(p)) n += this.ScoreLane(l);
      return n + this.ScoreHealth(p) + this.ScoreActionPoints(p) + this.ScoreCardsInHand(p);
    }
    if (d === undefined) {   // (player, CardItem, Lane)
      const item = b, lane = c;
      let mine = this.ScoreBoard(p), theirs = this.ScoreBoard(opp(p));
      const h1 = this.ScoreHealth(p), h2 = this.ScoreHealth(opp(p));
      const h1n = this.ScoreHealth(p, item, lane), h2n = this.ScoreHealth(opp(p), item, lane);
      const l1 = this.ScoreLane(lane), l2 = this.ScoreLane(lane.OpponentLane);
      const l1n = this.ScoreLane(p, item, lane), l2n = this.ScoreLaneDefender(item, lane.OpponentLane);
      const ap = this.ScoreActionPoints(p), apn = (this.GetMagicPoints(p) - item.Form.DetermineCost(p)) * 1;
      mine = mine - l1 - ap - h1 + (l1n + apn + h1n);
      theirs = theirs - l2 - h2 + (l2n + h2n);
      return mine - theirs;
    }
    const laneMods = b, healthMod = c, apMod = d;   // (player, LaneMods, HealthMod[], APMod[])
    let mine = this.ScoreBoard(p), theirs = this.ScoreBoard(opp(p));
    const h1 = this.ScoreHealth(p), h2 = this.ScoreHealth(opp(p));
    const h1n = this.ScoreHealth(p, laneMods, healthMod[p]), h2n = this.ScoreHealth(opp(p), laneMods, healthMod[opp(p)]);
    const ap1 = this.ScoreActionPoints(p), ap2 = this.ScoreActionPoints(opp(p));
    const ap1n = (this.GetMagicPoints(p) + apMod[p]) * 1, ap2n = (this.GetMagicPoints(opp(p)) + apMod[opp(p)]) * 1;
    mine = mine - h1 - ap1 + (h1n + ap1n);
    theirs = theirs - h2 - ap2 + (h2n + ap2n);
    const pair = [null, null];
    for (let i = 0; i < 4; i++) {
      const lane = this.GetLane(p, i);
      const s1 = this.ScoreLane(lane), s2 = this.ScoreLane(lane.OpponentLane);
      pair[0] = laneMods[p][i]; pair[1] = laneMods[opp(p)][lane.OpponentLane.Index];
      const n1 = this.ScoreLane(pair, healthMod[opp(p)], lane);
      pair[0] = laneMods[opp(p)][lane.OpponentLane.Index]; pair[1] = laneMods[p][i];
      const n2 = this.ScoreLane(pair, healthMod[p], lane.OpponentLane);
      mine = mine - s1 + n1; theirs = theirs - s2 + n2;
    }
    return mine - theirs;
  }

  /* after an effect: if every target said so, play goes on; anything that died now goes */
  AfterEffect(source, resume) { this.Update(); }
}
GameState.Instance = null;

/* ---------------------------------------------------------------- the AI: one greedy step at a time, as the original */

class AIDecision { constructor() { this.IsFloop = false; this.IsLeaderAbility = false; this.CardChoice = null; this.LaneChoice = null; } }
const AIManager = {
  WEIGHT_SCALE: 100, DEF_FACTOR: 2,
  get Instance() { return this; },
  Faults: [],
  /* one option weighed; the original's AI died with its turn when a card's weighing threw (a creature that returns a
     building, say, facing a building with no creature): here that one option is left out and noted in Faults */
  weigh(d, f, list) {
    try { const w = f(); list.AddSorted(d, w); }
    catch (e) { this.Faults.push((d.CardChoice ? d.CardChoice.Form.ID : 'hero') + ': ' + e.message); CardScript.ResetMods(); }
  },
  MakeDecision() {
    const gs = GameState.Instance, P = PlayerType.Opponent, list = new WeightedList();
    const lanes = gs.GetLanes(P);
    for (const item of gs.GetHand(P).slice()) {
      if (item.Form.Type === CardType.Spell) {
        if (item.Form.CanPlay(P, -1)) { const d = new AIDecision(); d.CardChoice = item; d.LaneChoice = null; this.weigh(d, () => item.EvaluateLanePlacement(P, null), list); }
        continue;
      }
      for (const lane of lanes) {
        if (!lane.HasCard(item.Form.Type) && item.Form.CanPlay(P, lane.Index)) {
          const d = new AIDecision(); d.CardChoice = item; d.LaneChoice = lane; this.weigh(d, () => item.EvaluateLanePlacement(P, lane), list);
        }
      }
    }
    for (const lane of lanes) {
      if (!lane.HasCreature()) continue;
      const cr = lane.GetCreature();
      if (gs.CanFloopCard(P, cr)) { const d = new AIDecision(); d.IsFloop = true; d.CardChoice = cr.Data; d.LaneChoice = lane; this.weigh(d, () => cr.EvaluateAbility(), list); }
    }
    if (gs.IsLeaderAbilityReady(P)) { const d = new AIDecision(); d.IsLeaderAbility = true; this.weigh(d, () => gs.EvaluateLeaderAbility(P), list); }
    const now = gs.ScoreBoard();
    return list.TopWeight() >= now ? list.TopCandidate() : null;
  },
};
