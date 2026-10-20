/* The label model of the Money section, the same in every place that puts labels on lines (the demo's rules):
   - sections (facets) are headings; Category is the main one and holds spending and income labels;
   - a label can sit inside a parent of its own section: it brings the parent along ("Food" counts toward
     "Food & Drink"), so a line keeps only its most specific labels;
   - a line carries any number of labels; it leaves To review once it has a category, or once it is a move between
     own accounts (an internal transfer, which takes no labels). */
import { useMemo } from 'react';
import type { MoneyCategory, Txn } from '../../api/money';
import { useCategories, useFacets } from './data';

export type Dir = 'out' | 'in';

export interface Section {
  id: string; name: string; main: boolean;
  /** its labels follow a payee when a choice is applied to all their lines ("Follows the payee") */
  carry: boolean;
}

export interface LabelBook {
  ready: boolean;
  sections: Section[];
  main: Section | undefined;
  label: (id: string) => MoneyCategory | undefined;
  secOf: (id: string) => string | undefined;
  isMain: (id: string) => boolean;
  /** the label of the same section it sits inside */
  parentOf: (id: string) => string | null;
  ancestors: (id: string) => string[];
  descendants: (id: string) => string[];
  /** child labels shown under a parent; `keep` also shows hidden ones that are in use */
  kids: (id: string, keep?: Set<string>) => MoneyCategory[];
  /** a section's top-level labels that fit the way the money went */
  tops: (sec: string, dirs: Dir[], keep?: Set<string>) => MoneyCategory[];
  /** without the parents of labels in the set: what a line keeps */
  normalize: (ids: Iterable<string>) => Set<string>;
  /** with everything the labels bring along: what a line counts under */
  effective: (ids: Iterable<string>) => Set<string>;
  sortIds: (ids: Iterable<string>) => string[];
  carries: (id: string) => boolean;
  kindOk: (c: MoneyCategory, dirs: Dir[]) => boolean;
  /** live labels of a section, in order */
  live: (sec: string) => MoneyCategory[];
}

const byOrder = (a: MoneyCategory, b: MoneyCategory) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

export function useLabelBook(): LabelBook {
  const facets = useFacets(), categories = useCategories();
  return useMemo(() => {
    const fs = (facets.data ?? []).filter(f => !f.archived).sort((a, b) => Number(b.main) - Number(a.main) || a.sortOrder - b.sortOrder);
    const mainFacet = fs.find(f => f.main);
    const sections: Section[] = fs.map(f => ({ id: f.id, name: f.name, main: f.main, carry: f.main || !f.perTransaction }));
    const secById = new Map(sections.map(s => [s.id, s]));
    const cats = categories.data ?? [];
    const byId = new Map(cats.map(c => [c.id, c]));
    const label = (id: string) => byId.get(id);
    const secOf = (id: string) => {
      const c = byId.get(id);
      if (!c) return undefined;
      return c.kind !== 'ANY' || !c.facetId ? mainFacet?.id : c.facetId;
    };
    const isMain = (id: string) => { const c = byId.get(id); return !!c && c.kind !== 'ANY'; };
    const parentOf = (id: string) => {
      const c = byId.get(id), s = secOf(id);
      if (!c) return null;
      for (const p of c.impliesIds) { const pc = byId.get(p); if (pc && !pc.archived && secOf(p) === s) return p; }
      return null;
    };
    const ancestors = (id: string) => {
      const out: string[] = [];
      for (let p = parentOf(id); p && p !== id && !out.includes(p); p = parentOf(p)) out.push(p);
      return out;
    };
    const descendants = (id: string) => cats.filter(c => ancestors(c.id).includes(id)).map(c => c.id);
    const normalize = (ids: Iterable<string>) => {
      const all = [...ids], s = new Set(all);
      for (const id of all) for (const a of ancestors(id)) s.delete(a);
      return s;
    };
    const effective = (ids: Iterable<string>) => {
      const s = new Set<string>(), todo = [...ids];
      while (todo.length) {
        const id = todo.pop()!;
        if (s.has(id)) continue;
        const c = byId.get(id);
        if (!c) continue;
        s.add(id);
        for (const x of c.impliesIds) { const xc = byId.get(x); if (xc && !xc.archived) todo.push(x); }
      }
      return s;
    };
    const kindOk = (c: MoneyCategory, dirs: Dir[]) => c.kind === 'ANY' || dirs.includes(c.kind === 'EXPENSE' ? 'out' : 'in');
    const visible = (c: MoneyCategory, keep?: Set<string>) => (!c.archived && !c.system) || !!keep?.has(c.id);
    const tops = (sec: string, dirs: Dir[], keep?: Set<string>) =>
      cats.filter(c => secOf(c.id) === sec && visible(c, keep) && kindOk(c, dirs) && !parentOf(c.id)).sort(byOrder);
    const kids = (id: string, keep?: Set<string>) => cats.filter(c => parentOf(c.id) === id && visible(c, keep)).sort(byOrder);
    const live = (sec: string) => cats.filter(c => secOf(c.id) === sec && !c.archived && !c.system).sort(byOrder);
    const rank = (id: string) => { const s = secOf(id); const i = sections.findIndex(x => x.id === s); return i < 0 ? 99 : i; };
    const sortIds = (ids: Iterable<string>) => [...new Set(ids)].filter(id => byId.has(id))
      .sort((a, b) => rank(a) - rank(b) || byOrder(byId.get(a)!, byId.get(b)!));
    const carries = (id: string) => { const s = secOf(id); return s ? secById.get(s)?.carry ?? true : true; };
    return {
      ready: !!facets.data && !!categories.data, sections, main: sections.find(s => s.main),
      label, secOf, isMain, parentOf, ancestors, descendants, kids, tops, normalize, effective, sortIds, carries, kindOk, live,
    };
  }, [facets.data, categories.data]);
}

// ── a line's labels ──

export const dirOf = (t: { amount: number }): Dir => (t.amount < 0 ? 'out' : 'in');

/** A move between own accounts; one the system found by itself is not anyone's choice to undo here. */
export const isMove = (t: Txn) => t.kind === 'TRANSFER';
export const systemMove = (t: Txn) => t.kind === 'TRANSFER' && t.categorizedBy === 'SYSTEM';

/** Out of To review: it has a category, or it is an internal transfer. */
export const decided = (t: Txn) => t.kind === 'TRANSFER' || t.status === 'OK';

/** The labels put on the line (not those brought along, and not the AI's guess while it waits). */
export function labelsOf(t: Txn): Set<string> {
  if (t.kind === 'TRANSFER') return new Set();
  return new Set((t.tags ?? []).filter(x => x.by !== 'IMPLIED' && !(t.status === 'REVIEW' && x.by === 'AI')).map(x => x.id));
}

/** What the AI guessed for a line still waiting. */
export function guessOf(t: Txn): Set<string> {
  if (t.kind === 'TRANSFER' || t.status !== 'REVIEW') return new Set();
  return new Set((t.tags ?? []).filter(x => x.by === 'AI').map(x => x.id));
}

export const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(x => b.has(x));

/** "3 transactions" */
export const txs = (n: number) => `${n} transaction${n === 1 ? '' : 's'}`;
