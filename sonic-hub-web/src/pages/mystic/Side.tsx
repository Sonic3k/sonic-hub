/* The sidebar while in Huyền học. Kept free of the Tử vi engine so the main bundle stays small. */
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tuviApi } from '../../api/tuvi';
import { isOwner } from '../../components/money/data';

export default function MysticSide() {
  const { pathname: p } = useLocation(), owner = isOwner();
  const saved = useQuery({ queryKey: ['tuvi-profiles'], queryFn: tuviApi.profiles, enabled: owner, staleTime: 60_000, retry: false });
  const on = (b: boolean) => (b ? 'on' : '');
  return (
    <>
      <h4>Huyền học</h4>
      <Link to="/huyen-hoc/tu-vi" className={on(p === '/huyen-hoc/tu-vi' || p === '/huyen-hoc')}><span className="dot" style={{ ['--c' as string]: 'var(--mystic)' }} />Tử vi</Link>
      <h4>Tử vi</h4>
      <Link to="/huyen-hoc/tu-vi" className={on(p === '/huyen-hoc/tu-vi')}>Lập lá số</Link>
      <Link to="/huyen-hoc/tu-vi/sach" className={on(p.startsWith('/huyen-hoc/tu-vi/sach'))}>Sách của bà</Link>
      <Link to="/huyen-hoc/tu-vi/tra-cuu" className={on(p.startsWith('/huyen-hoc/tu-vi/tra-cuu'))}>Tra cứu</Link>
      <Link to="/huyen-hoc/tu-vi/phan-1" className={on(p.startsWith('/huyen-hoc/tu-vi/phan-1'))}>Phần I · An sao</Link>
      {!!saved.data?.length && <h4>Lá số đã lưu</h4>}
      {saved.data?.map(x => (
        <Link key={x.id} to={`/huyen-hoc/tu-vi/la-so/${x.id}`} className={on(p === `/huyen-hoc/tu-vi/la-so/${x.id}`)}>{x.name}<small>{x.year}</small></Link>
      ))}
    </>
  );
}
