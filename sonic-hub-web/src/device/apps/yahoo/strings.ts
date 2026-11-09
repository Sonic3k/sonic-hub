/* The words of Yahoo! Messenger, as his copies showed them: English for 8 and 10, Vietnamese for 9 and 11 (his
   screenshots of 3/2009 and 8/2013). The Vietnamese ones are those of the 11.5 language pack he had
   (resources\vi-VN\res_msgr.dll; the number is the string's id there). */

export type YmVer = 'YM8' | 'YM9' | 'YM10' | 'YM11';

export const ymVer = (v?: string): YmVer => (v === 'YM8' || v === 'YM9' || v === 'YM10' ? v : 'YM11');
export const ymVi = (v: YmVer) => v === 'YM9' || v === 'YM11';

const EN = {
  menu: ['Messenger', 'Contacts', 'Actions', 'Help'],
  imMenu: ['Conversation', 'Edit', 'View', 'Actions', 'Help'],
  contacts: 'Contacts',
  updates: 'Y! Updates',
  insider: 'Insider',
  share: 'Have something to share?',
  search: 'type some contact information...',
  search9: 'Type a name or phone number',
  recent: 'Recent Contacts',
  plugins: 'Plug-ins',
  addPlugins: 'Add Plug-ins',
  addContact: 'Add a Contact',
  webSearch: 'Web Search',
  voice: 'Y! Voice',
  blog: 'Y! Blog',
  game: 'Game',
  phoneOut: '$0.00 - Phone Out',
  forward: 'Forward...',
  video: 'Video Call',
  call: 'Voice Call',
  photos: 'Photos',
  activities: 'Activities',
  imv: 'IMVironment',
  addUser: 'Add User',
  ignore: 'Ignore User',
  send: 'Send',
  last: (d: string, t: string) => `Last message received on ${d} at ${t}`,
  noContacts: 'No contacts yet.',
  card: ['Send Email...', 'Conference', 'Share Photos', 'Send a File'],
  conference: 'Conference',
  cardDetails: 'Contact Details',
  cardProfile: 'View Profile',
  cardOnline: 'You appear online to this contact',
  buzz: 'BUZZ!!!',
  notice: '',
  noticeMore: '',
  newMessages: (n: number) => `${n} new messages`,
};

const VI: typeof EN = {
  menu: ['Messenger', 'Danh bạ', 'Thao tác', 'Trợ giúp'],
  imMenu: ['Hội thoại', 'Sửa', 'Hiển thị', 'Thao tác', 'Trợ giúp'],
  contacts: 'Danh bạ', // 1558
  updates: 'Y! Updates', // 1559
  insider: 'Insider', // 1560
  share: 'Có gì muốn chia sẻ?', // 95
  search: 'đánh vào vài thông tin...', // 760
  search9: 'đánh vào vài thông tin...',
  recent: 'Mới liên lạc', // 61247
  plugins: 'Tiện ích', // 51006
  addPlugins: 'Thêm tiện ích', // 49
  addContact: 'Thêm bạn', // 113
  webSearch: 'Tìm kiếm Web', // 1010
  voice: 'Y! Voice',
  blog: 'Y! Blog',
  game: 'Game', // 529
  phoneOut: '$0.00 - Phone Out',
  forward: 'Forward...',
  video: 'Gọi video', // 783
  call: 'Gọi thoại', // 102
  photos: 'Hình ảnh', // 11240
  activities: 'Hoạt động', // 339
  imv: 'IMVironment',
  addUser: 'Thêm người dùng', // 1400
  ignore: 'Chặn', // 1401
  send: 'Gửi', // 43
  last: (d: string, t: string) => `Tin nhắn sau cùng nhận ngày ${d} lúc ${t}`, // 10309
  noContacts: 'Chưa có ai trong danh bạ.',
  card: ['Gửi Email...', 'Họp nhóm', 'Chia sẻ hình ảnh', 'Gửi tập tin'], // 60398, 531, 530, 1000
  conference: 'Họp nhóm', // 531
  cardDetails: 'Chi tiết liên lạc',
  cardProfile: 'Xem hồ sơ', // 11111
  cardOnline: 'Bạn hiện online với người này', // 491
  buzz: 'BUZZ!!!', // 33182
  notice: 'Một số tính năng của Yahoo! Messenger sẽ ngừng hoạt động vào 14/12/2012.',
  noticeMore: 'Thông tin khác',
  newMessages: (n: number) => `${n} tin nhắn mới`,
};

export const ymText = (v: YmVer) => (ymVi(v) ? VI : EN);
