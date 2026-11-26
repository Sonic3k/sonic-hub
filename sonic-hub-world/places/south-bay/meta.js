/* What the site needs to know about this world before any of it is built. Data only (the build reads it in Node). */
export default {
  id: 'south-bay',
  engine: 'world',                      // run by engine/world/app.js: the ground comes as the eye moves
  title: 'South Bay',
  sub: 'El Segundo · 2019–2022',
  kind: 'Vùng',
  where: 'El Segundo, California',
  /* the years he drove here: the black Camry from October 2019 to the end of 2022 */
  years: { from: 2019, to: 2022, start: 2019 },
  tz: -14,
  hours: [
    { id: 'sang', from: 5, label: 'Sáng' },
    { id: 'chieu', from: 16, label: 'Chiều' },
    { id: 'toi', from: 20, label: 'Tối' },
  ],
  intro: 'Tuyến đầu tiên: từ bãi xe Extended Stay ra Mariposa, lên Lairport, sang Maple, Nash, Atwood Way, vào bãi xe của khu AT&T (năm 2015 còn là DirecTV). Dài 1,7 km trên mạng đường thật của OpenStreetMap. Xe tự lái; anh cầm lái lúc nào cũng được.',
  blurb: 'Vùng South Bay quanh El Segundo, tải dần theo từng ô 500 m khi xe chạy. Ngồi trong chiếc Camry đen 2014, xe tự lái từ Extended Stay tới khu AT&T, màn hình giữa phát danh sách nhạc lái xe của anh.',
  aria: 'Lái xe qua El Segundo, California, dựng 3D: từ khách sạn Extended Stay tới khu văn phòng AT&T.',
  plan: null,
};
