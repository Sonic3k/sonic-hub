#!/usr/bin/env python3
"""Writes content/campaign.json: the land the campaign crosses, and what its milestones give.

    python3 tools/campaign.py            (after tools/extract.py)

The tables, their order and every number of them are the original's (content/data.json). What this adds:

  regions    the eight regions the original's main tables are set in, with the names and lines Leadlight gives them
  encore     the original also has a second run of the first four regions' tables, reworked, that nothing in it ever
             opens: here it opens once the first region's last table is won, and runs alongside the main road
  milestones what the original had but never let a player have, given at real points of the campaign:
               a region cleared (its last table won)      two of the locked Kiln recipes that are whole
               a region glazed (every table at 3 stars)   a card nothing gave, and one more locked recipe
               stars gathered across the land            the heroes who were never at any table
             The locked recipes left out are the unfinished ones: a single card of one kind and 100 coins for
             a card whose real recipes cost millions.
  recruit    the heroes who sit at tables but were never given: each win over one may bring her over, more
             likely each time, and the fifth win surely does
  hidden     heroes of the holidays and of the mirror's own road, who are not in the album
"""
import json, os

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGIONS = [
    ('TreeFort', 'Oriel Treehouse', 'A house in the boughs, every window a different summer.'),
    ('Picnic', 'Glasshouse Green', 'Lawns under a roof of glass, the tables laid out among the palms.'),
    ('Candy', 'Sugarwork Quarter', 'Streets of spun sugar and candied panes, sweet to look at and sharp at the edges.'),
    ('BeachParty', 'Seaglass Shore', 'Tide pools and bottle-glass, worn smooth and frosted by the sea.'),
    ('Cave', 'Geode Hollows', 'Caverns lined with crystal that keeps the light long after the day has gone.'),
    ('Ice', 'Frostpane Heights', 'High passes where the frost draws its own patterns on every pane.'),
    ('Sand', 'Silica Flats', 'White sand, the stuff all glass is made from, baking under the sun.'),
    ('DarkForest', 'Lampblack Wood', 'An old wood lit by lanterns, where the glass is darkest and burns brightest.'),
]
# the cards nothing gave, one for each region glazed, in the order their realms and rarities suit the road
GLAZED_CARDS = ['Creature_XMAS_SnowCorn', 'Creature_XMAS_SnowPlain', 'Creature_XMAS_SnowSwamp', 'Creature_XMAS_SnowSand',
                'Creature_REAL_PapercutTiger', 'Building_XMAS_FruitCake', 'Building_SunPyramid', 'Spell_IncredibleEgg']
STAR_STEP = 40   # a hero every forty stars


def main():
    data = json.load(open(os.path.join(HERE, 'content', 'data.json')))
    card = {c['src']: c for c in data['cards']}
    hero = {l['src']: l for l in data['leaders']}
    main_q = [q for q in data['quests'] if q['type'] == 'main']

    regions = []
    for place, name, line in REGIONS:
        tables = [q['id'] for q in main_q if q['place'] == place and int(q['id']) <= 120]
        encore = [q['id'] for q in main_q if q['place'] == place and int(q['id']) > 120]
        assert len(tables) == 15, (place, len(tables))
        regions.append({'place': place, 'name': name, 'line': line, 'tables': tables, 'encore': encore})

    # the locked recipes that are whole: more than a lone card, and a price like the real recipes' of that rarity
    rarity = {c['id']: c['rarity'] for c in data['cards']}
    def whole(r):
        lone = len(r['needs']) == 1 and r['needs'][0][1] == 1
        return not lone and not (rarity[r['card']] >= 4 and r['cost'] <= 100)
    locked = lambda u: sorted([r for r in data['recipes'] if r['unlock'] == u and whole(r)], key=lambda r: (rarity[r['card']], r['cost'], r['card']))
    first, second = locked('666'), locked('9999')
    assert len(first) == 16 and len(second) == 7, (len(first), len(second))
    clear = {str(k + 1): {'recipes': [r['card'] for r in first[2 * k:2 * k + 2]]} for k in range(8)}
    glazed = {str(k + 1): {'card': card[GLAZED_CARDS[k]]['id'], 'recipes': [second[k - 1]['card']] if k >= 1 else []} for k in range(8)}

    awarded = {q['heroAwarded'] for q in data['quests'] if q['heroAwarded']}
    sits = {q['hero'] for q in data['quests']}
    starter = 'maple'
    hidden = [hero[s]['id'] for s in ('Leader_VDayIceKing', 'Leader_Fionna', 'Leader_Cake')]
    recruit = [l['id'] for l in data['leaders'] if l['id'] in sits and l['id'] not in awarded and l['id'] != starter]
    never = [l['id'] for l in data['leaders'] if l['id'] not in sits and l['id'] not in awarded and l['id'] != starter and l['id'] not in hidden]
    assert len(recruit) == 34 and len(never) == 9, (len(recruit), len(never))
    stars = [{'at': STAR_STEP * (i + 1), 'hero': h} for i, h in enumerate(never)]

    out = {'regions': regions, 'encore': {'opensAfter': '15', 'first': '8001'},
           'milestones': {'clear': clear, 'glazed': glazed, 'stars': stars}, 'recruit': recruit, 'hidden': hidden}
    path = os.path.join(HERE, 'content', 'campaign.json')
    with open(path, 'w') as f: json.dump(out, f, ensure_ascii=False, indent=1)
    print(f'{len(regions)} regions, encore of {sum(len(r["encore"]) for r in regions)} tables, {len(recruit)} heroes to win over, {len(stars)} at star milestones -> {os.path.relpath(path)}')


if __name__ == '__main__':
    main()
