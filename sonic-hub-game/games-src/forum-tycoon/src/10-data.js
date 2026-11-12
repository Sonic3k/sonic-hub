/* ── Content: forum types, boxes, people, rules, hacks, hosting. All text is Vietnamese (the game's language). ── */

const TURNS = 24;            // 09/2007 → 08/2009, one turn = one month
const STICKY_BASE = 2;
const POLICY_SLOTS = 3;
const BOX_CAP = 4;           // non-sticky threads visible per box
const MAX_BOXES = 8;

const BAND = {
  name: 'Silverline',
  members: ['Ryan', 'Liam', 'Sean', 'Darren'],
  songs: ['Moonlight Promise', 'Paper Hearts', 'Until the Rain', 'Silver Morning', 'Coming Home to You', 'Forever Starts Today'],
  albums: ['Northern Lights', 'Silver Hearts', 'Tides'],
};
const CITIES = ['Hà Nội', 'Sài Gòn', 'Đà Nẵng', 'Hải Phòng', 'Huế', 'Cần Thơ', 'Vinh', 'Nha Trang', 'Quy Nhơn', 'Buôn Ma Thuột'];
const OTHER_FORUMS = ['Hội Yêu Mèo', 'Nhạc Xanh 4rum', 'Teen Hà Thành', 'Mê Phim Club', 'Góc Sinh Viên', 'Diễn đàn Truyện Ngắn'];

