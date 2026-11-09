/* A game remade for the portal, played on its own page: /games/play/:pkg */
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import GameRunner from '../games/Runner';

export default function GamePlayPage() {
  const { pkg } = useParams();
  const q = useQuery({ queryKey: ['game-package', pkg], enabled: !!pkg, queryFn: () => hub.gamePackage(pkg!), staleTime: 10 * 60_000 });
  const p = q.data;
  return (
    <div className="wrap page games g-playpage">
      <Link className="back" to={p ? `/games/${p.gameKey}` : '/games'}>← {p?.gameTitle ?? 'Game'}</Link>
      <div className="g-stage">{pkg && <GameRunner pkg={pkg} />}</div>
    </div>
  );
}
