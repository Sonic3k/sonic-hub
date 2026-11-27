/* The chests (GachaManager): a normal one for coins, a premium one for Jewels, each giving one card by the
   original's weights; the first premium chest is free, as the original's first lesson gave one. */

const Chests = (() => {
  const S = () => Me.data;
  const ABOUT = {
    normal: 'Standard cards of every rarity, the common ones most often.',
    premium: 'The rarest standard cards, and Gilded ones among them.',
  };
  function show() {
    Screens.show('chests'); purse();
    const s = S(), box = $('#chests-body'); box.innerHTML = '';
    for (const kind of ['normal', 'premium']) {
      const price = chestPrice(s, kind), why = chestBlock(s, kind);
      const cost = price.coins ? [h('i.coin'), ' ' + fmt(price.coins)] : price.jewels ? [h('i.gem'), ' ' + price.jewels] : ['Free, this once'];
      box.append(h('div.chest', h('div.art', Pictures.img('chest', kind)), h('h3', kind === 'normal' ? 'Normal chest' : 'Premium chest'), h('p', ABOUT[kind]),
        h('div.row', { style: { justifyContent: 'center' } }, h('button.jewel' + (kind === 'premium' ? '.blue' : '.go'), { disabled: !!why, title: why, onclick: () => openIt(kind) }, 'Open · ', ...cost)),
        why ? h('p.note', why) : ''));
    }
    box.append(h('p.note', { style: { gridColumn: '1 / -1', textAlign: 'center' } }, 'Coins come from every win and from selling cards you have to spare; Jewels from the third star of a table.'));
  }
  async function openIt(kind) {
    const s = S(), id = openChest(s, kind);
    if (!id) return;
    Me.write(); purse();
    const stage = $('#opening-stage'), pop = $('#opening'); stage.innerHTML = '';
    stage.append(h('div.art', Pictures.img('chest', kind))); pop.classList.add('on');
    await sleep(1000);
    document.body.append(h('div.burst')); setTimeout(() => $$('.burst').forEach(b => b.remove()), 800);
    stage.innerHTML = '';
    const again = chestBlock(s, kind);
    stage.append(cardEl(ROW[id]), h('div', { style: { color: '#fff6e4', font: '400 22px var(--title)', textShadow: '0 2px 6px #000' } }, ownCount(s, id) === 1 ? 'New to your collection' : `You now have ${ownCount(s, id)}`),
      h('div.row', { style: { justifyContent: 'center' } }, h('button.jewel.quiet', { onclick: () => { pop.classList.remove('on'); show(); } }, 'Close'),
        h('button.jewel.go', { disabled: !!again, title: again, onclick: () => openIt(kind) }, 'Open another')));
  }
  return { show };
})();