const ARCH = {
  fan: {
    name: 'Fanclub âm nhạc', defaultName: '4rum Silverline', tagline: 'Ngôi nhà chung của fan Silverline Việt Nam',
    pitch: 'Hội fan nhóm nhạc Silverline. Tin về nhóm kéo khách ầm ầm, fan rất nhiệt tình nhưng dễ "fan war".',
    perks: ['Ghim tin nóng là khách đổ về', 'Fan hay ủng hộ quỹ', 'Fan war nổ ra bất chợt'],
    boxes: ['announce', 'news', 'share', 'chat'],
    canOpen: ['qa', 'discuss', 'create', 'offline', 'heart', 'market'],
    names: { news: 'Tin tức Silverline', share: 'Nhạc & Video', discuss: 'Thảo luận về nhóm', create: 'Fanfic & Sáng tác' },
    mods: { gen: { news: 2.3, drama: 1.2 }, donate: 1.4 },
    founders: ['fanatic', 'veteran', 'newbie'],
    traitW: { fanatic: 3, joker: 2, star: 1.6, warrior: 2, veteran: 1.6, expert: 1, newbie: 2, seller: 1, techie: 1, lurker: 0.8 },
    milestones: [140, 680, 1550], fame: 8, rival: 'FC Golden Boys VN',
  },
  teen: {
    name: 'Teen chém gió', defaultName: 'Góc Nhỏ 9x', tagline: 'Nơi tụi mình nói đủ thứ chuyện trên đời',
    pitch: '4rum tuổi teen: đông nhanh, chém gió suốt ngày, drama không ngớt. Mùa thi vắng hoe, hè thì bùng nổ.',
    perks: ['Người mới đổ về rất nhanh', 'Mùa thi vắng, mùa hè bùng nổ', 'Drama và tỏ tình liên tục', 'Ít ai ủng hộ quỹ'],
    boxes: ['announce', 'chat', 'heart', 'fun'],
    canOpen: ['qa', 'study', 'create', 'offline', 'market', 'discuss'],
    names: { create: 'Thơ & Truyện ngắn' },
    mods: { gen: { chat: 1.6, drama: 1.35, quality: 0.75, hot: 1.2 }, guest: 1.12, signup: 1.18, donate: 0.45 },
    seasonAmp: 1.7,
    founders: ['joker', 'star', 'newbie'],
    traitW: { joker: 3, star: 2.5, warrior: 2.4, newbie: 2.5, veteran: 1, expert: 0.8, seller: 1, techie: 1, lurker: 0.8, fanatic: 0.4 },
    milestones: [150, 700, 1600], fame: 5, rival: 'Teen9x.net',
  },
  photo: {
    name: 'Câu lạc bộ ảnh', defaultName: 'Phố Ảnh', tagline: 'Nơi những người mê nhiếp ảnh gặp nhau',
    pitch: 'CLB nhiếp ảnh: lớn chậm nhưng chất. Bài hay dễ thành huyền thoại, lão làng chịu chi, nhưng ảnh nặng làm server mệt.',
    perks: ['Ghim bài chất 2 tháng là thành huyền thoại', 'Lão làng ủng hộ quỹ hào phóng', 'Ảnh nặng: server chịu tải kém', 'Lớn chậm hơn'],
    boxes: ['announce', 'gallery', 'tech', 'chat'],
    canOpen: ['qa', 'gear', 'discuss', 'offline', 'market', 'create'],
    names: { create: 'Ảnh đẹp sưu tầm' },
    mods: { gen: { quality: 2, drama: 0.85, chat: 0.75, spam: 1 }, guest: 0.85, signup: 0.82, donate: 1.5, cap: 0.75, legendSpeed: 1, churn: 0.01 },
    founders: ['veteran', 'expert', 'newbie'],
    traitW: { veteran: 2.5, expert: 2.5, lurker: 1.5, newbie: 2, warrior: 1.2, star: 1, joker: 1, seller: 1.2, techie: 1, fanatic: 0.3 },
    milestones: [110, 520, 1250], fame: 6, rival: 'PhotoVN Club',
  },
  game: {
    name: 'Game online', defaultName: 'Bá Vương 4rum', tagline: 'Hội quán game thủ Bá Vương Online',
    pitch: '4rum game: khách đông nhất, quảng cáo hái ra tiền, nhưng toàn spam bán acc, troll và hacker rình rập.',
    perks: ['Khách đông, quảng cáo ra tiền', 'Spam bán acc khắp nơi', 'Hacker để ý từ sớm', 'Game thủ dễ bỏ đi'],
    boxes: ['announce', 'gametalk', 'guide', 'chat'],
    canOpen: ['qa', 'market', 'clan', 'offline', 'discuss', 'create'],
    names: { create: 'Fan art & Truyện game' },
    mods: { gen: { spam: 1.8, hot: 1.4, drama: 1.3, request: 1.3 }, guest: 1.35, signup: 1.22, ads: 1.6, donate: 0.6, churn: 0.015, security: -1 },
    founders: ['joker', 'warrior', 'expert'],
    traitW: { warrior: 3, seller: 2.4, joker: 2, newbie: 2, techie: 1.5, expert: 1.5, star: 1, fanatic: 1, veteran: 0.8, lurker: 0.5 },
    milestones: [180, 950, 2200], fame: 6, rival: 'GameThủ Việt', locked: true,
    unlockText: 'Mở khóa khi một 4rum của bạn đạt 1.500 thành viên',
  },
};
const ARCH_ORDER = ['fan', 'teen', 'photo', 'game'];

const BGS = {
  student: { name: 'Học sinh lớp 12', desc: 'Nhiệt huyết dồi dào, tiền thì không. Hè rảnh rỗi, mùa thi bị cấm máy.', ap: 4, funds: 220, passion: 86, allowance: 60, mods: {} },
  it: { name: 'Sinh viên IT', desc: 'Tự vá lỗi được; mua hack/mod rẻ hơn 20%, thuê host rẻ hơn 25%.', ap: 4, funds: 300, passion: 72, allowance: 90, mods: { security: 2, hostCost: 0.75, pluginCost: 0.8 } },
  office: { name: 'Dân văn phòng', desc: 'Có lương đều, nhưng mỗi tháng chỉ online được buổi tối.', ap: 3, funds: 500, passion: 66, allowance: 260, mods: {} },
};
const BG_ORDER = ['student', 'it', 'office'];

