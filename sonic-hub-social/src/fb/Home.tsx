/* The News Feed of the owner at the moment, between the shortcuts and the day's birthdays. */
import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { social } from '../api';
import { barText, useMoment } from '../time';
import { Avatar, L, Name, profilePath } from '../ui/bits';
import { ICake, IChat, IGroup, IHome, IPage, IPhoto } from '../ui/icons';
import PostList from './PostList';
import { MeContext } from './PostCard';

export default function Home() {
  const { at, T } = useMoment();
  const me = useContext(MeContext);
  const home = useQuery({ queryKey: ['home', at], queryFn: () => social.home(at) });
  const h = home.data;
  return (
    <div className="fb-home">
      <aside className="fb-left">
        {me && <L to={profilePath(me)} className="left-row me"><Avatar r={me} size={20} link={false} /><span>{me.name}</span></L>}
        <L to="/facebook" className="left-row on"><IHome size={18} /><span>News Feed</span></L>
        <L to="/messenger" className="left-row"><IChat size={18} /><span>Messages</span></L>
        {!!h?.groups.length && <h4>Groups</h4>}
        {h?.groups.map(g => <L key={g.id} to={profilePath(g)} className="left-row"><Avatar r={g} size={20} link={false} /><span>{g.name}</span></L>)}
        {!!h?.pages.length && <h4>Pages</h4>}
        {h?.pages.map(g => <L key={g.id} to={profilePath(g)} className="left-row"><Avatar r={g} size={20} link={false} /><span>{g.name}</span></L>)}
        {!h?.groups.length && !h?.pages.length && <><h4>Explore</h4><span className="left-row muted"><IGroup size={18} />Groups</span><span className="left-row muted"><IPage size={18} />Pages</span></>}
      </aside>
      <section className="fb-feed">
        <div className="card composer">
          <div className="composer-tabs"><span><IPhoto size={14} /> Status</span><span><IPhoto size={14} /> Photo/Video</span></div>
          <div className="composer-in">{me && <Avatar r={me} size={40} link={false} />}<span>What's on your mind{me ? `, ${me.name.split(' ').slice(-1)[0]}` : ''}?</span></div>
        </div>
        <PostList qkey={['feed', at]} load={before => social.feed(at, before)} empty="Nothing in the News Feed at this moment." />
      </section>
      <aside className="fb-right">
        {!!h?.birthdays.length && (
          <div className="card side-card">
            <div className="side-title"><ICake size={16} /> Birthdays</div>
            <p className="bday">{h.birthdays.map((b, i) => <span key={b.id}>{i > 0 && (i === h.birthdays.length - 1 ? ' and ' : ', ')}<Name r={b} /></span>)} {h.birthdays.length > 1 ? 'have birthdays' : 'has a birthday'} today.</p>
          </div>
        )}
        <div className="card side-card moment-card">
          <div className="side-title">Looking from</div>
          <div className="moment-big">{barText(T)}</div>
          <p className="muted">Everything here is as it stood at this moment.</p>
        </div>
      </aside>
    </div>
  );
}
