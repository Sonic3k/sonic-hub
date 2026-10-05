import { Link } from 'react-router-dom';

/** Sections whose own design comes next — honest, inside the same frame. */
export default function Soon({ title, line }: { title: string; line: string }) {
  return <div className="soon page"><h1>{title}</h1><p>{line}</p><Link className="more" to="/" style={{ fontWeight: 600, color: 'var(--journal)' }}>← Về Hôm nay</Link></div>;
}