/* gen: how a box tilts the kind of threads people open in it */
const BOXES = {
  announce: { name: 'Thông báo', desc: 'Ban quản trị thông báo, nội quy và sự kiện.', draw: 0, aff: {}, fixed: true },
  news: { name: 'Tin tức', desc: 'Tin mới nhất, cập nhật từng giờ.', draw: 1, aff: { news: 3, hot: 1.3, quality: 0.6, chat: 0.4, request: 0.5 } },
  share: { name: 'Chia sẻ & Download', desc: 'Link nhạc, video, tài liệu. Nhớ cảm ơn người share!', draw: 1.25, aff: { quality: 1.4, request: 1.7, hot: 1.3, spam: 1.3, chat: 0.4 } },
  chat: { name: 'Chém gió', desc: 'Tán gẫu đủ thứ chuyện trên đời.', draw: 1.6, aff: { chat: 3.2, drama: 1.4, hot: 1.2, quality: 0.3, request: 0.4, news: 0.3 } },
  qa: { name: 'Hỏi đáp', desc: 'Có thắc mắc? Hỏi ở đây, sẽ có người trả lời.', draw: 0.9, aff: { request: 3.5, quality: 0.8, chat: 0.3, drama: 0.7 } },
  discuss: { name: 'Thảo luận', desc: 'Bàn luận nghiêm túc, có văn hóa.', draw: 1.05, aff: { quality: 1.8, drama: 1.3, chat: 0.5 } },
  create: { name: 'Sáng tác', desc: 'Thơ, truyện, fanfic của các thành viên.', draw: 0.85, aff: { quality: 2.5, chat: 0.4, spam: 0.6 } },
  offline: { name: 'Offline & Giao lưu', desc: 'Hẹn gặp mặt, giao lưu các tỉnh.', draw: 0.7, aff: { hot: 1.5, chat: 1.4, drama: 0.8 }, perk: 'Offline gặp mặt rẻ hơn một nửa' },
  heart: { name: 'Góc tâm sự', desc: 'Kể cho nhau nghe chuyện buồn vui.', draw: 1, aff: { quality: 1.3, chat: 1.3, drama: 1.2, hot: 1.1 } },
  market: { name: 'Chợ trời', desc: 'Mua bán, trao đổi đồ cũ.', draw: 0.8, aff: { spam: 2.6, hot: 0.6, quality: 0.3, request: 0.8 }, perk: 'Thu phí rao vặt: quỹ thêm theo số tích cực' },
  fun: { name: 'Giải trí', desc: 'Ảnh vui, clip hài, trắc nghiệm.', draw: 1.2, aff: { hot: 2, chat: 1.2, quality: 0.6 } },
  study: { name: 'Học tập', desc: 'Ôn thi, chia sẻ đề cương.', draw: 0.9, aff: { request: 2.2, quality: 1.6, chat: 0.5 }, perk: 'Mùa thi lại đông hơn' },
  gallery: { name: 'Ảnh của bạn', desc: 'Khoe ảnh, nhận góp ý thật lòng.', draw: 1.3, aff: { quality: 1.7, hot: 1.3, drama: 1.1 } },
  tech: { name: 'Kỹ thuật chụp', desc: 'Ánh sáng, bố cục, hậu kỳ.', draw: 1, aff: { request: 2, quality: 1.6, chat: 0.4 } },
  gear: { name: 'Máy ảnh & Ống kính', desc: 'Tư vấn, so sánh thiết bị.', draw: 0.9, aff: { request: 1.8, spam: 1.6, drama: 1.2 } },
  gametalk: { name: 'Thảo luận game', desc: 'Mọi thứ về Bá Vương Online.', draw: 1.3, aff: { hot: 1.4, drama: 1.3, news: 1.4 } },
  guide: { name: 'Hướng dẫn & Guide', desc: 'Kinh nghiệm cày cuốc, build nhân vật.', draw: 1, aff: { quality: 2, request: 1.6, chat: 0.4 } },
  clan: { name: 'Bang hội', desc: 'Tuyển quân, kết đồng minh, gây chiến.', draw: 1, aff: { drama: 2, hot: 1.3, chat: 1.2 } },
};

