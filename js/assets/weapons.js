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
XF.WeaponKinds = {
  blade(node,w,R){
    node.add(new N('box',hex(w.metal))).at(0,-.06,0).sc(.05,.22,.05);                 // 손잡이
    node.add(new N('box',hex(w.metal))).at(0,.05,0).sc(.22,.04,.07);                  // 코등이
    R.bladeN=node.add(new N('blade',hex(w.blade),{e:w.glow})).at(0,.06,0).sc(1.2,w.len,1); // 칼날
    node.add(new N('box',hex(w.accent),{e:w.glow})).at(0,.5,0).sc(.02,w.len*.8,.012); // 발광 홈
  },
  scythe(node,w,R){
    node.add(new N('cyl',hex(w.metal))).at(0,.4,0).sc(.05,w.len*1.7,.05);             // 자루
    const hd=node.add(new N(null)).at(0,.4+w.len*.85,0);
    R.bladeN=hd.add(new N('blade',hex(w.blade),{e:w.glow})).rot(0,0,-1.75).sc(1.6,w.len*.9,1); // 낫날
  },
  orb(node,w,R){
    R.bladeN=node.add(new N('sphere',hex(w.accent),{e:w.glow})).at(0,.12,0).sc(w.size,w.size,w.size);
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
