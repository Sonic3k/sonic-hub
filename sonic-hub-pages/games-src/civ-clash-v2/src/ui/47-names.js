/* ── Who sits at the table: you are "You"; each computer player is a famous king, queen, leader or general of its civilization,
   drawn at random for the match ── */
const LEADERS = {
  chinese: ['Tang Taizong', 'Wu Zetian', 'Song Taizu', 'Yue Fei', 'Hongwu Emperor', 'Zheng He'],
  japanese: ['Oda Nobunaga', 'Minamoto Yoshitsune', 'Takeda Shingen', 'Uesugi Kenshin', 'Toyotomi Hideyoshi', 'Tokugawa Ieyasu'],
  koreans: ['Yi Sun-sin', 'King Sejong', 'Gwanggaeto', 'Wang Geon', 'Eulji Mundeok', 'Yi Seong-gye'],
  jurchens: ['Wanyan Aguda', 'Wanyan Wuqimai', 'Wanyan Wuzhu', 'Wanyan Liang', 'Jin Shizong'],
  daiviet: ['Trần Hưng Đạo', 'Lý Thường Kiệt', 'Lê Lợi', 'Ngô Quyền', 'Lý Thái Tổ', 'Trần Nhân Tông', 'Lê Thánh Tông'],
  khmer: ['Jayavarman II', 'Indravarman I', 'Yasovarman I', 'Suryavarman II', 'Jayavarman VII'],
  indians: ['Harsha', 'Rajaraja Chola', 'Rajendra Chola', 'Prithviraj Chauhan', 'Krishnadevaraya', 'Rani Durgavati'],
  arabs: ['Khalid ibn al-Walid', 'Harun al-Rashid', 'Abd al-Rahman III', 'Saladin', 'Baibars'],
  persians: ['Shapur II', 'Bahram Gur', 'Khosrow I', 'Yazdegerd III', 'Ismail I'],
  turks: ['Tughril Beg', 'Alp Arslan', 'Osman I', 'Bayezid I', 'Mehmed II', 'Selim I'],
  malians: ['Sundiata Keita', 'Mansa Musa', 'Mansa Sulayman', 'Sunni Ali', 'Askia Muhammad'],
  ethiopians: ['Ezana', 'Lalibela', 'Yekuno Amlak', 'Amda Seyon', 'Zara Yaqob'],
  mongols: ['Genghis Khan', 'Kublai Khan', 'Ögedei Khan', 'Batu Khan', 'Subutai', 'Jebe'],
  huns: ['Attila', 'Bleda', 'Ruga', 'Uldin', 'Ellac', 'Dengizich'],
  khitans: ['Abaoji', 'Yelü Deguang', 'Xiao Yanyan', 'Yelü Xiuge', 'Yelü Dashi'],
  britons: ['Alfred the Great', 'Æthelstan', 'Harold Godwinson', 'Richard Lionheart', 'Edward I', 'Henry V'],
  celts: ['Brian Boru', 'Kenneth MacAlpin', 'Llywelyn the Great', 'William Wallace', 'Robert the Bruce', 'Owain Glyndŵr'],
  franks: ['Clovis I', 'Charles Martel', 'Pepin the Short', 'Charlemagne', 'Philip Augustus', 'Joan of Arc'],
  vikings: ['Ragnar Lothbrok', 'Ivar the Boneless', 'Erik the Red', 'Olaf Tryggvason', 'Cnut the Great', 'Harald Hardrada'],
  teutons: ['Henry the Fowler', 'Otto the Great', 'Conrad II', 'Barbarossa', 'Hermann von Salza'],
  goths: ['Fritigern', 'Alaric I', 'Athaulf', 'Euric', 'Theodoric the Great', 'Totila'],
  spanish: ['El Cid', 'Alfonso VI', 'James I of Aragon', 'Isabella I', 'Ferdinand II', 'Gonzalo de Córdoba'],
  portuguese: ['Afonso Henriques', 'John I', 'Nuno Álvares', 'Henry the Navigator', 'Manuel I', 'Vasco da Gama'],
  byzantines: ['Justinian I', 'Belisarius', 'Narses', 'Heraclius', 'Basil II', 'Alexios Komnenos'],
  aztecs: ['Itzcoatl', 'Tlacaelel', 'Moctezuma I', 'Nezahualcoyotl', 'Ahuitzotl', 'Cuauhtémoc'],
  mayans: ['Pakal the Great', 'Lady Six Sky', 'Yax Nuun Ahiin', "Jasaw Chan K'awiil", "K'uk' Bahlam"],
  incas: ['Viracocha Inca', 'Pachacuti', 'Topa Inca', 'Huayna Capac', 'Huáscar', 'Atahualpa'],
  berbers: ['Dihya', 'Tariq ibn Ziyad', 'Yusuf ibn Tashfin', 'Ibn Tumart', "Abd al-Mu'min", 'Yaqub al-Mansur'],
  malay: ['Raden Wijaya', 'Gajah Mada', 'Hayam Wuruk', 'Parameswara', 'Mansur Shah', 'Hang Tuah'],
  bohemians: ['Wenceslaus I', 'Ottokar II', 'Charles IV', 'Jan Žižka', 'Prokop the Great', 'George of Poděbrady'],
  poles: ['Mieszko I', 'Bolesław the Brave', 'Casimir the Great', 'Jadwiga', 'Władysław Jagiełło'],
  lithuanians: ['Mindaugas', 'Gediminas', 'Algirdas', 'Kęstutis', 'Vytautas the Great', 'Jogaila'],
  bulgarians: ['Krum', 'Boris I', 'Simeon the Great', 'Tsar Samuel', 'Kaloyan', 'Ivan Asen II'],
  slavs: ['Sviatoslav I', 'Vladimir the Great', 'Yaroslav the Wise', 'Alexander Nevsky', 'Dmitry Donskoy', 'Ivan III'],
  magyars: ['Árpád', 'Stephen I', 'Ladislaus I', 'Béla IV', 'John Hunyadi', 'Matthias Corvinus'],
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
