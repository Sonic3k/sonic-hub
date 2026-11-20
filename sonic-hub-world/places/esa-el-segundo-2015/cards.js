/* What this place says: the cards behind the bright dots, and the list of what is real and what is guessed.
   Everything here is read off the archive (and says where), or marked as a guess. */
import { pcAt, phoneAt } from '../../engine/hub.js';

/* the three hours, as moments: California time for the words, Vietnam wall-clock for Sonic Hub's ?at= */
const MOMENT = {
  sang: { say: '9:47 sáng 22/9/2015', at: '2015-09-22T23:47' },
  chieu: { say: '18:20 ngày 21/9/2015', at: '2015-09-22T08:20' },
  toi: { say: '21:30 ngày 21/9/2015', at: '2015-09-22T11:30' },
};

export const notes = {
  title: 'Chỗ nào là thật, chỗ nào là đoán',
  body: [
    ['p', 'Phòng dựng theo bốn tấm ảnh chụp tối 21/9/2015 lúc 19:15 giờ California (giường; tủ, tivi và gương; bếp nhỏ sau giường; bệ bếp có laptop) và ảnh iPhone các ngày 19/8 (bữa sáng ở bệ bếp), 30/8 (bồn rửa), 18/9 (phòng ban đêm), 25/9 (cửa mở ra hành lang). Album: Fsoft → [2015.08] Onsite 2015.'],
    ['p', 'Khách sạn, bãi xe, hàng rào và cầu thang theo ảnh chụp từ hành lang (19/8, 2/9, 18/9) và sáng 22/9 (9:47–9:48). Đường phố theo những tấm chụp trên đường đi bộ sáng hôm ấy (9:52–9:59), dọc Mariposa tới gầm đường ray Green Line.'],
    ['p', 'Khu đất, khối nhà và đường sá theo OpenStreetMap (© những người đóng góp OpenStreetMap, giấy phép ODbL) và ảnh vệ tinh; chiều cao nhà theo số liệu của Quận Los Angeles có trong bản đồ. Nhà xây sau 2015 đã bỏ ra.'],
    ['p', 'Thẻ ra vào theo bản scan trong Onsite 2015 → Documents. Laptop và điện thoại theo mục Máy tính của Sonic Hub: Asus N56 chạy Windows 8.1, iPhone 6s.'],
    ['p', 'Những chỗ đoán:'],
    ['ul', [
      'Phòng nào: tầng 2, mặt tây của dãy nhà phía bắc, phòng thứ sáu tính từ đầu dãy — suy từ góc nhìn sang Ralphs và chiều dài hành lang trong ảnh; có thể lệch một phòng.',
      'Kích thước phòng (chừng 4,1 × 6,8 m, trần 2,55 m) đo theo đồ vật trong ảnh — giường queen, cửa, tủ — không có số đo thật.',
      'Bệ bếp, cửa nhà tắm và bếp nhỏ: các ảnh chụp từ mấy góc không khớp hẳn với nhau; đây là cách xếp hợp nhất.',
      'Nhà tắm không có ảnh; dựng theo kiểu phòng studio của chuỗi khách sạn này.',
      'Rèm và chăn vẽ lại theo kiểu, không chép hoa văn; bức tranh trên vách nhà tắm chỉ phỏng theo.',
      'Ô tô trong bãi: số lượng, kiểu và màu là ngẫu nhiên. Chiếc Beetle nâu và tấm nệm dựa chân cầu thang là có thật, sáng 22/9.',
      'Ralphs, Starbucks, Jersey Mike\'s, In-N-Out: hình khối theo ảnh vệ tinh và ảnh của anh; biển hiệu chỉ là chữ thường, không có logo.',
      'Nhà cửa xa hơn chỉ là khối có mặt tiền vẽ. Khách sạn Hacienda bên kia Sepulveda quây lưới xanh ở tầng trên như trong ảnh 2015.',
      'Bản đồ chỉ vẽ một đường ray ở phía bắc ga Mariposa; ở đây cho hai dầm chạy song song như tấm ảnh chụp dưới gầm cầu.',
      'Xe chạy trên đường, đèn đường và quầng sáng ban đêm là thêm vào cho có không khí.',
      'Giờ: sáng là lúc anh ra bãi xe (9:47, 22/9); chiều 18:20 nắng xiên thẳng vào cửa sổ phía tây theo hướng mặt trời ngày ấy; tối 21:30 là giờ đặt.',
    ]],
  ],
};

