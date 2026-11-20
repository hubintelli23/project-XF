/* XF 신스에테르0 — assets/background.js : 배경(맵 겉모습) 에셋
 * ─────────────────────────────────────────────
 *  · 색감 바꾸기 .......... XF.BG.PALETTE (바닥·벽·발광 띠·안개)
 *  · 소품 모양 ............ XF.BG.PROPS[type].build(S,p) — 고정된 도형 / .draw(R,t,p) — 움직이는 빛·애니메이션
 *  · 새 소품 추가 ......... ① 여기 PROPS 에 모양 추가 ② world.js 의 W.props 에 배치 ③ 막히는 물체면 W.COLLIDERS 에 크기
 *  · 지역 전체 조명 ....... XF.BG.AMBIENT_LIGHTS
 * S(mesh, x,y,z, 가로,높이,세로, 색, 옵션, 회전Y) — 옵션: {e:[발광]}, {a:투명도}, {add:1 빛남}, {floor:1 바닥 타일}
 */
(function(){
'use strict';
const XF = window.XF = window.XF || {};
const hex=XF.hex;
const gray=v=>[v,v,v*1.05];

const BG = XF.BG = {};
BG.PALETTE = {
  floor: gray(.34), wall: gray(.25), wallPanel: gray(.2),
  strip: [.1,.25,.4], stripGlow: [.15,.45,.8],          // 벽 발광 띠
  fogClear: [.085,.1,.14], fogDense: [.12,.15,.26],     // 델리리움 안개: 옅음 → 짙음
  fogDenClear: .026, fogDenDense: .07
};
BG.AMBIENT_LIGHTS = [ // [x,y,z, 색, 반경]
  [0,4,-38,[.15,.2,.35],18], [0,4,-110,[.2,.25,.6],22], [0,5,-160,[.35,.25,.7],24]
];

BG.statics=[]; BG.anim=[];
function S(mesh,x,y,z,sx,sy,sz,c,o,ry){ BG.statics.push({mesh,x,y,z,sx,sy,sz,c:Array.isArray(c)?c:hex(c),o:o||{},ry:ry||0}); }

BG.PROPS = {
  capsule:{ build:(S,p)=>{ S('cyl',p.x,.2,p.z,3.2,.4,3.2,gray(.22)); S('tube',p.x,1.6,p.z,2.2,2.6,2.2,[.4,.8,1],{a:.18}); S('cyl',p.x,3.1,p.z,2.6,.5,2.6,gray(.2)); },
            draw:(R,t,p)=>{ const k=.5+.5*Math.sin(t*2); R.drawTRS('cyl',p.x,1.5,p.z,0,0,0,1.6,2.4,1.6,[.3,.7,1],{add:1,a:.12+.08*k}); R.light(p.x,2,p.z,[.3,.6,1],9); } },
  console:{ build:(S,p)=>{ S('box',p.x,1,p.z,1.4,2,1,gray(.27)); S('box',p.x,1.6,p.z+.51,1,.5,.02,[.1,.3,.5],{e:[.1,.5,.9]}); } },
  tank:{ build:(S,p)=>{ S('cyl',p.x,.3,p.z,2.6,.6,2.6,[.24,.24,.26]);
            if(p.broken){ S('tube',p.x,1.1,p.z,2.2,1.2,2.2,[.4,.6,.9],{a:.2}); S('cone',p.x+.5,1.6,p.z,.4,.8,.4,[.5,.7,.9],{a:.3}); }
            else { S('tube',p.x,2,p.z,2.2,3,2.2,[.4,.6,.9],{a:.18}); S('cyl',p.x,3.6,p.z,2.6,.4,2.6,[.22,.22,.24]); } },
         draw:(R,t,p)=>{ if(p.broken)return; R.drawTRS('sphere',p.x,1.8+Math.sin(t+p.x)*.2,p.z,0,0,0,.8,.8,.8,[.2,.35,.9],{add:1,a:.5}); R.light(p.x,2,p.z,[.25,.35,1],7); } },
  debris:{ build:(S,p)=>S('box',p.x,p.h/2,p.z,p.w,p.h,p.d,[.3,.3,.31],{},(p.x*7+p.z)%1.2) },
  cables:{ build:(S,p)=>{ const s=p.x>0?-1:1; for(let z=p.z0-3;z>p.z1+2;z-=7){ S('cyl',p.x+s*.6,.12,z-1.5,.25,.25,.25,[.15,.15,.16]); S('box',p.x+s*1.2,.1,z-3,.18,.18,5,[.12,.12,.13],{},.3*s); } } },
  workbench:{ build:(S,p)=>S('box',p.x,.6,p.z,6,1.2,1.4,gray(.3)) },
  locker:{ build:(S,p)=>S('box',p.x,1.5,p.z,1,3,3,gray(.26)) },
  station:{ build:(S,p)=>S('hex',p.x,.08,p.z,5,.16,5,[.12,.2,.25],{e:[.03,.12,.12]}),
            draw:(R,t,p)=>{ R.light(p.x-3,2.5,p.z,[.2,1,.7],9); R.light(p.x+3,2.5,p.z,[.25,.6,1],9);
              R.drawTRS('ring',p.x,.2,p.z,0,0,0,2.4,1,2.4,[.3,1,.8],{add:1,a:.4});
              R.drawTRS('ringThin',p.x,.25+Math.sin(t*2)*.05,p.z,0,0,0,3.2,1,3.2,[.3,.7,1],{add:1,a:.5});
              for(let i=0;i<6;i++){ const a=t*.6+i/6*Math.PI*2; R.drawTRS('diamond',p.x+Math.cos(a)*2.8,1.6+Math.sin(t*2+i)*.2,p.z+Math.sin(a)*2.8,Math.PI/2,-a,0,.18,1,.18,i%2?[.3,1,.75]:[.35,.65,1],{add:1,a:.8}); } } },
  gate:{ draw:(R,t,p)=>{ const W=XF.World, open=W.gateOpen, k=open?Math.min(1,(W.gateT||0)):0;
            for(const s of [-1,1]){ R.drawTRS('box',p.x+s*(1.6+k*2.6),3.5,p.z,0,0,0,3.2,7,.6,[.22,.23,.26]);
              R.drawTRS('box',p.x+s*(1.6+k*2.6),3.5,p.z+.32,0,0,0,.12,6.6,.05,[.3,.4,1],{e:open?[.1,.6,.4]:[.6,.2,.9]}); }
            if(!open) R.drawTRS('quad',p.x,3.5,p.z+.4,Math.PI/2,0,0,6,1,7,[.5,.3,1],{add:1,a:.12+.05*Math.sin(t*3)});
            R.light(p.x,3,p.z+2,open?[.2,1,.6]:[.6,.25,1],8); } },
  arena:{ build:(S,p)=>{ S('cyl',p.x,.04,p.z,30,.08,30,gray(.29),{floor:1}); S('ring',p.x,.1,p.z,14,1,14,[.35,.4,.9],{add:1,a:.16}); } },
  arenaPillar:{ build:(S,p)=>S('cyl',p.x,p.h/2,p.z,1.6,p.h,1.6,gray(.27)) }
};

BG.build=function(W){
  BG.statics.length=0; BG.anim.length=0;
  const P=BG.PALETTE, wallH=W.WALL.h, wt=W.WALL.t;
  // 바닥
  for(const r of W.rects) S('box',(r.x0+r.x1)/2,-.25,(r.z0+r.z1)/2,r.x1-r.x0,.5,r.z1-r.z0,P.floor,{floor:1});
  // 벽 · 패널 · 발광 띠
  for(const s of W.wallSegs){
    const len=s.b-s.a+wt, mid=(s.a+s.b)/2;
    if(s.ax==='z'){ S('box',mid,wallH/2,s.v,len,wallH,wt,P.wall);
      for(let x=s.a+2;x<s.b-1;x+=4) S('box',x,wallH/2,s.v-s.out*.42,.35,wallH,.12,P.wallPanel);
      S('box',mid,1.1,s.v-s.out*.42,len-.4,.06,.05,P.strip,{e:P.stripGlow});
    } else { S('box',s.v,wallH/2,mid,wt,wallH,len,P.wall);
      for(let z=s.a+2;z<s.b-1;z+=4) S('box',s.v-s.out*.42,wallH/2,z,.12,wallH,.35,P.wallPanel);
      S('box',s.v-s.out*.42,1.1,mid,.05,.06,len-.4,P.strip,{e:P.stripGlow});
    }
  }
  // 소품
  for(const p of W.props){ const d=BG.PROPS[p.type]; if(!d){ console.warn('배경 소품 모양 없음:',p.type); continue; }
    if(d.build) d.build(S,p); if(d.draw) BG.anim.push(p); }
};

BG.draw=function(R,t,player){
  const pz=player?player.z:0;
  for(const s of BG.statics){ if(Math.abs(s.z-pz)>75&&s.sz<30)continue; R.drawTRS(s.mesh,s.x,s.y,s.z,0,s.ry,0,s.sx,s.sy,s.sz,s.c,s.o); }
  for(const p of BG.anim){ if(Math.abs(p.z-pz)>80)continue; BG.PROPS[p.type].draw(R,t,p); }
  for(const L of BG.AMBIENT_LIGHTS) R.light(L[0],L[1],L[2],L[3],L[4]);
};

/* 안개 색·농도 (fog: 0 옅음 ~ 1 짙음) */
BG.fog=function(R,fog,boss){
  const P=BG.PALETTE, l=XF.lerp;
  R.fogColor=[l(P.fogClear[0],P.fogDense[0],fog),l(P.fogClear[1],P.fogDense[1],fog),l(P.fogClear[2],P.fogDense[2],fog)];
  R.fogDen=l(P.fogDenClear,P.fogDenDense,fog)*(boss?.8:1);
};
})();
