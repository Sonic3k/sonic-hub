/* A recording (a song, a voice message, a radio show someone sent): its poster with the player under it. */
import { cdn } from '../api/client';
import type { MediaFile } from '../types';

export default function AudioCard({ m }: { m: MediaFile }) {
  return (
    <div className="v-audio">
      {m.posterUrl ? <img src={cdn(m.posterUrl, 1280)} alt={m.caption ?? ''} /> : <div className="v-audio-ph">♪</div>}
      <audio src={m.cdnUrl} controls autoPlay />
    </div>
  );
}
