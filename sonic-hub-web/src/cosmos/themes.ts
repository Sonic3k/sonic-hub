/* Every year is its own corner of the universe — a different sky, like the levels of
   Bejeweled 2. Tags get their own worlds too, seeded from their names. */
import type { PlanetSpec } from './planet';
import { hashString, mulberry32 } from '../lib/rng';

export interface Theme {
  key: string; name: string;
  bg: [string, string]; neb: [string, string, string]; star: string;
  planet: PlanetSpec; planetAt: { x: number; y: number; r: number };
  galaxy: { x: number; y: number; r: number; hue: number; tilt: number; arms: number };
  moons: number; seed: number;
}

type Row = [string, [string, string], [string, string, string], PlanetSpec['type'], string[], boolean, string];
// name, bg, nebula, planet type, planet colors, ring, atmosphere
const YEARS: Record<number, Row> = {
  2008: ['Tinh vân Ngọc Bích', ['#061A2E', '#020611'], ['#1FA2B8', '#6B4CF0', '#F2B84B'], 'gas', ['#0E3B52', '#2B8DA6', '#9FE3E8', '#F2D38B'], true, '#7FE3F0'],
  2009: ['Hồng Tinh Vân', ['#1C0626', '#05020C'], ['#E0459B', '#5A3BD8', '#FF9B6B'], 'lava', ['#2A0F1E', '#5C1A35', '#FF6A3D'], false, '#FF7AB8'],
  2010: ['Dải Ngân Tím', ['#160A36', '#04030F'], ['#8A5CFF', '#FF7A3D', '#3FD0E0'], 'gas', ['#3A1F6E', '#8B5CF0', '#F59A5B', '#FFE0B8'], true, '#B9A0FF'],
  2011: ['Biển Lục Bảo', ['#04201C', '#010A09'], ['#2EDB9A', '#1C7FE0', '#B6F25B'], 'ocean', ['#062A4A', '#1F7FB8', '#3E9E5A', '#C9B98A'], false, '#7FF0D0'],
  2012: ['Hỏa Tinh Đỏ', ['#2A0610', '#0A0205'], ['#E8344F', '#7B2FD6', '#FFB347'], 'lava', ['#1E0A0A', '#5A1414', '#FF4A2A'], false, '#FF6A5A'],
  2013: ['Hổ Phách', ['#1E1405', '#080501'], ['#F2A93B', '#C2415E', '#6E5BFF'], 'gas', ['#5A2E0E', '#C9762E', '#F2C46B', '#FFF0C8'], true, '#FFC36B'],
  2014: ['Băng Lam', ['#04182E', '#010612'], ['#6FD6FF', '#3A62F0', '#E2F4FF'], 'ice', ['#9CC9E8', '#D8F0FF', '#FFFFFF', '#6FA8D8'], false, '#A8E6FF'],
  2015: ['Anh Đào', ['#250A2C', '#09030D'], ['#FF6FC8', '#9B5CFF', '#5CE1E6'], 'gas', ['#5A1E52', '#D45AA8', '#FFB3DD', '#FFE8F4'], true, '#FF9FD8'],
  2016: ['Đảo San Hô', ['#071F22', '#020A0B'], ['#3FE0C5', '#A2E04A', '#2F7BE6'], 'ocean', ['#04324A', '#1C9AB0', '#58B04A', '#E8D79B'], false, '#8BF5E0'],
  2017: ['Lam Kim', ['#0A0F30', '#02030C'], ['#3D6BFF', '#FFC857', '#9A4DFF'], 'gas', ['#16245E', '#3D6BE0', '#E8C25A', '#FFF2C8'], true, '#8FB0FF'],
  2018: ['Hồng San', ['#250818', '#090208'], ['#FF5C8A', '#2EC4B6', '#FFD166'], 'rocky', ['#5A2236', '#B85A6E', '#E8A07A', '#F5D9B0'], false, '#FF9AB4'],
  2019: ['Cam Hoàng Hôn', ['#2A1004', '#0B0401'], ['#FF8A3D', '#3A86FF', '#FF4D6D'], 'lava', ['#24100A', '#4A2416', '#FF8A2A'], false, '#FFB06A'],
  2020: ['Rừng Xanh', ['#0B2210', '#030A05'], ['#7ED957', '#8C52FF', '#2FC2D9'], 'ocean', ['#073A2A', '#1E8A6A', '#4E9E3B', '#B8C98A'], false, '#B5F59A'],
  2021: ['Hồng Ngọc', ['#2A0E06', '#0A0302'], ['#FF4E3D', '#FFC94D', '#9C3DFF'], 'gas', ['#5A140E', '#C2362A', '#F5A63B', '#FFE7B0'], true, '#FF8F6B'],
  2022: ['Lam Điện', ['#051E2A', '#01080D'], ['#2FE0FF', '#FF4FD8', '#6B5CFF'], 'ice', ['#7FD8F0', '#C8F2FF', '#FFFFFF', '#5A8CE0'], false, '#7FEFFF'],
  2023: ['Tím Thạch Anh', ['#160A30', '#05030F'], ['#A66CFF', '#36E2C8', '#FF8FB1'], 'gas', ['#2E1A5E', '#7B52D9', '#B98CFF', '#E8DCFF'], false, '#C8A6FF'],
  2024: ['Hoàng Hôn Hồng', ['#2A0A1A', '#0B0308'], ['#FF7A59', '#FF4F9A', '#7B5CFF'], 'rocky', ['#3E1A2E', '#9E4A5A', '#E88A5A', '#FFD3A0'], false, '#FF9F86'],
  2025: ['Đêm Xanh Thẳm', ['#06102A', '#01030B'], ['#4D7CFF', '#00D1C1', '#C77DFF'], 'ocean', ['#04163E', '#14509E', '#2E8A7A', '#A8C0B0'], false, '#7FA8FF'],
  2026: ['Oải Hương', ['#1A0F30', '#06030F'], ['#C9A2FF', '#FFD27A', '#6FD3FF'], 'gas', ['#3A2A6E', '#9C82E8', '#E8D2FF', '#FFE7B0'], true, '#D8C2FF'],
};
const RING = (cols: string[]) => ({ colors: [cols[cols.length - 1], cols[1], cols[cols.length - 2] ?? cols[0], '#FFFFFF'], tilt: .26 });

