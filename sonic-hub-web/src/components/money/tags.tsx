/* Tags by facet, shared by the edit sheet, the review pickers and the list's "chọn nhiều".
   The main facet's tags are the categories (kind EXPENSE/INCOME); every other facet's are kind ANY. */
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { moneyApi, type MoneyCategory, type MoneyFacet } from '../../api/money';
import { useCategories, useFacets } from './data';

export interface TagBook {
  /** live facets after the main one, in order */
  others: MoneyFacet[];
  byId: Map<string, MoneyCategory>;
  isMain: (id: string) => boolean;
  /** live tags of a facet */
  tagsOf: (facetId: string) => MoneyCategory[];
  /** a tag of a per-transaction facet ("Với ai", "Dịp"): about one occasion, so not carried into a rule by default */
  perTransaction: (id: string) => boolean;
  /** what the chosen tags bring along: implied id → the name of a tag that brings it */
  implied: (chosen: Iterable<string>) => Map<string, string>;
}

const order = (a: MoneyCategory, b: MoneyCategory) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi');

export function useTagBook(): TagBook {
  const facets = useFacets(), categories = useCategories();
  return useMemo(() => {
    const fs = (facets.data ?? []).filter(f => !f.archived).sort((a, b) => a.sortOrder - b.sortOrder);
    const facetById = new Map(fs.map(f => [f.id, f]));
    const cats = categories.data ?? [];
    const byId = new Map(cats.map(c => [c.id, c]));
    const isMain = (id: string) => { const c = byId.get(id); return !!c && c.kind !== 'ANY'; };
    const tagsOf = (facetId: string) => cats.filter(c => c.facetId === facetId && !c.archived && c.kind === 'ANY').sort(order);
    const perTransaction = (id: string) => {
      const c = byId.get(id);
      return !!c && c.kind === 'ANY' && !!c.facetId && !!facetById.get(c.facetId)?.perTransaction;
    };
    const implied = (chosen: Iterable<string>) => {
      const have = new Set(chosen), out = new Map<string, string>();
      for (const start of have) {
        const todo = [...(byId.get(start)?.impliesIds ?? [])], seen = new Set<string>();
        while (todo.length) {
          const id = todo.pop()!;
          if (seen.has(id)) continue;
          seen.add(id);
          const c = byId.get(id);
          if (!c || c.archived) continue;
          if (!have.has(id) && !out.has(id)) out.set(id, byId.get(start)?.name ?? '');
          todo.push(...c.impliesIds);
        }
      }
      return out;
    };
    return { others: fs.filter(f => !f.main), byId, isMain, tagsOf, perTransaction, implied };
  }, [facets.data, categories.data]);
}

/** A tag as a chip's content. */
export const tagText = (c: { icon: string | null; name: string }) => <>{c.icon && <span>{c.icon}</span>}{c.name}</>;

/**
 * One facet's tags as chips: tap to put one on or take it off. One brought along by another tag shows dimmed and
 * cannot be taken off on its own. "＋" makes a new tag in the facet and puts it on.
 */
export function FacetChips({ facet, book, chosen, implied, onToggle, onCreated, count, of }: {
  facet: MoneyFacet; book: TagBook; chosen: Set<string>; implied: Map<string, string>;
  onToggle: (id: string) => void; onCreated: (id: string) => void;
  /** how many of `of` picked lines already carry a tag ("3/5" on its chip) */
  count?: (id: string) => number; of?: number;
}) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const create = async () => {
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true); setError('');
    try {
      const c = await moneyApi.createTag({ name: n, facetId: facet.id });
      await qc.invalidateQueries({ queryKey: ['money', 'categories'] });
      qc.invalidateQueries({ queryKey: ['money', 'facets'] });
      onCreated(c.id);
      setAdding(false); setName('');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="mn-pick flat">
      {book.tagsOf(facet.id).map(c => {
        const on = chosen.has(c.id), via = on ? undefined : implied.get(c.id), n = count ? count(c.id) : 0;
        return (
          <button key={c.id} type="button" className={`mn-pick-i ${on ? 'on' : via !== undefined ? 'implied' : ''}`}
            aria-pressed={on || via !== undefined} title={via !== undefined ? `Đi kèm ${via}` : undefined}
            onClick={() => { if (via === undefined) onToggle(c.id); }}>
            {tagText(c)}
            {n > 0 && <small className="mn-pick-n">{n}/{of}</small>}
          </button>
        );
      })}
      {adding ? (
        <input className="mn-pick-new" autoFocus value={name} maxLength={80} disabled={busy} placeholder={`Nhãn mới cho “${facet.name}”`}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); create(); }
            if (e.key === 'Escape') { e.stopPropagation(); setAdding(false); setName(''); }
          }}
          onBlur={() => { if (!name.trim()) setAdding(false); }} />
      ) : (
        <button type="button" className="mn-pick-i add" onClick={() => setAdding(true)} aria-label={`Thêm nhãn cho ${facet.name}`} title="Thêm nhãn">＋</button>
      )}
      {error && <span className="mn-error mn-pick-wide">{error}</span>}
    </div>
  );
}
