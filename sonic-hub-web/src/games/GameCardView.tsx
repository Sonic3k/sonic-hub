/* A game of the shelf, read inside the old machines (desk app "gamecard"): when he played it, on what, his pictures. */
import { useQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import { cdn } from '../api/client';
import { playWhen } from '../pages/Games';

export default function GameCardView({ gameKey }: { gameKey: string }) {
  const q = useQuery({ queryKey: ['game', gameKey], queryFn: () => hub.game(gameKey), staleTime: 10 * 60_000 });
  const g = q.data;
  if (!g) return <div className="dv-gcard">{q.isLoading ? '…' : 'Không tìm thấy game này.'}</div>;
  const pics = g.media.filter(m => m.role !== 'ICON' && m.media.fileType === 'IMAGE').slice(0, 12);
  return (
    <div className="dv-gcard">
      <h2>{g.title}</h2>
      <div className="meta">{[g.platform, g.releaseYear, g.developer].filter(Boolean).join(' · ')}</div>
      {g.summary && <p>{g.summary}</p>}
      {g.plays.length > 0 && <ol>{g.plays.map(p => <li key={p.id}><b>{playWhen(p)}</b>{p.deviceName ? ` · ${p.deviceName}` : p.via ? ` · ${p.via}` : ''}{p.evidence && <small>{p.evidence}</small>}</li>)}</ol>}
      {pics.length > 0 && <div className="pics">{pics.map(m => <img key={m.linkId} src={cdn(m.media.cdnUrl, 240)} alt="" title={m.label || m.media.caption || ''} />)}</div>}
      <p style={{ marginTop: 12 }}><a href={`/games/${g.key}`} target="_blank" rel="noreferrer">Mở trên Sonic Hub</a></p>
    </div>
  );
}
