'use strict';
// Independent benchmark player: compares every candidate against the best
// immediate reply; includes recaptures on the contested square.
registerAI({id:'counterplay',name:'Counterplay',author:'Local benchmark',about:'Searches the reply and recaptures.',levels:1,
turn(S,ctx) {
 const values=[20000,105,240,135,90,460,140,255,630,540,48], me=S.turn;
 function score(T,side) {
  if(T.over) return T.over.winner<0?0:T.over.winner===side?40000:-40000;
  const count=[0,0,0,0,0,0];let n=0;
  for(let p=0;p<T.n;p++){
   const sq=T.at[p];if(sq<0)continue;
   const own=T.own[p],k=T.kind[p],a=CC.armOf(k);if(a>=0)count[own*3+a]++;
   let weight=values[k]+T.hero[p]*(k===CC.AIR?390:117);
   const y=own?12-CC.rankOf(sq):CC.rankOf(sq)-1;
   if(k!==CC.COMMANDER)weight+=4*Math.min(y,11-y)+3*Math.min(5,Math.max(0,5-Math.abs(CC.fileOf(sq)-6)));
   n+=(own===side?1:-1)*weight;
  }
  if(!T.total)for(let i=0;i<6;i++)if(count[i]===1)n+=(Math.floor(i/3)===side?-215:215);
  return n;
 }
 function gain(T,m) {
  const mode=CC.mMode(m);if(mode===CC.INTERCEPT)return -20000;if(mode===CC.COMMIT)return 5;
  if(mode===CC.MOVE||mode===CC.COMBINE)return 0;
  let g=0;for(const p of CC.members(T,CC.mTo(m))) g+=values[T.kind[p]]+T.hero[p]*100;
  return g-(mode===CC.SUICIDE?values[CC.AIR]:values[T.kind[CC.mActor(m)]]*.05);
 }
 function finish(T,m){
  if(!CC.play(T,m,true))return false;
  if(T.dOrg>=0&&!T.over) return CC.commit(T,true);
  return true;
 }
 const result=[];
 while(!S.over&&S.turn===me){
  const legal=CC.legalMoves(S), order=legal.map(m=>{const t=CC.clone(S);CC.play(t,m,true);
   return {m,s:score(t,me)+gain(S,m)*.18+(CC.inCheck(t,1-me)?35:0)};}).sort((a,b)=>b.s-a.s);
  let best=-Infinity,move=order[0].m;
  for(const x of order){
   if(ctx.timeLeft()<Math.max(9,ctx.timeMs*.08)) break;
   const t=CC.clone(S);if(!finish(t,x.m))continue;
   let value=score(t,me);
   if(!t.over) {
    let low=value, tested=0;
    const rs=CC.gen(t,[]).filter(m=>CC.mMode(m)!==CC.INTERCEPT).sort((a,b)=>gain(t,b)-gain(t,a));
    for(const m of rs){
     const capture=CC.mMode(m)>=1&&CC.mMode(m)<=3;
     if(!capture&&tested>=5)break;
     const u=CC.clone(t);if(!finish(u,m))continue;tested++;
     let v=score(u,me);
     if(capture&&!u.over&&u.top[CC.mTo(m)]>=0&&u.own[u.top[CC.mTo(m)]]!==me) {
      let up=v;
      const cap=CC.gen(u,[],true).filter(z=>CC.mTo(z)===CC.mTo(m)&&CC.mMode(z)!==CC.INTERCEPT);
      for(const z of cap){const w=CC.clone(u);if(finish(w,z))up=Math.max(up,score(w,me));}v=up;
     }
     low=Math.min(low,v);
     if(low<=best-45)break;
    }
    value=low*.93+value*.07;
   }
   if(value>best){best=value;move=x.m;}
  }
  result.push(move);CC.play(S,move,true);
 }
 return result;
}});
