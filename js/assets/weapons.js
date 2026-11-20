/* XF 신스에테르0 — assets/weapons.js : 무기 에셋
 * ─────────────────────────────────────────────
 * 새 무기 추가 방법
 *  1) 아래 XF.WEAPONS 에 항목 추가 (kind = 모양 종류, 나머지는 색·길이 등)
 *  2) 새 모양이 필요하면 XF.WeaponKinds 에 build 함수 추가
 *  3) assets/avatars.js 에서 아바타의 weapon 값을 새 무기 id로 지정
 * 색은 0xRRGGBB, glow 는 발광 [r,g,b] (0~1). 무기 끝(R.bladeN)은 베기 궤적 기준점.
 */
(function(){
'use strict';
const XF = window.XF = window.XF || {};
const N = XF.Node, hex = XF.hex;

/* 무기 목록 */
XF.WEAPONS = {
  synthe_blade: { name:'가변 블레이드 (신스)', kind:'blade',  len:1.05, metal:0x9aa3ad, blade:0xc8fff0, accent:0x3dffb0, glow:[.1,.9,.55] },
  zero_blade:   { name:'가변 블레이드 (제로)', kind:'blade',  len:1.2,  metal:0x4b5563, blade:0xbfe0ff, accent:0x3fa9ff, glow:[.15,.55,1] },
  husk_scythe:  { name:'잔해병의 낫',          kind:'scythe', len:.7,   metal:0x3a3540, blade:0x6b5cff, glow:[.35,.3,1] },
  chain_orb:    { name:'델리리움 사슬 구체',   kind:'orb',    size:.22, accent:0x5ab0ff, glow:[.2,.5,1] },
  elite_scythe: { name:'처형자의 사슬낫',      kind:'scythe', len:1.1,  metal:0x403848, blade:0x8a5cff, glow:[.55,.25,1] },
  boss_scythe:  { name:'베스페라의 영혼 낫',   kind:'scythe', len:1.35, metal:0x2d2635, blade:0x9a6bff, glow:[.6,.3,1] }
};

/* 무기 모양 (node = 손에 붙은 무기 루트, +Y 방향이 무기 끝) */
const M={spec:.8}, G={spec:.5};
XF.WeaponKinds = {
  blade(node,w,R){
    node.add(new N('limbS',hex(w.metal),M)).at(0,0,0).sc(.045,.2,.045);                          // 손잡이
    node.add(new N('sphere',hex(w.metal),M)).at(0,-.11,0).sc(.06,.06,.06).d();                    // 손잡이 끝
    node.add(new N('box',[.1,.1,.12],G)).at(0,-.05,0).sc(.05,.14,.05).d();                        // 그립 감개
    node.add(new N('taper',hex(w.metal),M)).at(0,.05,0).sc(.26,.05,.08).rot(Math.PI,0,0);          // 코등이
    node.add(new N('hex',hex(w.accent),{e:w.glow,spec:.4})).at(0,.05,.045).rot(Math.PI/2,0,0).sc(.04,.01,.04).d(); // 코등이 코어
    R.bladeN=node.add(new N('blade',hex(w.blade),{e:[w.glow[0]*.12,w.glow[1]*.12,w.glow[2]*.12],spec:.9})).at(0,.07,0).sc(.72,w.len,1.1); // 칼날
    node.add(new N('box',hex(w.accent),{e:w.glow})).at(0,.09+w.len*.42,0).sc(.016,w.len*.72,.014);   // 발광 홈
    for(const s of [-1,1]) node.add(new N('box',hex(w.metal),M)).at(s*.07,.12,0).sc(.03,.1,.03).rot(0,0,s*.35).d(); // 가변 기구
  },
  scythe(node,w,R){
    node.add(new N('limbS',hex(w.metal),M)).at(0,.4+w.len*.85,0).sc(.045,w.len*1.7,.045);         // 자루 (위 피벗이라 위로 올려 둠)
    for(let i=0;i<3;i++) node.add(new N('ringThin',hex(w.blade),{e:w.glow})).at(0,.1+i*w.len*.55,0).sc(.06,1,.06).d(); // 자루 고리
    const hd=node.add(new N(null)).at(0,.4+w.len*.85,0);
    hd.add(new N('sphere',hex(w.metal),M)).sc(.08,.08,.08);
    const seg=4; let prev=hd;                                                                     // 휘어진 낫날 (마디 4개)
    for(let i=0;i<seg;i++){ const n=prev.add(new N(null)).at(i?0:0,i?w.len*.26:0,0).rot(0,0,i?-.32:-1.6);
      const b=n.add(new N('blade',hex(w.blade),{e:[w.glow[0]*.5,w.glow[1]*.5,w.glow[2]*.5],spec:.9})).sc(1.8-i*.3,w.len*.3,1);
      if(i===seg-1) R.bladeN=b; prev=n; }
    hd.add(new N('cone',hex(w.metal),M)).at(0,.08,0).sc(.05,.16,.05).d();                          // 뒤쪽 가시
  },
  orb(node,w,R){
    R.bladeN=node.add(new N('sphere',hex(w.accent),{e:w.glow,spec:.6})).at(0,.12,0).sc(w.size,w.size,w.size);
    node.add(new N('ringThin',hex(w.accent),{e:w.glow})).at(0,.12,0).rot(.6,0,.3).sc(w.size*1.5,1,w.size*1.5).d();
    node.add(new N('ringThin',hex(w.accent),{e:w.glow})).at(0,.12,0).rot(-.5,0,-.6).sc(w.size*1.7,1,w.size*1.7).d();
  }
};

/* 아바타 리그의 오른손에 무기 장착 */
XF.buildWeapon=function(R,id){
  R.weapon=R.armR.hand.add(new N(null)).rot(Math.PI/2,0,0);
  const w=XF.WEAPONS[id]; if(!w)return;
  const kind=XF.WeaponKinds[w.kind]; if(kind) kind(R.weapon,w,R);
  R.weaponId=id;
};
})();
