/* A DOS game in js-dos (DOSBox in WebAssembly), served from /jsdos/: the bundle comes from the API (the private bucket),
   runs at once, without js-dos's own buttons, and stops when the window closes. */
import { useEffect, useRef, useState } from 'react';
import { packageFile } from '../api/hub';

type DosProps = { stop: () => Promise<void> | void };
declare global { interface Window { Dos?: (el: HTMLElement, opts: Record<string, unknown>) => DosProps } }

let loading: Promise<void> | null = null;
/** js-dos's script and stylesheet, once per page */
function loadJsDos(): Promise<void> {
  if (window.Dos) return Promise.resolve();
  return loading ??= new Promise<void>((ok, fail) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = '/jsdos/js-dos.css';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = '/jsdos/js-dos.js'; s.onload = () => ok(); s.onerror = () => { loading = null; fail(new Error('js-dos')); };
    document.head.appendChild(s);
  });
}

/** scale: how much the screen around it is enlarged (an old 800×600 screen shown bigger). js-dos measures its box on the
 *  page and sizes its picture to that, which inside an enlarged screen would come out enlarged twice; so the player
 *  sits in a box drawn that much larger and shrunk back, where what it measures is what it gets. */
export default function DosGame({ pkg, scale = 1 }: { pkg: string; scale?: number }) {
  const el = useRef<HTMLDivElement>(null), [err, setErr] = useState(false);
  useEffect(() => {
    let props: DosProps | null = null, gone = false;
    loadJsDos().then(() => {
      if (gone || !el.current || !window.Dos) return;
      props = window.Dos(el.current, { url: packageFile(pkg), pathPrefix: '/jsdos/emulators/', kiosk: true, autoStart: true,
        noCloud: true, noNetworking: true, mouseCapture: false, theme: 'dark' });
    }).catch(() => setErr(true));
    return () => { gone = true; try { void props?.stop(); } catch { /* already stopped */ } };
  }, [pkg]);
  if (err) return <div className="gr-err">Không mở được trình chạy DOS.</div>;
  if (scale === 1) return <div className="gr-dos" ref={el} />;
  return (
    <div className="gr-dos">
      <div style={{ position: 'absolute', left: 0, top: 0, width: `${100 * scale}%`, height: `${100 * scale}%`, transform: `scale(${1 / scale})`, transformOrigin: '0 0' }}>
        <div ref={el} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
