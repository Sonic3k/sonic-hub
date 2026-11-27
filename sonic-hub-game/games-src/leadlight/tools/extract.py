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
    out = {'cards': cards, 'leaders': leaders, 'decks': decks, 'params': params, 'rankUp': rankup}
    path = os.path.join(here, 'content', 'data.json')
    with open(path, 'w') as f: json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(cards)} cards, {len(leaders)} heroes, {len(decks)} decks -> {os.path.relpath(path)}')

if __name__ == '__main__':
    main()
