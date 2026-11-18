/* What this place says: the cards behind the bright dots, the word that goes with a year, and the list of what is
   real and what is guessed. Everything said here is either read off the archive (and says where), or marked as a guess. */
import { YEARS, WALL, atOf, PIANO_FROM } from './era.js';
import { pcAt, phoneAt } from '../../engine/hub.js';

export const notes = {
  title: 'Chỗ nào là thật, chỗ nào là đoán',
  body: [
    ['p', 'Mặt bằng, đồ đạc và chỗ đặt của chúng theo hai video quay nhà tháng 6/2013 (Hydrocity → [2013.06] Van Bao Home), mấy tấm ảnh chụp ở nhà ngày 22/9/2012, một tấm 25/5/2013, hai tấm Tết 2009 (bể cá, tượng Di Lặc) và phóng sự về onthi.com quay ở phòng lớn ngày 23/4/2008.'],
    ['p', 'Đã rà lại theo từng khung hình: bể cá nằm trên tường phía bếp; sau mảng tường đó là chỗ giặt có bồn rửa và máy giặt, cửa nhà tắm mở từ đấy; hai cửa phòng ngủ mở ra một hốc nhỏ ở cuối phòng khách; mặt nam của bếp và phòng lớn là một đường thẳng; lô gia treo ngoài bếp, chạy sang đông tới sát cửa sổ phòng lớn, và ô cửa sổ ấy bị dãy tủ (chỗ hốc bàn học) chia đôi.'],
    ['p', 'Đo lại ngày 18/11/2026 bằng những vật đã biết cỡ có trong ảnh và video — bóng tuýp 1,2 m trên tường phòng khách, bình nước 19 lít, bệ bếp, gạch lát bếp 50 cm: dải phía bắc (phòng khách, hốc cửa, phòng bố mẹ, hai ban công) chỉ sâu 2,8 m chứ không phải 3,5 m như bản vẽ đầu; phòng khách dài 5,25 m. Bếp thì rộng hơn bản vẽ đầu: 2,75 m (chiếc tủ lạnh sâu 75 cm đứng sát tường tây mà mặt trước còn cách tường đông 2 m), nên chỗ giặt và nhà tắm chỉ còn 1,25 m. Các phòng cộng lại vẫn khoảng 76 m² (bản vẽ đầu: 84).'],
    ['p', 'Máy tính, điện thoại và ngày tháng của chúng lấy từ mục Máy tính của Sonic Hub.'],
    ['p', 'Những chỗ đoán:'],
    ['ul', [
      'Kích thước: phòng khách, bếp, chỗ giặt, nhà tắm đo theo hình (lệch chừng 10–25 cm); phòng lớn, chiều dài phòng bố mẹ và độ sâu lô gia vẫn là ước.',
      'Trần cao khoảng 2,65 m: hai cách đo cho 2,5–2,65 m và 2,6–2,8 m, chưa có số đo thật.',
      'Phòng bố mẹ: tường phía đông có cửa ra ban công ở sát góc bắc, rồi tới ô cửa sổ ba cánh có bậu; ban công ấy — phần còn lại sau khi sửa nhà — quây lồng sắt (video 3:52–4:31). Trong video 6/2013 cửa bị rèm che kín, ghế và quạt đứng chắn phía trước; ở đây cửa để mở, đồ đạc xếp gọn lại cho có lối ra. Cửa rộng bao nhiêu, mở vào hay mở ra, ban công sâu bao nhiêu (đặt 1 m) là ước.',
      'Cửa bếp ra lô gia: ô cửa rộng chừng 1 m, cách tường đông 95 cm (hết bệ bếp rồi một mảng gạch trắng), hai cánh kính mở ra phía lô gia. Số cánh và kiểu cánh là ước — trong video chỉ thấy một cánh dựng nghiêng ở mép đông.',
      'Nhà tắm: bề ngang 1,25 m là phần còn lại sau khi đo bếp; chỗ đặt bồn cầu, cửa sổ, bình nóng lạnh theo video 2:27.',
      'Trước 2009 chỉ có phóng sự tháng 4/2008 (quay trong phòng lớn); phần còn lại của 2005–2008 dựng theo những năm sau.',
      'Đàn piano đặt từ 2009 (ảnh sớm nhất 9/2009); tháng 4/2008 chỗ đó còn là bàn học.',
      'Tủ lạnh: chiếc hai cửa đứng đầu bếp như ảnh 9/2012, đặt cho mọi năm. Góc bếp phía tây cạnh cửa lô gia — chỗ chiếc tủ lạnh lớn của năm 2013 — để trống.',
      'Mảng tường dày giữa bếp và phòng lớn, và độ sâu của hốc trước hai cửa phòng ngủ (70 cm).',
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
    case 'piano': return year >= PIANO_FROM
      ? { title: 'Đàn piano', body: [['p', 'Đàn đứng màu đen, phủ khăn ren, kê sát tường dưới mấy tầng giá sách.'], ['p', 'Mỗi lần chạm là một hợp âm. Đàn có trong ảnh từ tháng 9/2009; năm đàn về (2009) là đoán.', 'dim']] }
      : { title: 'Bàn học', body: [['p', 'Trước khi có đàn piano, góc này là bàn học cạnh cửa sổ, dưới mấy tầng giá sách treo tường.'], ['p', 'Phóng sự truyền hình về onthi.com quay ngay tại bàn này ngày 23/4/2008 (2007-2017 → onthi.com → onthi_vcd.mp4).', 'dim']] };
    case 'fish': return { title: 'Bể cá', body: [['p', 'Bể treo tường, khung gỗ như khung tranh, trên mảng tường ốp đá phía bếp, sát góc ban công. Dưới là chiếc tủ thấp.'], ['p', 'Vị trí theo video 6/2013 (phút 3:23). Ảnh mùng 2 Tết 2009 (Family → 2009 → Nha): cành đào cắm ngay trước bể.', 'dim']] };
    case 'dilac': return { title: 'Tượng Di Lặc', body: [['p', 'Tượng gỗ nhỏ nâng thỏi vàng qua đầu, đứng trên kệ tivi, cạnh màn hình.'], ['p', 'Có trong ảnh Tết 2009, ảnh 22/9/2012 và video 2013.', 'dim']] };
    case 'door507': return { title: 'Cửa căn 507', body: [['p', 'Cửa gỗ hai cánh sát góc nhà: cánh nhỏ đóng im, cánh lớn có tay nắm; ngoài là cửa sắt song dọc gắn biển số 507.'], ['p', 'Theo video tháng 6/2013 (4:52–5:01).', 'dim']] };
    case 'gallery': return { title: 'Hành lang tầng 5', body: [['p', 'Hành lang chung lát gạch bông, lan can bê tông nan đứng; 507 là căn cuối dãy.'], ['p', 'Đi dọc hành lang, qua mấy căn bên cạnh là tới cầu thang.', 'dim']] };
    case 'globe': return { title: 'Quả địa cầu', body: [['p', 'Đặt trên nóc dãy tủ ngăn đôi phòng lớn, nên đứng bên nào cũng thấy.']] };
    case 'books': return { title: 'Giá sách', body: [['p', 'Giá sách kín tường, từ cửa phòng tới cây đàn.']] };
    case 'window': return { title: 'Cửa sổ phòng lớn', body: [['p', 'Ô cửa sổ phía nam bị dãy tủ đứng chắn giữa, ngay chỗ hốc bàn học: bên góc máy tính thấy hai cánh, bên kia dãy tủ thấy hai cánh nữa.'], ['p', 'Song trắng. Nhìn ra mái ngói đỏ của mấy nhà thấp phía dưới.', 'dim']] };
    case 'phone': return { title: 'Điện thoại bàn', body: [['p', 'Máy bàn màu kem trên tủ đầu giường.']] };
    default: return null;
  }
}
