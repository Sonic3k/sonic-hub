import { Link, useParams, useSearchParams } from 'react-router-dom';

/* Each big section gets its own full app with its own design (next phases).
   For now: an honest landing pad on the other side of the warp. */
const APPS: Record<string, { title: string; line: string; next: string }> = {
  photos: { title: 'Ảnh', line: 'Toàn bộ album và ảnh, theo cây thư mục và theo dòng thời gian.', next: 'Ứng dụng ảnh riêng — đang dựng ở đợt tiếp theo.' },
  journal: { title: 'Nhật ký', line: 'Không gian đọc thực thụ: chữ to, dòng vừa mắt, ảnh nằm đúng chỗ trong bài.', next: 'Không gian blog — đang dựng ở đợt tiếp theo.' },
  angels: { title: 'Angels', line: 'Mỗi người một chương: ảnh, kỷ niệm, và phòng đọc chat của từng nền tảng.', next: 'Ứng dụng Angels — đang dựng ở đợt tiếp theo.' },
  games: { title: 'Game', line: 'Những trò đã chơi, đang chơi, và sẽ tự làm.', next: 'Kệ game — đang dựng ở đợt tiếp theo.' },
  football: { title: 'Bóng đá', line: 'Fantasy Football của tôi.', next: 'Chưa cấu hình địa chỉ trang Fantasy (VITE_FOOTBALL_URL).' },
};

export default function Arrival({ app }: { app: string }) {
  const { slug } = useParams(), [sp] = useSearchParams(), a = APPS[app] ?? APPS.photos, tag = sp.get('tag');
  return (
    <div className={`arrival arrival-${app}`}>
      <div className="arr-in">
        <p className="arr-k">Đã warp tới</p>
        <h1>{a.title}{tag ? <em> · {tag}</em> : null}{slug ? <em> · {slug}</em> : null}</h1>
        <p className="arr-line">{a.line}</p>
        <p className="arr-next">{a.next}</p>
        <Link to="/" className="arr-back">← Về vũ trụ</Link>
      </div>
    </div>
  );
}
