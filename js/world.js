/* XF 신스에테르0 — world.js : 제1지역 「잊혀진 실험동」 배치 · 충돌 (게임 규칙)
 * 겉모습(바닥·벽·소품·조명·안개 색)은 assets/background.js
 * 소품을 놓으려면 W.props 에 {type, x, z, ...} 추가 — 충돌 크기는 W.COLLIDERS, 모양은 background.js 의 XF.BG.PROPS
 */
(function(){
'use strict';
const XF = window.XF = window.XF || {};

const W = XF.World = {};
// 걸을 수 있는 영역 (x0,z0,x1,z1) — 겹치는 곳이 통로
W.rects = [
  {id:'R0', name:'각성 캡슐실',      x0:-8,  z0:-10, x1:8,  z1:6},
  {id:'C1', x0:-2.6, z0:-26, x1:2.6, z1:-9},
  {id:'R1', name:'실험동 A',          x0:-16, z0:-52, x1:16, z1:-25},
  {id:'C2', x0:-2.6, z0:-64, x1:2.6, z1:-51},
  {id:'R2', name:'정비실 (조력자)',   x0:-9,  z0:-78, x1:9,  z1:-63},
  {id:'C3', x0:-2.6, z0:-92, x1:2.6, z1:-77},
  {id:'R3', name:'침식 구역 B',       x0:-20, z0:-128,x1:20, z1:-91},
  {id:'C4', x0:-3,   z0:-141,x1:3,   z1:-127},
  {id:'R4', name:'기억의 심층부',     x0:-20, z0:-180,x1:20, z1:-140}
];
W.gateZ = -134;          // 기억 복원 게이트
W.gateOpen = false;
W.WALL = {h:7, t:.8};    // 벽 높이·두께

// 소품 배치
W.props = [
  // 각성 캡슐실
  {type:'capsule', x:0, z:3},
  {type:'console', x:-6, z:-6}, {type:'console', x:6, z:-6}, {type:'console', x:-6, z:2}, {type:'console', x:6, z:2},
  // 실험동 A
  {type:'tank', x:-11, z:-30, broken:false}, {type:'tank', x:11, z:-30, broken:false}, {type:'tank', x:-11, z:-47, broken:false}, {type:'tank', x:11, z:-47, broken:true},
  {type:'debris', x:-5, z:-38, w:2.2, d:1.4, h:1.2}, {type:'debris', x:6, z:-42, w:1.6, d:3, h:1}, {type:'debris', x:-9, z:-40, w:1.2, d:1.2, h:2.2}, {type:'debris', x:9, z:-36, w:1.4, d:1.4, h:.8},
  {type:'cables', x:-16, z0:-25, z1:-52}, {type:'cables', x:16, z0:-25, z1:-52},
  // 정비실
  {type:'workbench', x:0, z:-75.5}, {type:'locker', x:-6.5, z:-70}, {type:'locker', x:6.5, z:-70}, {type:'station', x:0, z:-70},
  // 침식 구역 B
  {type:'tank', x:-15, z:-96, broken:true}, {type:'tank', x:15, z:-96, broken:true}, {type:'tank', x:-15, z:-123, broken:true}, {type:'tank', x:15, z:-123, broken:true},
  {type:'debris', x:-8, z:-102, w:2, d:2, h:1.5}, {type:'debris', x:8, z:-117, w:3, d:1.4, h:1}, {type:'debris', x:-3, z:-121, w:1.4, d:1.4, h:2.4},
  {type:'debris', x:11, z:-105, w:1.2, d:2.4, h:1.2}, {type:'debris', x:-12, z:-112, w:2.6, d:1.2, h:.9},
  {type:'cables', x:-20, z0:-91, z1:-128}, {type:'cables', x:20, z0:-91, z1:-128},
  // 게이트 · 보스 아레나
  {type:'gate', x:0, z:-134},
  {type:'arena', x:0, z:-160}
];
for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; W.props.push({type:'arenaPillar', x:Math.cos(a)*16.5, z:-160+Math.sin(a)*16.5, h:i%3===0?3:6.5}); }

// 소품 충돌 크기 (w·d 너비, h 높이 — 이보다 높이 점프하면 위로 지나감)
W.COLLIDERS = {
  capsule:{w:2.6,d:2.6,h:3}, console:{w:1.4,d:1,h:2}, tank:{w:2.4,d:2.4,h:3},
  debris:p=>({w:p.w,d:p.d,h:p.h}), workbench:{w:6,d:1.4,h:1.2}, locker:{w:1,d:3,h:3},
  arenaPillar:p=>({w:1.3,d:1.3,h:p.h})
};

W.obstacles = [];        // {x0,z0,x1,z1,h}
W.roomAt=function(x,z){ for(const r of W.rects) if(r.name && x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1) return r; return null; };
W.fogAt=function(x,z){ // 델리리움 안개 농도 0..1
  let f=0; if(z<-88&&z>-130) f=1-Math.min(1,Math.abs(z+109)/24)*.4;
  if(z<-135) f=.45; return XF.clamp(f,0,1);
};

W.build=function(){
  W.obstacles.length=0;
  for(const p of W.props){ let c=W.COLLIDERS[p.type]; if(!c)continue; if(typeof c==='function') c=c(p);
    W.obstacles.push({x0:p.x-c.w/2,z0:p.z-c.d/2,x1:p.x+c.w/2,z1:p.z+c.d/2,h:c.h}); }
  const wt=W.WALL.t;
  // 벽: 각 사각형의 변 중 다른 사각형과 겹치지 않는 구간만
  const segs=[];
  for(const r of W.rects){
    const edges=[
      {ax:'z',v:r.z0,a:r.x0,b:r.x1,out:-1},{ax:'z',v:r.z1,a:r.x0,b:r.x1,out:1},
      {ax:'x',v:r.x0,a:r.z0,b:r.z1,out:-1},{ax:'x',v:r.x1,a:r.z0,b:r.z1,out:1}];
    for(const e of edges){
      let iv=[[e.a,e.b]];
      for(const o of W.rects){ if(o===r)continue;
        let lo,hi,inside;
        if(e.ax==='z'){ inside=e.v>o.z0-.01&&e.v<o.z1+.01 && !(Math.abs(e.v-o.z0)<.01&&e.out>0) && !(Math.abs(e.v-o.z1)<.01&&e.out<0); lo=o.x0;hi=o.x1; inside = e.v>o.z0+.01&&e.v<o.z1-.01; }
        else { lo=o.z0;hi=o.z1; inside = e.v>o.x0+.01&&e.v<o.x1-.01; }
        if(!inside)continue;
        const n=[];for(const [a,b] of iv){ if(hi<=a||lo>=b){n.push([a,b]);continue;} if(lo>a)n.push([a,lo]); if(hi<b)n.push([hi,b]); } iv=n;
      }
      for(const [a,b] of iv) if(b-a>.05) segs.push({ax:e.ax,v:e.v+e.out*wt/2,a,b,out:e.out});
    }
  }
  W.wallSegs=segs;
  if(XF.BG) XF.BG.build(W);
};
W.draw=function(R,t,player){ if(XF.BG) XF.BG.draw(R,t,player); };

/* 원(x,z,r)을 걸을 수 있는 영역 안으로 & 장애물 밖으로 */
W.collide=function(p,r,ignoreGate){
  if(!isFinite(p.x)||!isFinite(p.z)){ p.x=isFinite(p.px)?p.px:0; p.z=isFinite(p.pz)?p.pz:-5; p.vx=0; p.vz=0; }
  if(p.y!==undefined&&!isFinite(p.y)){ p.y=0; p.vy=0; }
  // 1) 영역
  let inside=false;
  for(const q of W.rects){ if(p.x>=q.x0+r&&p.x<=q.x1-r&&p.z>=q.z0+r&&p.z<=q.z1-r){inside=true;break;} }
  if(!inside){ let best=null,bd=1e9;
    for(const q of W.rects){ const x=XF.clamp(p.x,q.x0+r,q.x1-r), z=XF.clamp(p.z,q.z0+r,q.z1-r); const d=(x-p.x)**2+(z-p.z)**2; if(d<bd){bd=d;best=[x,z];} }
    p.x=best[0];p.z=best[1]; }
  // 2) 장애물 (공중이면 높이 비교)
  for(const o of W.obstacles){
    if(p.y!==undefined && p.y>o.h-.1) continue;
    const cx=XF.clamp(p.x,o.x0,o.x1), cz=XF.clamp(p.z,o.z0,o.z1); const dx=p.x-cx,dz=p.z-cz; const d2=dx*dx+dz*dz;
    if(d2<r*r){ if(d2>1e-6){const d=Math.sqrt(d2);p.x=cx+dx/d*r;p.z=cz+dz/d*r;}
      else { // 내부: 가장 가까운 면으로
        const m=[p.x-o.x0,o.x1-p.x,p.z-o.z0,o.z1-p.z];const i=m.indexOf(Math.min(...m));
        if(i===0)p.x=o.x0-r;else if(i===1)p.x=o.x1+r;else if(i===2)p.z=o.z0-r;else p.z=o.z1+r; } }
  }
  p.px=p.x; p.pz=p.z;
  // 3) 게이트
  if(!ignoreGate && !W.gateOpen && p.z<W.gateZ+.6+r && p.z>W.gateZ-1.5) p.z=W.gateZ+.6+r;
  p.px=p.x; p.pz=p.z;
};
})();