function build(key: string, row: Row, seed: number): Theme {
  const [name, bg, neb, type, cols, ring, atmo] = row, r = mulberry32(seed);
  return {
    key, name, bg, neb, star: neb[2], seed,
    planet: { type, colors: cols, seed, atmo, ring: ring ? RING(cols) : undefined, spot: type === 'gas' && r() < .7 },
    planetAt: { x: .7 + r() * .06, y: .84 + r() * .08, r: .2 + r() * .04 },
    galaxy: { x: .46 + r() * .12, y: .1 + r() * .1, r: .14 + r() * .06, hue: r() * 360, tilt: .32 + r() * .2, arms: 2 + Math.floor(r() * 3) },
    moons: 1,
  };
}

export function yearTheme(y: number): Theme {
  const yy = YEARS[y] ? y : 2008 + ((y % 19) + 19) % 19;
  return build(`y${y}`, YEARS[yy], y * 7919);
}

/** A tag's own world: palette borrowed from the year table, planet and layout from its name. */
export function tagTheme(name: string): Theme {
  const h = hashString(name.toLowerCase()), years = Object.keys(YEARS).map(Number), base = YEARS[years[h % years.length]];
  const types: PlanetSpec['type'][] = ['gas', 'ocean', 'ice', 'rocky', 'lava'];
  const row: Row = [base[0], base[1], base[2], types[(h >>> 5) % types.length], base[4], ((h >>> 9) & 1) === 1, base[6]];
  return build(`t${name}`, row, h);
}

/* The big sections are fixed worlds — the same planet in every year's sky. */
export interface SectionDef { id: 'photos' | 'journal' | 'angels' | 'football' | 'games'; label: string; tagline: string; planet: PlanetSpec }
export const SECTIONS: SectionDef[] = [
  { id: 'photos', label: 'Ảnh', tagline: 'Mười tám năm ảnh, xếp theo ngày chụp', planet: { type: 'gas', seed: 11, colors: ['#6E2A12', '#E0873F', '#FFD08A', '#FFF1D2'], atmo: '#FFC07A', ring: { colors: ['#FFF1D2', '#E0A060', '#8A5A3A', '#FFFFFF'], tilt: .28 }, spot: true } },
  { id: 'journal', label: 'Nhật ký', tagline: 'Những trang đã viết, đọc lại cho đúng', planet: { type: 'ocean', seed: 23, colors: ['#05304A', '#1F8FB0', '#4E9E5A', '#D8C894'], atmo: '#8FF0E0' } },
  { id: 'angels', label: 'Angels', tagline: 'Mỗi người một chương', planet: { type: 'gas', seed: 37, colors: ['#4A1238', '#D4558F', '#FFB8DA', '#FFE8F4'], atmo: '#FF9FD0', ring: { colors: ['#FFE8F4', '#E07AB0', '#8A3A6A', '#FFFFFF'], tilt: .22 } } },
  { id: 'football', label: 'Bóng đá', tagline: 'Fantasy Football của tôi', planet: { type: 'rocky', seed: 41, colors: ['#1E4A22', '#3E8A3A', '#8FD06A', '#E8F2C0'], atmo: '#A8F59A' } },
  { id: 'games', label: 'Game', tagline: 'Những trò đã chơi và sẽ tự làm', planet: { type: 'ice', seed: 53, colors: ['#5A3BBF', '#9D7BFF', '#E3D6FF', '#FFFFFF'], atmo: '#C8B4FF' } },
];
