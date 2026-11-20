/* XF 신스에테르0 — assets/avatars.js : 아바타(캐릭터 외형) 에셋
 * ─────────────────────────────────────────────
 * 새 아바타 추가 방법
 *  1) XF.AVATARS 에 항목 추가 — 체형(hip·w·limb), 색(0xRRGGBB), 머리(hair), 옷(coat/robe), 무기 id
 *  2) 플레이어 바디로 쓰려면 data.js 의 XF.CHARS 에도 같은 id 로 이름·설명 추가
 *  3) 적으로 쓰려면 data.js 의 XF.ENEMIES 에 같은 id 로 능력치 추가
 * hair: 'long'(긴 머리+엘프 귀) · 'short'(짧은 머리+바이저) · 'hood'(후드) · 'crown'(왕관+긴 머리)
 * 옵션: coat(뒷자락) · robe(로브 하체) · mechR(오른팔 의체) · chestPlate(가슴 발광판)
 * 나중에 3D 모델 파일(glTF 등)로 바꿀 때도 XF.Models[id] 가 같은 리그 구조를 돌려주면 게임 코드는 그대로 동작한다.
 */
(function(){
'use strict';
const XF = window.XF = window.XF || {};

XF.AVATARS = {
  // ---- 플레이어 바디 ----
  synthe:  { name:'신스 (여성 바디)', hip:.95, w:.36, limb:.95,
    skin:0xf0dccf, skinArm:0xe9d4c6, body:0xdfe4ea, cloth:0x2a3a3a, legC:0x262b33, boot:0x1c1f25,
    accent:0x3dffb0, glow:[.1,.9,.55], metal:0x9aa3ad, hair:'long', hairC:0xe8eef5, coat:1, chestPlate:1, weapon:'synthe_blade' },
  zero:    { name:'제로 (남성 바디)', hip:1.0, w:.44, limb:1.1,
    skin:0xdcc2b0, skinArm:0xd4b9a6, body:0x22262d, cloth:0x14171c, legC:0x1d2026, boot:0x101215,
    accent:0x3fa9ff, glow:[.15,.55,1], metal:0x4b5563, hair:'short', hairC:0x1a1c22, coat:1, mechR:1, chestPlate:1, weapon:'zero_blade' },
  // ---- 레비너스 ----
  husk:    { name:'레비너스 잔해병', hip:.9, w:.4, limb:1,
    skin:0x2a2730, skinArm:0x2a2730, body:0x221f27, cloth:0x17151b, legC:0x1c1a21, boot:0x111111,
    accent:0x7a6bff, glow:[.35,.3,1], metal:0x3a3540, hair:'hood', weapon:'husk_scythe' },
  chainer: { name:'델리리움 사슬술사', hip:1.1, w:.36, limb:.9,
    skin:0x2c2a33, skinArm:0x2c2a33, body:0x26232c, cloth:0x1b1820, legC:0x1b1820, boot:0x111111,
    accent:0x5ab0ff, glow:[.2,.5,1], metal:0x3a3540, hair:'hood', robe:1, weapon:'chain_orb' },
  elite:   { name:'레비너스 처형자', hip:1.25, w:.62, limb:1.35,
    skin:0x2a2530, skinArm:0x2a2530, body:0x1f1b24, cloth:0x141118, legC:0x19161d, boot:0x0e0e0e,
    accent:0xa064ff, glow:[.55,.25,1], metal:0x403848, hair:'hood', chestPlate:1, weapon:'elite_scythe' },
  boss:    { name:'베스페라', hip:1.2, w:.46, limb:1.1,
    skin:0xc9c0d8, skinArm:0xc9c0d8, body:0x1a1520, cloth:0x120e17, legC:0x16121b, boot:0x0d0b10,
    accent:0xb070ff, glow:[.6,.3,1], metal:0x2d2635, hair:'crown', hairC:0x2b2236, robe:1, chestPlate:1, weapon:'boss_scythe' }
};

/* 색 숫자 → 렌더러 색 배열로 바꿔 리그 생성 */
const COLOR_KEYS=['skin','skinArm','body','cloth','legC','boot','accent','metal','hairC'];
XF.buildAvatar=function(id){
  const a=XF.AVATARS[id]; if(!a) throw new Error('아바타 없음: '+id);
  const st=Object.assign({},a); for(const k of COLOR_KEYS) if(typeof st[k]==='number') st[k]=XF.hex(st[k]);
  if(!st.hairC) st.hairC=st.cloth;
  return XF.buildHumanoid(st);
};
XF.Models = XF.Models || {};
for(const id in XF.AVATARS) XF.Models[id]=()=>XF.buildAvatar(id);
})();
