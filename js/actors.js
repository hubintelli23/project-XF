/* XF 신스에테르0 — actors.js : 공통 인체 리그 · 포즈 · 절차적 애니메이션
 * (아바타 외형은 assets/avatars.js, 무기는 assets/weapons.js) */
(function(){
'use strict';
const XF = window.XF = window.XF || {};
const N = XF.Node, hex = XF.hex;

/* 스타일: 주인공·적 공통 인체 리그 */
function humanoid(st){
  const R={};
  const root=R.root=new N(null);
  const hips=R.hips=root.add(new N(null)).at(0,st.hip,0);
  R.pelvis=hips.add(new N('box',st.cloth)).sc(st.w*.9,.22,st.w*.55);
  const spine=R.spine=hips.add(new N(null)).at(0,.08,0);
  R.torso=spine.add(new N('box',st.body)).at(0,.3,0).sc(st.w,.55,st.w*.55);
  if(st.chestPlate) spine.add(new N('box',st.accent,{e:st.glow})).at(0,.38,st.w*.29).sc(st.w*.35,.12,.03);
  const neck=R.neck=spine.add(new N(null)).at(0,.62,0);
  R.head=neck.add(new N('sphere',st.skin)).at(0,.17,0).sc(.3,.34,.31);
  // 머리카락
  if(st.hair==='long'){
    neck.add(new N('sphere',st.hairC)).at(0,.22,-.02).sc(.34,.33,.34);
    R.tail=neck.add(new N('boxT',st.hairC)).at(0,.26,-.14).sc(.2,.68,.07).rot(.12,0,0);
    neck.add(new N('cone',st.skin)).at(-.17,.2,0).sc(.05,.16,.05).rot(0,0,1.2);   // 엘프 귀
    neck.add(new N('cone',st.skin)).at(.17,.2,0).sc(.05,.16,.05).rot(0,0,-1.2);
  } else if(st.hair==='short'){
    neck.add(new N('sphere',st.hairC)).at(0,.24,-.03).sc(.34,.28,.35);
    for(let i=0;i<4;i++) neck.add(new N('cone',st.hairC)).at(-.12+i*.08,.36,-.05).sc(.08,.16,.08).rot(-.5,0,(i-1.5)*.3);
    neck.add(new N('box',st.accent,{e:st.glow})).at(0,.2,.15).sc(.26,.05,.02); // 바이저
  } else if(st.hair==='hood'){
    neck.add(new N('cone',st.cloth)).at(0,.24,-.04).sc(.42,.5,.42);
    R.eyes=neck.add(new N('box',st.accent,{e:st.glow})).at(0,.17,.15).sc(.16,.03,.02);
  } else if(st.hair==='crown'){
    neck.add(new N('sphere',st.hairC)).at(0,.22,-.03).sc(.36,.34,.36);
    R.tail=neck.add(new N('boxT',st.hairC)).at(0,.26,-.14).sc(.38,.95,.08).rot(.15,0,0);
    for(let i=0;i<5;i++) neck.add(new N('cone',st.accent,{e:st.glow})).at(-.16+i*.08,.42+(i===2?.06:0),0).sc(.04,i===2?.24:.16,.04);
    R.eyes=neck.add(new N('box',st.accent,{e:st.glow})).at(0,.17,.155).sc(.15,.025,.02);
  }
  // 팔
  const arm=(s)=>{
    const sh=spine.add(new N(null)).at(s*(st.w*.5+.07),.52,0);
    const up=sh.add(new N('limb',s>0&&st.mechR?st.metal:st.body,s>0&&st.mechR?{}:undefined)).sc(.13*st.limb,.32,.13*st.limb);
    if(s>0&&st.mechR) sh.add(new N('box',st.accent,{e:st.glow})).at(0,-.16,.07).sc(.03,.2,.02);
    const el=sh.add(new N(null)).at(0,-.32,0);
    el.add(new N('limb',s>0&&st.mechR?st.metal:st.skinArm)).sc(.11*st.limb,.3,.11*st.limb);
    const hand=el.add(new N(null)).at(0,-.32,0);
    hand.add(new N('sphere',s>0&&st.mechR?st.metal:st.skinArm)).sc(.12,.12,.12);
    return {sh,el,hand};
  };
  R.armL=arm(-1); R.armR=arm(1);
  // 다리
  const leg=(s)=>{
    const hp=hips.add(new N(null)).at(s*st.w*.24,-.05,0);
    hp.add(new N('limb',st.legC)).sc(.17*st.limb,.46,.17*st.limb);
    const kn=hp.add(new N(null)).at(0,-.46,0);
    kn.add(new N('limb',st.legC)).sc(.14*st.limb,.44,.14*st.limb);
    kn.add(new N('box',st.boot)).at(0,-.44,.05).sc(.16,.1,.28);
    return {hp,kn};
  };
  R.legL=leg(-1); R.legR=leg(1);
  // 옷자락
  if(st.coat){ R.coat=hips.add(new N('boxT',st.cloth)).at(0,0,-.12).sc(st.w*.85,.62,.05).rot(.15,0,0);
    R.coat2=hips.add(new N('boxT',st.accent,{e:st.glow})).at(0,-.6,-.21).sc(st.w*.8,.02,.02).rot(.15,0,0); }
  if(st.robe){ R.robe=hips.add(new N('cone',st.cloth)).at(0,-.45,0).sc(st.w*1.6,1.0,st.w*1.4); }
  // 무기 (assets/weapons.js)
  XF.buildWeapon(R,st.weapon);
  R.st=st; R.cur={}; return R;
}

XF.buildHumanoid=humanoid;
const P = XF.Models = XF.Models || {};

/* ---------- 포즈 ---------- */
// pose 키: sp(척추 Y비틀기) lean(척추 X) aLx aLz eLx aRx aRz eRx lLx kLx lRx kRx y(엉덩이 높이 오프셋) roll wR(무기 비틀기)
const BASE={sp:0,lean:0,aLx:0,aLz:-.12,eLx:-.3,aRx:0,aRz:.12,eRx:-.3,lLx:0,kLx:0,lRx:0,kRx:0,y:0,roll:0,wR:0,wX:Math.PI/2};
P.poses={
  idle:{aRx:-.35,eRx:-.6,wX:Math.PI/2+.5,aLz:-.2},
  // 베기: 준비 / 타격
  slashDiagA:{sp:.9,aRx:-2.4,aRz:.6,eRx:-.4,wX:.6,lean:-.1},  slashDiagB:{sp:-.7,aRx:-.4,aRz:-.9,eRx:-.1,wX:1.6,lean:.25,lLx:-.5,kLx:.4,lRx:.3},
  slashHorA:{sp:1.2,aRx:-1.5,aRz:1.3,eRx:-.2,wX:1.5},           slashHorB:{sp:-1.3,aRx:-1.5,aRz:-.8,eRx:-.1,wX:1.6,lean:.15},
  stabDownA:{aRx:-2.9,eRx:-.3,wX:.2,y:.08,lean:-.15},            stabDownB:{aRx:-.6,eRx:0,wX:2.9,lean:.55,y:-.25,lLx:-.8,kLx:1.0,lRx:.5,kRx:.4},
  blastA:{aRx:-1.2,aLx:-1.2,eRx:-1.2,eLx:-1.2,sp:.3,lean:-.1},   blastB:{aRx:-1.6,aLx:-1.6,eRx:0,eLx:0,lean:.3,lLx:-.6,kLx:.5,lRx:.4},
  heavyA:{aRx:-.2,aRz:.3,eRx:-.3,wX:2.6,sp:1.0,lean:.2,y:-.18,lLx:-.6,kLx:.8,lRx:.4,kRx:.5}, heavyB:{aRx:-3.0,aRz:.2,eRx:-.2,wX:.2,sp:-.4,lean:-.25,y:.1},
  dash:{aRx:.6,aRz:.4,eRx:-.2,wX:2.4,lean:.7,aLx:.8,lLx:-.9,kLx:.6,lRx:.8,kRx:.9,y:-.15},
  air:{lLx:-.7,kLx:1.2,lRx:-.2,kRx:.9,aLx:-.4,aRx:-.9},
  airSlashA:{aRx:-2.7,aRz:.9,wX:.4,lLx:-.8,kLx:1.3,kRx:1.0}, airSlashB:{aRx:-.3,aRz:-1.0,wX:1.7,sp:-.6,lLx:-.8,kLx:1.3,kRx:1.0},
  plunge:{aRx:-.4,eRx:0,wX:3.1,lean:.5,lLx:-1.2,kLx:1.6,lRx:-1.0,kRx:1.5},
  dodge:{lean:.9,aRx:.4,aLx:.4,lLx:-1.4,kLx:1.9,lRx:-1.2,kRx:1.8,y:-.4},
  cast:{aLx:-1.6,eLx:-.1,aRx:-.3,lean:-.05},
  castUp:{aLx:-2.9,aRx:-2.9,eLx:0,eRx:0,lean:-.2,y:.05},
  aim:{aRx:-1.55,eRx:0,aLx:-1.45,eLx:-.3,wX:0,sp:.25,lLx:-.4,kLx:.2,lRx:.3},
  hurt:{lean:-.35,aRx:.3,aLx:.3,sp:.2},
  stun:{lean:.5,aRx:.5,aLx:.5,y:-.1,roll:.15},
  down:{lean:-1.5,y:-.7,aRx:-2.5,aLx:-2.5,lLx:-.2,lRx:.1},
  ult:{aRx:-3.0,aLx:-2.6,eRx:0,eLx:0,lean:-.3,wX:0},
  scyA:{sp:1.3,aRx:-2.2,aRz:1.0,eRx:-.3,wX:1.2,lean:-.15}, scyB:{sp:-1.4,aRx:-.9,aRz:-1.1,eRx:-.1,wX:1.4,lean:.35,lLx:-.5,kLx:.4},
  spin:{aRx:-1.6,aRz:1.4,aLx:-1.2,aLz:-1.4,wX:1.5,lean:.1}
};
P.mix=function(a,b,t){ const o={}; for(const k in BASE){ const va=(a&&a[k]!==undefined)?a[k]:BASE[k], vb=(b&&b[k]!==undefined)?b[k]:BASE[k]; o[k]=va+(vb-va)*t; } return o; };
P.base=BASE;

/* 포즈 적용 (부드럽게) */
P.apply=function(R,pose,run,phase,dt,k){
  const c=R.cur; const s=Math.min(1,dt*(k||16));
  for(const key in BASE){ const v=pose[key]!==undefined?pose[key]:BASE[key]; c[key]=c[key]===undefined?v:c[key]+(v-c[key])*s; }
  const sw=Math.sin(phase)*run, sw2=Math.cos(phase)*run;
  R.hips.p[1]=R.st.hip+c.y+Math.abs(Math.cos(phase))*.06*run;
  R.hips.r=[0,0,c.roll];
  R.spine.r=[c.lean+run*.18,c.sp,0];
  R.armL.sh.r=[c.aLx+sw*.9,0,c.aLz]; R.armL.el.r=[c.eLx-Math.max(0,sw)*.4,0,0];
  R.armR.sh.r=[c.aRx-sw*.6*(1-Math.min(1,Math.abs(c.aRx)/1.5)),0,c.aRz]; R.armR.el.r=[c.eRx,0,0];
  R.legL.hp.r=[c.lLx-sw*1.0,0,0]; R.legL.kn.r=[c.kLx+Math.max(0,sw2)*1.1*run,0,0];
  R.legR.hp.r=[c.lRx+sw*1.0,0,0]; R.legR.kn.r=[c.kRx+Math.max(0,-sw2)*1.1*run,0,0];
  R.weapon.r=[c.wX,c.wR,0];
  if(R.tail) R.tail.r[0]=.15+run*.5+Math.sin(phase*2)*.05*run;
  if(R.coat){ R.coat.r[0]=.15+run*.5; R.coat2.r[0]=R.coat.r[0]; R.coat2.p[2]=-.12-Math.sin(R.coat.r[0])*.62; R.coat2.p[1]=-Math.cos(R.coat.r[0])*.62; }
};
/* 무기 끝 월드 좌표 */
P.tip=function(R){ const n=R.bladeN||R.weapon; const m=n.M; return [m[12]+m[4],m[13]+m[5],m[14]+m[6]]; };
})();
