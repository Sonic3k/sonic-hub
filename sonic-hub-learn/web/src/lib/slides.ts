/* A lesson's slide deck in a shadow root, styled by the subject's theme. Each tap reveals the next .step. */

export interface SlideState {
  index: number;
  count: number;
  step: number;
  steps: number;
  title: string;
}

export interface SlideDeckApi {
  next(): boolean;
  prev(): void;
  goto(i: number): void;
}

export function mountSlides(host: HTMLElement, slidesHtml: string, themeCss: string | null, onChange?: (s: SlideState) => void, extraCss = ''): SlideDeckApi {
  const theme = (themeCss ?? '').replace(/:root/g, ':host').replace(/\.slides\s+section/g, 'section').replace(/\.slides\s+/g, '');
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${theme}
    :host { display: block; position: relative; }
    .deck { position: relative; width: 100%; height: 100%; overflow: hidden; border-radius: inherit; }
    section { position: absolute; inset: 0; padding: clamp(20px, 5vw, 44px); box-sizing: border-box; overflow: auto; opacity: 0; transform: translateX(24px); transition: opacity .35s, transform .45s cubic-bezier(.2,.8,.3,1); pointer-events: none; font-size: clamp(15px, 2.4vw, 19px); line-height: 1.5; }
    section.is-on { opacity: 1; transform: none; pointer-events: auto; }
    section.is-past { transform: translateX(-24px); }
    section h2 { margin: 0 0 .6em; font-size: clamp(22px, 4.2vw, 34px); line-height: 1.15; }
    .step { opacity: 0; transform: translateY(10px); transition: opacity .35s, transform .45s cubic-bezier(.2,.8,.3,1); }
    .step.is-shown { opacity: 1; transform: none; }
    .step:not(.is-shown), .step:not(.is-shown) * { animation-play-state: paused !important; }
    @media (prefers-reduced-motion: reduce) { section, .step { transition: none; } }
    ${extraCss}
  </style><div class="deck">${slidesHtml}</div>`;
  const sections = [...shadow.querySelectorAll<HTMLElement>('section')];
  let si = 0;
  const steps = (s: HTMLElement) => [...s.querySelectorAll<HTMLElement>('.step')];
  const shown = (s: HTMLElement) => steps(s).filter((x) => x.classList.contains('is-shown')).length;
  const paint = () => {
    sections.forEach((s, i) => {
      s.classList.toggle('is-on', i === si);
      s.classList.toggle('is-past', i < si);
    });
    const cur = sections[si];
    if (cur) onChange?.({ index: si, count: sections.length, step: shown(cur), steps: steps(cur).length, title: cur.dataset.title ?? '' });
  };
  const api: SlideDeckApi = {
    next() {
      const s = sections[si];
      if (!s) return false;
      const pending = steps(s).find((x) => !x.classList.contains('is-shown'));
      if (pending) pending.classList.add('is-shown');
      else if (si < sections.length - 1) si++;
      else return false;
      paint();
      return true;
    },
    prev() {
      const s = sections[si];
      if (!s) return;
      const on = steps(s).filter((x) => x.classList.contains('is-shown'));
      if (on.length) on[on.length - 1].classList.remove('is-shown');
      else if (si > 0) si--;
      paint();
    },
    goto(i: number) {
      si = Math.max(0, Math.min(i, sections.length - 1));
      paint();
    },
  };
  paint();
  return api;
}
