import type { AnswerFeedback, AnswerInput, AnswerResponse, RatingValue, SessionCardView } from '@learn/shared';
import { matchTyped } from '@learn/shared/text';
import { Fragment, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { untilLabel } from '../lib/format';
import { RATING_FALLBACK, RATING_LABEL, RATINGS } from '../lib/labels';
import { mdBlock } from '../lib/md';
import { speak } from '../lib/speech';
import { Md } from './Bits';
import { SpeakerIcon } from './Icons';

/* One study card: draws the question, collects the answer, and marks right and wrong once revealed. */

export type AnswerPayload = Omit<AnswerInput, 'sessionCardId' | 'timeMs' | 'clientId'>;

export interface Reveal {
  correct: boolean | null;
  typo?: boolean;
  feedback: AnswerFeedback | null;
  response: AnswerResponse | null;
}

export interface QuestionControls {
  /** Number keys: pick the n-th option of a single-choice question. */
  pick(n: number): void;
  /** Space: turn a flashcard over. */
  flip(): void;
}

interface Props {
  card: SessionCardView;
  /** study: answer once, then see why · exam: answers can change until submit · review: read only */
  mode: 'study' | 'exam' | 'review';
  reveal?: Reveal | null;
  /** exam: the answer saved earlier, shown again */
  saved?: AnswerResponse | null;
  busy?: boolean;
  onCommit?: (input: AnswerPayload) => void;
  controls?: Ref<QuestionControls>;
}

export function SpeakButton({ card, big = false }: { card: SessionCardView; big?: boolean }) {
  const [playing, setPlaying] = useState(0);
  const v = card.question;
  if (!v.speak && !v.audioUrl) return null;
  return (
    <button
      type="button"
      key={playing}
      className={`q-speak${big ? ' q-speak-big' : ''}${playing ? ' is-playing' : ''}`}
      aria-label="Nghe"
      onClick={(e) => {
        e.stopPropagation();
        speak({ text: v.speak?.text, lang: v.speak?.lang, audioUrl: v.audioUrl });
        setPlaying((n) => n + 1);
      }}
    >
      <SpeakerIcon />
      {big && <span>Nghe</span>}
    </button>
  );
}

const gapify = (html: string) => html.replace(/_{3,}/g, '<span class="fc-gap">_____</span>');

/** Front of a flashcard: the word, the meaning, a sentence with a gap, or the authored front. */
export function FlashFront({ card }: { card: SessionCardView }) {
  const v = card.question;
  const vocab = v.vocab;
  const img = v.imageUrl ? <img className="q-img" alt="" src={v.imageUrl} /> : null;
  if (vocab?.term)
    return (
      <>
        <SpeakButton card={card} />
        <p className="fc-term" lang={v.speak?.lang ?? 'en'}>
          {vocab.term}
        </p>
        {vocab.pronunciation && <p className="fc-pron">{vocab.pronunciation}</p>}
      </>
    );
  if (vocab?.meaning)
    return (
      <>
        <p className="fc-meaning">{vocab.meaning}</p>
        {vocab.pos && <p className="fc-pos">{vocab.pos}</p>}
        {img}
      </>
    );
  if (vocab && card.facet === 'listen') return <SpeakButton card={card} big />;
  if (card.itemKind === 'vocab' && card.facet === 'use')
    return <div className="fc-sentence" lang="en" dangerouslySetInnerHTML={{ __html: gapify(mdBlock(v.flashcard?.frontMd)) }} />;
  return (
    <>
      <Md className="fc-front" src={v.flashcard?.frontMd} />
      {img}
    </>
  );
}

/** Back of a flashcard: the item at a glance. */
export function FlashBack({ card }: { card: SessionCardView }) {
  const f = card.question.flashcard;
  if (card.itemKind === 'vocab') return <Md className={`summary${card.facet === 'use' ? '' : ' vocab'}`} src={f?.backMd} />;
  return (
    <>
      <Md className="fc-q" src={f?.frontMd} />
      <Md className="summary" src={f?.backMd} />
    </>
  );
}

/** Drag to reorder a vertical list (other chips glide aside); arrow keys move the focused chip. */
function useReorder(listRef: RefObject<HTMLOListElement | null>, order: string[], setOrder: (o: string[]) => void, locked: boolean) {
  const orderRef = useRef(order);
  orderRef.current = order;
  useEffect(() => {
    const list = listRef.current;
    if (!list || locked) return;
    type Drag = { chip: HTMLElement; startY: number; rects: DOMRect[]; from: number; to: number; id: number };
    let drag: Drag | null = null;
    const chips = () => [...list.querySelectorAll<HTMLElement>('.q-chip')];
    const down = (e: PointerEvent) => {
      const chip = (e.target as Element).closest<HTMLElement>('.q-chip');
      if (!chip || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      const all = chips();
      drag = { chip, startY: e.clientY, rects: all.map((c) => c.getBoundingClientRect()), from: all.indexOf(chip), to: all.indexOf(chip), id: e.pointerId };
      chip.setPointerCapture(e.pointerId);
      chip.classList.add('is-dragging');
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = e.clientY - drag.startY;
      drag.chip.style.transform = `translate3d(0, ${dy}px, 0) scale(1.03)`;
      const r = drag.rects[drag.from];
      const center = r.top + r.height / 2 + dy;
      let to = drag.from;
      drag.rects.forEach((rr, i) => {
        if (i < drag!.from && center < rr.top + rr.height / 2) to = Math.min(to, i);
        if (i > drag!.from && center > rr.top + rr.height / 2) to = Math.max(to, i);
      });
      drag.to = to;
      const gap = r.height + (drag.rects[1] ? drag.rects[1].top - drag.rects[0].bottom : 8);
      chips().forEach((c, i) => {
        if (c === drag!.chip) return;
        let shift = 0;
        if (drag!.from < to && i > drag!.from && i <= to) shift = -gap;
        if (drag!.from > to && i < drag!.from && i >= to) shift = gap;
        c.style.transform = shift ? `translate3d(0, ${shift}px, 0)` : '';
      });
    };
    const end = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const { chip, from, to } = drag;
      drag = null;
      const all = chips();
      all.forEach((c) => {
        c.style.transition = 'none';
        c.style.transform = '';
      });
      chip.classList.remove('is-dragging');
      if (to !== from) {
        const next = [...orderRef.current];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        flushSync(() => setOrder(next));
      }
      requestAnimationFrame(() => all.forEach((c) => (c.style.transition = '')));
    };
    list.addEventListener('pointerdown', down);
    list.addEventListener('pointermove', move);
    list.addEventListener('pointerup', end);
    list.addEventListener('pointercancel', end);
    return () => {
      list.removeEventListener('pointerdown', down);
      list.removeEventListener('pointermove', move);
      list.removeEventListener('pointerup', end);
      list.removeEventListener('pointercancel', end);
    };
  }, [listRef, setOrder, locked]);
}

export function Question({ card, mode, reveal = null, saved = null, busy = false, onCommit, controls }: Props) {
  const v = card.question;
  const type = v.type;
  const revealed = !!reveal;
  const readOnly = revealed || mode === 'review';
  const response = reveal?.response ?? saved;
  const fb = reveal?.feedback ?? null;
  const lang = v.speak?.lang ?? 'en';

  const [picked, setPicked] = useState<string[]>(() => response?.optionIds ?? []);
  const [tf, setTf] = useState<boolean | null>(() => response?.value ?? null);
  const [text, setText] = useState(() => response?.text ?? '');
  const [hintShown, setHintShown] = useState(false);
  const [blanks, setBlanks] = useState<Record<string, string>>(() => response?.blanks ?? {});
  const [order, setOrder] = useState<string[]>(() => response?.order ?? v.options?.map((o) => o.id) ?? []);
  const [pairs, setPairs] = useState<Record<string, string>>(() => response?.pairs ?? {});
  const [active, setActive] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const firstBlankRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  useReorder(listRef, order, setOrder, readOnly || busy);

  const commit = (input: AnswerPayload) => {
    if (readOnly || busy || !onCommit) return;
    onCommit({ ...input, ...(hintShown ? { hintUsed: true } : {}) });
  };
  const saveLabel = mode === 'exam' ? 'Lưu đáp án' : 'Kiểm tra';

  useImperativeHandle(controls, () => ({
    pick(n: number) {
      const o = v.options?.[n - 1];
      if (type === 'single' && o && !readOnly) {
        setPicked([o.id]);
        commit({ optionIds: [o.id] });
      }
    },
    flip() {
      if (type === 'flashcard') setFlipped(true);
    },
  }));

  // the typing box is ready to type into; listen cards play once when shown
  useLayoutEffect(() => {
    if (mode === 'review') return;
    if (type === 'typing') inputRef.current?.focus({ preventScroll: true });
    if (type === 'cloze') firstBlankRef.current?.focus({ preventScroll: true });
  }, [mode, type]);
  useEffect(() => {
    if (mode === 'study' && card.facet === 'listen' && type !== 'flashcard') speak({ text: v.speak?.text, lang: v.speak?.lang, audioUrl: v.audioUrl });
  }, [card.id]);

  const rootClass = ['q', `q--${type}`, revealed ? 'is-revealed' : '', revealed ? (reveal!.correct ? 'is-right' : 'is-wrongly') : '', busy ? 'q-busy' : '']
    .filter(Boolean)
    .join(' ');

  // ---- head
  const isListen = card.facet === 'listen';
  const speakBtn = type !== 'flashcard' && (v.speak || v.audioUrl) ? <SpeakButton card={card} big={isListen && !v.vocab?.term} /> : null;
  const head = (
    <>
      {!v.vocab?.term && speakBtn}
      {v.vocab?.term && (
        <>
          <p className="q-term" lang={lang}>
            {v.vocab.term}
            {speakBtn}
          </p>
          {(v.vocab.pronunciation || v.vocab.pos) && (
            <p className="q-meta">
              {v.vocab.pronunciation && <span className="q-pron">{v.vocab.pronunciation}</span>}
              {v.vocab.pos && <span className="q-pos">{v.vocab.pos}</span>}
            </p>
          )}
        </>
      )}
      {v.vocab?.meaning && (
        <>
          <p className="q-meaning">{v.vocab.meaning}</p>
          {v.vocab.pos && (
            <p className="q-meta">
              <span className="q-pos">{v.vocab.pos}</span>
            </p>
          )}
        </>
      )}
      {v.promptMd && <Md className="q-prompt" src={v.promptMd} />}
      {v.imageUrl && type !== 'flashcard' && <img className="q-img" alt="" src={v.imageUrl} />}
    </>
  );
  const hasHead = !!(speakBtn || v.vocab?.term || v.vocab?.meaning || v.promptMd || (v.imageUrl && type !== 'flashcard'));

  // ---- body
  let body: ReactNode = null;
  let actions: ReactNode = null;
  const whyOf = (id: string) => {
    const why = fb?.optionWhys?.[id];
    if (!why) return '';
    return v.source === 'generated' ? `Nghĩa của ${why}` : why;
  };

  if (type === 'single' || type === 'multi') {
    const correct = new Set(fb?.correctOptionIds ?? []);
    body = (
      <>
        {type === 'multi' && <p className="q-instr">Chọn {v.multiCount} đáp án</p>}
        <div className="q-options" role={type === 'single' ? 'radiogroup' : 'group'}>
          {(v.options ?? []).map((o, i) => {
            const isPicked = picked.includes(o.id);
            const cls = ['q-opt', isPicked ? 'is-picked' : '', fb && correct.has(o.id) ? 'is-correct' : '', fb && isPicked && !correct.has(o.id) ? 'is-wrong' : '']
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={o.id}
                type="button"
                className={cls}
                data-id={o.id}
                disabled={readOnly}
                aria-pressed={type === 'multi' ? isPicked : undefined}
                onClick={() => {
                  if (readOnly || busy) return;
                  if (type === 'single') {
                    setPicked([o.id]);
                    commit({ optionIds: [o.id] });
                  } else setPicked((p) => (p.includes(o.id) ? p.filter((x) => x !== o.id) : [...p, o.id]));
                }}
              >
                <span className="q-key">{i + 1}</span>
                <Md inline className="q-text" src={o.textMd} />
                <Md inline className="q-why" src={revealed ? whyOf(o.id) : ''} />
              </button>
            );
          })}
        </div>
      </>
    );
    if (type === 'multi')
      actions = (
        <button type="button" className="q-check" disabled={picked.length !== v.multiCount || busy} onClick={() => commit({ optionIds: picked })}>
          {saveLabel}
        </button>
      );
  } else if (type === 'true_false') {
    body = (
      <div className="q-tf">
        {[true, false].map((val) => {
          const cls = ['q-opt', tf === val ? 'is-picked' : '', fb && fb.trueFalseAnswer === val ? 'is-correct' : '', fb && tf === val && fb.trueFalseAnswer !== val ? 'is-wrong' : '']
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={String(val)}
              type="button"
              className={cls}
              data-value={String(val)}
              disabled={readOnly}
              onClick={() => {
                if (readOnly || busy) return;
                setTf(val);
                commit({ value: val });
              }}
            >
              <span className="q-text">{val ? 'Đúng' : 'Sai'}</span>
            </button>
          );
        })}
      </div>
    );
  } else if (type === 'typing') {
    const accepted = fb?.acceptedAnswers ?? [];
    const ok = revealed ? reveal!.correct : null;
    const hint = v.typingHint ? `${v.typingHint.firstLetter} ${'_ '.repeat(Math.max(0, v.typingHint.length - 1)).trim()}` : '';
    body = (
      <>
        <form
          className="q-typing"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) commit({ text });
          }}
        >
          <input
            ref={inputRef}
            className={`q-input${ok === true ? ' is-correct' : ok === false ? ' is-wrong' : ''}`}
            lang={lang}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Gõ từ tiếng Anh…"
            aria-label="Câu trả lời"
            value={text}
            readOnly={readOnly}
            onChange={(e) => setText(e.target.value)}
          />
        </form>
        {hintShown && !revealed && <p className="q-hint">{hint}</p>}
        {revealed && accepted[0] && (!reveal!.correct || reveal!.typo) && (
          <p className="q-answer">
            Đáp án: <strong lang={lang}>{accepted[0]}</strong>
          </p>
        )}
      </>
    );
    actions = (
      <>
        {mode === 'study' && v.typingHint && (
          <button type="button" className="q-hint-btn" disabled={hintShown} onClick={() => (setHintShown(true), inputRef.current?.focus())}>
            Gợi ý
          </button>
        )}
        <button type="button" className="q-check" disabled={!text.trim() || busy} onClick={() => commit({ text })}>
          {saveLabel}
        </button>
      </>
    );
  } else if (type === 'cloze' && v.cloze) {
    const answers = fb?.blankAnswers ?? {};
    const indices = v.cloze.blanks.map(String);
    const filled = indices.every((i) => (blanks[i] ?? '').trim());
    let first = true;
    body = (
      <>
        <p className="q-cloze" lang={lang}>
          {v.cloze.segments.map((s, k) => {
            if ('text' in s) return <Fragment key={k}>{s.text}</Fragment>;
            const idx = String(s.blank);
            const value = blanks[idx] ?? '';
            const accepted = answers[idx];
            const ok = revealed && accepted ? matchTyped(value, accepted) !== 'wrong' : null;
            const ref = first ? firstBlankRef : undefined;
            first = false;
            return (
              <Fragment key={k}>
                <input
                  ref={ref}
                  className={`q-blank${ok === true ? ' is-correct' : ok === false ? ' is-wrong' : ''}`}
                  data-blank={idx}
                  style={{ '--len': `${Math.max(5, value.length + 1, (s.hint?.length ?? 0) + 1)}ch` } as CSSProperties}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label={`Chỗ trống ${idx}`}
                  placeholder={s.hint ?? ''}
                  value={value}
                  readOnly={readOnly}
                  onChange={(e) => setBlanks((b) => ({ ...b, [idx]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filled) commit({ blanks });
                  }}
                />
                {ok === false && accepted?.[0] && <span className="q-fix">{accepted[0]}</span>}
              </Fragment>
            );
          })}
        </p>
        {v.hintMd && <Md className="q-hint q-tr" src={v.hintMd} />}
      </>
    );
    actions = (
      <button type="button" className="q-check" disabled={!filled || busy} onClick={() => commit({ blanks })}>
        {saveLabel}
      </button>
    );
  } else if (type === 'order') {
    const right = fb?.correctOrder ?? null;
    const byId = new Map((v.options ?? []).map((o) => [o.id, o]));
    body = (
      <>
        <p className="q-instr">Kéo để sắp xếp</p>
        <ol className="q-order" ref={listRef}>
          {order.map((id, i) => {
            const at = right ? right.indexOf(id) : -1;
            const cls = ['q-chip', right ? (at === i ? 'is-correct' : 'is-wrong') : '', readOnly ? 'is-locked' : ''].filter(Boolean).join(' ');
            return (
              <li
                key={id}
                className={cls}
                data-id={id}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (readOnly) return;
                  const j = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : -1;
                  if (j < 0 || j >= order.length) return;
                  e.preventDefault();
                  const next = [...order];
                  [next[i], next[j]] = [next[j], next[i]];
                  setOrder(next);
                  requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-id="${id}"]`)?.focus());
                }}
              >
                <span className="q-grip" aria-hidden="true" />
                <Md inline className="q-text" src={byId.get(id)?.textMd} />
                {right && at !== i && <span className="q-pos-fix">{at + 1}</span>}
              </li>
            );
          })}
        </ol>
      </>
    );
    actions = (
      <button type="button" className="q-check" disabled={busy} onClick={() => commit({ order })}>
        {saveLabel}
      </button>
    );
  } else if (type === 'match') {
    const right = fb?.correctPairs ?? null;
    const sequence = Object.keys(pairs);
    const targets = new Map((v.matchTargets ?? []).map((t) => [t.id, t]));
    const all = (v.options ?? []).length;
    body = (
      <>
        <p className="q-instr">Chạm một ô bên trái rồi chạm ô hợp với nó</p>
        <div className="q-match">
          <div className="q-col q-lefts">
            {(v.options ?? []).map((o) => {
              const n = sequence.indexOf(o.id);
              const ok = right ? pairs[o.id] === right[o.id] : null;
              const cls = ['q-left', 'q-opt', active === o.id ? 'is-active' : '', ok === true ? 'is-correct' : ok === false ? 'is-wrong' : ''].filter(Boolean).join(' ');
              return (
                <button
                  key={o.id}
                  type="button"
                  className={cls}
                  data-id={o.id}
                  data-pair={n >= 0 ? n + 1 : ''}
                  disabled={readOnly}
                  onClick={() => {
                    if (readOnly || busy) return;
                    if (pairs[o.id])
                      setPairs((p) => {
                        const { [o.id]: _, ...rest } = p;
                        return rest;
                      });
                    setActive((a) => (a === o.id ? null : o.id));
                  }}
                >
                  <Md inline className="q-text" src={o.textMd} />
                  {ok === false && right && <Md inline className="q-why" src={`→ ${targets.get(right[o.id])?.textMd ?? ''}`} />}
                </button>
              );
            })}
          </div>
          <div className="q-col q-rights">
            {(v.matchTargets ?? []).map((t) => {
              const owner = Object.entries(pairs).find(([, m]) => m === t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  className="q-right q-opt"
                  data-id={t.id}
                  data-pair={owner ? sequence.indexOf(owner[0]) + 1 : ''}
                  disabled={readOnly}
                  onClick={() => {
                    if (readOnly || busy || !active) return;
                    setPairs((p) => {
                      const next = Object.fromEntries(Object.entries(p).filter(([, m]) => m !== t.id));
                      next[active] = t.id;
                      return next;
                    });
                    setActive(null);
                  }}
                >
                  <Md inline className="q-text" src={t.textMd} />
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
    actions = (
      <button type="button" className="q-check" disabled={Object.keys(pairs).length !== all || busy} onClick={() => commit({ pairs })}>
        {saveLabel}
      </button>
    );
  } else if (type === 'flashcard') {
    const flip = () => setFlipped(true);
    body = (
      <div
        className={`q-flash${flipped ? ' is-flipped' : ''}`}
        tabIndex={0}
        role="button"
        aria-label="Lật thẻ"
        onClick={flip}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            flip();
          }
        }}
      >
        <div className="q-face q-front">
          <FlashFront card={card} />
        </div>
        <div className="q-face q-back">
          <FlashBack card={card} />
        </div>
      </div>
    );
    actions = !flipped ? (
      <button type="button" className="q-flip" onClick={flip}>
        Lật thẻ
      </button>
    ) : (
      <div className="q-rate">
        {RATINGS.map((r: RatingValue) => (
          <button key={r} type="button" className="q-rate-btn" data-rating={r} disabled={busy} onClick={() => commit({ rating: r })}>
            <span className="q-rate-label">{RATING_LABEL[r]}</span>
            <span className="q-rate-next">{untilLabel(card.ratingDue?.[r]) || RATING_FALLBACK[r]}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={rootClass} data-facet={card.facet}>
      {hasHead && <div className="q-head">{head}</div>}
      {body}
      {actions && mode !== 'review' && <div className="q-actions">{actions}</div>}
    </div>
  );
}
