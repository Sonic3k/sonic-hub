/* A series of notes read in order (e.g. "Hoa khôi onthi 2008"): its parts, each with who wrote it. */
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import { dayMonthYear } from '../lib/date';

export default function SeriesPage() {
  const [sp] = useSearchParams(), name = sp.get('name') ?? '';
  const q = useQuery({ queryKey: ['series', name], queryFn: () => hub.seriesParts(name), enabled: !!name, staleTime: 600_000 });
  const parts = q.data ?? [];
  return (
    <div className="wrap page">
      <Link className="back" to="/journal">← Nhật ký</Link>
      <div className="ptitle"><h1>{name || 'Series'}</h1><span>{parts.length ? `${parts.length} phần` : q.isLoading ? 'Đang tải…' : ''}</span></div>
      {!q.isLoading && !parts.length && <div className="card empty">Không có bài nào trong series này.</div>}
      <ol className="series-list">{parts.map((p, i) => (
        <li key={p.id}><Link to={p.slug ? `/journal/${p.slug}` : `/journal/id/${p.id}`}>
          <span className="sn">{p.seriesOrder ?? i + 1}</span>
          <span><b>{p.title || `Phần ${i + 1}`}</b><small>{[p.authorPersonName || p.authorName, dayMonthYear(p.writtenAt)].filter(Boolean).join(' · ')}</small></span>
        </Link></li>))}</ol>
    </div>
  );
}
