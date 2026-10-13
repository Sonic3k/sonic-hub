/* A PDF (a magazine, a scanned paper): the browser's own reader in the stage, and a button to open it on its own. */
import type { MediaFile } from '../types';

export default function DocumentCard({ m }: { m: MediaFile }) {
  return (
    <div className="v-doc">
      <iframe src={m.cdnUrl} title={m.caption ?? m.fileName} />
      <a className="v-doc-open" href={m.cdnUrl} target="_blank" rel="noreferrer">📄 Mở {m.fileName}</a>
    </div>
  );
}
