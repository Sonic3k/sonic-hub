/* Yahoo! Messenger's emoticons as 11.5 had them (Media\Smileys\emoticons.xml of his own copy): what was typed and
   the picture it became (smileys/<id>.gif among the yahoo assets), the longest codes first so ":((" is not read as ":(".
   Codes are matched exactly as Messenger listed them; anything else (^^, <3) stayed text. */

export const YM_CODES: [code: string, id: number][] = [
  [":::^^:::", 126], [":-)/\\:-)", 132], [":(fight)", 141], ["'@^@|||", 121], ["o|^_^|o", 127], [":(game)", 133],
  ["^O^||3", 123], [":-(||>", 124], [":puke!", 128], ["[]==[]", 131], ["%||:-{", 139], ["~^o^~", 120], ["[]---", 122],
  ["o|:-)", 130], [":->~~", 135], ["?@_@?", 136], [":(tv)", 137], [":-((", 20], ["/:-)", 23], ["o:-)", 25],
  ["0:-)", 25], ["<:-P", 36], ["<:o)", 36], [":-))", 21], [";;-)", 5], [">:D<", 6], ["#:-S", 18], ["<@:)", 34],
  [":-SS", 42], ["<):)", 48], [":-??", 106], ["3:-O", 50], ["3:-0", 50], [":(|)", 51], ["@};-", 53], ["**==", 55],
  ["(~~)", 56], ["*-:)", 58], ["=:-)", 60], ["[-O<", 63], [":)>-", 67], ["\\:D/", 69], ["^:)^", 77], [":-bd", 113],
  ["^#(^", 114], ["'+_+", 125], ["o|\\~", 129], ["'@-@", 134], ["%*-{", 140], [":-)", 1], ["(-:", 1], ["(:)", 1],
  [":-(", 2], [";-)", 3], [":-/", 7], [":-\\", 7], [":-x", 8], ["(L)", 8], [":\">", 9], [":-P", 10], [":-*", 11],
  ["(K)", 11], ["=((", 12], ["(U)", 12], [":-O", 13], ["X-(", 14], ["B-)", 16], ["(H)", 16], [">:)", 19], ["(6)", 19],
  [":((", 20], [":'(", 20], [":-|", 22], ["/:)", 23], ["^o)", 23], ["o:)", 25], ["0:)", 25], ["(A)", 25], [":-B", 26],
  ["8-|", 29], ["8-)", 29], [":-&", 31], ["+o(", 31], [":-$", 32], [":-#", 32], ["(:|", 37], ["(:}", 37], [":-?", 39],
  ["*-)", 39], [":))", 21], ["=))", 24], [":-D", 4], [";;)", 5], [":->", 15], [":-S", 17], ["I-)", 28], ["|-)", 28],
  ["L-)", 30], ["[-(", 33], [":o)", 34], [":0)", 34], ["8-}", 35], ["=P~", 38], ["#-o", 40], ["=D>", 41], ["@-)", 43],
  [":^O", 44], [":-w", 45], [":-<", 46], [">:P", 47], [":)]", 100], [":-c", 101], ["~x(", 102], [":-h", 103],
  [":-t", 104], ["8->", 105], ["%-(", 107], [":o3", 108], ["X_X", 109], [":!!", 110], ["\\m/", 111], [":@)", 49],
  ["~:>", 52], ["%%-", 54], ["~o)", 57], ["8-X", 59], ["=:)", 60], [">-)", 61], [":-L", 62], ["$-)", 64], [":-\"", 65],
  ["b-(", 66], ["[-X", 68], [">:/", 70], [";))", 71], ["o->", 72], ["o=>", 73], ["o-+", 74], ["(%)", 75], [":-@", 76],
  [":-j", 78], ["(*)", 79], [":-q", 112], [":bz", 115], ["&[]", 138], [":)", 1], ["(:", 1], [":(", 2], [";)", 3],
  [":S", 7], [":x", 8], [":$", 9], [":P", 10], [":*", 11], [":O", 13], ["X(", 14], [":@", 14], [":|", 22], [":B", 26],
  [":D", 4], [":>", 15], ["=;", 27],
];