const GEN_BASE = { normal: 32, chat: 14, request: 12, quality: 8, hot: 8, news: 5, drama: 9, spam: 9 };
const TTYPES = {
  normal: { name: 'Thớt thường', help: 'Không có gì đặc biệt, góp chút lượt xem.' },
  chat: { name: 'Chém gió', help: 'Ở box Chém gió thì vui (+không khí); lạc sang box khác thì làm phiền (−không khí).' },
  request: { name: 'Câu hỏi', help: 'Được trả lời thì người mới ở lại. Bỏ mặc 2 tháng: người hỏi bỏ đi, không khí giảm.' },
  quality: { name: 'Bài chất', help: 'Nâng không khí. Ghim đủ lâu sẽ thành thớt huyền thoại: kéo khách mãi mãi.' },
  hot: { name: 'Thớt hot', help: 'Hút khách mạnh, nhưng dễ bùng thành drama nếu không ghim hoặc khóa.' },
  news: { name: 'Tin nóng', help: 'Ghim ngay thì khách đổ về gấp ba. Tin cũ sau 2 tháng.' },
  drama: { name: 'Drama', help: 'Kéo khách cực mạnh nhưng làm không khí tụt. Lửa tăng mỗi tháng; tới 3 là chiến tranh, lan sang thớt khác.' },
  spam: { name: 'Spam', help: 'Làm không khí tụt và khách ngại vào. Ba thớt spam trở lên sẽ kéo thêm spam.' },
  ann: { name: 'Thông báo', help: 'Thông báo của Ban quản trị.' },
};

const TRAITS = {
  veteran: { name: 'Lão làng hiền', sig: 'quality', p: 0.2, mod: 'kind', desc: 'Viết bài chất, giữ không khí ấm áp.' },
  expert: { name: 'Chuyên gia', sig: 'quality', p: 0.15, mod: 'busy', desc: 'Mỗi tháng tự trả lời giúp một câu hỏi.' },
  joker: { name: 'Thánh chém gió', sig: 'chat', p: 0.32, mod: 'fun', desc: 'Đi tới đâu vui tới đó.' },
  warrior: { name: 'Anh hùng bàn phím', sig: 'drama', p: 0.33, mod: 'strict', desc: 'Cãi tới cùng. Ban thì hay quay lại bằng nick clone; làm mod thì dễ lạm quyền.' },
  star: { name: 'Ngôi sao 4rum', sig: 'hot', p: 0.3, mod: 'kind', desc: 'Kéo khách, nhưng dễ gây ghen tị.' },
  fanatic: { name: 'Fan cuồng', sig: 'news', p: 0.3, mod: 'busy', desc: 'Cập nhật tin siêu tốc, đôi khi gây fan war.' },
  techie: { name: 'Dân IT', sig: 'request', p: 0.1, mod: 'tech', desc: 'Còn ở 4rum thì bảo mật +1.' },
  seller: { name: 'Con buôn', sig: 'spam', p: 0.4, mod: 'strict', desc: 'Rao vặt khắp mọi nơi.' },
  lurker: { name: 'Lurker bí ẩn', sig: 'quality', p: 0.07, mod: 'kind', desc: 'Ít nói, nhưng đã viết là thành huyền thoại.' },
  newbie: { name: 'Newbie nhiệt tình', sig: 'request', p: 0.3, mod: 'busy', desc: 'Hỏi nhiều, lớn nhanh.' },
};
const MODTYPES = {
  strict: { name: 'Nghiêm khắc', cap: 2, vibe: -0.5, desc: 'Xóa spam, khóa drama. Hơi lạnh lùng: không khí −0,5/tháng.' },
  kind: { name: 'Hiền lành', cap: 2, vibe: 0.6, desc: 'Trả lời câu hỏi, can ngăn cãi vã. Không khí +0,6/tháng.' },
  busy: { name: 'Chăm chỉ', cap: 3, vibe: 0, drain: 2, desc: 'Việc gì cũng làm, 3 việc/tháng, nhưng nhanh đuối.' },
  tech: { name: 'Kỹ thuật', cap: 1, vibe: 0, security: 2, desc: 'Dọn spam. Bảo mật +2, server ít sập hơn.' },
  fun: { name: 'Hài hước', cap: 1, vibe: 0.8, desc: 'Can drama bằng một câu đùa. Không khí +0,8/tháng.' },
  tyrant: { name: 'Nghiêm khắc', cap: 2, vibe: -1.5, desc: 'Xóa spam, khóa drama. Hơi lạnh lùng.' }, // shows as strict until exposed
};

