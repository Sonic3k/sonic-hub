// Checks the engine against grandma's own tables and against known Vietnamese lunar dates.
// Run: node scripts/tuvi/test-engine.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importTs } from './ts-import.mjs';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const E = await importTs(path.join(web, 'src/mystic/tuvi/engine/chart.ts'));
const L = await importTs(path.join(web, 'src/mystic/tuvi/engine/lunar.ts'));
let fails = 0;
const eq = (what, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) { fails++; console.log(`✗ ${what}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); } };

// 1. lunar calendar (Vietnam, UTC+7)
const tet = [[2026, 2, 17], [2025, 1, 29], [2024, 2, 10], [2023, 1, 22], [2020, 1, 25], [2000, 2, 5], [1990, 1, 27], [1985, 1, 21], [1968, 1, 29], [2012, 1, 23], [2008, 2, 7]];
for (const [y, m, d] of tet) eq(`Tết ${y}`, L.solarToLunar(d, m, y), { day: 1, month: 1, year: y, leap: false });
eq('1/2 nhuận 2023', L.solarToLunar(22, 3, 2023), { day: 1, month: 2, year: 2023, leap: true });
eq('1/4 nhuận 2020', L.solarToLunar(23, 5, 2020), { day: 1, month: 4, year: 2020, leap: true });
eq('leap 2023', L.leapMonthOf(2023), 2);
eq('leap 2025', L.leapMonthOf(2025), 6);
eq('round trip', L.lunarToSolar(15, 8, 2026, false), [25, 9, 2026]);

// 2. "Vị trí của Tử Vi theo ngày sinh" — grandma's five tables
const T = {
  2: { 'Tỵ': [8, 9], 'Ngọ': [10, 11], 'Mùi': [12, 13], 'Thân': [14, 15], 'Thìn': [6, 7, 30], 'Dậu': [16, 17], 'Mão': [4, 5, 28, 29], 'Tuất': [18, 19], 'Dần': [2, 3, 26, 27], 'Sửu': [1, 24, 25], 'Tý': [22, 23], 'Hợi': [20, 21] },
  3: { 'Tỵ': [4, 12, 14], 'Ngọ': [7, 15, 17], 'Mùi': [10, 18, 20], 'Thân': [13, 21, 23], 'Thìn': [1, 9, 11], 'Dậu': [16, 24, 26], 'Mão': [6, 8], 'Tuất': [19, 27, 29], 'Dần': [3, 5], 'Sửu': [2, 28], 'Tý': [25], 'Hợi': [22, 30] },
  4: { 'Tỵ': [6, 16, 19, 25], 'Ngọ': [10, 20, 23, 29], 'Mùi': [14, 24, 27], 'Thân': [18, 28], 'Thìn': [2, 12, 15, 21], 'Dậu': [22], 'Mão': [8, 11, 17], 'Tuất': [26], 'Dần': [4, 7, 13], 'Sửu': [3, 9], 'Tý': [5], 'Hợi': [1, 30] },
  5: { 'Tỵ': [8, 20, 24], 'Ngọ': [1, 13, 25, 29], 'Mùi': [6, 18, 30], 'Thân': [11, 23], 'Thìn': [3, 15, 19, 27], 'Dậu': [16, 28], 'Mão': [10, 14, 22], 'Tuất': [21], 'Dần': [5, 9, 17], 'Sửu': [4, 12], 'Tý': [7], 'Hợi': [2, 26] },
  6: { 'Tỵ': [10, 24, 29], 'Ngọ': [2, 16, 30], 'Mùi': [8, 22], 'Thân': [14, 28], 'Thìn': [4, 18, 23], 'Dậu': [1, 20], 'Mão': [12, 17, 27], 'Tuất': [7, 26], 'Dần': [6, 11, 21], 'Sửu': [5, 15, 25], 'Tý': [9, 19], 'Hợi': [3, 13] },
};
const BR = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
for (const [c, tab] of Object.entries(T)) for (const [b, days] of Object.entries(tab)) for (const d of days) eq(`Tử Vi cục ${c} ngày ${d}`, BR[E.tuViPosition(+c, d)], b);

// 3. "Tìm Cục" — grandma's table: Mệnh palace × year stem
const CUC = { 'Tý': ['Thủy', 'Hỏa', 'Thổ', 'Mộc', 'Kim'], 'Sửu': ['Thủy', 'Hỏa', 'Thổ', 'Mộc', 'Kim'],
  'Dần': ['Hỏa', 'Thổ', 'Mộc', 'Kim', 'Thủy'], 'Mão': ['Hỏa', 'Thổ', 'Mộc', 'Kim', 'Thủy'], 'Tuất': ['Hỏa', 'Thổ', 'Mộc', 'Kim', 'Thủy'], 'Hợi': ['Hỏa', 'Thổ', 'Mộc', 'Kim', 'Thủy'],
  'Thìn': ['Mộc', 'Kim', 'Thủy', 'Hỏa', 'Thổ'], 'Tỵ': ['Mộc', 'Kim', 'Thủy', 'Hỏa', 'Thổ'],
  'Ngọ': ['Thổ', 'Mộc', 'Kim', 'Thủy', 'Hỏa'], 'Mùi': ['Thổ', 'Mộc', 'Kim', 'Thủy', 'Hỏa'],
  'Thân': ['Kim', 'Thủy', 'Hỏa', 'Thổ', 'Mộc'], 'Dậu': ['Kim', 'Thủy', 'Hỏa', 'Thổ', 'Mộc'] };
for (const [b, row] of Object.entries(CUC)) row.forEach((el, s5) => {
  const bi = BR.indexOf(b), stemDan = ((s5 % 5) * 2 + 2) % 10, st = (stemDan + ((bi - 2 + 12) % 12)) % 10;
  eq(`Cục ${b} / can ${s5}`, E.napAmOf(st, bi).element, el);
});

// 4. a whole chart: structure checks that must hold for any birth
for (const [y, m, d, h, g] of [[1990, 5, 12, 14, 'nam'], [1962, 11, 3, 2, 'nu'], [2025, 8, 30, 23, 'nam'], [1945, 2, 14, 9, 'nu'], [2001, 12, 31, 0, 'nam']]) {
  for (const variant of ['ba', 'sach']) {
    const c = E.buildChart({ gender: g, calendar: 'solar', year: y, month: m, day: d, hour: h }, { ...E.defaultOptions(), variant, viewYear: 2026 });
    const n = c.palaces.reduce((a, p) => a + p.stars.length, 0);
    const main = c.palaces.reduce((a, p) => a + p.stars.filter(s => s.kind === 'chinh').length, 0);
    eq(`${y}-${m}-${d} ${variant}: 14 main stars`, main, 14);
    eq(`${y}-${m}-${d} ${variant}: Phủ mirrors Tử Vi`, (c.pos.thien_phu + c.pos.tu_vi) % 12, 4);
    eq(`${y}-${m}-${d} ${variant}: Kình after Lộc`, (c.pos.kinh_duong - c.pos.loc_ton + 12) % 12, 1);
    eq(`${y}-${m}-${d} ${variant}: Thân in Mệnh/Phúc/Quan/Di/Tài/Phu`, ['Mệnh', 'Phúc Đức', 'Quan Lộc', 'Thiên Di', 'Tài Bạch', 'Phu Thê'].includes(c.palaces[c.than].role), true);
    if (y === 1990 && variant === 'ba') console.log(`1990-05-12 14h nam: ${c.lunar.day}/${c.lunar.month}/${c.lunar.year} ${['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'][c.stem]} ${BR[c.branch]} · Mệnh ${BR[c.menh]} · Thân ${BR[c.than]} · ${c.cuc.name} · ${c.napAm.name} · stars ${n}`);
  }
}
console.log(fails ? `${fails} failed` : 'all engine checks passed');
process.exit(fails ? 1 : 0);
