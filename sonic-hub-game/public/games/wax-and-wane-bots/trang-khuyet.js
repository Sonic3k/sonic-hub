// Trăng Khuyết · Wax & Wane. All three levels play through the original rules engine.
const BOT = (() => {
  const LEVELS = ['Easy', 'Medium', 'Hard'];
  const CORNERS = [0, 7, 56, 63];
  const EDGES = [
    [0,1,2,3,4,5,6,7], [56,57,58,59,60,61,62,63],
    [0,8,16,24,32,40,48,56], [7,15,23,31,39,47,55,63]
  ];
  const VALUE = [
    90,6,14,8,8,14,6,90, 6,2,1,0,0,1,2,6,
    14,1,6,3,3,6,1,14, 8,0,3,2,2,3,0,8,
    8,0,3,2,2,3,0,8, 14,1,6,3,3,6,1,14,
    6,2,1,0,0,1,2,6, 90,6,14,8,8,14,6,90
  ];
  const nextTo = new Int8Array(64).fill(-1), risk = new Int8Array(64);
  for (const corner of CORNERS) {
    const dx = corner % 8 === 0 ? 1 : -1, dy = corner < 8 ? 8 : -8;
    for (const step of [dx, dy, dx+dy]) {
      nextTo[corner+step] = corner;
      risk[corner+step] = step === dx+dy ? 46 : 19;
    }
  }
  const neighbours = Array.from({length:64}, (_, m) => {
    const out = [];
    for (let y=Math.max(0,(m>>3)-1);y<=Math.min(7,(m>>3)+1);y++)
      for (let x=Math.max(0,(m&7)-1);x<=Math.min(7,(m&7)+1);x++)
        if (8*y+x !== m) out.push(8*y+x);
    return out;
  });
  const moveLists = Array.from({length:20}, () => new Uint8Array(65));
  const timeout = {};
  const clock = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();
  let deadline, nodes;
  function squareValue(b,m) {
    return VALUE[m] - (nextTo[m]>=0 && !b[nextTo[m]] ? risk[m] : 0);
  }
  function easy(S,moves,opt) {
    let best=moves[0], top=-Infinity;
    for (const m of moves) {
      const x=m&7, y=m>>3;
      const edge=x===0 || x===7 || y===0 || y===7;
      const score=2*countFlips(S,m)+(CORNERS.includes(m)?18:edge?3:0)+opt.rand()*12;
      if (score>top) { best=m; top=score; }
    }
    return best;
  }
  // Count stable edge discs, excluding corners already valued by squareValue.
  function stableEdges(b,own) {
    let value=0;
    for (const line of EDGES) {
      let full=true;
      for (const m of line) if (!b[m]) { full=false; break; }
      if (full) {
        for (let j=1;j<7;j++) value+=b[line[j]]===own?1:-1;
        continue;
      }
      for (const start of [0,7]) {
        const c=b[line[start]];
        if (!c) continue;
        const step=start===0?1:-1;
        for (let j=start+step;j>0 && j<7 && b[line[j]]===c;j+=step)
          value+=c===own?1:-1;
      }
    }
    return value;
  }
  function assess(S,myChoices,hard) {
    const b=S.b, own=S.turn+1;
    let place=0, frontier=0, theirChoices=0;
    for (let m=0;m<64;m++) {
      if (b[m]) {
        const sign=b[m]===own?1:-1;
        place+=sign*squareValue(b,m);
        if (hard) for (const s of neighbours[m])
          if (!b[s]) { frontier-=sign; break; }
      } else if (hard && encloses(b,m,1-S.turn)) theirChoices++;
    }
    const margin=S.count[S.turn]-S.count[1-S.turn];
    if (!hard) return place+(S.empties<=12?3:1)*margin;
    return place+9*(myChoices-theirChoices)+4*frontier+9*stableEdges(b,own)
      +(S.empties<=12?4:0)*margin;
  }
  function order(list,n,b,preferred) {
    for (let i=1;i<n;i++) {
      const m=list[i], value=m===preferred?10000:squareValue(b,m);
      let j=i;
      while (j>0) {
        const before=list[j-1];
        if (before===preferred || squareValue(b,before)>=value) break;
        list[j]=before; j--;
      }
      list[j]=m;
    }
  }
  function search(S,depth,alpha,beta,ply,hard) {
    if ((++nodes&15)===0 && clock()>=deadline) throw timeout;
    const list=moveLists[ply], n=gen(S,list);
    if (!n) {
      const margin=S.count[S.turn]-S.count[1-S.turn];
      return Math.sign(margin)*20000+100*margin;
    }
    if (list[0]===PASS_MOVE) {
      make(S,PASS_MOVE);
      try { return -search(S,depth,-beta,-alpha,ply+1,hard); }
      finally { unmake(S); }
    }
    if (depth===0) return assess(S,n,hard);
    order(list,n,S.b,-1);
    let best=-100000;
    for (let j=0;j<n;j++) {
      make(S,list[j]);
      let v;
      try { v=-search(S,depth-1,-beta,-alpha,ply+1,hard); }
      finally { unmake(S); }
      if (v>best) {
        best=v;
        if (v>alpha) { alpha=v; if (alpha>=beta) break; }
      }
    }
    return best;
  }
  function think(S,opt) {
    const moves=legalMoves(S);
    if (moves.length<=1) return moves.length ? moves[0] : PASS_MOVE;
    if (opt.level==='Easy') return easy(S,moves,opt);
    const hard=opt.level==='Hard';
    let limit=hard?4:2;
    if (hard && S.empties<=12) limit=S.empties<=7?S.empties:5;
    limit=Math.min(limit,S.empties);
    const ms=Math.max(1,Number(opt.timeMs)||1000);
    deadline=clock()+Math.max(0,ms-Math.max(3,Math.min(35,.15*ms)));
    nodes=0;
    order(moves,moves.length,S.b,-1);
    let answer=moves[0];
    try {
      for (let depth=1;depth<=limit;depth++) {
        order(moves,moves.length,S.b,answer);
        let best=-100000, choice=moves[0];
        for (const m of moves) {
          if (clock()>=deadline) throw timeout;
          make(S,m);
          let score;
          try { score=-search(S,depth-1,-100000,-best,1,hard); }
          finally { unmake(S); }
          if (score>best) { best=score; choice=m; }
        }
        answer=choice;
      }
    } catch (err) { if (err!==timeout) throw err; }
    return answer;
  }
  return {name:'Trăng Khuyết',author:'OpenAI Codex',levels:LEVELS,think};
})();
