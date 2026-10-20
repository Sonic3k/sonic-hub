/* The quick-note language and money formatting of the Money section.
   "coffee 35k" · "grab 52k momo" · "yesterday 200k gift" · "+5m salary" · "12/10 1.2m bike repair tcb" · "$12 netflix"
   Vietnamese words still work: "hôm qua 200k quà", "+5tr lương", "1tr2". */
import type { MoneyAccount, MoneyCategory, MoneyRule } from '../api/money';

const VN = 'Asia/Ho_Chi_Minh';

/** "Ăn trưa, Phở 35k!" → "AN TRUA PHO 35K" — the same normalization the API uses for rules. */
export function norm(s: string | null | undefined): string {
  if (!s) return '';
  return s.normalize('NFD').replace(/\p{M}+/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

export const utc = (s: string) => new Date(s.endsWith('Z') ? s : s + 'Z');

export function vnd(n: number | null | undefined, signed = false): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const s = Math.round(Math.abs(n)).toLocaleString('en-US');
  return (signed ? (n < 0 ? '−' : n > 0 ? '+' : '') : n < 0 ? '−' : '') + s + ' ₫';
}

export function money(n: number | null | undefined, currency = 'VND', signed = false): string {
  if (currency === 'VND') return vnd(n, signed);
  if (n === null || n === undefined) return '—';
  return (signed ? (n < 0 ? '−' : n > 0 ? '+' : '') : n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** 35000 → "35k", 1200000 → "1.2M" — how the chips say it. */
export function short(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${+(a / 1_000_000).toFixed(a % 1_000_000 ? 1 : 0)}M`;
  if (a >= 1000) return `${+(a / 1000).toFixed(a % 1000 ? 1 : 0)}k`;
  return String(a);
}

/** Compact for axis ticks: 8.2M / 950k. */
export const compact = (n: number) => (Math.abs(n) >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : Math.abs(n) >= 1000 ? `${Math.round(n / 1000)}k` : `${Math.round(n)}`);

function vnParts(d: Date) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: VN, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
  const g = (t: string) => p.find(x => x.type === t)!.value;
  return { y: +g('year'), m: +g('month'), d: +g('day'), hh: g('hour') === '24' ? '00' : g('hour'), mm: g('minute') };
}

/** "2026-10" for a moment, Vietnam time. */
export function monthOf(d = new Date()): string { const p = vnParts(d); return `${p.y}-${String(p.m).padStart(2, '0')}`; }
export function dayOf(d: Date): string { const p = vnParts(d); return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`; }
export const shiftMonth = (m: string, delta: number) => {
  const [y, mo] = m.split('-').map(Number), d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** "October", or "October 2025" outside the current year. */
export const monthName = (m: string) => `${MONTHS[+m.slice(5) - 1]}${m.slice(0, 4) !== String(new Date().getFullYear()) ? ` ${m.slice(0, 4)}` : ''}`;
/** "October 2026". */
export const monthFull = (m: string) => `${MONTHS[+m.slice(5) - 1]} ${m.slice(0, 4)}`;
/** "Oct 2026", for the sidebar. */
export const monthAbbr = (m: string) => `${MONTHS[+m.slice(5) - 1].slice(0, 3)} ${m.slice(0, 4)}`;
/** "Oct", and "Jan 26" where a year starts, for chart ticks. */
export const monthShort = (m: string) => `${MONTHS[+m.slice(5) - 1].slice(0, 3)}${m.slice(5) === '01' ? ` ${m.slice(2, 4)}` : ''}`;
/** "2026-10-12" → "12 Oct". */
export const dayShort = (d: string) => `${+d.slice(8)} ${MONTHS[+d.slice(5, 7) - 1].slice(0, 3)}`;
export const timeOf = (s: string) => utc(s).toLocaleTimeString('en-GB', { timeZone: VN, hour: '2-digit', minute: '2-digit' });
export const dayLabel = (s: string) => {
  const d = dayOf(utc(s)), today = dayOf(new Date()), y = dayOf(new Date(Date.now() - 86_400_000));
  if (d === today) return 'Today';
  if (d === y) return 'Yesterday';
  return utc(s).toLocaleDateString('en-GB', { timeZone: VN, weekday: 'long', day: 'numeric', month: 'short' });
};
/** dayLabel inside a sentence: "latest today", "latest Monday 12 Oct". */
export const dayWord = (s: string) => { const d = dayLabel(s); return d === 'Today' || d === 'Yesterday' ? d.toLowerCase() : d; };

// ── the quick-note language ──

export interface Parsed {
  amount: number | null;          // signed, in the account's currency
  usd: boolean;
  accountId: string | null;       // null = the default (cash)
  date: string | null;            // YYYY-MM-DD (Vietnam) when not today
  text: string;                   // what is left: the description
}

const UNIT: Record<string, number> = { K: 1e3, NGHIN: 1e3, NGAN: 1e3, TR: 1e6, TRIEU: 1e6, M: 1e6, CU: 1e6, LIT: 1e5, D: 1, VND: 1, DONG: 1 };
const INCOME_WORDS = new Set(['NHAN', 'LUONG', 'THUONG', 'HOAN', 'LAI', 'SALARY', 'BONUS', 'REFUND', 'INTEREST', 'CASHBACK']);

/** Words that pick an account, besides its own name: cash, MoMo, banks. */
function accountAliases(accounts: MoneyAccount[]): [string, MoneyAccount][] {
  const out: [string, MoneyAccount][] = [];
  for (const a of accounts.filter(x => !x.archived)) {
    const words = new Set<string>([norm(a.name).replace(/ /g, ''), norm(a.institution).replace(/ /g, '')].filter(Boolean));
    if (a.mode === 'POOL') ['TM', 'CASH', 'TIENMAT'].forEach(w => words.add(w));
    const n = norm(a.name + ' ' + (a.institution ?? ''));
    if (n.includes('TPBANK')) ['TP', 'TPB'].forEach(w => words.add(w));
    if (n.includes('TECHCOMBANK')) ['TCB', 'TECHCOM'].forEach(w => words.add(w));
    if (n.includes('MOMO')) words.add('MM');
    if (n.includes('BANK OF AMERICA') || n.includes('BOA')) ['BOA', 'BOFA'].forEach(w => words.add(w));
    words.forEach(w => out.push([w, a]));
  }
  return out;
}

const up = (s: string) => s.normalize('NFD').replace(/\p{M}+/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase();

/** One token as an amount: 35k · 1,5tr · 1tr2 · 1.500.000 · 35 (= 35k) · $12. `unit` says whether it was explicit. */
function amountOf(raw: string): { value: number; usd: boolean; unit: boolean } | null {
  let t = raw.trim(), usd = false;
  if (/^\$|\$$|usd$/i.test(t)) { usd = true; t = t.replace(/\$|usd/gi, ''); }
  const u = up(t);
  const tr = /^(\d+)(TR|M|CU)(\d{1,3})$/.exec(u);                      // 1tr2 = 1,2 triệu
  if (tr) return { value: (+tr[1] + +(`0.${tr[3]}`)) * 1e6, usd, unit: true };
  const num = /^(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)([A-Z]*)$/.exec(u);
  if (!num) return null;
  const [, digits, unit] = num;
  if (unit && !(unit in UNIT)) return null;
  const grouped = /^\d{1,3}([.,]\d{3})+$/.test(digits);
  const value = grouped ? +digits.replace(/[.,]/g, '') : +digits.replace(',', '.');
  if (!Number.isFinite(value) || value <= 0) return null;
  if (usd) return { value, usd, unit: true };
  if (unit) return { value: value * UNIT[unit], usd, unit: true };
  return { value: value < 1000 ? value * 1000 : value, usd, unit: grouped };     // "cafe 35" means 35k
}

/**
 * Read a quick note. Accounts and dates are words; an amount with a unit wins over a bare number
 * ("tickets 2026 1.5m" is 1.5 million); "35 k" with a space works too; whatever is left is the description.
 */
export function parseNote(input: string, accounts: MoneyAccount[]): Parsed {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const aliases = accountAliases(accounts);
  const now = new Date();
  let sign = -1, accountId: string | null = null, date: string | null = null;
  const rest: { tok: string; i: number }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    let tok = tokens[i];
    const n = norm(tok).replace(/ /g, ''), next = norm(tokens[i + 1] ?? '').replace(/ /g, '');
    if (tok === '+') { sign = 1; continue; }
    if (tok.startsWith('+') && tok.length > 1) { sign = 1; tok = tok.slice(1); }
    if (n === 'HOM' && (next === 'QUA' || next === 'KIA')) { date = dayOf(new Date(now.getTime() - (next === 'QUA' ? 1 : 2) * 86_400_000)); i++; continue; }
    if (n === 'HQUA' || n === 'HOMQUA') { date = dayOf(new Date(now.getTime() - 86_400_000)); continue; }
    if (n === 'HKIA' || n === 'HOMKIA') { date = dayOf(new Date(now.getTime() - 2 * 86_400_000)); continue; }
    if (n === 'YESTERDAY' || n === 'YDAY') { date = dayOf(new Date(now.getTime() - 86_400_000)); continue; }
    if (n === 'TODAY') { date = null; continue; }
    const dm = /^(\d{1,2})[/](\d{1,2})(?:[/](\d{2,4}))?$/.exec(tok);
    if (dm) {
      const d = +dm[1], mo = +dm[2], y = dm[3] ? (+dm[3] < 100 ? 2000 + +dm[3] : +dm[3]) : vnYear(now, mo);
      if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) { date = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`; continue; }
    }
    if (n === 'TIEN' && next === 'MAT' && !accountId) {
      const a = aliases.find(([w]) => w === 'TIENMAT');
      if (a) { accountId = a[1].id; i++; continue; }
    }
    const acc = aliases.find(([w]) => w === n);
    if (acc && !accountId) { accountId = acc[1].id; continue; }
    rest.push({ tok, i });
  }

  // the amount: the first one with a unit, else the first bare number
  const cands = rest.map((r, k) => ({ k, a: amountOf(r.tok) })).filter(c => c.a);
  const pick = cands.find(c => c.a!.unit) ?? cands[0];
  let amount: { value: number; usd: boolean } | null = null;
  const used = new Set<number>();
  if (pick) {
    amount = { value: pick.a!.value, usd: pick.a!.usd };
    used.add(pick.k);
    const after = rest[pick.k + 1];                                    // "35 k", "2 tr"
    const unitWord = after ? up(after.tok).replace(/[^A-Z]/g, '') : '';
    if (!pick.a!.unit && !pick.a!.usd && after && unitWord in UNIT && unitWord !== 'D') {
      const base = +up(rest[pick.k].tok).replace(/[^0-9.,]/g, '').replace(',', '.');
      amount.value = base * UNIT[unitWord];
      used.add(pick.k + 1);
    }
  }
  const words = rest.filter((_, k) => !used.has(k)).map(r => r.tok);
  if (words.length && INCOME_WORDS.has(norm(words[0]).replace(/ /g, ''))) sign = 1;

  let usd = amount?.usd ?? false;
  if (usd && !accountId) accountId = accounts.find(a => a.currency === 'USD' && !a.archived)?.id ?? null;
  if (accountId && accounts.find(a => a.id === accountId)?.currency === 'USD') usd = true;
  return { amount: amount ? sign * amount.value : null, usd, accountId, date, text: words.join(' ') };
}

/** "12/10" typed in January means last October. */
function vnYear(now: Date, month: number): number {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: VN, year: 'numeric', month: '2-digit' }).formatToParts(now);
  const y = +p.find(x => x.type === 'year')!.value, m = +p.find(x => x.type === 'month')!.value;
  return month > m + 1 ? y - 1 : y;
}

/** Short words that mean a category in a note (never used on bank lines, where they collide with names). */
const NOTE_WORDS: [string[], string][] = [
  [['LUONG', 'SALARY'], 'luong'], [['THUONG', 'BONUS'], 'thuong'], [['LAI', 'HOAN', 'INTEREST', 'REFUND', 'CASHBACK'], 'lai-hoan-tien'],
  [['QUA', 'MUNG', 'LIXI', 'CUOI', 'HIEU', 'GIFT', 'GIFTS', 'WEDDING'], 'qua-hieu-hi'],
  [['THUOC', 'KHAM', 'MEDICINE', 'DOCTOR', 'PHARMACY', 'HOSPITAL'], 'suc-khoe'],
  [['SACH', 'BOOK', 'BOOKS', 'COURSE'], 'hoc-tap'],
  [['DIEN', 'NUOC', 'NET', 'WIFI', 'CUOC', 'ELECTRICITY', 'WATER', 'INTERNET', 'BILL'], 'hoa-don'],
  [['PHIM', 'GAME', 'MOVIE', 'CINEMA'], 'giai-tri'],
  [['XANG', 'GRAB', 'TAXI', 'XE', 'BUS', 'FUEL', 'PETROL', 'PARKING'], 'di-lai'],
  [['CAFE', 'CF', 'CAPHE', 'COFFEE', 'TEA', 'DRINK', 'DRINKS'], 'ca-phe'],
  [['AN', 'COM', 'PHO', 'BUN', 'LAU', 'NHAU', 'TRUA', 'BANH', 'NUONG', 'FOOD', 'LUNCH', 'DINNER', 'BREAKFAST', 'MEAL', 'SNACK'], 'an-uong'],
];

export type Guess = { kind: 'category'; category: MoneyCategory } | { kind: 'transfer'; account: MoneyAccount } | null;

/** What the note will most likely be filed as: the API's rules first, then the short note words. */
export function guess(text: string, sign: number, rules: MoneyRule[], categories: MoneyCategory[], accounts: MoneyAccount[], accountId: string | null): Guess {
  const padded = ` ${norm(text)} `;
  if (padded.trim()) {
    for (const r of rules) {
      if (!r.active || (r.direction === 'IN' && sign < 0) || (r.direction === 'OUT' && sign > 0)) continue;
      const words = r.keywords.split('|').map(norm).filter(Boolean);
      if (!words.some(w => padded.includes(` ${w} `))) continue;
      if (r.transferAccountId) {
        if (r.transferAccountId === accountId) continue;
        const a = accounts.find(x => x.id === r.transferAccountId);
        if (a) return { kind: 'transfer', account: a };
      } else {
        const c = categories.find(x => x.id === r.categoryId);
        if (c) return { kind: 'category', category: c };
      }
    }
    const tokens = norm(text).split(' ');
    for (const [words, code] of NOTE_WORDS) {
      if (!tokens.some(t => words.includes(t))) continue;
      const c = categories.find(x => x.code === code && !x.archived);
      if (c && (c.kind === 'INCOME') === sign > 0) return { kind: 'category', category: c };
    }
  }
  return null;
}

/** A note's time as the API wants it: that Vietnam day at the current clock time, with the +07:00 offset. */
export function noteTime(date: string | null): string | undefined {
  if (!date) return undefined;
  const p = vnParts(new Date());
  return `${date}T${p.hh}:${p.mm}:00+07:00`;
}