/** id → [English, Vietnamese] name, as the emoticon picker showed it */
export const YM_TITLES: Record<number, [string, string]> = {
  1: ["smile", "vui vẻ"], 2: ["frown", "nhăn mặt"], 3: ["wink", "nháy mắt"], 4: ["big grin", "cười nhăn răng"],
  5: ["batting eyelashes", "đá lông nheo"], 6: ["big hug", "ôm một cái"], 7: ["confused", "bối rối"],
  8: ["lovestruck", "yêu thế"], 9: ["blushing", "thẹn thùng"], 10: ["tongue", "lè lưỡi"], 11: ["kiss", "chụt chụt"],
  12: ["broken heart", "tan nát cõi lòng"], 13: ["surprise", "ngạc nhiên"], 14: ["angry", "giận dữ"],
  15: ["smug", "vênh mặt"], 16: ["cool", "ngầu"], 17: ["worried", "lo lắng"], 18: ["whew", "phù!"],
  19: ["devilish", "quỷ sứ"], 20: ["crying", "khóc rồi nè"], 21: ["laughing", "cười ngoác miệng"],
  22: ["straight face", "chịu"], 23: ["raised eyebrow", "nhíu mày"], 24: ["rolling on the floor", "cười lăn lộn"],
  25: ["angel", "thiên thần"], 26: ["dork", "mọt sách"], 27: ["talk to the hand", "đủ rồi"],
  28: ["sleepy", "buồn ngủ"], 29: ["rolling eyes", "tròn mắt"], 30: ["loser", "yếu mà ra gió"],
  31: ["puke", "không chịu nổi"], 32: ["silent", "im lặng"], 33: ["pouting", "không thèm nói"],
  34: ["clown", "làm mặt hề"], 35: ["silly", "ặc ặc"], 36: ["party", "toe toe"], 37: ["tired", "mệt mỏi"],
  38: ["drooling", "thèm nhỏ dãi"], 39: ["thinking", "suy nghĩ"], 40: ["doh!", "trời ơi!"], 41: ["clapping", "vỗ tay"],
  42: ["nailbiting", "cắn móng tay"], 43: ["hypnotized", "bị thôi miên"], 44: ["liar", "nói dối"],
  45: ["waiting", "đang đợi nè"], 46: ["sigh", "thở dài"], 47: ["phbbbt", "phbbbt"], 48: ["cowboy", "cao bồi"],
  49: ["pig", "lợn con"], 50: ["cow", "bò con"], 51: ["monkey", "khỉ con"], 52: ["chicken", "gà con"],
  53: ["rose", "hoa hồng"], 54: ["clover", "chúc may mắn"], 55: ["flag", "cờ"], 56: ["pumpkin", "bí ngô"],
  57: ["coffee", "cà phê"], 58: ["idea", "ý kiến hay"], 59: ["skull", "đầu lâu"], 60: ["bug", "bọ"],
  61: ["alien", "người hành tinh"], 62: ["frustrated", "bực quá"], 63: ["praying", "lạy trời"],
  64: ["money eyes", "thấy tiền là sáng mắt"], 65: ["whistling", "huýt sáo"], 66: ["feeling beat up", "muốn gây sự à"],
  67: ["peace sign", "hòa nhé"], 68: ["shame on you", "xấu hổ quá đi"], 69: ["dancing", "nhảy múa"],
  70: ["bring it on", "giỏi thì tới đây"], 71: ["hee hee", "hi hi"], 72: ["hiro", "hiro"], 73: ["billy", "billy"],
  74: ["april", "april"], 75: ["yin yang", "âm dương"], 76: ["chatterbox", "nói liên tục"],
  77: ["not worthy", "đa tạ"], 78: ["oh go on", "ồ thôi mà"], 79: ["star", "ngôi sao"],
  100: ["on the phone", "đang bận điện thoại"], 101: ["call me", "gọi cho tôi"], 102: ["at wits' end", "hết cách"],
  103: ["wave", "bái bai"], 104: ["time out", "hết giờ"], 105: ["daydreaming", "mơ giữa ban ngày"],
  106: ["I don't know", "ai biết đâu"], 107: ["not listening", "không nghe nữa đâu"],
  108: ["puppy dog eyes", "cún con"], 109: ["don't want to see", "sợ quá đi thôi"], 110: ["hurry up!", "nhanh lên!"],
  111: ["rock on!", "yeah!"], 112: ["thumbs down", "không đồng ý"], 113: ["thumbs up", "đồng ý hai tay"],
  114: ["it wasn't me!", "không phải tôi!"], 115: ["bumble bee", "con ong chăm chỉ"], 120: ["cheer", "cổ vũ"],
  121: ["dizzy", "chóng mặt"], 122: ["cook", "nấu ăn"], 123: ["eat", "ăn"], 124: ["give up", "chịu thua"],
  125: ["cold", "lạnh"], 126: ["hot", "nóng"], 127: ["music", "nghe nhạc"], 128: ["vomit", "nôn mửa"],
  129: ["sing", "ca hát"], 130: ["catch", "chụp lấy"], 131: ["exercise", "tập thể dục"], 132: ["high five", "hi5"],
  133: ["gaming", "chơi game"], 134: ["search me", "săm soi"], 135: ["spooky", "nhát ma"],
  136: ["studying", "học bài"], 137: ["tv", "xem TV"], 138: ["gift", "tặng quà"], 139: ["unlucky", "xui xẻo"],
  140: ["down on luck", "không gặp may"], 141: ["fight", "đánh nhau"],
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RE = new RegExp(YM_CODES.map(([c]) => esc(c)).join('|'), 'g');
const ID = new Map(YM_CODES);

/** A line of a Yahoo chat as text and emoticons. */
export type YmPiece = string | { code: string; id: number };
export function ymPieces(text: string): YmPiece[] {
  const out: YmPiece[] = [];
  let last = 0;
  for (const m of text.matchAll(RE)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    out.push({ code: m[0], id: ID.get(m[0])! });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
