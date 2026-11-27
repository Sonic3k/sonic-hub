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
  hidden     heroes of the holidays, who are not in the album

The roads around the campaign, as the original has them, with what an offline game puts in place of the online
parts:

  mirror     Mirrorside, the original's second campaign: its tables by region, as its map has them (the bonus
             tables where their regions are), opening once the main road's second region is cleared, with its two
             heroes given at the glass; a mirror table is played with a hero of the mirror, as the original asks
  goldie     the treasure thief who sits at a Mirrorside table once five battles there have passed (the original
             had her wait half a day), at a table of its map chosen by chance, and moves on if left five more
  velvet     the masked brawler who may step in when a Mirrorside table is chosen, round by round, by the
             original's battles needed and chance; her last round won brings her gold-masked form
  cellars    the original's daily dungeons, every day open, from a hero of rank 5, named for what they hold
  ladder     the tournaments, played against the land's own decks: from 999th to first in a cup, its prizes on
             the way; a cup for each different pair of first and tenth prizes the original's table has
  commissions  the side quests not tied to a holiday: their pieces found when her creatures fall
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
MIRROR = [   # each region of Mirrorside, the main region whose window it reflects, its tables (as the original's
             # map groups them, by their numbers) and the bonus table that sits in it
    ('Quicksilver Orchard', 'Every tree here grows toward its own reflection.', 0, (5001, 5007), ['5041']),
    ('The Silvered Hollows', 'Caverns where the crystal shows everything the other way round.', 4, (5008, 5019), ['5042']),
    ('Silverspun Street', 'Sugar and silver, and every shop sign reads backwards.', 2, (5020, 5027), []),
    ('Looking-Glass Heights', 'Snow that falls upward, and a throne of frozen mirror.', 5, (5028, 5040), ['5043']),
    ('Lilac Meadow', 'A meadow behind the glass, where the long road splits in two.', 1, (5044, 5061), []),
]
CELLARS = {   # the daily dungeons, by what they keep
    'Monday Dungeon': ('Cobalt Cellar', 'Blue glass stacked to the vaults, and the woman who keeps it.'),
    'Tuesday Dungeon': ('Amber Cellar', 'Sheets of amber laid down like old harvests.'),
    'Wednesday Dungeon': ('Fen Cellar', 'Green bottle-glass, cool and dripping.'),
    'Thursday Dungeon': ('Cranberry Cellar', 'Rose and ruby panes wrapped in straw.'),
    'Friday Dungeon': ('Dune Cellar', 'Sand and cullet waiting for the furnace.'),
    'Saturday Dungeon': ('The Gilt Cellar', 'Where the workshop keeps its gold: twice the reward of the others.'),
    'Sunday Dungeon': ('The Silver Cellar', 'Where the workshop keeps its silver: twice the reward of the others.'),
}
CUPS = ['Cathedral', 'Opalescent', 'Flashed', 'Streaky', 'Seedy', 'Ripple', 'Crackle', 'Dichroic', 'Antique', 'Cast', 'Fused', 'Slumped', 'Etched', 'Bevelled']
RUNGS = [999, 640, 420, 270, 170, 110, 75, 50, 35, 25, 16, 10, 6, 3, 1]
COMMISSIONS = {   # the side quests' words: what they are called, a piece and pieces, what is asked
    '4': ('Cullet for the furnace', ['shard of cullet', 'shards of cullet'], 'The furnace wants cullet, the broken glass that melts the new. Her creatures leave a shard of it when they fall.'),
    '5': ('Gold for the ruby', ['leaf of gold', 'leaves of gold'], 'A ruby glass needs a little gold in the melt. Her creatures carry a leaf of it now and then.'),
    '1': ('Four silver tesserae', ['silver tessera', 'silver tesserae'], 'A mosaic on the far side of the glass is missing four pieces, one at each of four tables.'),
    '2': ('The quicksilver backing', ['drop of quicksilver', 'drops of quicksilver'], 'A great mirror needs its backing renewed, drop by drop.'),
    '3': ('The mirror mended', ['silvered shard', 'silvered shards'], 'The great mirror itself is cracked. Its shards are scattered across Mirrorside.'),
}


