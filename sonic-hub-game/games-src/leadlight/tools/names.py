#!/usr/bin/env python3
"""Gives every card, hero and preset deck of the original its Leadlight name, id and rules text.

    python3 tools/names.py <original game folder (the fan port's root)>

Reads tools/rename.json (cards), content/cast.json (heroes) and the original's English text, and writes
content/names.json, keyed by the original IDs. tools/extract.py then builds content/data.json from it.

A card's rules text is the original's text for that card, with its values filled in and the words of the old world
swapped for the new ones (Floop -> Glint, Magic Points -> Light, the landscapes -> the realms). A hero's is written
from what her ability's script does, because several of the original hero texts say something other than their data.
Anything of the old world left in a text stops this script.
"""
import html, json, os, re, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REALM = ['Amber Fields', 'Cobalt Downs', 'Bottle Fen', 'Cranberry Vale', 'Sandglass Dunes', 'Prism']
REALM_SHORT = ['Amber', 'Cobalt', 'Fen', 'Cranberry', 'Dune', 'Prism']
FACTION = {'Corn': 0, 'Plains': 1, 'Swamp': 2, 'Cotton': 3, 'Sand': 4, 'Universal': 5}
TYPE_WORD = {0: 'creature', 1: 'building', 2: 'spell'}

def slug(s):
    s = s.lower().replace("'", '').replace('&', 'and')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

# the old words, longest first, and what they become
SWAPS = [
    (r'\bFLOOP abilities\b', 'Glints'), (r'\bFloop abilities\b', 'Glints'), (r'\bFLOOP ability\b', 'Glint'), (r'\bFloop ability\b', 'Glint'),
    (r'\bFLOOP\b', 'Glint'), (r'\bFlooped\b', 'Glinted'), (r'\bflooped\b', 'glinted'), (r'\bFlooping\b', 'Glinting'), (r'\bFloops\b', 'Glints'), (r'\bFloop\b', 'Glint'), (r'\bfloop\b', 'glint'),
    (r'\bMagic Points\b', 'Light'), (r'\bMagic Point\b', 'Light'), (r'\bmagic points\b', 'Light'), (r'\bmagic point\b', 'Light'), (r'\bMagic points\b', 'Light'),
    (r'\bUseless Swamp\b', 'Bottle Fen'), (r'\bBlue Plains\b', 'Cobalt Downs'), (r'\bCorn Fields\b', 'Amber Fields'), (r'\bSandy Lands\b', 'Sandglass Dunes'),
    (r'\bNice Lands\b', 'Cranberry Vale'), (r'\bNicelands\b', 'Cranberry'), (r'\bNice [Ll]ands?\b', 'Cranberry'),
    (r'\bSwamp\b', 'Fen'), (r'\bPlains\b', 'Cobalt'), (r'\bPlain\b', 'Cobalt'), (r'\bCorn\b', 'Amber'), (r'\bSand\b', 'Dune'), (r'\bRainbow\b', 'Prism'), (r'\bUniversal\b', 'Prism'),
    (r'\bLeader\b', 'Hero'), (r'\bleader\b', 'hero'), (r'\bDefense\b', 'DEF'), (r'\bdefense\b', 'DEF'), (r'\bAttack\b', 'ATK'),
    (r'\bDamage\b', 'damage'), (r'\bDiscard Pile\b', 'discard pile'), (r'\bHero\b', 'hero'),
]
OLD = re.compile(r'Floop|FLOOP|Magic Point|Swamp|Plains|Corn |Nice ?[Ll]and|Rainbow|Universal|Leader|Finn|Jake|Bubblegum|Marceline|Ooo', re.I)

def swap(text):
    for a, b in SWAPS: text = re.sub(a, b, text)
    return text

def card_text(desc, v1, v2):
    t = desc.replace('<val1>', str(v1)).replace('<val2>', str(v2))
    t = re.sub(r'\s+', ' ', t).strip()
    t = swap(t)
    t = t.replace('+-', '-')
    if t and t[-1] not in '.!': t += '.'
    return t

def hero_text(r, cast_realm):
    """written from the script: what it does, with its values"""
    s, v1, v2 = r['ScriptName'], r['Val1'] or '0', r['Val2'] or '0'
    fac = REALM_SHORT[FACTION[r['forFaction']]] if r['forFaction'] else None
    ctype = {'Creature': 'Creatures', 'Spell': 'Spells', 'Building': 'Buildings'}.get(r['forCardType'] or '', 'Cards')
    one = {'Creatures': 'creature', 'Spells': 'spell', 'Buildings': 'building'}.get(ctype, 'card')
    texts = {
        'GainActionPointsLeader': f'Gain {v1} extra Light this turn.',
        'ATKBonusFactionCreaturesLeader': f'Your {fac} creatures in play gain +{v1} ATK.',
        'ATKBonusAllCreaturesLeader': f'All your creatures in play gain +{v1} ATK.',
        'HealAllCreaturesLeader': 'Fully heal all your creatures.',
        'HealAllFactionCreaturesLeader': f'Fully heal all your {fac} creatures.',
        'ReduceTypeCostLeader': f'Your {ctype.lower()} cost {v1} less Light this turn.',
        'ReturnBuildingsLeader': 'Send every opposing building back to its owner\'s hand (to the discard pile if the hand is full).',
        'HealCreatureLeader': 'Choose one of your creatures and fully heal it.',
        'DrawCardsLeader': f'Draw {v1} card{"s" if v1 != "1" else ""}.',
        'ReduceCostLeader': 'Every card costs 1 less Light this turn.',
        'ReturnCardTypeLeader': f'Return a {one} from your discard pile to your hand.',
        'ReturnCardLeader': 'Return any card from your discard pile to your hand.',
        'DEFBonusAllCreaturesLeader': f'All your creatures in play gain +{v1} DEF.',
        'DEFBonusFactionCreaturesLeader': f'Your {fac} creatures in play gain +{v1} DEF.',
        'ReduceFactionCreatureCostLeader': f'This turn your {fac} {ctype.lower()} cost {v1} less Light, and your other {ctype.lower()} {v2} less.',
        'BlockCardTypeDestroyBuildingsLeader': f'Destroy every opposing building. Your opponent can\'t cast {ctype.lower()} on their next turn.',
        'ATKDEFBonusFactionCreaturesLeader': f'Your {fac} creatures in play gain +{v1} ATK and +{v2} DEF.',
    }
    return texts[s]

