/* ── Rules data: ages, units, buildings, techs, age cards, civilizations, the map ── */
const MAX_TURNS = 40;
const RELIC_WIN = 10, WONDER_HOLD = 4, CAP_HP = 120, WALL_HP = 80;
const RES = ['food', 'wood', 'gold'];
const RES_NAME = { food: 'Lương thực', wood: 'Gỗ', gold: 'Vàng' };
const SEASONS = ['Xuân', 'Hạ', 'Thu', 'Đông'];
const AGES = [null,
  { name: 'Đời 1', title: 'Thời Bóng Tối', cap: 20, prod: 2, builds: 1 },
  { name: 'Đời 2', title: 'Thời Phong Kiến', cap: 35, prod: 2, builds: 1, cost: { food: 350 } },
  { name: 'Đời 3', title: 'Thời Lâu Đài', cap: 55, prod: 3, builds: 2, cost: { food: 550, gold: 250 } },
  { name: 'Đời 4', title: 'Thời Đế Quốc', cap: 75, prod: 4, builds: 2, cost: { food: 800, gold: 600 } },
];
const GATHER = { food: 8, wood: 8, gold: 7 };
const VILL_COST = { food: 25 };

/* cls drives the counter table; vs on a unit overrides its row */
const UNITS = {
  spear:  { name: 'Giáo binh', str: 3, cost: { food: 20, wood: 15 }, age: 1, bld: 'barracks', kill: 0.5, cls: 'inf', desc: 'Rẻ, khắc chế kỵ binh. Yếu trước cung thủ.' },
  archer: { name: 'Cung thủ', str: 3.5, cost: { wood: 20, gold: 25 }, age: 2, bld: 'range', kill: 0.7, cls: 'rng', desc: 'Bắn hạ bộ binh. Bị kỵ binh xé nát.' },
  cav:    { name: 'Kỵ binh', str: 5.5, cost: { food: 45, gold: 35 }, age: 2, bld: 'stable', kill: 1.2, cls: 'cav', move: 2, desc: 'Đi 2 vùng một lượt, giỏi cướp dân và đánh cung thủ. Sợ giáo.' },
  siege:  { name: 'Xe công thành', str: 1.5, cost: { wood: 80, gold: 50 }, age: 3, bld: 'workshop', kill: 0.1, cls: 'sie', desc: 'Yếu ngoài trận, nhưng là thứ duy nhất phá nổi thành và lâu đài.' },
  thanhduc:  { name: 'Quân Thánh Dực', str: 5, cost: { food: 40, gold: 30 }, age: 3, bld: 'castle', kill: 0.6, cls: 'inf', vs: { rng: 1.1 }, civ: 'daiviet', desc: 'Cấm quân tinh nhuệ: chặn kỵ như giáo, chịu được tên.' },
  kyxa:      { name: 'Kỵ xạ', str: 4.6, cost: { wood: 30, gold: 40 }, age: 2, bld: 'stable', kill: 1.0, cls: 'hrc', move: 2, civ: 'mongol', desc: 'Vừa phi vừa bắn: đi 2 vùng, giáo binh khó bắt.' },
  catafract: { name: 'Kỵ binh giáp trụ', str: 6.5, cost: { food: 60, gold: 60 }, age: 3, bld: 'castle', kill: 1.0, cls: 'hcv', civ: 'byzantine', desc: 'Kỵ binh nặng chuyên phá đội hình bộ binh.' },
  paladin:   { name: 'Hiệp sĩ thánh chiến', str: 8, cost: { food: 70, gold: 60 }, age: 3, bld: 'castle', kill: 1.3, cls: 'cav', move: 2, civ: 'frank', desc: 'Kỵ binh mạnh nhất trận, vẫn sợ rừng giáo.' },
};
const UNIT_ORDER = ['spear', 'archer', 'cav', 'siege', 'thanhduc', 'kyxa', 'catafract', 'paladin'];
const VS = {
  inf: { inf: 1, rng: 0.7, cav: 2.4, sie: 1.4, hrc: 1.1, hcv: 1.6 },
  rng: { inf: 1.7, rng: 1, cav: 0.6, sie: 0.6, hrc: 0.9, hcv: 0.7 },
  cav: { inf: 0.5, rng: 2.1, cav: 1, sie: 2, hrc: 1.6, hcv: 0.9 },
  sie: { inf: 0.5, rng: 0.5, cav: 0.5, sie: 1, hrc: 0.4, hcv: 0.5 },
  hrc: { inf: 1.5, rng: 1.2, cav: 0.9, sie: 1.2, hrc: 1, hcv: 0.8 },
  hcv: { inf: 1.5, rng: 1.6, cav: 1.1, sie: 2, hrc: 1.2, hcv: 1 },
};
const MOUNTED = new Set(['cav', 'hrc', 'hcv']);

