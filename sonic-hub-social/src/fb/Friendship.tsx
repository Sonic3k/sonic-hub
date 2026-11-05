/* What two people shared up to the moment: when they became friends, the friends they had in common, and the posts
   between them. */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { social } from '../api';
import { monthYear, useMoment } from '../time';
import { Avatar, Loading, Name } from '../ui/bits';
import PostList from './PostList';
import { Unavailable } from './Profile';

export default function Friendship() {
  const { a = '', b = '' } = useParams();
  const { at } = useMoment();
  const head = useQuery({ queryKey: ['friendship', a, b, at], queryFn: () => social.friendship(a, b, at), retry: false });
  if (head.isLoading) return <Loading />;
  if (head.isError) return <div className="single"><Unavailable /></div>;
  const f = head.data!;
  return (
    <div className="single">
      <div className="card friendship-head">
        <div className="pair"><Avatar r={f.a} size={72} /><Avatar r={f.b} size={72} /></div>
        <h2><Name r={f.a} /> and <Name r={f.b} /></h2>
        {f.since ? <p className="muted">Friends since {monthYear(f.since)}</p> : <p className="muted">Not friends at this moment</p>}
        {f.mutual.length > 0 && (
          <div className="mutual"><small className="muted">{f.mutual.length} mutual friend{f.mutual.length > 1 ? 's' : ''}</small>
            <div>{f.mutual.map(m => <Avatar key={m.id} r={m} size={32} />)}</div></div>
        )}
      </div>
      <PostList qkey={['friendship-posts', a, b, at]} load={before => social.friendship(a, b, at, before).then(x => ({ items: x.posts, next: x.next }))}
        empty="Nothing between them yet at this moment." />
    </div>
  );
}
