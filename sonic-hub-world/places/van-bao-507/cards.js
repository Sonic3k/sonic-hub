/* What this place says: the cards behind the bright dots, the word that goes with a year, and the list of what is
   real and what is guessed. Everything said here is either read off the archive (and says where), or marked as a guess. */
import { YEARS, WALL, atOf } from './era.js';
import { pcAt, phoneAt } from '../../engine/hub.js';

export const notes = {
  title: 'Chỗ nào là thật, chỗ nào là đoán',
  body: [
    ['p', 'Mặt bằng, đồ đạc và chỗ đặt của chúng theo hai video quay nhà tháng 6/2013 (Hydrocity → [2013.06] Van Bao Home), mấy tấm ảnh chụp ở nhà ngày 22/9/2012 và hai tấm Tết 2009 (bể cá, tượng Di Lặc).'],
    ['p', 'Máy tính, điện thoại và ngày tháng của chúng lấy từ mục Máy tính của Sonic Hub.'],
    ['p', 'Những chỗ đoán:'],
    ['ul', [
      'Kích thước các phòng: ước theo hình, chưa có số đo.',
      'Nhà giữ nguyên bài trí của 2013 cho cả 2005–2012; chỉ máy móc và tờ lịch đổi theo năm.',
      'Chiếc máy Win XP cũ đặt ở bàn phòng bố mẹ trong 2006–2008.',
      'Tivi: loại đèn hình đến 2009, màn hình phẳng từ 2010.',
      'Màn hình máy tính, tivi, điện thoại là hình vẽ phỏng theo; riêng 2011–2012 là đúng tấm ảnh xe buýt 27 đặt làm hình nền.',
      'Tên gọi "phòng bố mẹ" và phía nào của phòng lớn là của ai.',
      'Hướng nắng: đặt theo vệt nắng chiều in song cửa lên tường tivi trong video.',
      'Nhà hàng xóm ngoài cửa sổ chỉ là kiểu phố quanh đó, không phải từng căn thật.',
    ]],
  ],
};

/** the line shown when the year changes */
export const sayYear = year => { const Y = YEARS[year]; return `${Y.pc.name}, ${Y.pc.os}${Y.phone ? ' · Nokia' : ''}`; };

/** what opens when a bright dot is touched: { title, body } — body is a list of ['p', text, class?], ['ul', [items]], ['a', text, address] */
export function card(id, { year, hour, extra }) {
  const Y = YEARS[year], at = atOf(year, hour), when = `${hour === 'toi' ? '21:00' : '18:05'} ngày 15/6/${year}`;
  switch (id) {
    case 'pc': {
      const b = [['p', `${Y.pc.name} — ${Y.pc.model}.`], ['p', `${Y.pc.os} · ${Y.pc.web} · ${Y.pc.ym}`], ['p', `Dùng: ${Y.pc.used}.`, 'dim'],
        ['p', year >= 2011 ? `Hình nền: ${WALL[year]} — trên màn hình ở đây là đúng tấm ảnh đó.` : `Hình nền ghi trong mục Máy tính: ${WALL[year]}. Màn hình ở đây chỉ là hình vẽ phỏng theo.`, 'dim'],
        ['a', `Bật máy tính này lúc ${when}`, pcAt(at)]];
      if (Y.phone) b.push(['p', 'Trên bàn còn chiếc Nokia (Series 40), dùng từ 2006 đến giữa 2015.', 'dim'], ['a', `Bật điện thoại lúc ${when}`, phoneAt(at)]);
      else b.push(['p', 'Năm 2005 chưa có điện thoại riêng.', 'dim']);
      return { title: 'Góc máy tính', body: b };
    }
    case 'tv': return { title: 'Tivi', body: [['p', extra ? 'Đang bật.' : 'Đang tắt.'], ['p', year <= 2009 ? 'Loại đèn hình. Năm đổi sang màn hình phẳng là đoán (ở đây: 2010).' : 'Màn hình phẳng, như trong ảnh 9/2012 và video 2013. Năm đổi là đoán (ở đây: 2010).', 'dim'], ['p', 'Mỗi lần chạm là bật hoặc tắt.', 'dim']] };
    case 'piano': return { title: 'Đàn piano', body: [['p', 'Đàn đứng màu đen, phủ khăn ren, kê sát tường dưới mấy tầng giá sách.'], ['p', 'Mỗi lần chạm là một hợp âm.', 'dim']] };
    case 'fish': return { title: 'Bể cá', body: [['p', 'Bể khung gỗ gắn vào mảng tường ốp đá cạnh cửa ban công.'], ['p', 'Ảnh mùng 2 Tết 2009 (Family → 2009 → Nha): cành đào cắm ngay trước bể.', 'dim']] };
    case 'dilac': return { title: 'Tượng Di Lặc', body: [['p', 'Tượng gỗ nâng thỏi vàng qua đầu, đứng ở đầu kệ tivi.'], ['p', 'Có trong ảnh Tết 2009 và trong video 2013.', 'dim']] };
    case 'door507': return { title: 'Cửa căn 507', body: [['p', 'Cửa gỗ hai cánh, ngoài là cửa sắt song dọc gắn biển số 507.'], ['p', 'Theo video hành lang tháng 6/2013.', 'dim']] };
    case 'gallery': return { title: 'Hành lang tầng 5', body: [['p', 'Hành lang chung lát gạch bông, lan can bê tông nan đứng; 507 là căn cuối dãy.'], ['p', 'Đi dọc hành lang, qua mấy căn bên cạnh là tới cầu thang.', 'dim']] };
    case 'globe': return { title: 'Quả địa cầu', body: [['p', 'Đặt trên nóc dãy tủ ngăn đôi phòng lớn, nên đứng bên nào cũng thấy.']] };
    case 'books': return { title: 'Giá sách', body: [['p', 'Giá sách kín tường, từ cửa phòng tới cây đàn.']] };
    case 'window': return { title: 'Cửa sổ góc máy tính', body: [['p', 'Song ngang, lưới chống muỗi, bên ngoài là chuồng cọp. Nhìn ra mái ngói đỏ của mấy nhà thấp phía dưới.']] };
    case 'phone': return { title: 'Điện thoại bàn', body: [['p', 'Máy bàn màu kem trên tủ đầu giường.']] };
    default: return null;
  }
}
