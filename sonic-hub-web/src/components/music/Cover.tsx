/* A song's picture: its cover (its own, else its album's), and while it has none the default one — a record, drawn
   flat in the colours of Music. Square, like every picture of the 2.4 set. */
import { cdn } from '../../api/client';

export default function Cover({ url, size = 40, className = '' }: { url?: string | null; size?: number; className?: string }) {
  const box = { width: size, height: size };
  if (url) return <img className={`mu-cover ${className}`} style={box} src={cdn(url, size)} alt="" loading="lazy" decoding="async" />;
  return (
    <span className={`mu-cover none ${className}`} style={box} aria-hidden="true">
      <svg viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="14" />
        <circle className="g" cx="20" cy="20" r="10.5" />
        <circle className="g" cx="20" cy="20" r="7.5" />
        <circle className="l" cx="20" cy="20" r="4.4" />
        <circle className="h" cx="20" cy="20" r="1.1" />
      </svg>
    </span>
  );
}
