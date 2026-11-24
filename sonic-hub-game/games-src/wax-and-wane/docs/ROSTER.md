# Who plays whom

Every opponent of the campaign, place by place: her rating, the points at which she sits down with a player, the bot
she plays as (a file in `bots/` and a level in it), and the model that wrote that bot. The ratings are the
league's (`arena/ratings.json`, written from every game in `arena/league.json`).

This page is written by `npm run build` from `content/campaign.json` and `arena/ratings.json`. To change who sits
where, what she is called or which bot she plays as, change the campaign and build again.

## 1. Sea of Nectar

Open from the start. Orchards come down to the water here and the air is sweet all year. Everyone who crosses the Moon sets out from this shore, and nobody on it is in a hurry to beat you.

| Opponent | Rating | Opens at | Bot | Level | Written by |
|---|---|---|---|---|---|
| Posy, fruit picker | 600 | the start | `bots/house.js` | new | Claude Fable 5.2 |
| Dot, beekeeper, retired | 619 | the start | `bots/random.js` | random | Claude Fable 5.2 |
| Greta, jam maker | 738 | the start | `bots/greedy.js` | greedy | Claude Fable 5.2 |
| Wren, orchard hand | 759 | the start | `bots/soi-trang.js` | Easy | GPT-6 Luna Max |
| Sabine, cider maker | 1085 | 885 points | `bots/crescent-easy.js` | easy | Claude Fable 5.2 Max |
| Honora, keeps the orchard | 1271 | 1070 points | `bots/house.js` | quarter | Claude Fable 5.2 |

## 2. Sea of Tranquility

Opens at 615 points. Flat water, a long pier, and lamps that are lit before it is dark. Nobody hurries here. They let you make the first mistake, and are in no rush to point it out.

| Opponent | Rating | Opens at | Bot | Level | Written by |
|---|---|---|---|---|---|
| Pippa, ferry deckhand | 815 | 615 points | `bots/trang-ram-grok.js` | Easy | Grok |
| Tilde, postwoman | 828 | 630 points | `bots/thuong-huyen.js` | L1 | Claude Haiku 5.5 |
| Noor, runs the pier café | 851 | 650 points | `bots/trang-ram-sonnet.js` | Easy | Claude Sonnet 5.5 |
| Coral, fishmonger | 873 | 675 points | `bots/trang-khuyet.js` | Easy | GPT-6.2 Astra Max |
| Ines, librarian | 1137 | 935 points | `bots/trang-ram-sonnet.js` | Medium | Claude Sonnet 5.5 |
| Marguerite, harbour master | 1431 | 1230 points | `bots/trang-ram-sonnet.js` | Hard | Claude Sonnet 5.5 |

## 3. Lake of Dreams

Opens at 765 points. Mist on the water, and lights that drift across it all night. People here play the game they dreamed, and some of them dream very well.

| Opponent | Rating | Opens at | Bot | Level | Written by |
|---|---|---|---|---|---|
| Luz, lamplighter | 966 | 765 points | `bots/am-duong.js` | Easy | Claude Opus 5.5 |
| Fern, rows the night ferry | 992 | 790 points | `bots/house.js` | crescent | Claude Fable 5.2 |
| Odile, innkeeper | 1103 | 905 points | `bots/trang-khuyet.js` | Medium | GPT-6.2 Astra Max |
| Yara, harpist | 1250 | 1050 points | `bots/trang-ram-grok.js` | Medium | Grok |
| Celestine, astronomer | 1440 | 1240 points | `bots/house.js` | gibbous | Claude Fable 5.2 |
| Isolde, warden of the lake | 1603 | 1405 points | `bots/moonwarden.js` | Moonwarden | GPT-6 Luna Max |

## 4. Sea of Cold

Opens at 870 points. Ice on the water and green fire in the sky. Up here nobody moves until it is worth moving, and they have all winter.

