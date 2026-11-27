/* What goes into each officer's portrait prompt (tools/avatar-prompts.js puts the prompts together).

   The portraits are drawn, not photographed: gouache poster work, the kin of the chart and of the views at the
   stations (flat shapes, evening light), which sits well on the cream and brass of the cards and still reads when a
   face is a token a few millimetres across.

   Every prompt has the same parts in the same order, and the shot is named before the framing. SHOT, FRAMING, STYLE
   and AVOID are the same words in every prompt, so the set comes out as one hand; change them here and write the
   prompts again. The framing is the game's: a portrait is cut to its frame from a little below the top, and a face
   token is the middle of the upper half, so the eyes go on the upper third, the chin at mid-height, and the cap
   stays inside the picture. A picture taller than 3:4 loses its lower part in the wide frames; a wider one loses
   its sides in the tall ones.

   Her uniform, cap and backdrop colours are taken from her entry in the campaign (look, tone), which the stand-in
   portraits are drawn from too: the picture that replaces a stand-in wears what the stand-in wore. */
const SHOT = 'Bust portrait (head and shoulders), straight-on at eye level.';
const FRAMING = 'Vertical 3:4. One woman only, centred, shoulders square to the viewer, head turned at most slightly. Eyes on the upper-third line, chin at mid-height. Hair and cap wholly inside the frame with a little space above. Both shoulders in frame, running out at the bottom corners.';
const STYLE = 'Hand-painted gouache poster illustration, in the manner of mid-century travel and naval recruitment posters. Flat shapes of opaque colour with crisp cut-paper edges, two or three tones to each form, a few confident dark brush lines for eyes, brows and mouth, light paper grain. Semi-realistic adult proportions and an individual, readable face; elegant, not cartoonish. Soft warm light from the left. Palette close to deep navy, sea teal, cream, brass yellow and signal red, plus her backdrop colours.';
const AVOID = 'photograph, photorealism, 3D render, anime, chibi, glossy airbrush, any text, letters, numbers or watermark, picture frame or border, hands, weapons, a second person.';

/* by the coat of her service (look[4]) */
const COAT = {
  navy: 'Dark navy-blue naval uniform jacket with brass-gold lapel facings, cream shirt.',
  air: 'Slate-blue air force jacket with pale blue-grey lapel facings, pale blue shirt.',
  army: 'Olive-green army jacket with red collar facings, khaki shirt.',
  fort: 'Charcoal-grey coast artillery jacket with red collar facings, light grey shirt.',
  staff: 'Dark bottle-green Staff College jacket with brass-gold lapel facings, cream shirt.',
  general: 'Dark forest-green general’s jacket with brass-gold collar facings, cream shirt.',
  white: 'White dress-uniform jacket with brass-gold lapel facings over a navy shirt.',
};
/* by her cap (look[3]); an army cap takes the colour of the jacket it is worn with */
const CAP = {
  navy: 'Naval peaked cap with a white top, a navy band and a small gold badge.',
  air: 'Slate-blue peaked cap with a small gold badge.',
  army: 'Peaked cap in the colour of her jacket with a small gold badge.',
  beret: 'Beret a shade darker than her jacket, pulled to one side, with a small brass badge.',
  side: 'Slate-blue side cap worn at a slight tilt.',
  '': 'No cap.',
};
const BOARDS = 'Gold-braided shoulder boards.';

/* who: what she looks like. extra: something of her own that she wears. mood: her face.
   back: the two colours of her backdrop in words (their values come from her tone), and the one thing seen in it. */
