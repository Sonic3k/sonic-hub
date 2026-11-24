// Independent sparring partner. This bot uses only the kit's public board API.
// Its score combines corners, playable squares, discs next to an empty square,
// and exposure beside vacant corners. Iterative alpha-beta uses the host's clock.
const BOT = (() => {
  const corners=[0,7,56,63];
  const neighbor=[[1,8,9],[6,15,14],[48,57,49],[55,62,54]];
  const near=Array.from({length:64},(_,m)=>{
    const a=[];
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const x=(m&7)+dx,y=(m>>3)+dy;
      if((dx||dy)&&x>=0&&x<8&&y>=0&&y<8)a.push(x+8*y);
    }
    return a;
  });
  const cache=new Map(),stop={};
  let deadline,visits;
  function assess(S,legal) {
    const me=S.turn+1,other=3-me,b=S.b;
    let corner=0,nearCorner=0,frontier=0;
    for(let i=0;i<4;i++) {
      const c=b[corners[i]];
      if(c)corner+=c===me?1:-1;
      else for(let j=0;j<3;j++){
        const disc=b[neighbor[i][j]];
        if(disc)nearCorner+=(disc===me?-1:1)*(j===2?3:1);
      }
    }
    for(let m=0;m<64;m++)if(b[m] && near[m].some(s=>!b[s]))frontier+=b[m]===me?-1:1;
    S.turn=1-S.turn;const otherMoves=legalMoves(S);S.turn=1-S.turn;
    const mobility=(legal[0]===PASS_MOVE?0:legal.length)-(otherMoves[0]===PASS_MOVE?0:otherMoves.length);
    const discs=S.count[me-1]-S.count[other-1];
    return 185*corner+22*nearCorner+14*mobility+9*frontier+(S.empties<=12?4:0)*discs;
  }
  function search(S,d,alpha,beta){
    if((++visits&31)===0 && performance.now()>=deadline)throw stop;
    const list=legalMoves(S);
    if(!list.length)return 1000*(S.count[S.turn]-S.count[1-S.turn]);
    if(list[0]===PASS_MOVE){make(S,PASS_MOVE);try{return -search(S,d,-beta,-alpha);}finally{unmake(S);}}
    if(!d)return assess(S,list);
    const key=String(S.hl)+','+S.hh,hit=cache.get(key),a0=alpha;
    if(hit&&hit.d>=d&&(hit.flag===0||hit.flag===1&&hit.score>=beta||hit.flag===-1&&hit.score<=alpha))return hit.score;
    list.sort((a,b)=>order(b)-order(a));
    function order(m){return (hit&&hit.m===m?8:0)+(corners.includes(m)?4:0)+((m&7)%7===0||(m>>3)%7===0?1:0);}
    let best=-100000,move=list[0];
    for(const m of list){
      make(S,m);let v;try{v=-search(S,d-1,-beta,-alpha);}finally{unmake(S);}
      if(v>best){best=v;move=m;if(v>alpha){alpha=v;if(alpha>=beta)break;}}
    }
    cache.set(key,{d,score:best,m:move,flag:best<=a0?-1:best>=beta?1:0});
    return best;
  }
  function think(S,opt){
    const allowed=legalMoves(S);if(allowed.length===1)return allowed[0];
    const key=String(S.hl)+','+S.hh;let best=allowed[0];
    cache.clear();visits=0;deadline=performance.now()+Math.max(1,opt.timeMs*.89);
    for(let depth=1;depth<=S.empties;depth++)try{search(S,depth,-100000,100000);best=cache.get(key).m;}catch(e){if(e!==stop)throw e;break;}
    return best;
  }
  return {name:'Positional Alpha-Beta',author:'OpenAI Codex',levels:['Tournament'],think};
})();
