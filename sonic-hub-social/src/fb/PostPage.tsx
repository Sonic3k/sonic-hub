/* One post on its own page, with every comment it had by the moment (a note reads in full here). */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { social } from '../api';
import { useMoment } from '../time';
import { Loading } from '../ui/bits';
import PostCard from './PostCard';
import { Unavailable } from './Profile';

export default function PostPage() {
  const { id = '' } = useParams();
  const { at } = useMoment();
  const post = useQuery({ queryKey: ['post', id, at], queryFn: () => social.post(id, at), retry: false });
  if (post.isLoading) return <Loading />;
  if (post.isError) return <div className="single"><Unavailable /></div>;
  return <div className={`single ${post.data!.body ? 'note' : ''}`}><PostCard p={post.data!} full /></div>;
}