const NICK_A = ['pe_heo', 'boy_lanh_lung', 'co_be_mua_dong', 'thien_than_nho', 'hoang_tu_sau_ngu', 'cun_con', 'meo_beo', 'ga_con', 'sat_thu_dien_trai', 'lang_tu_gio', 'tieu_thu', 'chang_trai_de_thuong', 'bong_bong', 'kem_dau', 'socola', 'ca_chua_bi', 'dau_tay', 'mua_thu', 'gio_dong', 'hat_mua', 'sao_bang', 'ngoi_sao_nho', 'ac_quy_nho', 'cute_girl', 'dark_angel', 'prince', 'princess', 'bin_bon', 'ty_ti', 'superman', 'hello_kitty', 'matrix', 'gau_bong', 'tho_trang', 'nhoc_con', 'be_bong', 'cau_ut', 'lop_truong', 'em_gai_mua', 'kiem_khach', 'bo_cong_anh', 'la_vang', 'hoa_sua', 'pho_co', 'bup_be', 'nang_tien', 'chu_be_dan', 'ca_heo', 'xu_ka', 'banh_bao'];
const NICK_B = ['_9x', '_8x', '_88', '_89', '_90', '_91', '_92', '_93', '_hn', '_sg', '_dn', '_hp', '_pro', '_kute', '_xinh', '_vn', '_2007', '_4ever', '_lonely', '_buon', '', '', '', '_123', '_iu', '_cool', '_nt'];
const SELLER_NICKS = ['ban_the_cao_re', 'kiem_tien_online', 'hang_xach_tay_vip', 'seo_top_1', 'shop_teen_gia_re', 'dich_vu_uy_tin'];

const POLICIES = [
  { id: 'nospam', name: 'Cấm spam, cấm double post', good: 'Spam −40%, không khí +0,8/tháng', bad: 'Chém gió −20%, người mới hơi ngại', mods: { gen: { spam: 0.6, chat: 0.8 }, vibeTurn: 0.8, activation: -0.03 } },
  { id: 'post30', name: 'Đủ 30 bài mới thấy link download', good: 'Người mới ở lại +12%, khách +10%', bad: 'Chém gió và spam +40%, bài chất −15%', mods: { activation: 0.12, guest: 1.1, gen: { chat: 1.4, spam: 1.4, quality: 0.85 } } },
  { id: 'approve', name: 'Duyệt tay thành viên mới', good: 'Spam −70%', bad: 'Đăng ký −40%', mods: { gen: { spam: 0.3 }, signup: 0.6 } },
  { id: 'nocode', name: 'Viết có dấu, cấm teencode', good: 'Bài chất +30%, drama −10%', bad: 'Người mới ở lại −8%', mods: { gen: { quality: 1.3, drama: 0.9 }, activation: -0.08 } },
  { id: 'civil', name: 'Cấm công kích cá nhân', good: 'Drama −40%', bad: 'Thớt hot −15%, khách −5%', mods: { gen: { drama: 0.6, hot: 0.85 }, guest: 0.95 } },
  { id: 'free', name: 'Tự do ngôn luận', good: 'Thớt hot +40%, khách +15%', bad: 'Drama +60%, không khí −1/tháng', mods: { gen: { hot: 1.4, drama: 1.6 }, guest: 1.15, vibeTurn: -1 } },
  { id: 'vip', name: 'Bán nick màu VIP', good: 'Quỹ +0,6k mỗi người tích cực/tháng', bad: 'Không khí −1,5/tháng', mods: { vibeTurn: -1.5 }, vip: 0.6 },
  { id: 'private', name: 'Khách phải đăng ký mới được đọc', good: 'Đăng ký ×1,8', bad: 'Khách −45%, danh tiếng lên chậm', mods: { signup: 1.8, guest: 0.55, fameGain: 0.5 } },
  { id: 'classified', name: 'Cho rao vặt có thu phí', good: 'Quỹ +0,25k mỗi người tích cực/tháng', bad: 'Spam +50%', mods: { gen: { spam: 1.5 } }, fee: 0.25 },
];

