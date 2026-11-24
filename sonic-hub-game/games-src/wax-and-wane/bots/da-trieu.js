/* Dạ Triều — a time-bounded Othello searcher for the supplied Wax & Wane rules.
 * Four 32-bit words represent the two sides; the host remains the authority on legal moves.
 * Negamax, principal-variation search, a transposition table and exact late-game search.
 */
const BOT = (() => {
  const INF = 1000000, WIN = 100000, TABLE_BITS = 18, TABLE_SIZE = 1 << TABLE_BITS, TABLE_MASK = TABLE_SIZE - 1;
  const kp0 = new Int32Array(TABLE_SIZE), kp1 = new Int32Array(TABLE_SIZE);
  const ko0 = new Int32Array(TABLE_SIZE), ko1 = new Int32Array(TABLE_SIZE);
  const tv = new Int32Array(TABLE_SIZE), td = new Uint8Array(TABLE_SIZE), tf = new Uint8Array(TABLE_SIZE);
  const tm = new Int8Array(TABLE_SIZE), ta = new Uint16Array(TABLE_SIZE);
  let age = 0;
  const STRIDE = 64, LAYERS = 130;
  const moveList = new Int8Array(STRIDE * LAYERS), flipLo = new Int32Array(STRIDE * LAYERS);
  const flipHi = new Int32Array(STRIDE * LAYERS), orderValue = new Int32Array(STRIDE * LAYERS);
  let out0 = 0, out1 = 0, f0 = 0, f1 = 0, near0 = 0, near1 = 0;
  let deadline = 0, checkMask = 127, nodes = 0, stopped = false;

  // The source-square masks prevent horizontal and diagonal wrap across files.
  function findMoves(p0, p1, o0, o1) {
    let m0=0, m1=0, x0=0, x1=0, t0=0, t1=0;
  x0 = ((p0&0x7f7f7f7f)<<1) & o0; x1 = ((p1&0x7f7f7f7f)<<1) & o1;
  for (let k=0; k<5; k++) { t0=((x0&0x7f7f7f7f)<<1); t1=((x1&0x7f7f7f7f)<<1); x0 |= t0 & o0; x1 |= t1 & o1; }
  m0 |= ((x0&0x7f7f7f7f)<<1); m1 |= ((x1&0x7f7f7f7f)<<1);
  x0 = ((p0&0xfefefefe)>>>1) & o0; x1 = ((p1&0xfefefefe)>>>1) & o1;
  for (let k=0; k<5; k++) { t0=((x0&0xfefefefe)>>>1); t1=((x1&0xfefefefe)>>>1); x0 |= t0 & o0; x1 |= t1 & o1; }
  m0 |= ((x0&0xfefefefe)>>>1); m1 |= ((x1&0xfefefefe)>>>1);
  x0 = (p0<<8) & o0; x1 = ((p1<<8)|(p0>>>24)) & o1;
  for (let k=0; k<5; k++) { t0=(x0<<8); t1=((x1<<8)|(x0>>>24)); x0 |= t0 & o0; x1 |= t1 & o1; }
  m0 |= (x0<<8); m1 |= ((x1<<8)|(x0>>>24));
  x0 = ((p0>>>8)|(p1<<24)) & o0; x1 = (p1>>>8) & o1;
  for (let k=0; k<5; k++) { t0=((x0>>>8)|(x1<<24)); t1=(x1>>>8); x0 |= t0 & o0; x1 |= t1 & o1; }
  m0 |= ((x0>>>8)|(x1<<24)); m1 |= (x1>>>8);
  x0 = ((p0&0x7f7f7f7f)<<9) & o0; x1 = (((p1&0x7f7f7f7f)<<9)|((p0&0x7f7f7f7f)>>>23)) & o1;
  for (let k=0; k<5; k++) { t0=((x0&0x7f7f7f7f)<<9); t1=(((x1&0x7f7f7f7f)<<9)|((x0&0x7f7f7f7f)>>>23)); x0 |= t0 & o0; x1 |= t1 & o1; }
  m0 |= ((x0&0x7f7f7f7f)<<9); m1 |= (((x1&0x7f7f7f7f)<<9)|((x0&0x7f7f7f7f)>>>23));
  x0 = ((p0&0xfefefefe)<<7) & o0; x1 = (((p1&0xfefefefe)<<7)|((p0&0xfefefefe)>>>25)) & o1;
  for (let k=0; k<5; k++) { t0=((x0&0xfefefefe)<<7); t1=(((x1&0xfefefefe)<<7)|((x0&0xfefefefe)>>>25)); x0 |= t0 & o0; x1 |= t1 & o1; }
  m0 |= ((x0&0xfefefefe)<<7); m1 |= (((x1&0xfefefefe)<<7)|((x0&0xfefefefe)>>>25));
  x0 = (((p0&0x7f7f7f7f)>>>7)|((p1&0x7f7f7f7f)<<25)) & o0; x1 = ((p1&0x7f7f7f7f)>>>7) & o1;
  for (let k=0; k<5; k++) { t0=(((x0&0x7f7f7f7f)>>>7)|((x1&0x7f7f7f7f)<<25)); t1=((x1&0x7f7f7f7f)>>>7); x0 |= t0 & o0; x1 |= t1 & o1; }
  m0 |= (((x0&0x7f7f7f7f)>>>7)|((x1&0x7f7f7f7f)<<25)); m1 |= ((x1&0x7f7f7f7f)>>>7);
  x0 = (((p0&0xfefefefe)>>>9)|((p1&0xfefefefe)<<23)) & o0; x1 = ((p1&0xfefefefe)>>>9) & o1;
  for (let k=0; k<5; k++) { t0=(((x0&0xfefefefe)>>>9)|((x1&0xfefefefe)<<23)); t1=((x1&0xfefefefe)>>>9); x0 |= t0 & o0; x1 |= t1 & o1; }
  m0 |= (((x0&0xfefefefe)>>>9)|((x1&0xfefefefe)<<23)); m1 |= ((x1&0xfefefefe)>>>9);
    out0 = m0 & ~(p0 | o0); out1 = m1 & ~(p1 | o1);
  }
  function findFlips(p0, p1, o0, o1, m0, m1) {
    let x0=0, x1=0, t0=0, t1=0; f0=0; f1=0;
  x0 = ((m0&0x7f7f7f7f)<<1) & o0; x1 = ((m1&0x7f7f7f7f)<<1) & o1;
  for (let k=0; k<5; k++) { t0=((x0&0x7f7f7f7f)<<1); t1=((x1&0x7f7f7f7f)<<1); x0 |= t0 & o0; x1 |= t1 & o1; }
  if ((((x0&0x7f7f7f7f)<<1)&p0) | (((x1&0x7f7f7f7f)<<1)&p1)) { f0 |= x0; f1 |= x1; }
  x0 = ((m0&0xfefefefe)>>>1) & o0; x1 = ((m1&0xfefefefe)>>>1) & o1;
  for (let k=0; k<5; k++) { t0=((x0&0xfefefefe)>>>1); t1=((x1&0xfefefefe)>>>1); x0 |= t0 & o0; x1 |= t1 & o1; }
  if ((((x0&0xfefefefe)>>>1)&p0) | (((x1&0xfefefefe)>>>1)&p1)) { f0 |= x0; f1 |= x1; }
  x0 = (m0<<8) & o0; x1 = ((m1<<8)|(m0>>>24)) & o1;
  for (let k=0; k<5; k++) { t0=(x0<<8); t1=((x1<<8)|(x0>>>24)); x0 |= t0 & o0; x1 |= t1 & o1; }
  if (((x0<<8)&p0) | (((x1<<8)|(x0>>>24))&p1)) { f0 |= x0; f1 |= x1; }
  x0 = ((m0>>>8)|(m1<<24)) & o0; x1 = (m1>>>8) & o1;
  for (let k=0; k<5; k++) { t0=((x0>>>8)|(x1<<24)); t1=(x1>>>8); x0 |= t0 & o0; x1 |= t1 & o1; }
  if ((((x0>>>8)|(x1<<24))&p0) | ((x1>>>8)&p1)) { f0 |= x0; f1 |= x1; }
  x0 = ((m0&0x7f7f7f7f)<<9) & o0; x1 = (((m1&0x7f7f7f7f)<<9)|((m0&0x7f7f7f7f)>>>23)) & o1;
  for (let k=0; k<5; k++) { t0=((x0&0x7f7f7f7f)<<9); t1=(((x1&0x7f7f7f7f)<<9)|((x0&0x7f7f7f7f)>>>23)); x0 |= t0 & o0; x1 |= t1 & o1; }
  if ((((x0&0x7f7f7f7f)<<9)&p0) | ((((x1&0x7f7f7f7f)<<9)|((x0&0x7f7f7f7f)>>>23))&p1)) { f0 |= x0; f1 |= x1; }
  x0 = ((m0&0xfefefefe)<<7) & o0; x1 = (((m1&0xfefefefe)<<7)|((m0&0xfefefefe)>>>25)) & o1;
  for (let k=0; k<5; k++) { t0=((x0&0xfefefefe)<<7); t1=(((x1&0xfefefefe)<<7)|((x0&0xfefefefe)>>>25)); x0 |= t0 & o0; x1 |= t1 & o1; }
  if ((((x0&0xfefefefe)<<7)&p0) | ((((x1&0xfefefefe)<<7)|((x0&0xfefefefe)>>>25))&p1)) { f0 |= x0; f1 |= x1; }
  x0 = (((m0&0x7f7f7f7f)>>>7)|((m1&0x7f7f7f7f)<<25)) & o0; x1 = ((m1&0x7f7f7f7f)>>>7) & o1;
  for (let k=0; k<5; k++) { t0=(((x0&0x7f7f7f7f)>>>7)|((x1&0x7f7f7f7f)<<25)); t1=((x1&0x7f7f7f7f)>>>7); x0 |= t0 & o0; x1 |= t1 & o1; }
  if (((((x0&0x7f7f7f7f)>>>7)|((x1&0x7f7f7f7f)<<25))&p0) | (((x1&0x7f7f7f7f)>>>7)&p1)) { f0 |= x0; f1 |= x1; }
  x0 = (((m0&0xfefefefe)>>>9)|((m1&0xfefefefe)<<23)) & o0; x1 = ((m1&0xfefefefe)>>>9) & o1;
  for (let k=0; k<5; k++) { t0=(((x0&0xfefefefe)>>>9)|((x1&0xfefefefe)<<23)); t1=((x1&0xfefefefe)>>>9); x0 |= t0 & o0; x1 |= t1 & o1; }
  if (((((x0&0xfefefefe)>>>9)|((x1&0xfefefefe)<<23))&p0) | (((x1&0xfefefefe)>>>9)&p1)) { f0 |= x0; f1 |= x1; }
  }
  function adjacent(b0, b1) {
    near0 = ((b0&0x7f7f7f7f)<<1) | ((b0&0xfefefefe)>>>1) | (b0<<8) | ((b0>>>8)|(b1<<24)) | ((b0&0x7f7f7f7f)<<9) | ((b0&0xfefefefe)<<7) | (((b0&0x7f7f7f7f)>>>7)|((b1&0x7f7f7f7f)<<25)) | (((b0&0xfefefefe)>>>9)|((b1&0xfefefefe)<<23));
  near1 = ((b1&0x7f7f7f7f)<<1) | ((b1&0xfefefefe)>>>1) | ((b1<<8)|(b0>>>24)) | (b1>>>8) | (((b1&0x7f7f7f7f)<<9)|((b0&0x7f7f7f7f)>>>23)) | (((b1&0xfefefefe)<<7)|((b0&0xfefefefe)>>>25)) | ((b1&0x7f7f7f7f)>>>7) | ((b1&0xfefefefe)>>>9);
  }
  function count(x) {
    x -= (x >>> 1) & 0x55555555;
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
  }
  function count2(lo, hi) { return count(lo) + count(hi); }
  function bit(lo, hi, sq) { return sq < 32 ? (lo >>> sq) & 1 : (hi >>> (sq - 32)) & 1; }
  function slot(p0, p1, o0, o1) {
    let h = p0 ^ ((p1 << 7) | (p1 >>> 25)) ^ ((o0 << 13) | (o0 >>> 19)) ^ ((o1 << 21) | (o1 >>> 11));
    h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
    h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
    return (h ^ (h >>> 16)) & TABLE_MASK;
  }
  function same(i, p0, p1, o0, o1) {
    return tf[i] !== 0 && kp0[i] === p0 && kp1[i] === p1 && ko0[i] === o0 && ko1[i] === o1;
  }
  function save(i, p0, p1, o0, o1, d, value, flag, move) {
    if (same(i,p0,p1,o0,o1) || ta[i] !== age || d >= td[i]) {
      kp0[i]=p0; kp1[i]=p1; ko0[i]=o0; ko1[i]=o1;
      td[i]=d; tv[i]=value; tf[i]=flag; tm[i]=move; ta[i]=age;
    }
  }
  function terminal(p0, p1, o0, o1) {
    const d = count2(p0,p1) - count2(o0,o1);
    return d > 0 ? WIN + 100*d : d < 0 ? -WIN + 100*d : 0;
  }

  const squareValue = new Int16Array([
     800,-190,100, 40, 40,100,-190, 800,
    -190,-300,-45,-25,-25,-45,-300,-190,
     100, -45, 60,  5,  5, 60, -45, 100,
      40, -25,  5,  0,  0,  5, -25,  40,
      40, -25,  5,  0,  0,  5, -25,  40,
     100, -45, 60,  5,  5, 60, -45, 100,
    -190,-300,-45,-25,-25,-45,-300,-190,
     800,-190,100, 40, 40,100,-190, 800
  ]);
  const rowScore = new Int16Array(8*256);
  for (let r=0; r<8; r++) for (let b=1; b<256; b++) {
    const least = b & -b, x = 31 - Math.clz32(least);
    rowScore[r*256+b] = rowScore[r*256+(b^least)] + squareValue[r*8+x];
  }
  const corners = [
    {s:0, x:9, c:[1,8], rays:[[1,2,3,4,5,6,7],[8,16,24,32,40,48,56]]},
    {s:7, x:14, c:[6,15], rays:[[6,5,4,3,2,1,0],[15,23,31,39,47,55,63]]},
    {s:56, x:49, c:[48,57], rays:[[57,58,59,60,61,62,63],[48,40,32,24,16,8,0]]},
    {s:63, x:54, c:[55,62], rays:[[62,61,60,59,58,57,56],[55,47,39,31,23,15,7]]}
  ];
  function stableEdges(p0,p1,o0,o1) {
    let sp0=0,sp1=0,so0=0,so1=0;
    for (const c of corners) {
      const mine=bit(p0,p1,c.s), theirs=bit(o0,o1,c.s);
      if (!(mine|theirs)) continue;
      const a=mine?p0:o0, b=mine?p1:o1;
      let lo=0, hi=0;
      if (c.s<32) lo |= 1<<c.s; else hi |= 1<<(c.s-32);
      for (const ray of c.rays) for (const sq of ray) {
        if (!bit(a,b,sq)) break;
        if (sq<32) lo |= 1<<sq; else hi |= 1<<(sq-32);
      }
      if (mine) { sp0|=lo; sp1|=hi; } else { so0|=lo; so1|=hi; }
    }
    return count2(sp0,sp1)-count2(so0,so1);
  }
  function evaluation(p0,p1,o0,o1,ml0,ml1,empties) {
    let pos=0;
    for (let r=0; r<8; r++) {
      const shift=(r&3)*8, p=r<4?p0:p1, o=r<4?o0:o1;
      pos += rowScore[r*256+((p>>>shift)&255)]-rowScore[r*256+((o>>>shift)&255)];
    }
    // X and C squares stop being dangerous once the adjoining corner is occupied.
    for (const c of corners) if (bit(p0|o0,p1|o1,c.s)) {
      pos += 300*(bit(p0,p1,c.x)-bit(o0,o1,c.x));
      for (const s of c.c) pos += 190*(bit(p0,p1,s)-bit(o0,o1,s));
    }
    findMoves(o0,o1,p0,p1);
    const mine=count2(ml0,ml1), theirs=count2(out0,out1);
    const mobility=700*(mine-theirs)/(mine+theirs+2);
    const e0=~(p0|o0), e1=~(p1|o1);
    adjacent(e0,e1);
    const fp=count2(near0&p0,near1&p1), fo=count2(near0&o0,near1&o1);
    const frontier=350*(fo-fp)/(fp+fo+2);
    adjacent(o0,o1); const pp=count2(near0&e0,near1&e1);
    adjacent(p0,p1); const po=count2(near0&e0,near1&e1);
    const potential=200*(pp-po)/(pp+po+2);
    const stable=65*stableEdges(p0,p1,o0,o1);
    const discs=count2(p0,p1)-count2(o0,o1);
    const discWeight=empties>28 ? -2 : empties>15 ? 1 : Math.min(35,(16-empties)*3);
    return Math.trunc(pos + mobility + frontier + potential + stable + discs*discWeight);
  }

  // Odd empty regions are generally favourable to play last in the endgame.
  function oddRegions(e0,e1) {
    let remaining0=e0,remaining1=e1, odd0=0,odd1=0;
    while (remaining0|remaining1) {
      let a=remaining0 ? remaining0 & -remaining0 : 0;
      let b=remaining0 ? 0 : remaining1 & -remaining1;
      for (;;) {
        adjacent(a,b);
        const na=a|(near0&e0), nb=b|(near1&e1);
        if (na===a && nb===b) break;
        a=na; b=nb;
      }
      remaining0 &= ~a; remaining1 &= ~b;
      if (count2(a,b)&1) { odd0|=a; odd1|=b; }
    }
    return [odd0,odd1];
  }

  // Returns from the perspective of the side to play. Depth counts placed discs, not passes.
  function search(p0,p1,o0,o1,empties,depth,alpha,beta,ply) {
    if (((++nodes)&checkMask)===0 && performance.now()>=deadline) stopped=true;
    if (stopped) return 0;
    if (!empties || !(p0|p1) || !(o0|o1)) return terminal(p0,p1,o0,o1);
    const originalAlpha=alpha, originalBeta=beta, i=slot(p0,p1,o0,o1), hit=same(i,p0,p1,o0,o1);
    const hashMove=hit ? tm[i] : -1;
    if (hit && td[i]>=depth) {
      const value=tv[i], flag=tf[i];
      if (flag===1 || (flag===2 && value>=beta) || (flag===3 && value<=alpha)) return value;
    }
    findMoves(p0,p1,o0,o1);
    let ml0=out0,ml1=out1;
    if (!(ml0|ml1)) {
      findMoves(o0,o1,p0,p1);
      if (!(out0|out1)) return terminal(p0,p1,o0,o1);
      return -search(o0,o1,p0,p1,empties,depth,-beta,-alpha,ply+1);
    }
    if (!depth) return evaluation(p0,p1,o0,o1,ml0,ml1,empties);
    if (empties===1) {
      findFlips(p0,p1,o0,o1,ml0,ml1);
      return terminal(p0|ml0|f0,p1|ml1|f1,o0&~f0,o1&~f1);
    }

    const off=ply*STRIDE, n=count2(ml0,ml1);
    let odd0=0,odd1=0;
    if (empties<=14 && n>1 && depth>=4) [odd0,odd1]=oddRegions(~(p0|o0),~(p1|o1));
    let k=0;
    while (ml0|ml1) {
      const low=ml0!==0, one=low ? (ml0&-ml0) : (ml1&-ml1);
      if (low) ml0^=one; else ml1^=one;
      const sq=(low?0:32)+31-Math.clz32(one), m0=low?one:0, m1=low?0:one;
      findFlips(p0,p1,o0,o1,m0,m1);
      const a=f0,b=f1;
      let priority=squareValue[sq]*4+(sq===hashMove?1000000:0);
      if ((m0&odd0)|(m1&odd1)) priority+=180;
      if (depth>=3 && n>1) {
        findMoves(o0&~a,o1&~b,p0|a|m0,p1|b|m1);
        priority-=35*count2(out0,out1);
        if (!(out0|out1)) priority+=800;
        if ((out0&0x81)|(out1&0x81000000)) priority-=12000;
      }
      let j=k++;
      while (j>0 && orderValue[off+j-1]<priority) {
        moveList[off+j]=moveList[off+j-1]; flipLo[off+j]=flipLo[off+j-1];
        flipHi[off+j]=flipHi[off+j-1]; orderValue[off+j]=orderValue[off+j-1]; j--;
      }
      moveList[off+j]=sq; flipLo[off+j]=a; flipHi[off+j]=b; orderValue[off+j]=priority;
    }
    let best=-INF,bestMove=moveList[off];
    for (let j=0;j<n;j++) {
      const sq=moveList[off+j],a=flipLo[off+j],b=flipHi[off+j];
      const m0=sq<32 ? 1<<sq : 0, m1=sq>=32 ? 1<<(sq-32) : 0;
      const np0=p0|a|m0,np1=p1|b|m1,no0=o0&~a,no1=o1&~b;
      let value;
      if (!j) value=-search(no0,no1,np0,np1,empties-1,depth-1,-beta,-alpha,ply+1);
      else {
        value=-search(no0,no1,np0,np1,empties-1,depth-1,-alpha-1,-alpha,ply+1);
        if (!stopped && value>alpha && value<beta)
          value=-search(no0,no1,np0,np1,empties-1,depth-1,-beta,-alpha,ply+1);
      }
      if (stopped) return 0;
      if (value>best) { best=value; bestMove=sq; }
      if (value>alpha) alpha=value;
      if (alpha>=beta) break;
    }
    const flag=best<=originalAlpha?3:best>=originalBeta?2:1;
    save(i,p0,p1,o0,o1,depth,best,flag,bestMove);
    return best;
  }
  function bitsOf(S) {
    let p0=0,p1=0,o0=0,o1=0;
    for (let s=0;s<64;s++) {
      const v=S.b[s]; if (!v) continue;
      if (s<32) { if (v===S.turn+1) p0|=1<<s; else o0|=1<<s; }
      else { if (v===S.turn+1) p1|=1<<(s-32); else o1|=1<<(s-32); }
    }
    return [p0,p1,o0,o1];
  }
  function think(S,opt) {
    const legal=legalMoves(S);
    if (legal.length<=1) return legal[0];
    const start=performance.now(), allowance=Math.max(0,Number(opt.timeMs)||0);
    deadline=start+Math.max(0,Math.min(allowance*0.84,allowance-12));
    checkMask=allowance<10?0:allowance<100?31:127; nodes=0; stopped=false;
    age=(age+1)&65535; if (!age) { ta.fill(0); age=1; }
    const [p0,p1,o0,o1]=bitsOf(S), root=slot(p0,p1,o0,o1), empty=S.empties;
    findMoves(p0,p1,o0,o1);
    // If a port ever disagrees with the supplied engine, return an engine-approved move.
    if (count2(out0,out1)!==legal.length || legal.some(s=>!bit(out0,out1,s))) return legal[0];
    let best=legal[0];
    for (let d=1; d<=empty; d++) {
      if (performance.now()>=deadline) break;
      let target=d;
      const solveAt=empty<=10?5:empty<=12?7:empty===13?8:9;
      if (empty<=14 && d===solveAt && empty>d) target=empty;
      search(p0,p1,o0,o1,empty,target,-INF,INF,0);
      if (stopped) break;
      if (same(root,p0,p1,o0,o1) && legal.includes(tm[root])) best=tm[root];
      if (target===empty) break;
    }
    return best;
  }
  return { name: 'Dạ Triều', author: 'OpenAI Codex', levels: ['Maximum'], think };
})();
