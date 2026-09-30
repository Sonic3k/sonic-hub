/* Shared placeholder photo set for the demos. Deterministic seeds so every reload
   looks the same. Swap `src` for real CDN URLs (sonic-hub.b-cdn.net/...) when wiring. */
window.SH_PHOTOS = (() => {
  const shapes = [
    [4,3],[3,4],[16,9],[1,1],[3,2],[2,3],[5,4],[4,5],[21,9],[3,2],
    [4,3],[1,1],[3,4],[16,10],[3,2],[2,3],[4,3],[5,4],[3,2],[1,1],
    [4,5],[16,9],[3,2],[4,3],[2,3],[3,2],[1,1],[3,4],[4,3],[5,3],
    [3,2],[4,3],[1,1],[16,9],[3,4],[3,2],[2,3],[4,3],[5,4],[3,2],
  ];
  const years = [2008,2009,2009,2010,2010,2010,2011,2011,2012,2012,2013,2014,2015,2016,2017,2018,2018,2019,2020,2021,2022,2023,2024,2025,2026];
  return shapes.map(([w, h], i) => {
    const year = years[i % years.length];
    const W = 900, H = Math.round(900 * h / w);
    return {
      id: i,
      src: `https://picsum.photos/seed/sonichub${i}/${W}/${H}`,
      w, h, ratio: w / h,
      year,
      caption: ['Hồ Tây, chiều', 'Sân trường cũ', 'Đà Lạt sương', 'Bãi Sau', 'Ngõ nhỏ Hà Nội', 'Cà phê Đinh', 'Cầu Long Biên', 'Quán quen', 'Tam Đảo', 'Phố cổ'][i % 10],
    };
  });
})();
