#!/usr/bin/env python3
"""Reads the original game's data tables and writes the game's own data, every number as it was.

    python3 tools/extract.py <Blueprints folder of the original> [content/names.json]

Writes content/data.json: the cards, the heroes, the preset decks and the few rules numbers the battle needs.
Each entry keeps `src`, the original ID, so any card can be checked against the report tables, which use those IDs.
The names, and the ids made from them, come from content/names.json: a card not named there yet keeps its
original ID as its id, so that nothing is ever silently missing.
"""
import json, os, re, sys

FACTION = {'Corn': 0, 'Plains': 1, 'Swamp': 2, 'Cotton': 3, 'Sand': 4, 'Universal': 5}
LANDSCAPE = {'Corn': 0, 'Plains': 1, 'Swamp': 2, 'Cotton': 3, 'Sand': 4}
QUALITY = {'Standard': 0, 'Gold': 1, 'Obsidian': 2, 'Halloween': 3, 'Christmas': 4, 'FionnaCake': 5}
CARDTYPE = {'Creature': 0, 'Building': 1, 'Spell': 2}

def load(folder, name):
    with open(os.path.join(folder, name), encoding='utf-8-sig') as f: return json.load(f)

def as_int(v, default=0):
    """TFUtils.LoadInt: an empty value is the default, else floor(x + 0.5)"""
    if v is None or (isinstance(v, str) and v.strip() == ''): return default
    import math
    return int(math.floor(float(v) + 0.5))

def as_float(v, default=None):
    if v is None or (isinstance(v, str) and v.strip() == ''): return default
    return float(v)

