/* Turning on the computer or the phone of the moment the page is looking at: the day shown on Hôm nay, the year or
   month opened in Ảnh, a memory (the computer opens it with its windows). Elsewhere, the machines of now.
   The machines are a page of their own (/pc, /phone), so these are plain links. */
import { skipToken, useQuery } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTimeline } from '../lib/queries';
import type { Episode } from '../types';

const pad = (n: number | string) => String(n).padStart(2, '0');

/** The Vietnam wall-clock the page is about, as the machines take it ("2011-08-22T21:00"), or null for now. */
function useMomentOfPage(): string | null {
  const loc = useLocation(), [sp] = useSearchParams(), tl = useTimeline();
  const memId = /^\/memories\/([^/]+)/.exec(loc.pathname)?.[1];
  // the memory page's own data, if it is open (never fetched from here)
  const mem = useQuery<Episode>({ queryKey: ['memory', memId], queryFn: skipToken });
  const now = new Date();
  if (loc.pathname === '/') {
    const [pm, pd] = (sp.get('d') ?? '').split('-').map(Number);
    const month = pm || now.getMonth() + 1, day = pd || now.getDate();
    const buckets = tl.data ?? [], years = [...new Set(buckets.map(b => b.year))].sort((a, b) => b - a);
    // the year Hôm nay shows when none is asked: the latest with photos in this month, else the latest at all
    const year = Number(sp.get('y')) || years.find(y => buckets.some(b => b.year === y && b.month === month && b.count > 0)) || years[0];
    if (!year) return null;
    return `${year}-${pad(month)}-${pad(day)}T21:00`;
  }
  if (loc.pathname === '/photos' && sp.get('year')) return `${sp.get('year')}-${pad(sp.get('month') ?? 6)}-15T21:00`;
  if (memId && mem.data) return atOfMemory(mem.data);
  return null;
}

/** When a memory happened, as the machines take it: its time when known to the hour, else 21:00 on its day. */
export function atOfMemory(e: Pick<Episode, 'occurredAt' | 'precision'>): string | null {
  if (!e.occurredAt) return null;
  const p = e.precision;
  if (p === 'HOUR' || p === 'MINUTE' || p === 'SECOND') {
    const d = new Date(new Date(`${e.occurredAt}Z`).getTime() + 7 * 3600_000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  }
  return `${e.occurredAt.slice(0, 10)}T21:00`;
}

export default function MachineButtons() {
  const loc = useLocation();
  const at = useMomentOfPage();
  const memId = /^\/memories\/([^/]+)/.exec(loc.pathname)?.[1];
  const q = at ? `?at=${encodeURIComponent(at)}` : '';
  return (
    <div className="machines">
      <a href={memId ? `/pc?scene=${memId}` : `/pc${q}`} title={memId ? 'Mở ký ức này trên máy tính của lúc đó' : 'Bật máy tính của lúc này'}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="1.6" /><path d="M9 20h6M12 16v4" /></svg><span>Máy tính</span>
      </a>
      <a href={`/phone${q}`} title="Bật điện thoại của lúc này">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.2" /><path d="M11 18.5h2" /></svg><span>Điện thoại</span>
      </a>
    </div>
  );
}