| Opponent | Rating | Opens at | Bot | Level | Written by |
|---|---|---|---|---|---|
| Tove, ice cutter | 1072 | 870 points | `bots/thuong-huyen.js` | L2 | Claude Haiku 5.5 |
| Kiri, sled driver | 1246 | 1045 points | `bots/thuong-huyen.js` | L3 | Claude Haiku 5.5 |
| Marit, weather watcher | 1288 | 1090 points | `bots/crescent-medium.js` | medium | Claude Fable 5.2 Max |
| Anouk, mapmaker | 1292 | 1090 points | `bots/am-duong.js` | Medium | Claude Opus 5.5 |
| Zofia, icebreaker captain | 1530 | 1330 points | `bots/trang-khuyet.js` | Hard | GPT-6.2 Astra Max |
| Solveig, keeper of the north light | 1707 | 1505 points | `bots/house.js` | full | Claude Fable 5.2 |

## 5. Sea of Clouds

Opens at 1035 points. A sea of cloud with the peaks standing out of it like islands. From up here they see the whole board at once, and they will tell you so.

| Opponent | Rating | Opens at | Bot | Level | Written by |
|---|---|---|---|---|---|
| Juno, kite maker | 1234 | 1035 points | `bots/soi-trang.js` | Medium | GPT-6 Luna Max |
| Amara, balloon pilot | 1511 | 1310 points | `bots/thuong-huyen.js` | L4 | Claude Haiku 5.5 |
| Talia, glider pilot | 1574 | 1375 points | `bots/trang-ram-grok.js` | Hard | Grok |
| Leontine, forecaster | 1757 | 1555 points | `bots/trang-ram-sonnet.js` | Expert | Claude Sonnet 5.5 |
| Petra, surveyor of the peaks | 1894 | 1695 points | `bots/positional.js` | Tournament | GPT-6.2 Astra Max |

## 6. Sea of Showers

Opens at 1150 points. Stars fall here every night, and somebody counts every one. They will count your discs the same way, and they do not lose count.

| Opponent | Rating | Opens at | Bot | Level | Written by |
|---|---|---|---|---|---|
| Mei, counts the falling stars | 1352 | 1150 points | `bots/soi-trang.js` | Hard | GPT-6 Luna Max |
| Ingrid, clockmaker | 1690 | 1490 points | `bots/thuong-huyen.js` | L5 | Claude Haiku 5.5 |
| Dalia, smith of star iron | 1828 | 1630 points | `bots/am-duong.js` | Hard | Claude Opus 5.5 |
| Keiko, telescope maker | 1851 | 1650 points | `bots/trang-ram-grok.js` | Expert | Grok |
| Octavia, master of the observatory | 2045 | 1845 points | `bots/crescent-master.js` | master | Claude Fable 5.2 Max |

## 7. Bay of Rainbows

Opens at 1285 points. A bay that stands under seven colours whenever the rain has passed. The finest glass on the Moon is cut here, and the people who cut it do not leave rough edges.

| Opponent | Rating | Opens at | Bot | Level | Written by |
|---|---|---|---|---|---|
| Esme, glassblower | 1487 | 1285 points | `bots/crescent-hard.js` | hard | Claude Fable 5.2 Max |
| Farah, dyer | 1844 | 1645 points | `bots/da-trieu.js` | Maximum | GPT-6.1 Terra Max |
| Paloma, prism cutter | 1955 | 1755 points | `bots/trang-ram-grok.js` | Master | Grok |
| Imani, lens grinder | 2056 | 1855 points | `bots/am-duong.js` | Expert | Claude Opus 5.5 |
| Aurelia, mistress of the glassworks | 2173 | 1975 points | `bots/soc-vong.js` | Max | GPT-6.2 Astra Max |

## 8. Ocean of Storms

Opens at 1465 points. The far side of the map, where the weather never lifts. Whoever plays out here stopped making mistakes a long time ago.

| Opponent | Rating | Opens at | Bot | Level | Written by |
|---|---|---|---|---|---|
| Maren, storm pilot | 1663 | 1465 points | `bots/crescent-expert.js` | expert | Claude Fable 5.2 Max |
| Vesper, deep-sea captain | 2037 | 1835 points | `bots/trieu-ngan.js` | max | GPT-6.2 Sol Max |
| Cordelia, reads the barometers | 2155 | 1955 points | `bots/trang-ram-sonnet.js` | Master | Claude Sonnet 5.5 |
| Soraya, admiral of the storm fleet | 2201 | 2000 points | `bots/am-duong.js` | Master | Claude Opus 5.5 |
| Selene, keeper of the last light | 2372 | 2170 points | `bots/eclipse.js` | max | Claude Fable 5.2 Max |
