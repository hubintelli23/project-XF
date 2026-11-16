/* XF 신스에테르0 — world.js : 제1지역 「잊혀진 실험동 (The Silent Lab)」 */
(function(){
'use strict';
const XF = window.XF = window.XF || {};
const hex=XF.hex;

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
W.obstacles = [];        // {x0,z0,x1,z1,h}
W.statics = [];          // 정적 그리기 목록
W.deco = [];             // 발광 장식

W.roomAt=function(x,z){ for(const r of W.rects) if(r.name && x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1) return r; return null; };
W.fogAt=function(x,z){ // 델리리움 안개 농도 0..1
  let f=0; if(z<-88&&z>-130) f=1-Math.min(1,Math.abs(z+109)/24)*.4;
  if(z<-135) f=.45; return XF.clamp(f,0,1);
};

function S(mesh,x,y,z,sx,sy,sz,c,o,ry){ W.statics.push({mesh,x,y,z,sx,sy,sz,c:Array.isArray(c)?c:hex(c),o:o||{},ry:ry||0}); }
function obstacle(x,z,w,d,h){ W.obstacles.push({x0:x-w/2,z0:z-d/2,x1:x+w/2,z1:z+d/2,h:h||2}); }

W.build=function(){
  W.statics.length=0; W.obstacles.length=0; W.deco.length=0;
  const wallH=7, wt=.8;
  const gray=v=>[v,v,v*1.05];
  // 바닥
  for(const r of W.rects){
    const w=r.x1-r.x0, d=r.z1-r.z0;
    S('box',(r.x0+r.x1)/2,-.25,(r.z0+r.z1)/2,w,.5,d,gray(.34),{floor:1});
  }
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
  for(const s of segs){
    const len=s.b-s.a+wt, mid=(s.a+s.b)/2;
    if(s.ax==='z'){ S('box',mid,wallH/2,s.v,len,wallH,wt,gray(.25));
      // 벽 패널 & 발광 띠
      for(let x=s.a+2;x<s.b-1;x+=4){ S('box',x,wallH/2,s.v-s.out*.42,.35,wallH,.12,gray(.2)); }
      S('box',mid,1.1,s.v-s.out*.42,len-.4,.06,.05,[.1,.25,.4],{e:[.15,.45,.8]});
    } else { S('box',s.v,wallH/2,mid,wt,wallH,len,gray(.25));
      for(let z=s.a+2;z<s.b-1;z+=4){ S('box',s.v-s.out*.42,wallH/2,z,.12,wallH,.35,gray(.2)); }
      S('box',s.v-s.out*.42,1.1,mid,.05,.06,len-.4,[.1,.25,.4],{e:[.15,.45,.8]});
    }
  }
  // 각성 캡슐실 R0
  S('cyl',0,.2,3,3.2,.4,3.2,gray(.22)); S('tube',0,1.6,3,2.2,2.6,2.2,[.4,.8,1],{a:.18});
  S('cyl',0,3.1,3,2.6,.5,2.6,gray(.2)); W.deco.push({type:'capsule',x:0,y:1.5,z:3});
  obstacle(0,3,2.6,2.6,3);
  for(const [x,z] of [[-6,-6],[6,-6],[-6,2],[6,2]]){ S('box',x,1,z,1.4,2,1,gray(.27)); S('box',x,1.6,z+.51,1,.5,.02,[.1,.3,.5],{e:[.1,.5,.9]}); obstacle(x,z,1.4,1,2); }
  // 실험동 A R1: 깨진 배양조, 잔해
  for(const [x,z] of [[-11,-30],[11,-30],[-11,-47],[11,-47]]){ tank(x,z,(x+z)%3===0); }
  for(const [x,z,w,d,h] of [[-5,-38,2.2,1.4,1.2],[6,-42,1.6,3,1],[-9,-40,1.2,1.2,2.2],[9,-36,1.4,1.4,.8]]){ debris(x,z,w,d,h); }
  cables(-16,-25,-52); cables(16,-25,-52);
  // 정비실 R2: 작업대, 홀로그램 단말
  S('box',0,.6,-75.5,6,1.2,1.4,gray(.3)); obstacle(0,-75.5,6,1.4,1.2);
  S('box',-6.5,1.5,-70,1,3,3,gray(.26)); obstacle(-6.5,-70,1,3,3);
  S('box',6.5,1.5,-70,1,3,3,gray(.26)); obstacle(6.5,-70,1,3,3);
  S('hex',0,.08,-70,5,.16,5,[.12,.2,.25],{e:[.03,.12,.12]});
  W.deco.push({type:'station',x:0,y:0,z:-70});
  // 침식 구역 B R3
  for(const [x,z] of [[-15,-96],[15,-96],[-15,-123],[15,-123],[0,-110]]){ if(x===0)continue; tank(x,z,true); }
  for(const [x,z,w,d,h] of [[-8,-102,2,2,1.5],[8,-117,3,1.4,1],[-3,-121,1.4,1.4,2.4],[11,-105,1.2,2.4,1.2],[-12,-112,2.6,1.2,.9]]){ debris(x,z,w,d,h); }
  cables(-20,-91,-128); cables(20,-91,-128);
  // 게이트
  W.deco.push({type:'gate',x:0,y:0,z:W.gateZ});
  // 보스 아레나 R4: 원형 단, 부서진 기둥
  S('cyl',0,.04,-160,30,.08,30,gray(.29),{floor:1});
  S('ring',0,.1,-160,14,1,14,[.35,.4,.9],{add:1,a:.16});
  for(let i=0;i<8;i++){ const a=i/8*Math.PI*2, x=Math.cos(a)*16.5, z=-160+Math.sin(a)*16.5; const h=i%3===0?3:6.5;
    S('cyl',x,h/2,z,1.6,h,1.6,gray(.27)); obstacle(x,z,1.3,1.3,h); }
};
function tank(x,z,broken){
  S('cyl',x,.3,z,2.6,.6,2.6,[.24,.24,.26]);
  if(broken){ S('tube',x,1.1,z,2.2,1.2,2.2,[.4,.6,.9],{a:.2}); S('cone',x+.5,1.6,z,.4,.8,.4,[.5,.7,.9],{a:.3}); }
  else { S('tube',x,2,z,2.2,3,2.2,[.4,.6,.9],{a:.18}); S('cyl',x,3.6,z,2.6,.4,2.6,[.22,.22,.24]); W.deco.push({type:'tankglow',x,y:1.8,z}); }
  W.obstacles.push({x0:x-1.2,z0:z-1.2,x1:x+1.2,z1:z+1.2,h:3});
}
function debris(x,z,w,d,h){ S('box',x,h/2,z,w,h,d,[.3,.3,.31],{},(x*7+z)%1.2); W.obstacles.push({x0:x-w/2,z0:z-d/2,x1:x+w/2,z1:z+d/2,h}); }
function cables(x,z0,z1){ const s=x>0?-1:1; for(let z=z0-3;z>z1+2;z-=7){ S('cyl',x+s*.6,.12,z-1.5,.25,.25,.25,[.15,.15,.16]); S('box',x+s*1.2,.1,z-3,.18,.18,5,[.12,.12,.13],{},.3*s); } }

W.draw=function(R,t,player){
  const px=player?player.x:0,pz=player?player.z:0;
  for(const s of W.statics){
    if(Math.abs(s.z-pz)>75 && s.sz<30) continue; // 간단한 거리 컬링
    R.drawTRS(s.mesh,s.x,s.y,s.z,0,s.ry,0,s.sx,s.sy,s.sz,s.c,s.o);
  }
  for(const d of W.deco){
    if(Math.abs(d.z-pz)>80)continue;
    if(d.type==='capsule'){ const p=.5+.5*Math.sin(t*2); R.drawTRS('cyl',d.x,d.y,d.z,0,0,0,1.6,2.4,1.6,[.3,.7,1],{add:1,a:.12+.08*p}); R.light(d.x,2,d.z,[.3,.6,1],9); }
    else if(d.type==='tankglow'){ R.drawTRS('sphere',d.x,d.y+Math.sin(t+d.x)*.2,d.z,0,0,0,.8,.8,.8,[.2,.35,.9],{add:1,a:.5}); R.light(d.x,2,d.z,[.25,.35,1],7); }
    else if(d.type==='station'){
      R.light(-3,2.5,-70,[.2,1,.7],9); R.light(3,2.5,-70,[.25,.6,1],9);
      R.drawTRS('ring',0,.2,-70,0,0,0,2.4,1,2.4,[.3,1,.8],{add:1,a:.4});
      R.drawTRS('ringThin',0,.25+Math.sin(t*2)*.05,-70,0,0,0,3.2,1,3.2,[.3,.7,1],{add:1,a:.5});
      for(let i=0;i<6;i++){ const a=t*.6+i/6*Math.PI*2; R.drawTRS('diamond',Math.cos(a)*2.8,1.6+Math.sin(t*2+i)*.2,-70+Math.sin(a)*2.8,Math.PI/2,-a,0,.18,1,.18,i%2?[.3,1,.75]:[.35,.65,1],{add:1,a:.8}); }
    }
    else if(d.type==='gate'){
      const open=W.gateOpen; const k=open?Math.min(1,(W.gateT||0)):0;
      for(const s of [-1,1]){ R.drawTRS('box',s*(1.6+k*2.6),3.5,d.z,0,0,0,3.2,7,.6,[.22,.23,.26]);
        R.drawTRS('box',s*(1.6+k*2.6),3.5,d.z+.32,0,0,0,.12,6.6,.05,[.3,.4,1],{e:open?[.1,.6,.4]:[.6,.2,.9]}); }
      if(!open){ R.drawTRS('quad',0,3.5,d.z+.4,Math.PI/2,0,0,6,1,7,[.5,.3,1],{add:1,a:.12+.05*Math.sin(t*3)}); }
      R.light(0,3,d.z+2,open?[.2,1,.6]:[.6,.25,1],8);
    }
  }
  // 벽 상단 은은한 안개 경계 조명
  R.light(0,4,-38,[.15,.2,.35],18); R.light(0,4,-110,[.2,.25,.6],22); R.light(0,5,-160,[.35,.25,.7],24);
};

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