const PLUGINS = [
  { id: 'captcha', name: 'Mã xác nhận chống bot', price: 200, desc: 'Spam −60%. Đăng ký −8% vì nhiều người lười gõ.', mods: { gen: { spam: 0.4 }, signup: 0.92 } },
  { id: 'thanks', name: 'Nút Cảm ơn', price: 150, desc: 'Người mới ở lại +5%, bài chất +10%, không khí +0,4/tháng.', mods: { activation: 0.05, gen: { quality: 1.1 }, vibeTurn: 0.4 } },
  { id: 'shoutbox', name: 'Chatbox trang chủ', price: 240, desc: 'Không khí +1/tháng, chém gió lạc đề −50%, drama +10%.', mods: { vibeTurn: 1, gen: { chat: 0.5, drama: 1.1 } } },
  { id: 'arcade', name: 'Khu game Flash', price: 300, desc: 'Người online ×1,25: dễ phá kỷ lục, nhưng server nặng hơn. Không khí +0,5/tháng.', mods: { online: 1.25, vibeTurn: 0.5 } },
  { id: 'seo', name: 'Tối ưu tìm kiếm Google', price: 450, desc: 'Khách tìm thấy 4rum qua Google ×1,25.', mods: { guest: 1.25 } },
  { id: 'rep', name: 'Điểm danh tiếng', price: 200, desc: 'Lão làng lên nhanh hơn. Drama +10% (cãi nhau vì điểm).', mods: { core: 0.006, gen: { drama: 1.1 } } },
  { id: 'medals', name: 'Huy chương thành viên', price: 180, desc: 'Lão làng lên nhanh hơn, mod vui hơn (+3 tinh thần/tháng).', mods: { core: 0.004, modMorale: 3 } },
  { id: 'birthday', name: 'Lịch sinh nhật', price: 120, desc: 'Không khí +0,4 và nhiệt huyết +0,6 mỗi tháng.', mods: { vibeTurn: 0.4, passionTurn: 0.6 } },
  { id: 'album', name: 'Kho ảnh riêng', price: 380, desc: 'Bài chất hút khách ×1,3. Ảnh trong bài không bao giờ chết link.', mods: { qualityViews: 1.3 } },
  { id: 'music', name: 'Trình nghe nhạc online', price: 260, desc: 'Khách +15% (fanclub +30%). Có thể bị hãng đĩa để ý.', mods: { guest: 1.15 } },
  { id: 'firewall', name: 'Tường lửa chống hack', price: 420, desc: 'Bảo mật +3.', mods: { security: 3 } },
  { id: 'backup', name: 'Sao lưu tự động', price: 160, desc: 'Bị hack cũng không mất dữ liệu.', mods: {} },
  { id: 'donate', name: 'Hộp ủng hộ quỹ', price: 100, desc: 'Tiền ủng hộ hằng tháng ×1,8.', mods: { donate: 1.8 } },
  { id: 'modtools', name: 'Công cụ mod', price: 220, desc: 'Mỗi mod làm thêm 1 việc/tháng. Admin dọn sạch spam cả box chỉ với 1 giờ.', mods: { modCap: 1 } },
  { id: 'skin', name: 'Skin mới thật đẹp', price: 200, desc: 'Ngay lập tức: không khí +4, danh tiếng +6. Sau đó không khí +0,3/tháng.', mods: { vibeTurn: 0.3 }, once: { vibe: 4, fame: 6 } },
  { id: 'toplist', name: 'Bảng Top thành viên', price: 140, desc: 'Người mới ở lại +4%. Chém gió +15%, spam +10% (cày bài).', mods: { activation: 0.04, gen: { spam: 1.1, chat: 1.15 } } },
  { id: 'blog', name: 'Blog cá nhân cho thành viên', price: 340, minTurn: 9, desc: 'Lão làng ít bỏ đi hơn 30%, bài chất +15%.', mods: { coreChurn: 0.7, gen: { quality: 1.15 } } },
  { id: 'wap', name: 'Giao diện cho điện thoại', price: 520, minTurn: 15, desc: 'Phây kéo người đi chậm hơn 40%. Online +10%.', mods: { phay: 0.6, online: 1.1 } },
];

