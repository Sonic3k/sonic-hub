/* What the site needs to know about this place before any of it is built. Data only (the build reads it in Node). */
import { PLAN } from './plan.js';

export default {
  id: 'esa-el-segundo-2015',
  title: 'Extended Stay America, El Segundo',
  sub: 'phòng tầng 2 · đợt onsite 8–9/2015',
  kind: 'Chỗ ở',
  where: '1910 E Mariposa Ave, El Segundo, California',
  /* one stretch of weeks: 17/8 to 27/9/2015 (the place keeps the paper and ink of 2015) */
  years: { from: 2015, to: 2015, start: 2015 },
  /* Sonic Hub names moments on Vietnam's clock; California's (PDT) stood 14 hours behind */
  tz: -14,
  hours: [
    { id: 'sang', from: 5, label: 'Sáng 9:47', name: 'Sáng 22/9, 9:47', say: 'mây biển sáng sớm đang tan, đi bộ đi làm' },
    { id: 'chieu', from: 16, label: 'Chiều 18:20', name: 'Chiều, 18:20', say: 'nắng tây chiếu thẳng vào hành lang và cửa sổ' },
    { id: 'toi', from: 20, label: 'Tối 21:30', name: 'Tối, 21:30', say: 'đèn phòng, đèn hành lang, biển Ralphs sáng' },
  ],
  intro: 'Phòng 271, tầng 2 ở dãy phía bắc của khách sạn, sáu tuần onsite ở DirecTV năm 2015. Dựng lại từ ảnh trong kho Sonic Hub (Fsoft → [2015.08] Onsite 2015), ảnh vệ tinh và dữ liệu OpenStreetMap. Đi ra hành lang, xuống cầu thang, ra Mariposa, sang Starbucks và Ralphs, đi dọc hàng si tới đường ray Green Line.',
  blurb: 'Một studio của Extended Stay America cạnh sân bay LAX: giường, bếp nhỏ, quầy có laptop, hành lang ngoài trời có lan can trắng nhìn sang Ralphs. Ra đường: Sepulveda, Mariposa, Starbucks, Ralphs, hàng si, ga Mariposa của Green Line.',
  aria: 'Phòng khách sạn Extended Stay America ở El Segundo năm 2015, dựng 3D.',
  plan: PLAN,
};
