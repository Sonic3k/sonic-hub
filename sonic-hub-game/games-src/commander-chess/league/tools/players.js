// who plays in the league: the 14 bots that were handed in (a bot with levels: one player for each level) and the game's own five
const one = (key, file, id, ai, by, levelName) => ({ key, file: 'bots/' + file, id, level: 1, ai, by, levelName: levelName || 'one level' });
const three = (id, file, ai, by) => ['Easy', 'Medium', 'Hard'].map((n, i) => ({ key: id + ':' + n, file: 'bots/' + file, id, level: i + 1, ai, by, levelName: n }));
const FABLE = 'Claude Fable 5.2', HOUSE = 'Claude Fable 5.2 (the game)';
module.exports = [
  one('sol-commander', 'sol-commander.js', 'sol-commander', 'Sol Commander', 'GPT-6.1 Sol Max'),
  one('titan-commander', 'titan-commander.js', 'titan-commander', 'Titan Commander', 'GPT-6.1 Terra Max'),
  one('astra-commander', 'astra-commander.js', 'astra-commander', 'Astra Commander Max', 'GPT-6 Astra Max'),
  one('lac-hong', 'lac-hong.js', 'lac-hong', 'Lạc Hồng', 'GPT-6.2 Astra Max'),
  one('iron-commander', 'iron-commander.js', 'iron-commander', 'Bastion', 'GPT-6 Luna Max'),
  ...three('dai-bang', 'dai-bang.js', 'Đại Bàng', 'Claude Opus 5.5'),
  one('quan-su', 'quan-su.js', 'quan-su', 'Quân Sư', 'Claude Sonnet 5.5'),
  ...three('tham-muu', 'tham-muu.js', 'Tham Mưu', 'Grok'),
  one('than-co', 'than-co.js', 'than-co', 'Thần Cơ', FABLE),
  one('lao-tuong', 'lao-tuong.js', 'lao-tuong', 'Lão Tướng', FABLE),
  one('trinh-sat', 'trinh-sat.js', 'trinh-sat', 'Trinh Sát', FABLE),
  one('du-kich', 'du-kich.js', 'du-kich', 'Du Kích', FABLE),
  one('luc-quan', 'luc-quan.js', 'luc-quan', 'Lục Quân', FABLE),
  one('tan-binh', 'tan-binh.js', 'tan-binh', 'Tân Binh', FABLE),
  one('house:Isolde', 'house.js', 'house-isolde', 'House', HOUSE, 'Isolde (hardest)'),
  one('house:Nadia', 'house.js', 'house-nadia', 'House', HOUSE, 'Nadia (hard)'),
  one('house:Hana', 'house.js', 'house-hana', 'House', HOUSE, 'Hana (moderate)'),
  one('house:Marisol', 'house.js', 'house-sol', 'House', HOUSE, 'Marisol (easy)'),
  one('house:Pia', 'house.js', 'house-pia', 'House', HOUSE, 'Pia (easiest)'),
];
