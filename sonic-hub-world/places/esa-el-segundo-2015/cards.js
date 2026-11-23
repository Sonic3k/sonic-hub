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
    ['p', 'Phòng dựng theo bốn tấm ảnh chụp tối 21/9/2015 lúc 19:15 giờ California (từ cửa nhìn vào; giường; hai tấm chụp bức tường có tủ, tivi, gương và chiếc bàn anh ngồi làm việc) và ảnh iPhone các ngày 19/8 (bữa sáng ở bàn), 18/9 (bàn và bếp, cửa nhà tắm đang mở), 25/9 (cửa phòng mở ra hành lang, hốc treo đồ sau cánh cửa). Album: Fsoft → [2015.08] Onsite 2015.'],
    ['p', 'Với mỗi tấm ảnh, vị trí máy chụp được dựng lại rồi đo ngược ra từng món đồ: phòng rộng 3,63 m, sâu chừng 6,45 m, trần 2,39 m; mặt bàn cao 0,91 m. Thước đo là những thứ có cỡ chuẩn — mặt bếp 36 inch, cửa nhà tắm 80 inch — và nó khớp với chiếc laptop 15,6 inch và chiếc giường cỡ full (1,37 × 1,9 m).'],
    ['p', 'Khách sạn, bãi xe, hàng rào và cầu thang theo ảnh chụp từ hành lang (19/8, 2/9, 18/9) và sáng 22/9 (9:47–9:48). Đường phố theo những tấm chụp trên đường đi bộ sáng hôm ấy (9:52–9:59), dọc Mariposa tới gầm đường ray Green Line.'],
    ['p', 'Khu đất, khối nhà và đường sá theo OpenStreetMap (© những người đóng góp OpenStreetMap, giấy phép ODbL) và ảnh vệ tinh; chiều cao nhà theo số liệu của Quận Los Angeles có trong bản đồ. Nhà xây sau 2015 đã bỏ ra.'],
    ['p', 'Thẻ ra vào theo bản scan trong Onsite 2015 → Documents. Laptop và điện thoại theo mục Máy tính của Sonic Hub: Asus N56 chạy Windows 8.1, iPhone 6s.'],
    ['p', 'Những chỗ đoán:'],
    ['ul', [
      'Phòng nào: tầng 2, mặt tây của dãy nhà phía bắc, phòng ngay phía bắc tháp cầu thang tây-nam — suy từ ba tấm ảnh sáng 22/9 chụp liền nhau (lan can 9:47:21, hành lang 9:47:46, chân cầu thang 9:48:14) và ảnh iPhone 17/8 chụp từ bãi xe. Số phòng thì không biết.',
      'Chiều sâu phòng về phía bếp có thể lệch chừng 10 cm; vị trí cửa ra vào và cửa sổ dọc bức tường mặt tiền chừng 5 cm.',
      'Hai chiếc ghế cao đặt như tối 21/9: đẩy vào hai bên bàn, áo khoác xám vắt trên lưng ghế phía tây. Đồ trên bàn (hộp trà, chai nước, can nước, bình đỏ) đúng loại và gần đúng chỗ, không đúng từng li.',
      'Thẻ ra vào đặt trên bàn là thêm vào: không tấm ảnh nào cho thấy nó nằm ở đâu.',
      'Hốc treo đồ: ảnh 25/9 chỉ cho thấy thanh treo, mấy chiếc mắc xanh và sợi dây bàn là; phần còn lại là đoán.',
      'Nhà tắm không có ảnh; dựng theo kiểu phòng studio của chuỗi khách sạn này.',
      'Rèm, chăn, thảm vẽ lại theo kiểu và màu, không chép hoa văn; bức tranh trên vách nhà tắm chỉ phỏng theo. Hình trong gương là vẽ, không phải phản chiếu thật.',
      'Cột hành lang chia đều giữa hai tháp cầu thang; có thể lệch nửa mét. Ô tô trong bãi: số lượng, kiểu và màu là ngẫu nhiên. Chiếc Beetle nâu và tấm nệm dựa chân cầu thang là có thật, sáng 22/9.',
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
      ['p', 'Mở sát mép bàn phía tây, màn hình quay về chiếc ghế có áo khoác — đúng chỗ tối 21/9. Windows 8.1, đang ở màn hình khoá: 7:15, Monday, September 21 — giờ California, lúc anh chụp mấy tấm ảnh phòng.'],
      ['p', 'Máy và hệ điều hành theo mục Máy tính của Sonic Hub; hình trên màn hình chỉ vẽ phỏng theo.', 'dim'],
      ['a', `Bật laptop lúc ${M.say}`, pcAt(M.at)],
      ['p', 'Điện thoại đợt này là iPhone 6s.', 'dim'],
      ['a', `Bật iPhone lúc ${M.say}`, phoneAt(M.at)],
    ] };
    case 'badge': return { title: 'Thẻ ra vào DirecTV', body: [
      ['p', 'Thẻ của đợt onsite ở trụ sở DirecTV, El Segundo: in tên, FPT, VIETNAM và hạn dùng đến 6 giờ chiều 25/9/2015.'],
      ['p', 'Theo bản scan trong Onsite 2015 → Documents. Ở đây chỉ vẽ lại chữ; không có ảnh chân dung, không có logo.', 'dim'],
    ] };
    case 'tv': return { title: 'Tivi LG', body: [['p', extra ? 'Đang bật.' : 'Đang tắt.'], ['p', 'Tivi LG 32 inch trên chiếc tủ bốn ngăn kéo gỗ thông, cạnh đèn bàn chân gốm xanh — như ảnh 21/9.', 'dim'], ['p', 'Mỗi lần chạm là bật hoặc tắt.', 'dim']] };
    case 'bed': return { title: 'Giường', body: [
      ['p', 'Giường cỡ full (rộng 1,37 m), đầu giường gỗ sẫm có hai ô bọc màu bò, hai đèn tay xoay trên bức tường xanh, tấm phủ chân giường màu nâu vàng. Tủ đầu giường có điện thoại bàn, đồng hồ số đỏ và điều khiển; ghế bành da nâu ở góc cạnh cửa sổ, bên nó là thùng các-tông, giày để gần cửa.'],
      ['p', 'Theo ảnh 21/9, 19:15.', 'dim'],
    ] };
    case 'counter': return { title: 'Bàn làm việc', body: [
      ['p', 'Chiếc bàn ăn hai chỗ nhô ra từ tường bắc: mặt trắng 0,87 × 1,16 m, cao 0,91 m, hai góc ngoài bo tròn; dưới đầu sát tường là ô tủ trắng viền gỗ, giữa là tấm chân vát chéo. Hai ghế cao đẩy vào hai bên. Anh ngồi phía tây, mặt quay về bếp; laptop đặt sát mép bàn.'],
      ['p', 'Đo từ ba tấm ảnh 21/9 và ảnh iPhone 18/9.', 'dim'],
    ] };
    case 'closet': return { title: 'Hốc treo đồ', body: [
      ['p', 'Hốc treo đồ không cánh ở góc phòng, ngay sau cánh cửa ra vào khi mở: thanh treo với mấy chiếc mắc nhựa xanh, kệ phía trên có bàn là.'],
      ['p', 'Theo ảnh iPhone 25/9; chỉ thấy một phần, phần còn lại là đoán.', 'dim'],
    ] };
    case 'kitchen': return { title: 'Bếp nhỏ', body: [
      ['p', 'Tủ lạnh, bồn rửa, hai bếp điện, lò vi sóng và máy hút mùi dưới dãy tủ trên; tủ trắng viền gỗ sồi — góc bếp ở cuối phòng, đối diện cửa nhà tắm.'],
      ['p', 'Theo ảnh 21/9 và ảnh iPhone 18/9, 30/8.', 'dim'],
    ] };
    case 'print': return { title: 'Bức tranh', body: [['p', 'Tranh khung đen trên vách nhà tắm, trông sang giường.'], ['p', 'Chỉ phỏng theo: một ô cửa đỏ giữa nền xanh. Không chép tranh thật.', 'dim']] };
    case 'mirror': return { title: 'Gương', body: [['p', 'Gương khung gỗ có vòm, treo giữa tủ và bàn. Trong ảnh 21/9 nó soi thấy bức tường xanh, chiếc đèn đầu giường, bức tranh và chiếc áo vắt trên ghế.'], ['p', 'Hình trong gương ở đây là vẽ, không phải phản chiếu thật.', 'dim']] };
    case 'door': return { title: 'Cửa phòng', body: [
      ['p', openShut('Đang mở. Ra ngoài là hành lang tầng 2 và lan can nhìn xuống bãi xe.', 'Đang đóng — cửa đóng thì không đi qua được.')],
      ['p', 'Ảnh iPhone 25/9 chụp cửa mở ra hành lang. Chạm để mở hoặc đóng.', 'dim'],
    ] };
    case 'bathdoor': return { title: 'Cửa nhà tắm', body: [['p', openShut('Đang mở.', 'Đang đóng.')], ['p', 'Cửa mở ra phía bếp (ảnh 18/9 chụp lúc nó đang mở). Bên trong không có ảnh; dựng theo kiểu phòng studio của chuỗi khách sạn này. Chạm để mở hoặc đóng.', 'dim']] };
    case 'curtain': return { title: 'Rèm cửa sổ', body: [['p', openShut('Đang kéo ra.', 'Đang kéo lại.')], ['p', 'Rèm vải kẻ ô nâu treo từ sát trần, hai cây gậy trắng để kéo — như ảnh 21/9. Tối thì kéo lại. Chạm để kéo.', 'dim']] };
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