/** what opens when a bright dot is touched: { title, body } — body: ['p', text, class?], ['ul', [items]], ['a', text, address] */
export function card(id, { hour, extra }) {
  const M = MOMENT[hour] || MOMENT.sang;
  const openShut = (o, s) => extra === 'open' ? o : s;
  switch (id) {
    case 'laptop': return { title: 'Laptop Asus N56', body: [
      ['p', 'Mở trên bệ bếp, quay về chiếc ghế cao. Windows 8.1, đang ở màn hình khoá: 7:15, Monday, September 21 — giờ California, lúc anh chụp mấy tấm ảnh phòng.'],
      ['p', 'Máy và hệ điều hành theo mục Máy tính của Sonic Hub; hình trên màn hình chỉ vẽ phỏng theo.', 'dim'],
      ['a', `Bật laptop lúc ${M.say}`, pcAt(M.at)],
      ['p', 'Điện thoại đợt này là iPhone 6s.', 'dim'],
      ['a', `Bật iPhone lúc ${M.say}`, phoneAt(M.at)],
    ] };
    case 'badge': return { title: 'Thẻ ra vào DirecTV', body: [
      ['p', 'Thẻ của đợt onsite ở trụ sở DirecTV, El Segundo: in tên, FPT, VIETNAM và hạn dùng đến 6 giờ chiều 25/9/2015.'],
      ['p', 'Theo bản scan trong Onsite 2015 → Documents. Ở đây chỉ vẽ lại chữ; không có ảnh chân dung, không có logo.', 'dim'],
    ] };
    case 'tv': return { title: 'Tivi LG', body: [['p', extra ? 'Đang bật.' : 'Đang tắt.'], ['p', 'Tivi màn phẳng trên chiếc tủ bốn ngăn gỗ thông, cạnh đèn bàn chân xanh — như ảnh 21/9.', 'dim'], ['p', 'Mỗi lần chạm là bật hoặc tắt.', 'dim']] };
    case 'bed': return { title: 'Giường', body: [
      ['p', 'Giường queen, đầu giường gỗ sẫm có hai ô bọc da màu bò, hai đèn tay xoay trên bức tường xanh. Tủ đầu giường có điện thoại bàn, đồng hồ số đỏ và điều khiển; ghế ngả màu nâu đứng cạnh cửa sổ, sau nó là thùng các-tông và mấy đôi giày.'],
      ['p', 'Theo ảnh 21/9, 19:15.', 'dim'],
    ] };
    case 'kitchen': return { title: 'Bếp nhỏ', body: [
      ['p', 'Tủ lạnh, bồn rửa, hai bếp điện, lò vi sóng trên cao, tủ trắng viền gỗ — góc bếp ở cuối phòng, sau giường.'],
      ['p', 'Theo ảnh 21/9 và ảnh iPhone 30/8 chụp ở bồn rửa này.', 'dim'],
    ] };
    case 'print': return { title: 'Bức tranh', body: [['p', 'Tranh khung đen trên vách nhà tắm, trông sang giường.'], ['p', 'Chỉ phỏng theo: một ô cửa đỏ giữa nền xanh. Không chép tranh thật.', 'dim']] };
    case 'mirror': return { title: 'Gương', body: [['p', 'Gương khung gỗ có vòm, treo giữa tủ và bệ bếp. Trong ảnh 21/9 nó soi thấy bức tường xanh, chiếc đèn đầu giường và mép bức tranh.'], ['p', 'Hình trong gương ở đây là vẽ, không phải phản chiếu thật.', 'dim']] };
    case 'door': return { title: 'Cửa phòng', body: [
      ['p', openShut('Đang mở. Ra ngoài là hành lang tầng 2 và lan can nhìn xuống bãi xe.', 'Đang đóng — cửa đóng thì không đi qua được.')],
      ['p', 'Ảnh iPhone 25/9 chụp cửa mở ra hành lang. Chạm để mở hoặc đóng.', 'dim'],
    ] };
    case 'bathdoor': return { title: 'Cửa nhà tắm', body: [['p', openShut('Đang mở.', 'Đang đóng.')], ['p', 'Nhà tắm không có ảnh; dựng theo kiểu phòng studio của chuỗi khách sạn này. Chạm để mở hoặc đóng.', 'dim']] };
    case 'curtain': return { title: 'Rèm cửa sổ', body: [['p', openShut('Đang kéo ra.', 'Đang kéo lại.')], ['p', 'Rèm vải kẻ ô nâu đỏ, lớp voan trắng bên trong, như ảnh 21/9. Tối thì kéo lại. Chạm để kéo.', 'dim']] };
    case 'ralphs': return { title: 'Ralphs', body: [
      ['p', 'Siêu thị Ralphs ở góc Sepulveda và Mariposa: khối nhà lớn, mặt trước có hai đầu hồi kiểu Tây Ban Nha lợp ngói đỏ.'],
      ['p', 'Từ lan can hành lang tầng 2 nhìn sang thấy nó qua hàng rào và bãi xe (ảnh 9:47 sáng 22/9). Biển ở đây chỉ là chữ.', 'dim'],
    ] };
    case 'starbucks': return { title: 'Starbucks', body: [
      ['p', 'Starbucks và Jersey Mike\'s chung một dãy nhà nhỏ ở góc bãi xe phía Sepulveda, hiên ngồi ngoài trời quay ra bãi. Từ phòng đi bộ chừng ba phút.'],
      ['p', 'Hình khối theo ảnh vệ tinh; biển hiệu chỉ là chữ, không có logo.', 'dim'],
    ] };
    case 'greenline': return { title: 'Green Line — ga Mariposa', body: [
      ['p', 'Tàu điện Metro Green Line chạy trên cầu cạn dọc Nash St; ga Mariposa nằm ngay phía nam Mariposa Ave, cách khách sạn chừng 700 m về phía đông.'],
      ['p', 'Sáng 22/9 anh đi bộ dọc Mariposa, qua những hàng si, tới đây lúc 9:59 và chụp dưới gầm cầu.', 'dim'],
    ] };
    default: return null;
  }
}