def deck_id(src):
    m = re.fullmatch(r'(Quest|Remix|FCQuest|FCTC|ElFisto|Valentine|Mimic)(\d+)([ab]?)_Deck', src)
    if m:
        kind = {'Quest': 'quest', 'Remix': 'campaign', 'FCQuest': 'mirror', 'FCTC': 'goldie', 'ElFisto': 'velvet', 'Valentine': 'rose', 'Mimic': 'mabel'}[m.group(1)]
        return f'{kind}-{int(m.group(2))}{m.group(3)}'
    m = re.fullmatch(r'(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(\d+)_Deck', src)
    if m: return f'hollow-{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].index(m.group(1)) + 1}-{m.group(2)}'
    m = re.fullmatch(r'FC_(Enemy|Player)_Demo(\d+)_Deck', src)
    if m: return f'mirror-{m.group(1).lower()}-demo-{m.group(2)}'
    fixed = {'TEST_DECK': 'test', 'Corn': 'amber-sampler', 'Plains': 'cobalt-sampler', 'PlayerDeck1': 'starter', 'tcat_Deck': 'goldie-hoard',
             'FCMLee_Deck': 'mirror-rowan', 'FCLSP_Deck': 'mirror-cirrus', 'FCIQ_Deck': 'mirror-isolde', 'Bobo_Deck': 'wanderer'}
    return fixed[src]

def main():
    root = sys.argv[1]
    bp = os.path.join(root, 'Assets/StreamingAssets/Blueprints')
    text = {}
    for f in ['EN_Descriptions.bytes', 'EN_Names.bytes', 'EN_Menu.bytes']:
        for m in re.finditer(r'<entry name="([^"]+)">(.*?)</entry>', open(os.path.join(root, 'Assets/Resources/languages', f), encoding='utf-8').read(), re.S):
            text[m.group(1)] = html.unescape(m.group(2))
    load = lambda f: json.load(open(os.path.join(bp, f), encoding='utf-8-sig'))
    rename = json.load(open(os.path.join(HERE, 'tools', 'rename.json')))
    cast = json.load(open(os.path.join(HERE, 'content', 'cast.json')))
    editions = rename['editions']

    out = {'cards': {}, 'leaders': {}, 'decks': {}}
    taken, problems = {}, []
    for fname, table in [('db_Creatures.json', 'creatures'), ('db_Buildings.json', 'buildings'), ('db_Spells.json', 'spells')]:
        for r in load(fname):
            old = text.get(r['Name'], r['Name'])
            if old not in rename[table]: problems.append(f'{r["ID"]}: "{old}" is not in rename.json {table}'); continue
            name, art = rename[table][old]
            edition = editions[r['Quality']]
            cid = slug(name) + ('-' + slug(edition) if edition else '')
            n = 2
            while cid in taken: cid = f'{slug(name)}{("-" + slug(edition)) if edition else ""}-{n}'; n += 1
            taken[cid] = r['ID']
            desc = text.get(r['Desc'], '')
            t = card_text(desc, r.get('val1') or 0, r.get('val2') or 0)
            if OLD.search(t): problems.append(f'{r["ID"]}: text still says "{t}"')
            out['cards'][r['ID']] = {'id': cid, 'name': name, 'edition': edition, 'art': art, 'text': t}

    for r in load('db_Leaders.json'):
        key, form = cast['heroes'][r['ID']]
        person = cast['people'][key]
        hid = key + ('-' + slug(form) if form else '')
        out['leaders'][r['ID']] = {'id': hid, 'name': person['name'], 'form': form, 'cast': key, 'text': hero_text(r, person['realm'])}

    cur = None
    for r in load('db_Decks.json'):
        if r['DeckID']: out['decks'][r['DeckID']] = deck_id(r['DeckID'])

    if problems: raise SystemExit('\n'.join(problems))
    path = os.path.join(HERE, 'content', 'names.json')
    json.dump(out, open(path, 'w'), ensure_ascii=False, indent=1)
    print(f'{len(out["cards"])} cards, {len(out["leaders"])} heroes, {len(out["decks"])} decks named -> {os.path.relpath(path)}')

if __name__ == '__main__':
    main()