const BUILDINGS = {
  barracks: { name: 'Trại lính', cost: { wood: 75 }, age: 1, where: 'capital', max: 2, desc: 'Luyện giáo binh, 2 quân mỗi lượt.' },
  range:    { name: 'Trường bắn', cost: { wood: 100 }, age: 2, where: 'capital', max: 2, desc: 'Luyện cung thủ.' },
  stable:   { name: 'Chuồng ngựa', cost: { wood: 100 }, age: 2, where: 'capital', max: 2, desc: 'Luyện kỵ binh.' },
  workshop: { name: 'Xưởng công thành', cost: { wood: 150 }, age: 3, where: 'capital', max: 1, desc: 'Đóng xe công thành.' },
  walls:    { name: 'Tường thành', cost: { wood: 150 }, age: 2, where: 'capital', max: 1, desc: `Kinh thành thêm ${WALL_HP} độ bền, phòng thủ +30%; quân thường gần như không phá nổi tường.` },
  castle:   { name: 'Lâu đài', cost: { wood: 100, gold: 350 }, age: 3, where: 'own', max: 2, desc: 'Phòng thủ 25 cho vùng, luyện quân đặc biệt. Chỉ xe công thành mới đánh sập.' },
  tower:    { name: 'Tháp canh', cost: { wood: 60, gold: 30 }, age: 2, where: 'own', perRegion: 2, desc: 'Phòng thủ +7 cho vùng, bắn kẻ đi cướp.' },
  town:     { name: 'Thị trấn', cost: { wood: 200, gold: 100 }, age: 2, where: 'home', max: 2, desc: 'Luyện thêm 2 dân/lượt, +5 dân số tối đa, phòng thủ +8.' },
  wonder:   { name: 'Kỳ quan', cost: { wood: 900, gold: 900 }, age: 4, where: 'capital', max: 1, desc: `Xây 2 lượt. Đứng vững ${WONDER_HOLD} lượt sau khi xong là thắng.` },
};
const TECHS = {
  plow:  { name: 'Cày bừa', cost: { wood: 75 }, age: 2, desc: 'Lương thực +20%.', eff: { gather: { food: 0.2 } } },
  saw:   { name: 'Cưa xẻ', cost: { food: 75 }, age: 2, desc: 'Gỗ +20%.', eff: { gather: { wood: 0.2 } } },
  mine:  { name: 'Khai mỏ', cost: { food: 100, wood: 50 }, age: 2, desc: 'Vàng +20%.', eff: { gather: { gold: 0.2 } } },
  forge: { name: 'Rèn binh khí', cost: { food: 150, gold: 75 }, age: 2, desc: 'Mọi quân +12%.', eff: { str: 0.12 } },
  armor: { name: 'Giáp trụ', cost: { food: 250, gold: 150 }, age: 3, desc: 'Mọi quân +12%.', eff: { str: 0.12 } },
  wheel: { name: 'Xe cút kít', cost: { food: 200, wood: 100 }, age: 3, desc: 'Mọi nguồn lợi +15%.', eff: { gather: { food: 0.15, wood: 0.15, gold: 0.15 } } },
};
const CARDS = {
  tax:       { age: 2, name: 'Thuế ruộng', desc: 'Lương thực +15%.', eff: { gather: { food: 0.15 } } },
  levy:      { age: 2, name: 'Quân dịch', desc: 'Giáo binh và cung thủ rẻ hơn 25%.', eff: { cheap: { spear: 0.25, archer: 0.25 } } },
  spies:     { age: 2, name: 'Mạng lưới do thám', desc: 'Mỗi lượt do thám thêm 1 nơi; thấy rõ quân địch ở các vùng giáp ranh.', eff: { scouts: 1, sharp: 1 } },
  smith:     { age: 3, name: 'Lò rèn hoàng gia', desc: 'Mọi quân +10%.', eff: { str: 0.1 } },
  masonry:   { age: 3, name: 'Thành đá', desc: 'Tháp, lâu đài, tường thành mạnh thêm 50%.', eff: { fort: 0.5 } },
  academy:   { age: 3, name: 'Học viện', desc: 'Lên Đời 4 và nghiên cứu rẻ hơn 30%.', eff: { cheapRes: 0.3 } },
  wonders:   { age: 4, name: 'Công trình vĩ đại', desc: 'Kỳ quan rẻ hơn 30% và xây xong trong 1 lượt.', eff: { cheapWonder: 0.3, fastWonder: 1 } },
  imperial:  { age: 4, name: 'Quân đội đế quốc', desc: 'Mọi quân +15%; mỗi xưởng luyện thêm 1 quân/lượt.', eff: { str: 0.15, prod: 1 } },
  trebuchet: { age: 4, name: 'Máy bắn đá', desc: 'Xe công thành phá thành gấp đôi và mạnh thêm 50%.', eff: { trebuchet: 1 } },
  dv2: { age: 2, civ: 'daiviet', name: 'Ngụ binh ư nông', desc: 'Quân đóng ở đất nhà tự làm ruộng: mỗi quân +2 lương thực/lượt.', eff: { soldierFarm: 2 } },
  dv3: { age: 3, civ: 'daiviet', name: 'Hịch tướng sĩ', desc: 'Phòng thủ trên đất nhà +25%; dân trong kinh thành cùng giữ thành.', eff: { homeDef: 0.25, militia: 1 } },
  dv4: { age: 4, civ: 'daiviet', name: 'Hào khí Đông A', desc: 'Mọi quân +15%; mỗi lượt giữ Tu viện được 2 điểm thánh tích.', eff: { str: 0.15, relicX: 1 } },
  mg2: { age: 2, civ: 'mongol', name: 'Đại thảo nguyên', desc: 'Kỵ binh, kỵ xạ rẻ hơn 20%; cướp được thêm 50%.', eff: { cheap: { cav: 0.2, kyxa: 0.2 }, plunder: 0.5 } },
  mg3: { age: 3, civ: 'mongol', name: 'Giả thua', desc: 'Thua trận vẫn rút về được một nửa quân.', eff: { retreat: 0.5 } },
  mg4: { age: 4, civ: 'mongol', name: 'Vó ngựa thần tốc', desc: 'Quân cưỡi ngựa đi 3 vùng một lượt và mạnh thêm 10%.', eff: { cavMove: 1, cavStr: 0.1 } },
  bz2: { age: 2, civ: 'byzantine', name: 'Vàng Constantinople', desc: 'Vàng +25%.', eff: { gather: { gold: 0.25 } } },
  bz3: { age: 3, civ: 'byzantine', name: 'Lửa Hy Lạp', desc: 'Phòng thủ ở kinh thành và vùng có tháp, lâu đài +40%.', eff: { fortDef: 0.4 } },
  bz4: { age: 4, civ: 'byzantine', name: 'Hoàng kim', desc: 'Kỳ quan rẻ hơn 40%; vàng +20%.', eff: { cheapWonder: 0.4, gather: { gold: 0.2 } } },
  fr2: { age: 2, civ: 'frank', name: 'Lãnh chúa phong kiến', desc: 'Lâu đài rẻ hơn 30%; quân cưỡi ngựa +10%.', eff: { cheapCastle: 0.3, cavStr: 0.1 } },
  fr3: { age: 3, civ: 'frank', name: 'Thánh chiến', desc: 'Mỗi lượt giữ Tu viện được thêm 1 điểm thánh tích; hiệp sĩ +15%.', eff: { relicX: 1, uuStr: 0.15 } },
  fr4: { age: 4, civ: 'frank', name: 'Hiệp sĩ đạo', desc: 'Quân cưỡi ngựa +20%.', eff: { cavStr: 0.2 } },
};
const CIVS = {
  daiviet: {
    name: 'Đại Việt', era: 'nhà Trần, 1225–1400', capital: 'Thăng Long', color: '#b3261e', light: '#e8b93a', uu: 'thanhduc',
    desc: 'Lấy thủ làm công. Quân địch vào đất Việt hao mòn từng lượt, dân sơ tán khi bị cướp, rồi phản công.',
    bonus: ['Vườn không nhà trống: quân địch trên đất nhà mất 8% mỗi lượt, cướp được ít hơn một nửa', 'Phòng thủ trên đất nhà +15%', 'Kỵ binh đắt hơn 20%'],
    mods: { homeDef: 0.15, attrition: 0.08, evac: 0.5, costMul: { cav: 1.2 } }, ai: { rush: 0.8, boom: 2, turtle: 2.5, relic: 1.5 },
  },
  mongol: {
    name: 'Mông Cổ', era: 'đế quốc Mông Cổ, 1206–1368', capital: 'Karakorum', color: '#1f7a6d', light: '#eef3f2', uu: 'kyxa',
    desc: 'Kỵ binh như gió. Có kỵ xạ ngay từ Đời 2, lấy cướp phá nuôi quân, nhưng không giỏi giữ thành.',
    bonus: ['Kỵ xạ (quân đặc biệt) luyện ở chuồng ngựa từ Đời 2', 'Mỗi dân địch bị giết đem về 12 lương thực, 8 vàng', 'Phòng thủ −15%; tháp và tường đắt gấp rưỡi'],
    mods: { plunderBase: 1, defPen: 0.15, costMul: { tower: 1.5, walls: 1.5 } }, ai: { rush: 3, boom: 1, turtle: 0.3, relic: 1 },
  },
  byzantine: {
    name: 'Đông La Mã', era: 'Byzantium, 395–1453', capital: 'Constantinople', color: '#6b2d8f', light: '#e8c25a', uu: 'catafract',
    desc: 'Tường thành kiên cố, kho vàng đầy. Giữ chắc nhà rồi nhắm tới kỳ quan.',
    bonus: ['Tháp, lâu đài, tường thành mạnh thêm 30%', 'Giáo binh rẻ hơn 25%', 'Kỳ quan rẻ hơn 15%'],
    mods: { fort: 0.3, cheap: { spear: 0.25 }, cheapWonder: 0.15 }, ai: { rush: 0.5, boom: 1.5, turtle: 3, relic: 1.5 },
  },
  frank: {
    name: 'Frank', era: 'vương quốc Frank, 481–987', capital: 'Aachen', color: '#1f4e9c', light: '#f1d36b', uu: 'paladin',
    desc: 'Hiệp sĩ nặng giáp và lâu đài rẻ. Một cú đấm kỵ binh ở Đời 3 có thể kết thúc ván đấu.',
    bonus: ['Quân cưỡi ngựa +15%', 'Lâu đài rẻ hơn 25%', 'Lương thực +10%'],
    mods: { cavStr: 0.15, cheapCastle: 0.25, gather: { food: 0.1 } }, ai: { rush: 1.5, boom: 2, turtle: 1, relic: 2 },
  },
};
const CIV_ORDER = ['daiviet', 'mongol', 'byzantine', 'frank'];

