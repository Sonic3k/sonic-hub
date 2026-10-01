import { Link } from 'react-router-dom';

export default function TopBar({ onRandom }: { onRandom?: () => void }) {
  return (
    <header className="topbar">
      <Link to="/" className="brand"><i className="brand-star" />sonic hub</Link>
      {onRandom && (
        <button type="button" className="glint" onClick={onRandom}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="9" cy="9" r="1.1" /><circle cx="15" cy="15" r="1.1" /><circle cx="15" cy="9" r="1.1" /><circle cx="9" cy="15" r="1.1" /></svg>
          Một ngày bất kỳ
        </button>
      )}
    </header>
  );
}
