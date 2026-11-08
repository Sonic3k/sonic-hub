/* Pieces shared by the Yahoo! Messenger windows: the files of his copy (skin, emoticons, sounds) by name, a picture
   cut from a sprite of states, and a line of chat with its emoticons. */
import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { useAssets } from '../../assets';
import { ymPieces } from './emoticons';

export const useYm = () => useAssets('yahoo');

/** One state of a sprite whose states are stacked top to bottom (h each), or side by side with across. */
export function Sp({ src, w, h, at = 0, across, className, title, style }: {
  src?: string; w: number; h: number; at?: number; across?: boolean; className?: string; title?: string; style?: CSSProperties;
}) {
  const pos = across ? `${-at * w}px 0` : `0 ${-at * h}px`;
  return <i className={`ym-sp ${className ?? ''}`} title={title}
    style={{ width: w, height: h, backgroundImage: src ? `url("${src}")` : undefined, backgroundPosition: pos, ...style }} />;
}

/** A background stretched from one state of a stacked sprite of n states. */
export const stateBg = (src: string | undefined, n: number, at: number): CSSProperties => src ? {
  backgroundImage: `url("${src}")`, backgroundSize: `100% ${n * 100}%`, backgroundPosition: `0 ${n > 1 ? (at * 100) / (n - 1) : 0}%`,
} : {};

export const bgUrl = (src: string | undefined): CSSProperties => (src ? { backgroundImage: `url("${src}")` } : {});

/** A line as Messenger drew it: the codes it knew became their pictures; the rest stays as typed. */
export function YmText({ text }: { text: string }) {
  const { a } = useYm();
  const out: ReactNode[] = ymPieces(text).map((p, i) => {
    if (typeof p === 'string') return <Fragment key={i}>{p}</Fragment>;
    const src = a(`smileys/${p.id}.gif`);
    return src ? <img key={i} className="ym-emo" src={src} alt={p.code} title={p.code} /> : <Fragment key={i}>{p.code}</Fragment>;
  });
  return <>{out}</>;
}

/** A buzz, as it was archived ("<ding>") or typed. */
export const isBuzz = (text?: string | null) => !!text && /^\s*(<ding>|BUZZ!!!)\s*$/i.test(text);

/** The files each Messenger draws its windows with (buddy list, conversation, card, alert), to have them before it
 *  opens; its emoticons come as they are typed. */
export function ymFiles(v: string): string[] {
  const common = ['icon/im-16.png', 'icon/messenger-16.png', 'icon/messenger-256.png', 'skin/images/DefaultFriendIcon.png'];
  if (v === 'YM8') return [...common, 'ads/2007.png', 'res/png-1225.png', 'res/png-1226.png', 'res/png-1228.png',
    ...['avatar-2007', 'avatars', 'busy', 'mail', 'offline', 'online', 'phone', 'plugins', 'voicemail', 'websearch',
      'im-emobar', 'im-friendbar-icons', 'im-search', 'im-toolbar'].map(n => `ym8/${n}.png`)];
  if (v === 'YM9') return [...common, 'ads/2010.png', 'skin/images/online.png', 'skin/images/offline.png', 'skin/theme/Yahoo!_Messenger.png',
    ...['websearch', 'im-emobar', 'im-emobar-r', 'im-toolbar'].map(n => `ym9/${n}.png`)];
  return [...common, v === 'YM10' ? 'ads/2011.png' : 'ads/2013.png', 'ym11/websearch-logo.png', 'skin/theme/mainmenubarbg_aero.png',
    'skin/theme/Yahoo!_Messenger_aero.png', 'skin/SlotManager/BottomPluginPanel.png',
    ...['AddBuddy', 'Plugins-arrow', 'SearchOptions', 'TabLeft', 'TabMenuLeft', 'TabRight', 'gameButton', 'icon_info', 'info_bg', 'me_bg',
      'new_updates'].map(n => `skin/FriendList/${n}.png`),
    ...['Clear', 'RecentContact_Icon', 'addbuddy', 'bg_selected', 'email', 'mobile_status', 'offline', 'online', 'rolodex',
      'single_arrow_down', 'yinsider', 'SendFile', 'video', 'voice'].map(n => `skin/images/${n}.png`),
    ...['Activities', 'IMTheme', 'PhotoShare', 'im_side_bg', 'im_tb_audibles', 'im_tb_buzz', 'im_tb_disp_img_toggle', 'im_tb_emoticon',
      'im_tb_format', 'im_tb_screen_capture'].map(n => `skin/IMWindow/${n}.png`),
    ...['background', 'card-CallButton', 'card-SmsButton', 'card-VideoButton'].map(n => `skin/ContactCard/${n}.png`)];
}
