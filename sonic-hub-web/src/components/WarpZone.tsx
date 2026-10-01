/** A warp zone in the demo's language: a small wormhole and luminous words. */
export default function WarpZone({ label, hint, onWarp }: { label: string; hint?: string; onWarp: () => void }) {
  return (
    <button type="button" className="warpzone" onClick={onWarp}>
      <span className="wormhole mini" aria-hidden="true"><i /><i /><i /></span>
      <span><small>Vùng warp</small><b>{label}</b>{hint && <em>{hint}</em>}</span>
    </button>
  );
}