/* the map: 9 regions, west (side 0) to east (side 1). Gold only in the middle and a little at each capital. */
const REGIONS = {
  c0: { kind: 'capital', side: 0, name: 'Kinh thành' },
  f0: { kind: 'farm', side: 0, name: 'Đồng lúa' },
  w0: { kind: 'forest', side: 0, name: 'Rừng' },
  n:  { kind: 'gold', name: 'Mỏ vàng Bắc', terrain: 'hill', note: 'Đồi cao: cung thủ +25%. Đứng trên đồi nhìn xa thêm một vùng.' },
  m:  { kind: 'relic', name: 'Tu viện', terrain: 'walls', note: `Tường đá: bên giữ +20%. Đóng quân ở đây mỗi lượt được 12 vàng; từ Đời 3 (có thầy tu) được thêm 1 điểm thánh tích, đủ ${RELIC_WIN} điểm là thắng.` },
  s:  { kind: 'gold', name: 'Mỏ vàng Nam', terrain: 'ford', note: 'Bến sông: bên giữ +20%.' },
  f1: { kind: 'farm', side: 1, name: 'Đồng lúa' },
  w1: { kind: 'forest', side: 1, name: 'Rừng' },
  c1: { kind: 'capital', side: 1, name: 'Kinh thành' },
};
const REGION_IDS = Object.keys(REGIONS);
const ADJ = {
  c0: ['f0', 'w0'], f0: ['c0', 'w0', 'n', 'm'], w0: ['c0', 'f0', 'm', 's'],
  n: ['f0', 'm', 'f1'], m: ['f0', 'w0', 'n', 's', 'f1', 'w1'], s: ['w0', 'm', 'w1'],
  f1: ['c1', 'w1', 'n', 'm'], w1: ['c1', 'f1', 'm', 's'], c1: ['f1', 'w1'],
};
const TERRAIN_DEF = { walls: 0.2, ford: 0.2 };
/* villager jobs: a region can host more than one (the capital has fields and a small gold seam) */
const JOBS = {
  c0: { region: 'c0', res: 'food', slots: 6 }, c0g: { region: 'c0', res: 'gold', slots: 3, reserve: 450 },
  f0: { region: 'f0', res: 'food', slots: 10 }, w0: { region: 'w0', res: 'wood', slots: 10 },
  n: { region: 'n', res: 'gold', slots: 8 }, s: { region: 's', res: 'gold', slots: 8 },
  f1: { region: 'f1', res: 'food', slots: 10 }, w1: { region: 'w1', res: 'wood', slots: 10 },
  c1: { region: 'c1', res: 'food', slots: 6 }, c1g: { region: 'c1', res: 'gold', slots: 3, reserve: 450 },
};
const JOB_IDS = Object.keys(JOBS);
const homeOf = side => side === 0 ? ['c0', 'f0', 'w0'] : ['c1', 'f1', 'w1'];
const capOf = side => (side === 0 ? 'c0' : 'c1');
/* geometry for the board (viewBox 1000×640): shared vertices so borders line up */
const PTS = { 1: [24, 170], 2: [196, 128], 3: [214, 318], 4: [198, 506], 5: [24, 466], 6: [262, 40], 7: [436, 52], 8: [424, 236], 9: [432, 322], 10: [420, 404], 11: [444, 596], 12: [268, 604], 13: [566, 44], 14: [578, 240], 15: [570, 320], 16: [584, 408], 17: [558, 600], 18: [742, 48], 19: [806, 130], 20: [790, 318], 21: [804, 510], 22: [736, 602], 23: [976, 172], 24: [976, 466] };
const POLY = { c0: [1, 2, 3, 4, 5], f0: [2, 6, 7, 8, 9, 3], w0: [3, 9, 10, 11, 12, 4], n: [7, 13, 14, 8], m: [8, 14, 15, 16, 10, 9], s: [10, 16, 17, 11], f1: [13, 18, 19, 20, 15, 14], w1: [15, 20, 21, 22, 17, 16], c1: [19, 23, 24, 21, 20] };
const CENTER = { c0: [112, 318], f0: [322, 186], w0: [322, 466], n: [500, 138], m: [500, 322], s: [500, 506], f1: [678, 186], w1: [678, 466], c1: [888, 318] };
