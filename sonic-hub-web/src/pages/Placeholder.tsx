interface Props { title: string; note: string }

/* An empty room, honestly empty. Each section lands here until it is built. */
export default function Placeholder({ title, note }: Props) {
  return (
    <div className="pt-2">
      <h1 className="font-display text-[clamp(28px,6.5vw,42px)] font-extrabold leading-[1.1] tracking-[-0.03em]">{title}</h1>
      <p className="mt-4 max-w-[32em] text-[15px] leading-relaxed text-ink2">{note}</p>
    </div>
  );
}
