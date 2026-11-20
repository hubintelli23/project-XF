/* XF 신스에테르0 — actors.js : 공통 인체 리그 · 포즈 · 절차적 애니메이션
 * (아바타 외형은 assets/avatars.js, 무기는 assets/weapons.js) */
(function(){
'use strict';
const XF = window.XF = window.XF || {};
const N = XF.Node, hex = XF.hex;

/* 스타일: 주인공·적 공통 인체 리그 (v0.6.0 디테일 모델)
 * .d() 가 붙은 부품은 멀리 있을 때 생략되는 디테일 (LOD) */
const SKIN={spec:.05}, CLOTH={spec:.06}, METAL={spec:.75}, GLOSS={spec:.4};
function humanoid(st){
  const R={}; const w=st.w, L=st.limb, fem=st.female?1:0;
  const glow=(o)=>Object.assign({e:st.glow,spec:.3},o||{});
  const darkEye=[.08,.09,.11];
  const root=R.root=new N(null);
  const hips=R.hips=root.add(new N(null)).at(0,st.hip,0);
  // ── 골반 · 벨트
  R.pelvis=hips.add(new N('taper',st.cloth,CLOTH)).at(0,-.02,0).sc(w*(.92+fem*.08),.24,w*.6).rot(Math.PI,0,0);
  hips.add(new N('box',st.metal,METAL)).at(0,.09,0).sc(w*.98,.06,w*.64);
  hips.add(new N('box',st.accent,glow())).at(0,.09,w*.33).sc(.07,.05,.02).d();             // 벨트 버클
  // ── 척추 · 상체
  const spine=R.spine=hips.add(new N(null)).at(0,.1,0);
  spine.add(new N('taper',st.body,CLOTH)).at(0,.15,0).sc(w*(.78-fem*.06),.24,w*.5).rot(Math.PI,0,0);   // 허리
  R.torso=spine.add(new N('taper',st.body,CLOTH)).at(0,.42,0).sc(w*(1.06-fem*.1),.34,w*.6);          // 가슴 (위가 넓음)
  spine.add(new N('box',st.cloth,CLOTH)).at(0,.44,-w*.29).sc(w*.85,.3,.04).d();                     // 등판
  // 가슴 장식: 에테르 코어 / 갑옷판
  if(st.chestPlate){ spine.add(new N('box',st.metal,METAL)).at(0,.45,w*.3).sc(w*.5,.18,.04);
    spine.add(new N('hex',st.accent,glow())).at(0,.46,w*.33).rot(Math.PI/2,0,0).sc(.07,.02,.07); }
  // 칼라 · 목
  spine.add(new N('cyl',st.cloth,CLOTH)).at(0,.6,0).sc(w*.5,.06,w*.42);
  const neck=R.neck=spine.add(new N(null)).at(0,.62,0);
  neck.add(new N('cyl',st.skin,SKIN)).at(0,.05,0).sc(.1,.12,.1);
  // ── 머리 · 얼굴
  const head=R.headN=neck.add(new N(null)).at(0,.19,0);
  R.head=head.add(new N('sphere',st.skin,SKIN)).sc(.26,.31,.27);
  if(st.hair!=='hood'){ for(const sx of [-1,1]){
    head.add(new N('sphere',darkEye,GLOSS)).at(sx*.058,.025,.118).sc(.045,.035,.02).d();        // 눈
    head.add(new N('sphere',st.accent,glow({spec:0}))).at(sx*.058,.025,.128).sc(.018,.02,.006).d(); // 눈동자 빛
    head.add(new N('box',st.hairC||st.cloth,CLOTH)).at(sx*.06,.072,.122).sc(.055,.01,.008).rot(0,0,sx*-.1).d(); } } // 눈썹
  // 머리카락 스타일
  const hc=st.hairC||st.cloth;
  if(st.hair==='long'){
    head.add(new N('sphere',hc,GLOSS)).at(0,.05,-.02).sc(.3,.3,.31);
    for(let i=0;i<5;i++){ const x=-.1+i*.05; head.add(new N('strand',hc,GLOSS)).at(x,.15,.12).sc(.07,.13,.04).rot(-.35,0,(i-2)*.08).d(); }  // 앞머리
    for(const sx of [-1,1]) head.add(new N('strand',hc,GLOSS)).at(sx*.14,.06,.06).sc(.08,.36,.04).rot(.05,0,sx*.08);                    // 옆머리
    R.tail=head.add(new N(null)).at(0,.08,-.12);
    for(let i=0;i<5;i++) R.tail.add(new N('strand',hc,GLOSS)).at((i-2)*.055,0,-.01*Math.abs(i-2)).sc(.1,.62+(2-Math.abs(i-2))*.06,.04).rot(.1,0,(i-2)*.07);
    for(const sx of [-1,1]) head.add(new N('cone',st.skin,SKIN)).at(sx*.15,.02,-.01).sc(.04,.16,.06).rot(-.15,0,sx*-1.25); // 엘프 귀
    head.add(new N('box',st.accent,glow())).at(.12,.14,.05).sc(.02,.06,.02).rot(0,0,-.3).d();                          // 머리 장식
  } else if(st.hair==='short'){
    head.add(new N('sphere',hc,GLOSS)).at(0,.07,-.03).sc(.3,.25,.31);
    for(let i=0;i<7;i++){ const a=(i-3)*.32; head.add(new N('cone',hc,GLOSS)).at(Math.sin(a)*.12,.17,-.02+Math.cos(a)*.05).sc(.09,.17,.07).rot(-.6+Math.abs(i-3)*.08,0,(i-3)*.28).d(); }
    for(let i=0;i<3;i++) head.add(new N('strand',hc,GLOSS)).at(-.06+i*.06,.13,.12).sc(.08,.1,.03).rot(-.5,0,(i-1)*.2).d();   // 앞머리
    head.add(new N('box',st.metal,METAL)).at(0,.04,.14).sc(.27,.06,.03);                                              // 바이저 프레임
    head.add(new N('box',st.accent,glow())).at(0,.04,.157).sc(.22,.025,.01);                                          // 바이저 빛
    head.add(new N('box',st.metal,METAL)).at(.15,0,0).sc(.03,.08,.1).d();                                             // 귀 장치
  } else if(st.hair==='hood'){
    head.add(new N('sphere',[.03,.03,.04],CLOTH)).at(0,-.01,.05).sc(.22,.24,.2);                                       // 그림자 진 얼굴
    head.add(new N('cone',st.cloth,CLOTH)).at(0,.1,-.05).sc(.4,.5,.42);
    head.add(new N('taperW',st.cloth,CLOTH)).at(0,-.12,-.06).sc(.42,.24,.38).d();                                      // 후드 목 부분
    R.eyes=head.add(new N(null));
    for(const sx of [-1,1]) R.eyes.add(new N('box',st.accent,glow({spec:0}))).at(sx*.055,.01,.15).sc(.05,.018,.01).rot(0,0,sx*.2);
  } else if(st.hair==='crown'){
    head.add(new N('sphere',hc,GLOSS)).at(0,.05,-.03).sc(.31,.31,.32);
    for(let i=0;i<4;i++) head.add(new N('strand',hc,GLOSS)).at(-.08+i*.055,.14,.12).sc(.07,.15,.04).rot(-.3,0,(i-1.5)*.1).d();
    R.tail=head.add(new N(null)).at(0,.08,-.13);
    for(let i=0;i<7;i++) R.tail.add(new N('strand',hc,GLOSS)).at((i-3)*.05,0,-.01*Math.abs(i-3)).sc(.1,.9+(3-Math.abs(i-3))*.05,.04).rot(.12,0,(i-3)*.06);
    const crown=head.add(new N(null)).at(0,.19,0);
    crown.add(new N('ringThin',st.metal,METAL)).sc(.18,1,.18).d();
    for(let i=0;i<7;i++){ const a=(i-3)*.42, tall=i===3?.26:i%2?.12:.18;
      crown.add(new N('cone',st.accent,glow())).at(Math.sin(a)*.16,tall/2,Math.cos(a)*.16-.02).sc(.035,tall,.035).rot(Math.cos(a)*-.2,0,Math.sin(a)*.25); }
    R.eyes=head.add(new N(null));
    for(const sx of [-1,1]) R.eyes.add(new N('box',st.accent,glow({spec:0}))).at(sx*.06,.02,.14).sc(.05,.016,.01).rot(0,0,sx*.15);
  }
  // ── 팔
  const arm=(s)=>{
    const mech=s>0&&st.mechR;
    const sh=spine.add(new N(null)).at(s*(w*.5+.06),.54,0);
    sh.add(new N('sphere',mech?st.metal:st.cloth,mech?METAL:CLOTH)).at(s*.015,.01,0).sc(.14*L,.12,.14*L);        // 어깨
    if(st.pauldron||mech) sh.add(new N('taper',st.metal,METAL)).at(s*.04,.06,0).sc(.2*L,.08,.2*L).rot(0,0,s*-.35).d(); // 견갑
    sh.add(new N('capsT',mech?st.metal:st.body,mech?METAL:CLOTH)).sc(.12*L,.34,.12*L);                          // 위팔
    if(mech){ sh.add(new N('box',st.accent,glow())).at(0,-.17,.065*L).sc(.025,.22,.01);
      sh.add(new N('box',st.metal,METAL)).at(s*.06*L,-.18,0).sc(.02,.2,.09*L).d(); }
    const el=sh.add(new N(null)).at(0,-.32,0);
    el.add(new N('sphere',mech?st.metal:st.body,mech?METAL:CLOTH)).sc(.11*L,.11*L,.11*L).d();                    // 팔꿈치
    el.add(new N('capsT',mech?st.metal:st.skinArm,mech?METAL:SKIN)).sc(.1*L,.32,.1*L);                          // 아래팔
    el.add(new N('limbS',mech?st.accent:st.metal,mech?glow():METAL)).at(0,-.2,0).sc(.115*L,.12,.115*L);          // 손목 보호대
    const hand=el.add(new N(null)).at(0,-.33,0);
    hand.add(new N('box',mech?st.metal:st.skinArm,mech?METAL:SKIN)).at(0,-.03,0).sc(.08,.1,.05);                 // 손
    hand.add(new N('box',mech?st.metal:st.skinArm,mech?METAL:SKIN)).at(-s*.045,-.02,.02).sc(.025,.06,.025).rot(0,0,s*.4).d(); // 엄지
    return {sh,el,hand};
  };
  R.armL=arm(-1); R.armR=arm(1);
  // ── 다리
  const leg=(s)=>{
    const hp=hips.add(new N(null)).at(s*w*(.24+fem*.02),-.06,0);
    hp.add(new N('capsT',st.legC,CLOTH)).sc(.16*L,.48,.16*L);                                                    // 허벅지
    const kn=hp.add(new N(null)).at(0,-.46,0);
    kn.add(new N('sphere',st.metal,METAL)).at(0,0,.06).sc(.1*L,.1,.07).d();                                      // 무릎 보호대
    kn.add(new N('capsT',st.legC,CLOTH)).sc(.13*L,.44,.13*L);                                                    // 정강이
    kn.add(new N('taper',st.boot,GLOSS)).at(0,-.3,0).sc(.15*L,.22,.15*L).rot(Math.PI,0,0);                         // 부츠 목
    kn.add(new N('boot',st.boot,GLOSS)).at(0,-.43,.05).sc(.15,.09,.27);                                          // 발
    kn.add(new N('box',st.accent,glow())).at(s*.07,-.3,0).sc(.01,.12,.04).d();                                   // 부츠 발광선
    return {hp,kn};
  };
  R.legL=leg(-1); R.legR=leg(1);
  // ── 옷자락 (갈라진 코트 꼬리)
  if(st.coat){ R.coat=hips.add(new N(null)).at(0,.04,-w*.3);
    for(const sx of [-1,1]){ const tail=R.coat.add(new N(null)).at(sx*w*.22,0,0).rot(0,0,sx*.06);
      tail.add(new N('boxT',st.cloth,CLOTH)).sc(w*.42,.66+fem*.06,.035);
      tail.add(new N('box',st.accent,glow())).at(0,-.64-fem*.06,-.01).sc(w*.4,.025,.02).d(); }
    for(const sx of [-1,1]) hips.add(new N('boxT',st.cloth,CLOTH)).at(sx*w*.44,.04,0).sc(.03,.42,w*.45).rot(0,0,sx*-.08).d(); } // 옆자락
  // ── 로브
  if(st.robe){ R.robe=hips.add(new N('cone',st.cloth,CLOTH)).at(0,-.45,0).sc(w*1.6,1.0,w*1.4);
    hips.add(new N('taperW',st.cloth,CLOTH)).at(0,-.2,0).sc(w*1.1,.4,w*.9).d();
    hips.add(new N('ringThin',st.accent,glow())).at(0,-.93,0).sc(w*.8,1,w*.7).d(); }
  // ── 망토 (적 · 넝마)
  if(st.cape){ R.cape=spine.add(new N(null)).at(0,.58,-w*.32);
    for(let i=0;i<4;i++) R.cape.add(new N('strand',st.cloth,CLOTH)).at((i-1.5)*w*.24,0,0).sc(w*.34,1.0+(i%2)*.18,.04).rot(.12,0,(i-1.5)*.05); }
  // ── 어깨 가시 (처형자)
  if(st.spikes) for(const sx of [-1,1]) for(let i=0;i<3;i++) spine.add(new N('cone',st.metal,METAL)).at(sx*(w*.55+.05),.68,-.05+i*.08).sc(.05,.2-i*.03,.05).rot(-.2,0,sx*-.5).d();
  // ── 무기 (assets/weapons.js)
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
  if(R.tail) R.tail.r[0]=.12+run*.45+Math.sin(phase*2)*.05*run-Math.min(0,c.lean)*.2;
  if(R.coat) R.coat.r[0]=.12+run*.55+Math.max(0,-c.lean)*.3+Math.sin(phase*2)*.04*run;
  if(R.cape) R.cape.r[0]=.08+run*.4+Math.sin(phase*2+1)*.05*run;
};
/* 무기 끝 월드 좌표 */
P.tip=function(R){ const n=R.bladeN||R.weapon; const m=n.M; return [m[12]+m[4],m[13]+m[5],m[14]+m[6]]; };
})();