const HOSTING = {
  free: { name: 'Host miễn phí', cap: 30, cost: 0, down: 0.07, desc: 'Chập chờn, kèm quảng cáo của nhà host (không khí −1/tháng).' },
  shared: { name: 'Shared hosting', cap: 120, cost: 150, down: 0.02, desc: 'Ổn định cho 4rum nhỏ.' },
  vps: { name: 'VPS', cap: 400, cost: 450, down: 0.01, desc: 'Máy chủ ảo riêng, chịu tải tốt.' },
  dedi: { name: 'Server riêng', cap: 1500, cost: 1200, down: 0.005, desc: 'Cả một cái máy chủ cho riêng 4rum.' },
};
const HOST_ORDER = ['free', 'shared', 'vps', 'dedi'];

const ACTIVITIES = [
  { id: 'seed', name: 'Tự viết một bài chất', ap: 1, cost: 0, desc: 'Admin viết bài tâm huyết ở box bạn chọn.' },
  { id: 'promo', name: 'Đi quảng bá ở forum khác', ap: 1, cost: 0, cd: 1, desc: 'Khách +30% tháng này. 20% bị bên kia ban nick vì tội spam (danh tiếng −3).' },
  { id: 'contest', name: 'Tổ chức cuộc thi', ap: 2, cost: 80, cd: 3, desc: '2 tháng: bài chất ×1,6, không khí +2/tháng, danh tiếng +5.' },
  { id: 'drive', name: 'Kêu gọi ủng hộ quỹ', ap: 1, cost: 0, cd: 3, desc: 'Quỹ thêm tùy số lão làng và không khí. Không khí −2.' },
  { id: 'offline', name: 'Offline gặp mặt', ap: 2, cost: 150, cd: 4, minActive: 25, desc: 'Không khí +8, nhiệt huyết +6, khoảng 8% người tích cực thành lão làng.' },
  { id: 'openbox', name: 'Mở box mới', ap: 1, cost: 50, desc: 'Thêm chỗ cho thớt mới, nhiều khách hơn. Mở nhiều mà vắng thì 4rum trông buồn.' },
];

const ACHIEVEMENTS = [
  { id: 'rec100', name: 'Trăm người online', desc: 'Kỷ lục 100 người online cùng lúc' },
  { id: 'rec500', name: 'Nghẽn mạng vì đông', desc: 'Kỷ lục 500 người online' },
  { id: 'legend1', name: 'Thớt huyền thoại', desc: 'Có thớt huyền thoại đầu tiên' },
  { id: 'legend5', name: 'Thư viện huyền thoại', desc: '5 thớt huyền thoại trong một 4rum' },
  { id: 'mem1000', name: 'Nghìn thành viên', desc: '1.000 thành viên' },
  { id: 'mem3000', name: '4rum quốc dân', desc: '3.000 thành viên' },
  { id: 'survive', name: 'Những người ở lại', desc: 'Sống sót qua kỷ nguyên Phây' },
  { id: 'pacifist', name: 'Admin hiền như bụt', desc: 'Đi hết 24 tháng mà không ban ai' },
  { id: 'drama', name: 'Ông trùm drama', desc: '6 cuộc chiến nổ ra trong một 4rum' },
  { id: 'stable', name: 'Server bất tử', desc: 'Đi hết 24 tháng không sập lần nào' },
  { id: 'rich', name: 'Đại gia hosting', desc: 'Quỹ chạm 3 triệu' },
  { id: 'allthree', name: 'Ba kiểu 4rum', desc: 'Làm admin đủ ba loại 4rum' },
];

const RANKS = [
  [0, 'Forum xóm'], [900, 'Forum phường'], [2200, 'Forum quận'], [4200, 'Forum thành phố'], [7500, 'Forum quốc dân'], [12000, 'Huyền thoại 4rum Việt'],
];