const WHO = {
  pia: { who: 'Swedish. Fair, lightly freckled skin, grey-blue eyes, a sandy-blonde chin-length bob with a few strands out of place.',
    extra: 'A small signal-flag pin on the lapel.', mood: 'A wide, eager grin with raised eyebrows, as if just caught doing something well-meant.',
    back: ['warm amber', 'coral orange', 'a string of signal flags'] },
  sol: { who: 'Latina. Sun-browned skin, dark brown eyes, loose dark-brown curls to the shoulders.',
    extra: 'The top button undone.', mood: 'A relaxed, confident half-smile, one eyebrow raised, chin a little lifted.',
    back: ['sunset orange', 'deep crimson', 'a ship’s mast and rigging'] },
  hana: { who: 'Japanese-French. Light skin, dark eyes, long straight black hair worn loose behind her shoulders.',
    mood: 'Cool and level, lips closed, one eyebrow a fraction raised; she is assessing the viewer.',
    back: ['pale teal', 'deep sea blue', 'the low wall of a gun battery'] },
  nadia: { who: 'Iranian. Light olive skin, large dark eyes, glossy black wavy hair to the shoulders.',
    extra: 'The cap sits at a slightly rakish angle.', mood: 'A bold, amused smile, head tilted a little, entirely sure of herself.',
    back: ['bright amber', 'deep red', 'the bow of a fast destroyer'] },
  isolde: { who: 'Hungarian. Fair skin with fine lines at the eyes, grey-green eyes, auburn hair pinned up in a neat roll below her cap.',
    mood: 'Composed and unhurried, the faintest knowing smile.',
    back: ['soft lilac', 'deep violet', 'a tall window with many panes'] },
  yuna: { who: 'Japanese. Light skin, bright dark eyes, straight black hair cut to the chin with a full fringe.',
    mood: 'Bright and determined, a small eager smile, leaning very slightly forward.',
    back: ['pale sky blue', 'clear mid blue', 'one small training plane climbing'] },
  maeve: { who: 'Irish. Fair, freckled skin, green eyes, copper-red curls tied back with loose strands escaping; a faint smudge of oil on one cheek.',
    mood: 'Dry and unimpressed, a one-sided half-smile.',
    back: ['light sky blue', 'steel blue', 'the curve of a hangar roof'] },
  leilani: { who: 'Native Hawaiian. Warm brown skin, dark brown eyes, long black wavy hair over one shoulder; one small white flower tucked behind an ear.',
    mood: 'Calm and warm, an easy open smile.',
    back: ['aqua', 'ocean blue', 'long thin bands of high cloud'] },
  defne: { who: 'Turkish. Light olive skin, hazel eyes, strong dark brows, dark brown hair in a low pinned chignon below her cap.',
    mood: 'Sharp and appraising, a slight closed-lip smile; the look of someone grading a landing.',
    back: ['pale blue', 'deep royal blue', 'a control tower'] },
  ligaya: { who: 'Filipina. Light brown skin, dark eyes, black hair in a high ponytail.',
    extra: 'The jacket is a size too big for her.', mood: 'A big open grin, a little breathless, delighted to be allowed to play.',
    back: ['spring green', 'leaf green', 'the tops of pine trees'] },
  thandiwe: { who: 'Swazi. Deep brown skin, dark eyes, natural hair cropped very short, strong cheekbones.',
    extra: 'Collar and buttons immaculate.', mood: 'Stern and steady, chin up, lips closed, a hint of pride at the corners of her mouth.',
    back: ['soft green', 'deep green', 'a flagpole on a parade ground'] },
  dandara: { who: 'Afro-Brazilian. Medium brown skin, dark eyes, long black locs gathered at the nape below her beret.',
    mood: 'Watchful and quiet, a slight half-smile, eyes a little narrowed as if she has already counted you.',
    back: ['wheat yellow', 'moss green', 'pine trunks in morning mist'] },
  morag: { who: 'Scottish. Fair, weathered skin with deep laugh lines, pale blue eyes, silver-white hair in a tight bun; round steel-rimmed spectacles.',
    extra: 'A row of medal ribbons on the chest.', mood: 'Dry and unbending, a thin smile with a glint behind the spectacles.',
    back: ['sage green', 'dark pine green', 'old pines and a brick gatehouse'] },
  efua: { who: 'Ghanaian, one of three sisters who share high rounded cheekbones and wide-set dark eyes. Dark brown skin, a round natural afro; a pencil tucked behind one ear.',
    mood: 'Earnest and a little anxious, a careful small smile, as if still counting.',
    back: ['golden yellow', 'warm orange', 'a lighthouse beam crossing the sky'] },
  adjoa: { who: 'Ghanaian, one of three sisters who share high rounded cheekbones and wide-set dark eyes. Dark brown skin, hair in a high bun.',
    extra: 'A red pen clipped in the breast pocket.', mood: 'Sceptical and amused, one corner of the mouth up; the look of someone marking your work.',
    back: ['pale gold', 'amber brown', 'a distant lighthouse on its headland'] },
  abena: { who: 'Ghanaian, one of three sisters who share high rounded cheekbones and wide-set dark eyes. Deep brown skin, hair in a smooth low updo.',
    mood: 'Serene and unreadable, perfectly still, a closed-lip smile that gives nothing away.',
    back: ['golden yellow', 'burnt sienna', 'a quiet college colonnade'] },
  vidya: { who: 'Tamil. Brown skin, dark eyes, black hair streaked with grey in a low bun below her cap; thin gold-rimmed reading glasses.',
    mood: 'Calm and measuring, a faint patient smile.',
    back: ['periwinkle', 'deep indigo', 'the tall arched windows of a library'] },
  greta: { who: 'German. Fair, rosy skin, blue eyes, blonde hair in one thick braid over her shoulder.',
    extra: 'A pencil stub and a folding rule in the breast pocket.', mood: 'Cheerful and proud, a broad closed-lip smile, pleased with something she has built.',
    back: ['peach', 'dusky rose', 'the angled stone wall of a star fort'] },
  arevik: { who: 'Armenian. Light olive skin, dark eyes under strong dark brows, long straight black hair tied back at the nape.',
    mood: 'Intent and decisive, lips set, eyes fixed straight on the viewer.',
    back: ['apricot', 'wine red', 'a signal mast with pennants'] },
  wanjiru: { who: 'Kenyan. Deep brown skin, calm dark eyes, hair cropped close below her beret.',
    mood: 'Patient and far-seeing, a slight calm smile, completely unhurried.',
    back: ['dusty pink', 'plum purple', 'the first stars over a parapet'] },
  citlali: { who: 'Mexican, of Nahua descent. Bronze-brown skin, dark eyes, black hair in one long braid over her shoulder.',
    mood: 'Commanding and direct, chin level, the trace of a smile that says the timing is already settled.',
    back: ['lavender', 'deep violet-blue', 'one bright star above the muzzle of a great gun'] },
  june: { who: 'English. Light skin, brown eyes, a neat chestnut-brown bob tucked behind one ear.',
    extra: 'A gold aide’s cord looped at the right shoulder.', mood: 'Bright and eager, a quick confident smile, a touch too sure of herself.',
    back: ['pale gold', 'warm ochre', 'a sunlit colonnade'] },
  aroha: { who: 'Māori. Warm brown skin, dark eyes creased with laughter, dark brown wavy hair to the shoulders.',
    mood: 'A big generous laugh just ending, head slightly back, entirely at ease.',
    back: ['coral', 'deep crimson', 'the masts of a line of warships'] },
  hong: { who: 'Vietnamese. Light skin, dark eyes, black hair with a few silver threads in a neat low bun below her cap.',
    mood: 'A gentle, courteous smile with very sharp eyes.',
    back: ['soft blue', 'deep navy blue', 'a single spray of orchids'] },
  vasilisa: { who: 'Russian. Pale skin, pale grey eyes, silver hair braided and pinned in a crown, seen below her cap.',
    mood: 'Completely still, no smile, a level, piercing gaze.',
    back: ['deep blue', 'midnight navy', 'a few falling snowflakes'] },
};
module.exports = { SHOT, FRAMING, STYLE, AVOID, COAT, CAP, BOARDS, WHO };
