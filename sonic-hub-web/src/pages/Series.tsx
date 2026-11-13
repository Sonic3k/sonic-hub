/* A series of notes read in order (e.g. "Hoa khôi onthi 2008"): its parts, each with who wrote it. */
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import { dayMonthYear, vnClock } from '../lib/date';

export default function SeriesPage() {
  const [sp] = useSearchParams(), name = sp.get('name') ?? '';
  const q = useQuery({ queryKey: ['series', name], queryFn: () => hub.seriesParts(name), enabled: !!name, staleTime: 600_000 });
  const parts = q.data ?? [];
  return (
    <div className="wrap page jn">
      <Link className="back" to="/journal">← Nhật ký</Link>
      <header className="jn-head"><h1>{name || 'Series'}</h1>{q.isLoading && <span className="ph-n">Đang tải…</span>}</header>
      {!q.isLoading && !parts.length && <p className="jn-wait">Không có bài nào trong series này.</p>}
      <ol className="series-list">{parts.map((p, i) => (
        <li key={p.id}><Link to={p.slug ? `/journal/${p.slug}` : `/journal/id/${p.id}`}>
          <span className="sn">{p.seriesOrder ?? i + 1}</span>
          <span><b>{p.title || `Phần ${i + 1}`}</b><small>{[p.authorPersonName || p.authorName, dayMonthYear(vnClock(p.writtenAt))].filter(Boolean).join(' · ')}</small></span>
        </Link></li>))}</ol>
    </div>
  );
}
