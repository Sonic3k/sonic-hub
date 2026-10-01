/** A swirling gate. Stepping through warps you out of the cosmos into a full app. */
export default function WarpGate({ label, hint, onWarp }: { label: string; hint?: string; onWarp: () => void }) {
  return (
    <button type="button" className="gate" onClick={onWarp}>
      <span className="gate-ring" aria-hidden="true"><i /><i /><i /></span>
      <span className="gate-txt"><small>Vùng warp</small><b>{label}</b>{hint && <em>{hint}</em>}</span>
    </button>
  );
}
