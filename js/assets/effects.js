/* XF 신스에테르0 — assets/effects.js : 스킬·전투 이펙트 에셋
 * ─────────────────────────────────────────────
 * 이펙트는 기본 도형을 짧은 시간 띄웠다 사라지게 하는 방식.
 *  · 색 바꾸기 ............ XF.FXC
 *  · 기본 이펙트 함수 ...... XF.FX.ring / burst / spark / spike / beam / circleRune / slash
 *  · 묶음 이펙트(프리셋) .... XF.FX.PRESETS — 게임 코드에서 XF.FX.play('이름', x, y, z, 옵션) 로 호출
 *  · 직접 만들기 ........... XF.FX.add({mesh, x,y,z, s,s1, c,a, life, add, ...})
 * 도형(mesh): ring ringThin disc arc arcW sector sphere cyl tube cone hex box diamond blade quad
 * 옵션: rx/ry/rz 회전 · spin 초당 회전 · sx/sy/sz 축 비율(sy=높이 고정) · vx/vy/vz 속도 · g 중력 · move+tx/ty/tz 목표로 이동
 */
(function(){
'use strict';
const XF = window.XF = window.XF || {};
const hex=XF.hex, rand=XF.rand, lerp=XF.lerp;

/* 색 */
XF.FXC = {
  ELF:  hex(0x3dffb0),   // 아르카나 · 에메랄드
  CY:   hex(0x3fa9ff),   // 오버로드 · 네온 블루
  RED:  hex(0xff3b4e),   // 나노 플라즈마
  HARM: [.95,.9,1],      // 하모닉 · 흰빛
  DEL:  hex(0x7a6bff),   // 델리리움
  WARN: [1,.25,.3]       // 적 공격 예고
};
const C=XF.FXC;
const list=()=>XF.Game.fx;

const FX = XF.FX = {};
FX.add=o=>{ list().push(o); return o; };
FX.ring=(x,y,z,c,r,life)=>FX.add({mesh:'ring',x,y,z,s:r*.2,s1:r,c,a:.9,life,add:1});
FX.burst=(x,y,z,c,r,life)=>FX.add({mesh:'sphere',x,y,z,s:r*.3,s1:r,c,a:.7,life,add:1});
FX.spike=(x,z,c,s)=>{ FX.add({mesh:'cone',x,y:.5*s,z,s:.1,s1:.7*s,sy:1.6*s,c,a:.85,life:.35,add:1}); FX.add({mesh:'ring',x,y:.08,z,s:.3,s1:1.3*s,c,a:.7,life:.3,add:1}); };
FX.spark=(x,y,z,c,sp)=>FX.add({mesh:'box',x,y,z,s:.12,s1:.02,c,a:1,life:rand(.2,.45),add:1,vx:rand(-sp,sp),vy:rand(-1,sp),vz:rand(-sp,sp),g:9,rx:rand(0,3),ry:rand(0,3)});
FX.beam=(x,y,z,yaw,len,w,c,life)=>{
  FX.add({mesh:'box',x:x+Math.sin(yaw)*len/2,y,z:z+Math.cos(yaw)*len/2,ry:yaw,sx:w*.35,sy:w*.35,sz:len,s:1,c:[1,1,1],a:.9,life,add:1});
  FX.add({mesh:'box',x:x+Math.sin(yaw)*len/2,y,z:z+Math.cos(yaw)*len/2,ry:yaw,sx:w,sy:w,sz:len,s:1,c,a:.55,life,add:1}); };
FX.circleRune=(x,z,r,c,life)=>{
  FX.add({mesh:'ring',x,y:.12,z,s:r,s1:r,c,a:.85,life,add:1,spin:1.5});
  FX.add({mesh:'ringThin',x,y:.13,z,s:r*.72,s1:r*.72,c,a:.8,life,add:1,spin:-2});
  for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; FX.add({mesh:'diamond',x:x+Math.cos(a)*r*.86,y:.14,z:z+Math.sin(a)*r*.86,ry:-a,s:r*.08,s1:r*.08,c,a:.9,life,add:1}); } };
/* 베기 궤적: (x,y,z) 위치, yaw 방향, tilt 기울기(0=수평, 1.4≈수직), r 크기 */
FX.slash=(x,y,z,yaw,tilt,r,c,mesh,life)=>FX.add({mesh:mesh||'arc',x,y,z,rx:tilt||0,ry:-yaw+Math.PI/2,rz:0,s:r,s1:r*1.12,c,a:.6,life:life||.22,add:1});

/* 묶음 이펙트 — 새 연출은 여기 추가하고 게임 코드에서 XF.FX.play('이름',x,y,z,{...}) */
FX.PRESETS = {
  harmonicStart:(x,y,z)=>{ FX.burst(x,1,z,C.HARM,5,1.2); },
  burstOn:(x,y,z,o)=>{ const c=o.state==='astral'?C.ELF:o.state==='neo'?C.CY:C.HARM;
    FX.ring(x,.2,z,c,5,.5); FX.burst(x,1,z,c,3,.4); if(o.state==='astral') FX.circleRune(x,z,3,C.ELF,.8); },
  overload:(x,y,z,o)=>{ for(let i=0;i<14;i++) FX.spark(x,1.2,z,o.elf?C.ELF:C.CY,6); },
  harmonicForced:(x,y,z)=>{ for(let i=0;i<16;i++) FX.spark(x,1.2,z,C.RED,6); },
  purify:(x,y,z,o)=>{ // 오염 구조 제거 → 정상 에테르 회수 (o.state, o.to = 흡수 대상)
    if(o.state!=='neo') FX.circleRune(x,z,2.2,C.ELF,1.2);
    if(o.state!=='astral') for(let i=0;i<10;i++) FX.spark(x,rand(.5,3),z,C.CY,4);
    for(let i=0;i<8;i++) FX.add({mesh:'sphere',x:x+rand(-.6,.6),y:rand(1,3.5),z:z+rand(-.6,.6),s:.25,s1:.05,c:[.85,1,.95],a:.9,life:.8,add:1,move:1,tx:o.to.x,ty:1.2,tz:o.to.z}); },
  enemyDeath:(x,y,z)=>{ FX.burst(x,1,z,C.DEL,2,.4); for(let i=0;i<8;i++) FX.spark(x,1,z,C.DEL,4); },
  enemySpawn:(x,y,z)=>{ FX.ring(x,.1,z,C.DEL,1.8,.9); FX.add({mesh:'disc',x,y:.06,z,s:1.6,s1:.2,c:[.05,.03,.12],a:.8,life:1}); }
};
FX.play=(name,x,y,z,o)=>{ const p=FX.PRESETS[name]; if(p) p(x,y,z,o||{}); };

/* 매 프레임 갱신 · 그리기 (game.js 가 호출) */
FX.update=function(dt){
  const G=XF.Game;
  for(const f of G.fx){ f.t=(f.t||0)+dt;
    if(f.vx!==undefined){ f.x+=f.vx*dt;f.y+=f.vy*dt;f.z+=f.vz*dt; if(f.g)f.vy-=f.g*dt; }
    if(f.move){ const k=f.t/f.life; f.cx=lerp(f.x,f.tx,k); f.cy=lerp(f.y,f.ty,k); f.cz=lerp(f.z,f.tz,k); } }
  G.fx=G.fx.filter(f=>f.t<f.life);
};
FX.render=function(R){
  for(const f of XF.Game.fx){
    const k=f.t/f.life; const s=lerp(f.s,f.s1!==undefined?f.s1:f.s,1-(1-k)*(1-k));
    const sx=(f.sx||1)*s, sy=f.sy!==undefined?f.sy:s, sz=(f.sz||1)*s;
    const x=f.move?f.cx:f.x,y=f.move?f.cy:f.y,z=f.move?f.cz:f.z;
    R.drawTRS(f.mesh,x,y,z,f.rx||0,(f.ry||0)+(f.spin?f.t*f.spin:0),f.rz||0,sx,sy,sz,f.c,{add:f.add,a:f.a*(1-k)});
  }
};
})();
