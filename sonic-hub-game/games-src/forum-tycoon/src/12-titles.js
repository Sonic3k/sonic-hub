/* ── Thread titles. {band} {m} {m2} {song} {song2} {album} {city} {a} {b} {n} are filled at spawn time. ── */
const TITLES = {
  normal: {
    any: ['Mọi người hay lên mạng vào giờ nào?', 'Góp ý giúp mình cái chữ ký mới với', 'Ai có nick Yahoo thì để lại làm quen nào', 'Kể về lần đầu bạn biết đến 4rum', 'Mình mới đổi avatar, đẹp không mọi người?', 'Cuối tuần này mọi người làm gì?', 'Bài hát đang nghe lúc này', 'Hôm nay trời {city} đẹp ghê'],
    fan: ['Cảm nhận về bài {song}', 'Mọi người thích {m} hay {m2} hơn?', 'Vừa mua được đĩa gốc album {album}!', 'Nếu gặp {band} ngoài đời, bạn sẽ nói gì?', 'Bài nào của {band} làm bạn khóc?'],
    teen: ['Nhật ký ngày mưa', 'Hôm nay bị cô gọi lên bảng :((', 'Lớp mình có đứa hát hay cực', 'Mọi người học ban A hay ban D?'],
    photo: ['Ảnh chụp vội sáng nay', 'Góp ý giúp mình tấm này với', 'Thử chụp đêm lần đầu', 'Một góc phố quen'],
    game: ['Lần đầu lên level 50', 'Server 3 tối nay lag quá', 'Khoe đồ mới đập được', 'Ai chơi chung bang hội không?'],
  },
  chat: {
    any: ['TOPIC CHÉM GIÓ #{n}: hôm nay bạn thế nào?', 'Ai thức khuya điểm danh nào', 'Nối từ đi mọi người ơi', 'Đếm số đến 10.000 (cấm double post nha)', 'Hôm nay ăn gì?', 'Spam cho đủ 50 bài :D', 'Mưa quá, ai ở {city} không?', 'Kể chuyện ma đêm khuya', 'Làm quen nào mọi người ơi', 'Chúc mừng sinh nhật {a}!!!', 'Hôm nay cười gì? Post vào đây', 'Bóc tem thớt mới =))'],
    tet: ['Chúc Tết 4rum! Năm mới phát tài :D', 'Khoe tiền lì xì năm nay nào', 'Tết này mọi người có về quê không?'],
    exam: ['Mai thi rồi mà vẫn online =((', 'Ai ôn thi thì vào đây than thở'],
  },
  request: {
    any: ['[Hỏi] Làm sao để đặt avatar động?', '[Hỏi] Sao em không gửi được bài vậy ạ?', '[Hỏi] Chữ ký của em bị lỗi font, help!!!', '[Help] Máy em dính virus, mở 4rum toàn hiện quảng cáo', '[Hỏi] Chèn nhạc vào blog 360 thế nào ạ?', '[Hỏi] Newbie xin chỉ giáo, mới vào chưa biết gì :(', '[Hỏi] Bao nhiêu bài thì lên Thành viên tích cực?', '[Hỏi] Quên mật khẩu, lấy lại kiểu gì?'],
    fan: ['[Hỏi] Cho em xin link album {album} với ạ', '[Hỏi] Lời dịch bài {song} ai có không?', '[Hỏi] Mua vé concert {band} ở đâu?', '[Hỏi] Hợp âm guitar bài {song}?'],
    teen: ['[Hỏi] Tặng quà gì cho bạn thân dịp 8/3?', '[Hỏi] Ôn thi chuyên Anh dùng sách gì?', '[Hỏi] Làm sao để mẹ không biết mình lên mạng?'],
    photo: ['[Hỏi] Nên mua Canon 400D hay Nikon D80?', '[Hỏi] Chụp ngược sáng bị tối mặt, xử lý sao?', '[Hỏi] Xin cách chỉnh màu kiểu phim', '[Hỏi] Ống kính 50mm có đáng mua không?'],
    game: ['[Hỏi] Level 60 nên đánh boss nào?', '[Hỏi] Bị hack acc, lấy lại kiểu gì?', '[Hỏi] Server nào đông người chơi nhất?', '[Hỏi] Người mới nên chọn phái nào?'],
  },
  quality: {
    any: ['[Thảo luận] Điều bạn nhớ nhất về 4rum mình', '[Share] Bộ smiley siêu dễ thương cho chữ ký', '[Hướng dẫn] Làm chữ ký động bằng Photoshop'],
    fan: ['[Dịch] Phỏng vấn {m} trên tạp chí Anh, bản dịch đầy đủ', '[Tổng hợp] Lời bài hát và lời dịch mọi album của {band}', '[Fanfic] Mùa đông năm ấy (chap 1–12)', '[Kỷ niệm] 5 năm làm fan {band}', '[Share] Hợp âm guitar {song}, đã test kỹ', '[Tư liệu] Lịch sử {band} từ ngày đầu thành lập'],
    teen: ['[Tâm sự] Gửi cậu, người bạn thân nhất cấp 2', '[Sáng tác] Thơ: Mưa trên sân trường', '[Chia sẻ] Kinh nghiệm thi chuyên của mình', '[Truyện ngắn] Chiếc lá cuối cùng của tháng 11', '[Sổ tay] 50 mẹo học tiếng Anh không chán'],
    photo: ['[Ảnh] Hà Nội mùa hoa sữa', '[Hướng dẫn] Chụp chân dung bằng ánh sáng cửa sổ', '[Bộ ảnh] Một ngày ở phố cổ', '[Review] Ống 50mm f/1.8: rẻ mà chất', '[Ảnh] Mùa vàng trên ruộng bậc thang', '[Hướng dẫn] Đọc histogram cho người mới'],
    game: ['[Guide] Build nhân vật full sát thương', '[Guide] Bản đồ toàn bộ boss và giờ xuất hiện', '[Video] Pha xử lý 1 cân 5 của bang mình', '[Tổng hợp] Mọi nhiệm vụ ẩn trong bản mở rộng'],
  },
  hot: {
    any: ['Bình chọn: thành viên dễ thương nhất 4rum năm nay', 'Topic khoe ảnh thật, mạnh dạn lên nào!', 'Ai cùng tuổi Tý điểm danh!!!', 'Test IQ siêu khó, ai trên 120 vào đây', 'Lộ ảnh offline 4rum hôm qua :))', 'Trắc nghiệm: bạn hợp với cung hoàng đạo nào?'],
    fan: ['[HOT] Ảnh {m} hồi bé, siêu cute!!!', '[HOT] Clip hậu trường mới nhất của {band}', 'Đố vui: 100 câu hỏi về {band}, ai trả lời hết?'],
    teen: ['[HOT] Ảnh kỷ yếu lớp mình, đẹp như phim!', 'Khoe góc học tập của bạn nào'],
    photo: ['[HOT] Bộ ảnh cưới Đà Lạt đang gây sốt', 'Thử thách: một tuần chỉ chụp bằng điện thoại'],
    game: ['[HOT] Lộ thông tin bản cập nhật mới', '[HOT] Clip boss mới bị hạ trong 30 giây'],
  },
  news: {
    any: ['[Tin] Lịch nghỉ Tết năm nay được 9 ngày'],
    fan: ['[Tin] {band} xác nhận ra album mới cuối năm', '[Tin] Lịch tour châu Á của {band} đã công bố!', '[Tin nóng] MV {song} lên sóng truyền hình', '[Tin] {m} sắp kết hôn?!', '[Tin] {band} lập kỷ lục bán đĩa tuần đầu'],
    teen: ['[Tin] Có điểm thi học kỳ rồi!!!', '[Tin] Đề thi đại học năm nay có gì mới?', '[Tin] Trường mình được nghỉ 2 ngày!'],
    photo: ['[Tin] Hãng máy ảnh ra mẫu mới, giá mềm', '[Tin] Cuộc thi ảnh Hà Nội mùa thu nhận bài'],
    game: ['[Tin] Mở server mới tối nay!', '[Tin] Nhà phát hành tặng code cho thành viên 4rum'],
  },
  drama: {
    any: ['{a} vs {b}: mời mọi người vào phân xử', 'Mod xóa bài em không lý do, ai làm chứng?', 'Gửi bạn nào đó nói xấu mình ở chatbox', 'Clone nick vào chửi tôi, admin xử đi!!!', 'Nói thật, 4rum dạo này chán lắm', 'Ai cho phép đăng ảnh của tôi lên đây?'],
    fan: ['Fan nhóm khác vào đây gây sự à?', 'Tranh cãi: {song} hay hơn {song2}?', 'Ai bảo {m} hát dở? Ra đây nói chuyện', 'Fan cứng hay fan phong trào? Cãi luôn'],
    teen: ['Tâm thư gửi người đã phản bội tình bạn', 'Lớp A1 hay lớp A2 xịn hơn?', 'Đừng có giả nai nữa {a}'],
    photo: ['Ảnh này chỉnh quá đà, xin lỗi phải nói thẳng', 'Canon hay Nikon? Cãi nốt lần này thôi', 'Ai lấy ảnh tôi mà không ghi nguồn?'],
    game: ['Bang của {a} đánh lén bang mình, xin công lý!', 'Phái nào mạnh nhất? Vào cãi', 'Tố cáo {a} lừa đảo bán đồ'],
    spill: ['Ra đây nói chuyện tiếp nè {a}', '[Phần 2] Vụ cãi nhau bên kia', 'Ai đúng ai sai trong vụ ở box bên cạnh?'],
  },
  spam: {
    any: ['BÁN THẺ CÀO GIÁ RẺ, CHIẾT KHẤU 20%!!!', 'Kiếm 500$/tháng tại nhà, không cần vốn!!!', 'Cần bán gấp Nokia N70 like new 99%', 'Click vào đây nhận quà miễn phí >>>', 'Thiết kế blog 360 lung linh, giá sinh viên', 'Thuốc giảm cân thần kỳ, 10kg trong 1 tuần', 'Dịch vụ SEO lên top 1 Google', 'UP UP UP UP UP', 'Hàng xách tay giá rẻ, liên hệ nick Yahoo', 'Cho thuê hosting 10k/tháng, rẻ nhất VN'],
    game: ['Bán acc VIP full đồ giá sinh viên', 'Cày thuê level, bao uy tín', 'Bán vàng giá rẻ nhất server'],
  },
};
