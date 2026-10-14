/* The knowledge base is large (grandma's whole notebook + ~4,600 rules), so it is fetched only when a Tử vi page needs it. */
import { useQuery } from '@tanstack/react-query';
import { compile, type Kb, type Principle, type Rule, type Source, type Tone } from '../engine/reading';

export interface BookPara { id: number; kind: 'meta' | 'section' | 'item' | 'text'; sec: string[] | null; text: string }
export interface BookEntry { star: string; stars?: string[]; name: string; line: number; paras: BookPara[] }
export interface Book { source: { title: string; file: string; note: string }; preface: { id: number; text: string }[]; entries: BookEntry[] }
interface RawRule { i: string; e: number; p: number; at: string[]; t: string; o: Tone; c?: string; w?: string; r?: string }
interface Supp {
  about: string;
  palaces: { palace: string; about: string }[];
  principles: Principle[];
  stars: { star: string; about: string; rules: { id: string; palaces: string[]; text: string; when: string; tone: Tone }[] }[];
}

export interface FullKb extends Kb {
  book: Book;
  entries: BookEntry[];
  entryByLine: Map<number, BookEntry>;
  /** the entry where grandma writes about a star (a pair entry counts for both of its stars) */
  entryOfStar: Map<string, BookEntry>;
  rulesByPara: Map<number, Rule[]>;
  supplementAbout: string;
}

async function load(): Promise<FullKb> {
  const [book, raw, supp] = await Promise.all([
    import('./book.json').then(m => m.default as unknown as Book),
    import('./rules.json').then(m => (m.default as unknown as { rules: RawRule[] }).rules),
    import('./supplement.json').then(m => m.default as unknown as Supp),
  ]);
  const entryByLine = new Map(book.entries.map(e => [e.line, e]));
  const starOfEntry = (line: number) => entryByLine.get(line)?.star;
  const rules = compile(raw.map(r => ({
    id: r.i, source: 'ba' as Source, entry: r.e, para: r.p, star: starOfEntry(r.e), at: r.at, text: r.t, ctx: r.c, when: r.w, tone: r.o, review: r.r,
  })));
  const supplement = compile(supp.stars.flatMap(s => s.rules.map(r => ({
    id: r.id, source: 'bo-sung' as Source, star: s.star, at: r.palaces, text: r.text, when: r.when, tone: r.tone,
  }))));
  const rulesByPara = new Map<number, Rule[]>();
  for (const r of rules) { const l = rulesByPara.get(r.para!) ?? []; l.push(r); rulesByPara.set(r.para!, l); }
  const entryOfStar = new Map<string, BookEntry>();
  for (const e of book.entries) for (const s of e.stars ?? [e.star]) if (!entryOfStar.has(s)) entryOfStar.set(s, e);
  return {
    book, entries: book.entries, entryByLine, entryOfStar, rulesByPara,
    rules, supplement,
    palaceAbout: Object.fromEntries(supp.palaces.map(p => [p.palace, p.about])),
    principles: Object.fromEntries(supp.principles.map(p => [p.id, p])),
    starAbout: Object.fromEntries(supp.stars.map(s => [s.star, s.about])),
    entryName: Object.fromEntries(book.entries.map(e => [e.line, e.name])),
    supplementAbout: supp.about,
  };
}

export const useKb = () => useQuery({ queryKey: ['tuvi-kb'], queryFn: load, staleTime: Infinity, gcTime: Infinity });
