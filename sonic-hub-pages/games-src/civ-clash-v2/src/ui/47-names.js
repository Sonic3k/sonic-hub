/* ── Who sits at the table: you are "You"; each computer player is a famous king, queen, leader or general of its civilization,
   drawn at random for the match ── */
const LEADERS = {
  chinese: ['Tang Taizong', 'Wu Zetian', 'Song Taizu', 'Yue Fei', 'Hongwu Emperor', 'Zheng He'],
  japanese: ['Oda Nobunaga', 'Minamoto Yoshitsune', 'Takeda Shingen', 'Uesugi Kenshin', 'Toyotomi Hideyoshi', 'Tokugawa Ieyasu'],
  koreans: ['Yi Sun-sin', 'King Sejong', 'Gwanggaeto', 'Wang Geon', 'Eulji Mundeok', 'Yi Seong-gye'],
  jurchens: ['Wanyan Aguda', 'Wanyan Wuqimai', 'Wanyan Wuzhu', 'Wanyan Liang', 'Jin Shizong'],
  dali: ['Duan Siping', 'Duan Suying', 'Duan Zhengchun', 'Duan Zhengxing', 'Gao Shengtai', 'Duan Xingzhi'],
  tibetans: ['Songtsen Gampo', 'Trisong Detsen', 'Tri Ralpachen', 'Tri Dusong', 'Langdarma', 'Drogön Chögyal Phagpa'],
  tanguts: ['Li Jiqian', 'Li Deming', 'Li Yuanhao', 'Empress Liang', 'Li Renxiao', 'Li Anquan'],
  daiviet: ['Trần Hưng Đạo', 'Lý Thường Kiệt', 'Lê Lợi', 'Ngô Quyền', 'Lý Thái Tổ', 'Trần Nhân Tông', 'Lê Thánh Tông'],
  khmer: ['Jayavarman II', 'Indravarman I', 'Yasovarman I', 'Suryavarman II', 'Jayavarman VII'],
  malay: ['Raden Wijaya', 'Gajah Mada', 'Hayam Wuruk', 'Parameswara', 'Mansur Shah', 'Hang Tuah'],
  pagan: ['Anawrahta', 'Kyansittha', 'Alaungsithu', 'Narapatisithu', 'Htilominlo', 'Narathihapate'],
  bengalis: ['Gopala', 'Dharmapala', 'Devapala', 'Ilyas Shah', 'Alauddin Husain Shah', 'Isa Khan'],
  hindustanis: ['Qutb ud-Din Aibak', 'Iltutmish', 'Razia Sultana', 'Alauddin Khalji', 'Muhammad bin Tughluq', 'Babur'],
  chola: ['Vijayalaya', 'Parantaka I', 'Rajaraja Chola', 'Rajendra Chola', 'Kulothunga I', 'Rajadhiraja'],
  gurjaras: ['Nagabhata I', 'Vatsaraja', 'Mihira Bhoja', 'Mahendrapala I', 'Prithviraj Chauhan', 'Rana Kumbha'],
  mongols: ['Genghis Khan', 'Kublai Khan', 'Ögedei Khan', 'Batu Khan', 'Subutai', 'Jebe'],
  huns: ['Attila', 'Bleda', 'Ruga', 'Uldin', 'Ellac', 'Dengizich'],
  khitans: ['Abaoji', 'Yelü Deguang', 'Xiao Yanyan', 'Yelü Xiuge', 'Yelü Dashi'],
  tatars: ['Berke Khan', 'Özbeg Khan', 'Toqtamysh', 'Edigu', 'Timur', 'Hacı Giray'],
  cumans: ['Bonyak', 'Sharukan', 'Konchak', 'Tugorkan', 'Köten', 'Ayepa'],
  arabs: ['Khalid ibn al-Walid', 'Harun al-Rashid', 'Abd al-Rahman III', 'Saladin', 'Baibars'],
  turks: ['Tughril Beg', 'Alp Arslan', 'Osman I', 'Bayezid I', 'Mehmed II', 'Selim I'],
  persians: ['Shapur II', 'Bahram Gur', 'Khosrow I', 'Yazdegerd III', 'Ismail I'],
  armenians: ['Vartan Mamikonian', 'Ashot I', 'Gagik I', 'Levon I', 'Hethum I', 'Zabel'],
  georgians: ['David IV the Builder', 'Queen Tamar', 'George III', 'Bagrat III', 'Rusudan', 'George V the Brilliant'],
  bohemians: ['Wenceslaus I', 'Ottokar II', 'Charles IV', 'Jan Žižka', 'Prokop the Great', 'George of Poděbrady'],
  poles: ['Mieszko I', 'Bolesław the Brave', 'Casimir the Great', 'Jadwiga', 'Władysław Jagiełło'],
  lithuanians: ['Mindaugas', 'Gediminas', 'Algirdas', 'Kęstutis', 'Vytautas the Great', 'Jogaila'],
  bulgarians: ['Krum', 'Boris I', 'Simeon the Great', 'Tsar Samuel', 'Kaloyan', 'Ivan Asen II'],
  slavs: ['Sviatoslav I', 'Vladimir the Great', 'Yaroslav the Wise', 'Alexander Nevsky', 'Dmitry Donskoy', 'Ivan III'],
  magyars: ['Árpád', 'Stephen I', 'Ladislaus I', 'Béla IV', 'John Hunyadi', 'Matthias Corvinus'],
  byzantines: ['Justinian I', 'Belisarius', 'Narses', 'Heraclius', 'Basil II', 'Alexios Komnenos'],
  italians: ['Enrico Dandolo', 'Matilda of Canossa', 'Cosimo de\' Medici', 'Francesco Sforza', 'Bartolomeo Colleoni', 'Lorenzo de\' Medici'],
  spanish: ['El Cid', 'Alfonso VI', 'James I of Aragon', 'Isabella I', 'Ferdinand II', 'Gonzalo de Córdoba'],
  portuguese: ['Afonso Henriques', 'John I', 'Nuno Álvares', 'Henry the Navigator', 'Manuel I', 'Vasco da Gama'],
  teutons: ['Henry the Fowler', 'Otto the Great', 'Conrad II', 'Barbarossa', 'Hermann von Salza'],
  goths: ['Fritigern', 'Alaric I', 'Athaulf', 'Euric', 'Theodoric the Great', 'Totila'],
  vikings: ['Ragnar Lothbrok', 'Ivar the Boneless', 'Erik the Red', 'Olaf Tryggvason', 'Cnut the Great', 'Harald Hardrada'],
  saxons: ['Offa of Mercia', 'Alfred the Great', 'Æthelflæd', 'Æthelstan', 'Edmund Ironside', 'Harold Godwinson'],
  normans: ['Rollo', 'William the Conqueror', 'Robert Guiscard', 'Roger II of Sicily', 'Bohemond of Taranto', 'Tancred of Hauteville'],
  britons: ['Henry II', 'Richard Lionheart', 'Edward I', 'Edward III', 'The Black Prince', 'Henry V'],
  celts: ['Brian Boru', 'Kenneth MacAlpin', 'Llywelyn the Great', 'William Wallace', 'Robert the Bruce', 'Owain Glyndŵr'],
  franks: ['Clovis I', 'Charles Martel', 'Pepin the Short', 'Charlemagne', 'Philip Augustus', 'Joan of Arc'],
  burgundians: ['Philip the Bold', 'John the Fearless', 'Philip the Good', 'Charles the Bold', 'Mary of Burgundy'],
  berbers: ['Dihya', 'Tariq ibn Ziyad', 'Yusuf ibn Tashfin', 'Ibn Tumart', "Abd al-Mu'min", 'Yaqub al-Mansur'],
  malians: ['Sundiata Keita', 'Mansa Musa', 'Mansa Sulayman', 'Sunni Ali', 'Askia Muhammad'],
  ethiopians: ['Ezana', 'Lalibela', 'Yekuno Amlak', 'Amda Seyon', 'Zara Yaqob'],
  swahili: ['Ali ibn al-Hassan Shirazi', 'Sulaiman ibn al-Hasan', 'al-Hasan ibn Sulaiman', 'Fumo Liyongo', 'Mwana Mkisi'],
  nubians: ['Qalidurut', 'Merkurios', 'Kyriakos', 'Zacharias I', 'Georgios I', 'Moses Georgios'],
  yoruba: ['Oduduwa', 'Oranmiyan', 'Alaafin Sango', 'Moremi Ajasoro', 'Obalufon II', 'Alaafin Abiodun'],
  aztecs: ['Itzcoatl', 'Tlacaelel', 'Moctezuma I', 'Nezahualcoyotl', 'Ahuitzotl', 'Cuauhtémoc'],
  maya: ['Pakal the Great', 'Lady Six Sky', 'Yax Nuun Ahiin', "Jasaw Chan K'awiil", "K'uk' Bahlam"],
  inca: ['Viracocha Inca', 'Pachacuti', 'Topa Inca', 'Huayna Capac', 'Huáscar', 'Atahualpa'],
  mississippians: ['Birdman of Cahokia', 'Great Sun of the Natchez', 'Tuskaloosa', 'Chief of Coosa', 'Lady of Cofitachequi'],
};
/* a leader for each computer player, fixed for the match (from its seed), never the same name twice at one table */
function nameTable(S, seed) {
  let x = (seed >>> 0) || 1;
  const rnd = () => ((x = (x * 1103515245 + 12345) >>> 0) / 4294967296);
  const used = new Set();
  S.players.forEach((P, i) => {
    if (i === 0) { P.name = 'You'; return; }
    const pool = (LEADERS[P.civ] || [CIVS[P.civ].name]).filter(n => !used.has(n));
    P.name = pool[Math.floor(rnd() * pool.length)] || CIVS[P.civ].name;
    used.add(P.name);
  });
}
const nameOf = pid => (S.players[pid].name || (pid === 0 ? 'You' : CIVS[S.players[pid].civ].name));