def main():
    data = json.load(open(os.path.join(HERE, 'content', 'data.json')))
    card = {c['src']: c for c in data['cards']}
    QUEST = {q['id']: q for q in data['quests']}
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
    assert len(recruit) == 34 and len(never) == 9, (len(recruit), len(never))   # before the brawler's gold mask is set apart below
    stars = [{'at': STAR_STEP * (i + 1), 'hero': h} for i, h in enumerate(never)]

    # Mirrorside: its tables as its map holds them; the two heroes the glass gives; the first card it gives
    fc = [q for q in data['quests'] if q['type'] == 'fc']
    placed = set()
    mirror_regions = []
    for name, line, reflects, (first, last), bonus in MIRROR:
        tables = [q['id'] for q in fc if first <= int(q['id']) <= last]
        assert all(QUEST[b]['label'] == 'bonus' for b in bonus) and not any(QUEST[t]['label'] == 'bonus' for t in tables), name
        placed.update(tables + bonus)
        mirror_regions.append({'name': name, 'line': line, 'reflects': reflects, 'tables': tables, 'bonus': bonus})
    assert placed == {q['id'] for q in fc}, sorted({q['id'] for q in fc} - placed)
    mirror = {'opensAfter': '30', 'first': '5001', 'regions': mirror_regions, 'heroes': [hero['Leader_Fionna']['id'], hero['Leader_Cake']['id']],
              'firstCard': data['params']['FC_CardReward_FirstTime']}
    hidden = [h for h in hidden if h not in mirror['heroes']]
    never = [h for h in never]
    # the treasure thief and the masked brawler both come once Mirrorside's second boss falls (it opens their tables)
    opener = next(q['id'] for q in fc if any(u.startswith('6001') or ',6001' in u.replace(' ', '') for u in q['unlocks']))
    goldie = {'opensAfter': opener, 'every': int(data['params']['BonusQuest_matchlapse_FC']), 'first': data['params']['BonusQuest_firstquest_FC'],
              'tables': [q['id'] for q in data['quests'] if q['type'] == 'tcat' and any(q['id'] in u.replace(' ', '').split(',') for t in data['quests'] for u in t['unlocks'])],
              'hoard': 'goldie-hoard'}
    velvet = {'opensAfter': opener, 'lastForm': hero['Leader_ElFistoA']['id']}
    recruit = [h for h in recruit if h != velvet['lastForm']]
    cellars = [dict(c, name=CELLARS[c['src']][0], line=CELLARS[c['src']][1]) for c in data['cellars']]
    ladder = {'opensAfter': '15', 'rungs': RUNGS, 'cups': [{'name': f'The {n} Cup', 'prizes': c['prizes']} for n, c in zip(CUPS, data['cups'])]}
    commissions = [dict(x, name=COMMISSIONS[x['id']][0], piece=COMMISSIONS[x['id']][1][0], pieces=COMMISSIONS[x['id']][1][1], line=COMMISSIONS[x['id']][2]) for x in data['side']]

    out = {'regions': regions, 'encore': {'opensAfter': '15', 'first': '8001'},
           'milestones': {'clear': clear, 'glazed': glazed, 'stars': stars}, 'recruit': recruit, 'hidden': hidden,
           'mirror': mirror, 'goldie': goldie, 'velvet': velvet, 'cellars': cellars, 'ladder': ladder, 'commissions': commissions,
           'rivals': [[hero['Leader_Jake']['cast'], hero['Leader_BMO']['cast']]]}
    path = os.path.join(HERE, 'content', 'campaign.json')
    with open(path, 'w') as f: json.dump(out, f, ensure_ascii=False, indent=1)
    print(f'{len(regions)} regions, encore of {sum(len(r["encore"]) for r in regions)} tables, {len(recruit)} heroes to win over, {len(stars)} at star milestones; '
          f'Mirrorside {len(mirror_regions)} regions, {len(goldie["tables"])} treasure tables, {len(cellars)} cellars, {len(ladder["cups"])} cups, {len(commissions)} commissions -> {os.path.relpath(path)}')


if __name__ == '__main__':
    main()
