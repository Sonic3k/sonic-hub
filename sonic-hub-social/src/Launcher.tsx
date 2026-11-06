/* The Social Media portal's front door: the networks, as they were. */
import { useQuery } from '@tanstack/react-query';
import { social } from './api';
import { barText, useMoment, utc } from './time';
import { L } from './ui/bits';
import { IChat, IPhoto, IQuote } from './ui/icons';

const SOON = [
  { name: 'Yahoo', mark: 'Y!', color: '#6001d2' },
  { name: 'Instagram', mark: <IPhoto size={26} />, color: '#c13584' },
  { name: 'Threads', mark: <IQuote size={26} />, color: '#111' },
];

export default function Launcher() {
  const { T } = useMoment();
  const range = useQuery({ queryKey: ['range'], queryFn: social.range });
  const r = range.data;
  const from = utc(r?.from), to = utc(r?.to);
  return (
    <div className="launch">
      <header>
        <h1>Social Media</h1>
        <p>{from && to ? <>Dữ liệu từ {barText(from).split(' · ')[0]} đến {barText(to).split(' · ')[0]} · đang xem lúc {barText(T)}</> : 'Đang xem lúc ' + barText(T)}</p>
      </header>
      <div className="launch-grid">
        <L to="/facebook" className="app-card fb-card">
          <span className="app-mark"><svg viewBox="0 0 24 24" width="30" height="30"><circle cx="12" cy="12" r="7.2" fill="none" stroke="#fff" strokeWidth="2.8" /><circle cx="12" cy="12" r="2.1" fill="#fff" /></svg></span>
          <b>Facebook</b>
          <small>Trang cá nhân, bài đăng, nhóm và trang{r ? ` · ${r.posts.toLocaleString('vi-VN')} bài` : ''}</small>
        </L>
        <L to="/messenger" className="app-card ms-card">
          <span className="app-mark"><IChat size={30} /></span>
          <b>Messenger</b>
          <small>Tin nhắn Facebook{r ? ` · ${r.threads} cuộc trò chuyện` : ''}</small>
        </L>
        {SOON.map(s => (
          <div key={s.name} className="app-card soon" style={{ ['--c' as string]: s.color }}>
            <span className="app-mark">{s.mark}</span>
            <b>{s.name}</b>
            <small>Sắp có</small>
          </div>
        ))}
      </div>
    </div>
  );
}
