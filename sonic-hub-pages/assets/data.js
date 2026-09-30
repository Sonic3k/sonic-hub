/* Shared sample content for the portal sets. Swap for API data when porting. */
window.SH_DATA = (() => {
  const YEARS = Array.from({ length: 19 }, (_, i) => 2008 + i);
  const PEOPLE = [
    { name: 'Bích Trân', from: 2009, to: 2012, via: 'Yahoo · Nokia', like: 'Trà sữa, mưa, Westlife', memory: 'Đi bộ vòng Hồ Tây dưới mưa, về ốm ba ngày' },
    { name: 'Linh', from: 2013, to: 2014, via: 'Facebook', like: 'Chụp ảnh film, mèo', memory: 'Buổi sáng Tam Đảo sương mù dày đặc' },
    { name: 'Hà My', from: 2015, to: 2015, via: 'Facebook', like: 'Đọc truyện, cà phê muối', memory: 'Chuyến tàu đêm vào Huế' },
    { name: 'Quỳnh', from: 2016, to: 2018, via: 'Zalo', like: 'Chạy bộ, nhạc indie', memory: 'Hoàng hôn Bãi Sau' },
    { name: 'Thu', from: 2019, to: 2019, via: 'Facebook', like: 'Làm bánh', memory: 'Sinh nhật ở quán quen' },
    { name: 'Mai', from: 2021, to: 2021, via: 'Telegram', like: 'Leo núi', memory: 'Đỉnh Fansipan lúc 6 giờ sáng' },
  ];
  const NOTES = [
    { year: 2026, title: 'Ba dòng cho đỡ nặng đầu', body: 'Không cần ai đọc. Chỉ cần viết ra. Link vào vấn đề đang theo dõi để tuần sau nhìn lại còn nhớ mình đã qua thế nào.', tags: ['Stress'], problem: 'Deadline Q4', mood: 'mệt' },
    { year: 2025, title: 'Đem Nokia N73 đi chụp lại Hồ Tây', body: 'Nhiễu như xưa, và đẹp như xưa. Cái máy vẫn lên nguồn — pin chịu đúng bốn mươi phút.', tags: ['Máy ảnh'], mood: 'nhớ' },
    { year: 2024, title: 'Xem lại chung kết 2005 sau 20 năm', body: 'Câu trả lời ngắn: có, Liverpool xứng đáng. Câu trả lời dài mất 2.400 chữ và một cốc cà phê.', tags: ['Bóng đá'], mood: 'vui' },
    { year: 2010, title: 'Status Yahoo tối nay', body: 'mai thi xong roi di choi nhe. Tối nào cũng đổi status một lần, như viết nhật ký cho cả danh sách bạn bè đọc.', tags: ['Ký ức'], mood: 'háo hức' },
    { year: 2009, title: 'Ngày đầu có máy ảnh', body: 'Chụp 214 tấm trong một buổi chiều. Giữ lại 9. Đến giờ vẫn còn 9 tấm đó.', tags: ['Máy ảnh'], mood: 'vui' },
  ];
  const FOLDERS = [['Hồ Tây', 48], ['Tam Đảo', 31], ['Đà Lạt', 77], ['Bãi Sau', 22], ['Phố cổ', 19]];
  const photos = window.SH_PHOTOS || [];
  const photosOf = (y) => photos.filter(p => p.year === y);
  const nearestYear = (y) => photosOf(y).length ? y : YEARS.slice().sort((a, b) => Math.abs(a - y) - Math.abs(b - y)).find(v => photosOf(v).length);
  const peopleOf = (y) => PEOPLE.filter(p => y >= p.from && y <= p.to);
  const notesOf = (y) => NOTES.filter(n => n.year === y);
  const todayVN = () => new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
  return { YEARS, PEOPLE, NOTES, FOLDERS, photos, photosOf, nearestYear, peopleOf, notesOf, todayVN };
})();
