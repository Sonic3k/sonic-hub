/* What the site needs to know about this place before any of it is built: its name, its years, its hours, its rooms
   on a plan. Read by the build (to write the page and the list of places) and by the place itself. Data only. */
import { LIV, PAR, WC, UTL, KIT, BIG, LOG, BW, BE } from './plan.js';

export default {
  id: 'van-bao-507',
  title: 'Nhà Vạn Bảo',
  sub: 'căn 507 · tầng 5',
  kind: 'Nhà',
  where: 'Khu tập thể Vạn Bảo, Hà Nội',
  /* the years it can be seen in, and the one it opens on */
  years: { from: 2005, to: 2012, start: 2007 },
  /* the hours of the day it can be seen at; `from` is the hour of the clock each begins at (for ?at=…) */
  hours: [
    { id: 'chieu', from: 6, label: 'Chiều 18:05', name: 'Chiều, 18:05', say: 'nắng xiên qua cửa ban công' },
    { id: 'toi', from: 19, label: 'Tối 21:00', name: 'Tối, 21:00', say: 'đèn bật, màn hình sáng' },
  ],
  intro: 'Dựng lại từ hai video quay nhà tháng 6/2013 trong kho Sonic Hub. Máy tính và điện thoại đổi theo năm, đúng ngày tháng ghi ở mục Máy tính.',
  /* for the list of places */
  blurb: 'Căn hộ tập thể tầng 5, cuối hành lang: phòng khách có bể cá và tượng Di Lặc, góc máy tính, phòng có đàn piano, bếp, lô gia. Máy tính, điện thoại, tivi đổi theo năm.',
  aria: 'Căn 507 dựng 3D.',
  /* its rooms as rectangles on the ground (metres; x east, z south), drawn as the plan on its card */
  plan: [LIV, PAR, KIT, BIG, WC, UTL, LOG, BW, BE],
};