def main():
    src_dir = sys.argv[1]
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    names_file = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, 'content', 'names.json')
    names = json.load(open(names_file)) if os.path.exists(names_file) else {}
    def ident(src, kind):
        n = names.get(kind, {}).get(src)
        if kind == 'decks': return (n, n) if n else (src, src)
        return (n['id'], n['name']) if n else (src, src)
    def extra(src, kind, keys):
        n = names.get(kind, {}).get(src) or {}
        return {k: n.get(k, '') for k in keys}

    cards = []
    for fname, kind, tname in [('db_Creatures.json', 'cards', 'Creature'), ('db_Buildings.json', 'cards', 'Building'), ('db_Spells.json', 'cards', 'Spell')]:
        for r in load(src_dir, fname):
            cid, nm = ident(r['ID'], 'cards')
            c = {'id': cid, 'src': r['ID'], 'name': nm, 'type': CARDTYPE[tname], 'faction': FACTION[r['Faction']],
                 'quality': QUALITY[r['Quality']], 'rarity': as_int(r['Rarity']), 'cost': as_int(r['Cost']),
                 'floop': as_int(r.get('FloopCost'), 0), 'atk': as_int(r.get('ATK'), 0), 'def': as_int(r.get('DEF'), 0),
                 'v1': as_int(r.get('val1'), 0), 'v2': as_int(r.get('val2'), 0), 'sale': as_int(r.get('BaseSalePrice'), 0),
                 'script': r.get('ScriptName') or '', 'fuse': r.get('CanFuse') == 'True'}
            c.update(extra(r['ID'], 'cards', ['edition', 'art', 'text']))
            cards.append(c)

    leaders = []
    for r in load(src_dir, 'db_Leaders.json'):
        lid, nm = ident(r['ID'], 'leaders')
        nullable = lambda k, table: table[r[k]] if r.get(k) else None
        leaders.append({'id': lid, 'src': r['ID'], 'name': nm, **extra(r['ID'], 'leaders', ['form', 'cast', 'text']), 'character': r['CharacterID'],
                        'hp': as_int(r.get('BaseHP'), 23), 'cooldown': as_int(r.get('Cooldown'), 0),
                        'v1': as_int(r.get('Val1'), 0), 'v2': as_int(r.get('Val2'), 0), 'script': r.get('ScriptName') or '',
                        'forFaction': nullable('forFaction', FACTION), 'forLandscape': nullable('forLandscape', LANDSCAPE),
                        'forCardType': nullable('forCardType', CARDTYPE), 'rarity': as_int(r.get('Rarity'), 1),
                        'startLevel': as_int(r.get('StartLevel'), 1), 'lvScheme': r.get('LvUpSchemeID') or '',
                        'fcWorld': r.get('FCWorld') == '1',
                        'ring': {'p1Hit': as_float(r['Ring_P1_HitAreaRange']), 'p1Crit': as_float(r['Ring_P1_CritAreaRange']),
                                 'p2Hit': as_float(r['Ring_P2_HitAreaRange']), 'p2Crit': as_float(r['Ring_P2_CritAreaRange']),
                                 'spinMin': as_float(r['TimeFor1SpinMin']), 'spinMax': as_float(r['TimeFor1SpinMax']),
                                 'crit': as_float(r['CritDamageMod'])}})

    params = {p['ID']: p['Value'] for p in load(src_dir, 'db_Parameters.json')}
    by_src = {c['src']: i for i, c in enumerate(cards)}   # deck rows name a card by its place in `cards`
    decks, cur, seen = [], None, set()
    for r in load(src_dir, 'db_Decks.json'):
        if r['DeckID']:
            did, _ = ident(r['DeckID'], 'decks')
            cur = {'id': did, 'src': r['DeckID'], 'landscapes': [], 'cards': []}
            # a deck ID met again starts a deck the original never registers (AIDeckManager): its rows are lost
            if r['DeckID'] not in seen: decks.append(cur)
            seen.add(r['DeckID'])
        if cur is None: continue
        if len(cur['landscapes']) < 4 and r.get('Landscapes'):
            cur['landscapes'].append({'corn': 0, 'plains': 1, 'swamp': 2, 'cotton': 3, 'sand': 4, 'none': 5}[r['Landscapes'].strip().lower()])
        card = r.get('Cards') or ''
        if card not in by_src:
            card = params['Bad_Deck_Card_Replacement']   # the original swaps a card it cannot find for this one
        # one row a card: [card's place in cards, level, drop chance, drop level, static weight, coin chance, coins]
        cur['cards'].append([by_src[card], as_int(r.get('Level'), 1), as_float(r.get('DropChance'), 0.0),
                             as_int(r.get('DropLevel'), 1), as_int(r.get('StaticWeight'), 0),
                             as_float(r.get('CoinChance'), 0.0), as_int(r.get('CoinReward'), 0)])

    rankup = [{'rank': as_int(r['LeaderRank']), 'deckMax': as_int(r['DeckMaxSize'])} for r in load(src_dir, 'db_RankUp.json')]

    # the tables of the original's quests: who sits across, with which deck, and how the wheel is set for it
    card_id = {c['src']: c['id'] for c in cards}
    hero_id = {l['src']: l['id'] for l in leaders}
    deck_id = {d['src']: d['id'] for d in decks}
    deck_id['_PLAYER_CLONE_DECK'] = 'player-clone'   # the impostor plays a copy of the player's own deck
    # the second run of main tables names a Remix1_Deck the data never had: the original found no deck there and its
    # table could not be played. The other remixes are the first run's tables reworked, so this one is its own table's deck
    deck_id['Remix1_Deck'] = deck_id['Quest1_Deck']
    quests = []
    for r in load(src_dir, 'db_Quest.json'):
        drops = [card_id[r[k]] for k in [f'CardDrop{i}' for i in range(1, 9)] if r.get(k) and r[k] in card_id]
        quests.append({'id': r['QuestID'], 'type': r['QuestType'], 'label': r.get('QuestLabel') or '',
                       'hero': hero_id.get(r['LeaderID'], r['LeaderID']), 'rank': as_int(r.get('LeaderLevel'), 1),
                       'deck': deck_id.get(r['Deck'], r['Deck']),
                       'spin': as_float(r.get('SpinFactor'), 1.0), 'p1Hit': as_float(r.get('P1_HitAreaMod'), 0.0),
                       'p1Crit': as_float(r.get('P1_CritAreaMod'), 0.0), 'p2Hit': as_float(r.get('P2_HitAreaMod'), 0.0),
                       'p2Crit': as_float(r.get('P2_CritAreaMod'), 0.0),
                       'reshuffle': (r.get('AIReshuffle') or 'True').strip().lower() != 'false',
                       'xp': [as_float(r.get('MinXP'), 0.0), as_float(r.get('MaxXP'), 0.0)],
                       'coins': [as_float(r.get('MinCoins'), 0.0), as_float(r.get('MaxCoins'), 0.0)],
                       'loot': as_float(r.get('Loot'), 0.0), 'maxLoot': as_int(r.get('MaxLootDrops'), 0), 'staticDrops': as_int(r.get('StaticDrops'), 0),
                       'heroAwarded': hero_id.get(r.get('LeaderAwarded') or '', ''), 'conditions': [r.get(f'Condition{i}') or '' for i in (1, 2, 3)],
                       'place': r.get('LevelPrefab') or '', 'unlocks': [r.get(k) or '' for k in ('UnlockQuestIDs1', 'UnlockQuestIDs2', 'UnlockQuestIDs3')],
                       'dropProfile': r.get('DropProfileID') or '', 'drops': drops,
                       'heroRules': r.get('LeaderRules') or '', 'restricted': r.get('RestrictedLeaders') or ''})
    # ---- what the campaign around the battles is made of: every number as the original's tables have it

    # the stars: a table's second and third star each ask one of these (QuestConditionManager)
    def enum_list(text, table):
        lower = {k.lower(): v for k, v in table.items()}
        return sorted({lower[w.strip().lower()] for w in re.split(r'[ ,;]', text) if w.strip()})
    conditions = {}
    for r in load(src_dir, 'db_QuestConditions.json'):
        if not r.get('ID'): continue
        c = {}
        for k in ('MaxTurns', 'MinCreaturesDefeated', 'MaxActionPointsPerCard', 'MaxActionPointsTotal', 'MaxHPLost',
                  'MaxNumCreaturesLost', 'MinLandscapesUsed', 'MaxDeckCost', 'MaxFloopsUsed'):
            if (r.get(k) or '').strip(): c[k] = int(r[k])
        if (r.get('AllowedTypes') or '').strip(): c['types'] = enum_list(r['AllowedTypes'], CARDTYPE)
        if (r.get('AllowedFactions') or '').strip(): c['factions'] = enum_list(r['AllowedFactions'], FACTION)
        conditions[r['ID']] = c
    # one table asks for 'Defeat10', a condition the table of conditions spells 'Deafeat10': the original found none
    # and that star could never be had. It is the same condition, so the table is pointed at it.
    for q in quests:
        q['conditions'] = ['Deafeat10' if c == 'Defeat10' else c for c in q['conditions']]
        for c in q['conditions']:
            if c and c not in conditions: raise SystemExit(f'quest {q["id"]} asks for a condition no one wrote: {c}')

    # what a beaten creature of the table's may leave (DropProfileDataManager): the lists run as far as their columns
    def series(r, name):
        out, n = [], 1
        while name + str(n) in r: out.append(r[name + str(n)]); n += 1
        return out
    profiles = {}
    for r in load(src_dir, 'db_DropProfile.json'):
        if not r.get('DropProfileID'): continue
        profiles[r['DropProfileID']] = {
            'chest': [as_float(v, 0.0) for v in series(r, 'ChestDropPercentage')],
            'weights': [as_int(v, 0) for v in series(r, 'CardWeight')],
            'coinChance': [as_float(v, 0.0) for v in series(r, 'CoinDropPercentage')],
            'coins': [as_int(v, 0) for v in series(r, 'CoinAmount')],
            'coinWeights': [as_int(v, 0) for v in series(r, 'CoinWeight')]}
    # a table's drops keep their places: CardWeight n weighs CardDrop n, and a drop the data names wrongly is a gap
    for q, r in zip(quests, load(src_dir, 'db_Quest.json')):
        q['drops'] = [card_id.get(r.get(f'CardDrop{i}') or '', '') for i in range(1, 9)]
        while q['drops'] and not q['drops'][-1]: q['drops'].pop()

    # the Kiln: what each recipe makes, for how much, from what, and the table whose first win shows it (FusionManager)
    recipes = []
    for r in load(src_dir, 'db_Fusion.json'):
        ing = []
        for i in (1, 2, 3):   # the original reads three ingredients and no more
            n = (r.get(f'C{i}_Name') or '').strip()
            if n and n in card_id: ing.append([card_id[n], as_int(r.get(f'C{i}_Count'), 1)])
        if not ing or r['Card_ID'] not in card_id: continue
        recipes.append({'card': card_id[r['Card_ID']], 'src': r['Card_ID'], 'cost': as_int(r.get('Cost'), 0),
                        'unlock': str(as_int(r.get('Quest_Unlock'), 0)), 'needs': ing})

    # the chests and the cards turned over after a win (GachaManager, DailyGiftDataManager): weights by card
    weights = load(src_dir, 'db_GachaWeights.json')
    def pool(col):
        return [[card_id[w['CardID']], as_int(w.get(col), 0)] for w in weights if w['CardID'] in card_id and as_int(w.get(col), 0) > 0]
    schedule = [s for s in load(src_dir, 'db_GachaSchedule.json') if (s.get('StartDate') or '').lower() == 'default']
    chest = {}
    for s in schedule:
        kind = 'premium' if s['ChestType'].lower() == 'premium' else 'normal'
        cols = [s[f'Weight{i}'] for i in range(1, 11) if s.get(f'Weight{i}')]
        chest[kind] = {'coins': as_int(s.get('Coins'), 0), 'jewels': as_int(s.get('Gems'), 0), 'cols': cols}
    gifts = load(src_dir, 'db_DailyGift.json')
    tier_of = {'card normal': 'standard', 'card gold': 'gilded', 'card obsidian': 'obsidian'}
    flips = {'tiers': [[tier_of[g['Type'].lower()], as_int(g['Rarity'])] for g in gifts if g['Type'].lower() in tier_of],
             'retry': max(as_int(g.get('RetryGemCost'), 1) for g in gifts),
             'pools': {'standard': pool('DailyGiftStandard'), 'gilded': pool('DailyGiftGold'), 'obsidian': pool('DailyGiftObsidian')}}
    chests = {k: {'coins': v['coins'], 'jewels': v['jewels'], 'pool': pool(v['cols'][0])} for k, v in chest.items()}
    # The holiday cards were only ever in the holiday chests and gifts, which are gone with the holidays. They come
    # instead as the standard cards of their rarity come: in each pool, with the weight most standard cards of that
    # rarity have there, and not at all in a pool that holds no standard card of that rarity.
    by_src = {c['src']: c for c in cards}
    base_cols = ('NormalChestWeight', 'PremiumChestWeight', 'DailyGiftStandard', 'DailyGiftGold', 'DailyGiftObsidian')
    holiday_cols = ('DailyGiftHalloween', 'KeyChristmas', 'HalloweenCarnival', 'HolidayCarnival')
    holiday = [w['CardID'] for w in weights if w['CardID'] in by_src and all(as_int(w.get(c), 0) == 0 for c in base_cols)
               and any(as_int(w.get(c), 0) > 0 for c in holiday_cols)]
    def usual(col, rarity):
        seen = [as_int(w.get(col), 0) for w in weights if w['CardID'] in by_src and by_src[w['CardID']]['quality'] == 0
                and by_src[w['CardID']]['rarity'] == rarity and as_int(w.get(col), 0) > 0]
        if not seen: return 0
        count = {}
        for v in seen: count[v] = count.get(v, 0) + 1
        return sorted(count.items(), key=lambda kv: (-kv[1], kv[0]))[0][0]
    for src in holiday:
        c = by_src[src]
        for target, col in ((flips['pools']['standard'], 'DailyGiftStandard'), (chests['normal']['pool'], 'NormalChestWeight'), (chests['premium']['pool'], 'PremiumChestWeight')):
            w = usual(col, c['rarity'])
            if w: target.append([c['id'], w])
        c['holiday'] = True

    # the album shows every card a player could ever meet: three cards no deck holds and nothing gives are left out
    met = set()
    for d in decks:
        for row in d['cards']: met.add(cards[row[0]]['id'])
    given = set()
    for q in quests: given.update(x for x in q['drops'] if x)
    for pl in [flips['pools'][t] for t in flips['pools']] + [chests[k]['pool'] for k in chests]: given.update(x[0] for x in pl)
    for w in weights:
        if w['CardID'] in card_id and any(as_int(v, 0) > 0 for k, v in w.items() if k not in ('CardID', 'Quality')): given.add(card_id[w['CardID']])
    given.update(r['card'] for r in recipes)
    for c in cards:
        if c['id'] not in met and c['id'] not in given: c['album'] = False

    out = {'cards': cards, 'leaders': leaders, 'decks': decks, 'quests': quests, 'params': params, 'rankUp': rankup,
           'conditions': conditions, 'profiles': profiles, 'recipes': recipes, 'chests': chests, 'flips': flips,
           'xp': {r['LvUpSchemeID']: as_float(r['LvIndex']) for r in load(src_dir, 'db_LvUpScheme.json')}}
    path = os.path.join(here, 'content', 'data.json')
    with open(path, 'w') as f: json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(cards)} cards, {len(leaders)} heroes, {len(decks)} decks, {len(quests)} quests, {len(recipes)} recipes -> {os.path.relpath(path)}')

if __name__ == '__main__':
    main()
