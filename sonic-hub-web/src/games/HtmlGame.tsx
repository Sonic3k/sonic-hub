/* A web game that is one .html file written by someone else (a game he copied from the web to look at). The file is
   read from the API as text and shown in a frame that has none of this site's origin: it cannot reach the page around
   it, this site's storage or its session, cannot open windows or lead the tab away, and loads only from the hosts its
   package lists (config "hosts": its fonts). What it keeps for itself (its settings) lasts until the frame closes.
   The bar above it lets the game fill the screen and come back (a phone has no other way out of a filled screen). */
import { useEffect, useRef, useState } from 'react';
import { packageFile } from '../api/hub';

/** the hosts as "https://name" words only, whatever the package's config holds */
const hostList = (hosts?: string) => (hosts ?? '').split(/\s+/).filter(h => /^https:\/\/[a-z0-9.-]+$/i.test(h)).join(' ');

/** The page with its policy ahead of everything in the file, so nothing of its own loads or runs before the policy
 *  holds (a page that opens with a doctype keeps one in front). */
export function confined(html: string, hosts?: string): string {
  const policy = `default-src 'unsafe-inline' data: blob: ${hostList(hosts)}; form-action 'none'; base-uri 'none'`;
  return (/^\s*<!doctype/i.test(html) ? '<!doctype html>' : '') + `<meta http-equiv="Content-Security-Policy" content="${policy}">` + html;
}

export default function HtmlGame({ pkg, title, hosts }: { pkg: string; title: string; hosts?: string }) {
  const [doc, setDoc] = useState<string | null>(null), [failed, setFailed] = useState(false), [full, setFull] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let gone = false;
    setDoc(null); setFailed(false);
    fetch(packageFile(pkg)).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
      .then(t => { if (!gone) setDoc(confined(t, hosts)); }).catch(() => { if (!gone) setFailed(true); });
    return () => { gone = true; };
  }, [pkg, hosts]);

  // leaving the browser's own full screen (Esc) brings the bar's button back in step; the page behind does not scroll
  useEffect(() => {
    const left = () => { if (!document.fullscreenElement) setFull(false); };
    document.addEventListener('fullscreenchange', left);
    return () => document.removeEventListener('fullscreenchange', left);
  }, []);
  useEffect(() => {
    if (!full) return;
    const root = document.documentElement, was = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => { root.style.overflow = was; };
  }, [full]);

  const toggle = () => {
    if (full) { setFull(false); if (document.fullscreenElement) void document.exitFullscreen().catch(() => { /* already out */ }); }
    else { setFull(true); void box.current?.requestFullscreen?.().catch(() => { /* a phone: the box fills the page instead */ }); }
  };

  if (failed) return <div className="gr-err">Không mở được game này.</div>;
  return (
    <div className={`gr-html${full ? ' full' : ''}`} ref={box}>
      <div className="gr-html-bar"><button type="button" onClick={toggle}>{full ? '← Thu nhỏ' : 'Toàn màn hình'}</button></div>
      {doc === null ? <div className="gr-wait">…</div>
        : <iframe title={title} srcDoc={doc} sandbox="allow-scripts allow-pointer-lock" allow="fullscreen *; autoplay *; gamepad *"
            referrerPolicy="no-referrer" onLoad={e => e.currentTarget.focus()} />}
    </div>
  );
}
