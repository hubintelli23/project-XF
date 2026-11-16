/* XF 신스에테르0 — game.js : 플레이어 · 전투 · 싱크로 게이지 · 레비너스 AI · 보스 */
(function(){
'use strict';
const XF = window.XF;
const {clamp,lerp,rand,angDiff,hex} = XF;
const W = XF.World, M = XF.Models, A = XF.Audio, SY = XF.SYNC;
const G = XF.Game = {};
let R = null;

G.mode='title'; G.time=0; G.hitstop=0; G.slow=0;
G.enemies=[]; G.proj=[]; G.fx=[]; G.tele=[]; G.nums=[]; G.picks=[]; G.pillars=[]; G.ghosts=[];
G.cam={yaw:Math.PI,pitch:.3,dist:5.4,tx:0,ty:1.5,tz:0,shake:0,cine:0,pos:[0,3,6]};
G.settings={sens:1,invertY:false,nums:true,shake:true,quality:1,autoRes:true,resMax:1};
G.stats={kills:0,maxCombo:0,start:0};
G.flags={};
const C_ELF=hex(0x3dffb0), C_CY=hex(0x3fa9ff), C_RED=hex(0xff3b4e), C_HARM=[.95,.9,1], C_DEL=hex(0x7a6bff), C_WARN=[1,.25,.3];

/* ================= 플레이어 ================= */
const P = G.player = {};
G.rigs={};
function resetPlayer(cid){
  Object.assign(P,{char:cid,x:0,y:0,z:-5,vx:0,vy:0,vz:0,yaw:Math.PI,hpMax:600,hp:600,
    sync:50,lastSide:-1,load:Object.assign({},G.loadout),harmT:0,harmCool:0,ult:0,act:null,buf:null,combo:0,comboT:0,
    cd:{q:0,e:0,st:0,dash:0,dodge:0,swap:0},qHold:{q:-1,e:-1},iframe:0,stunT:0,hurtT:0,poison:0,grounded:true,phase:0,
    atkHeld:false,atkT:0,atkHeavy:false,orbitT:0,orbitA:0,orbitTick:0,ore:0,shards:0,
    up:{rune:0,astral:0,arm:0,nano:0},prevState:null,hits:0,hitT:0,checkpoint:[0,-5],pull:null,perfect:false,dead:false,superT:0,trail:[]});
  P.state=stateOf();P.prevState=P.state;
}
const lean=()=>P.lastSide||-1;
G.loadout={q:'lance',e:'gale',r:'nova'};
try{ const s=JSON.parse(localStorage.getItem('xf_loadout')); if(s&&XF.SKILLS[s.q]&&XF.SKILLS[s.e]&&XF.SKILLS[s.r]) G.loadout=s; }catch(e){}
G.setLoadout=function(l){ G.loadout=Object.assign({},l); if(P.load) P.load=Object.assign({},l); try{localStorage.setItem('xf_loadout',JSON.stringify(l));}catch(e){} };
function startSyncOf(l){ const n=[l.q,l.e].reduce((s,k)=>s+(XF.SKILLS[k].side==='elf'?-1:1),0); return n<0?34:n>0?66:42; }
function stateOf(){ if(P.harmT>0)return 'harm'; if(P.sync<50)return 'astral'; if(P.sync>50)return 'neo'; return lean()<0?'astral':'neo'; }
G.stateOf=stateOf;
const fwd=()=>[Math.sin(P.yaw),Math.cos(P.yaw)];
function hpMax(){ return Math.round(600*(1+.12*P.up.astral)); }

/* ---- 싱크로 게이지 ---- */
function shiftSync(v,fromSkill){
  if(P.harmT>0||!v) return;
  P.sync=clamp(P.sync+v,0,100);
  // 하모닉 싱크로: 스킬로 게이지를 47~53 구간에 정확히 맞췄을 때 발동
  if(fromSkill&&P.harmCool<=0&&P.sync>=SY.HARM_MIN&&P.sync<=SY.HARM_MAX){ P.harmT=SY.HARM_TIME; P.sync=50; A.play('harm');
    G.msg('하모닉 싱크로 — 50 : 50','#f4e9ff',true); burst(P.x,1,P.z,C_HARM,5,1.2); G.cam.shake=.4; }
}
function updateSync(dt){
  if(P.harmT>0){ P.harmT-=dt; P.sync=50; if(P.harmT<=0){ P.harmT=0; P.sync=50+lean()*18; P.harmCool=10; G.msg('하모닉 싱크로 해제','#cbb8ff'); } }
  else { P.harmCool=Math.max(0,P.harmCool-dt);
    // 조화 회복: 중앙 쪽으로 천천히 (하모닉 구간 바깥 경계까지만)
    if(P.sync<SY.HARM_MIN-.5) P.sync=Math.min(SY.HARM_MIN-.5,P.sync+SY.RECOVER*dt);
    else if(P.sync>SY.HARM_MAX+.5) P.sync=Math.max(SY.HARM_MAX+.5,P.sync-SY.RECOVER*dt); }
  if(P.harmT<=0 && (P.sync<=0||P.sync>=100)) overload();
  // 상태 전환 효과
  const s=stateOf(); P.state=s;
  if(s!==P.prevState){
    if(s==='astral'){ A.play('elf'); G.msg('아스트랄 버스트 — 정화 파동',XF.STATES.astral.color); P.poison=0;
      ring(P.x,.2,P.z,C_ELF,6,.6); hitArc(P.x,P.z,0,5,Math.PI,25,{kind:'elf',knock:5,set:new Set(),ult:1}); }
    if(s==='neo'){ A.play('cyber'); G.msg('네오 오버라이드 — 슈퍼아머',XF.STATES.neo.color); burst(P.x,1,P.z,C_CY,3,.5); }
    P.prevState=s; }
}
function overload(){
  const toElf=P.sync<=0; P.sync=toElf?SY.OVERLOAD_RESET:100-SY.OVERLOAD_RESET;
  A.play('overload'); G.msg('싱크로 과부하!','#ff5470',true); G.ui&&G.ui.glitch(1);
  P.hp=Math.max(1,P.hp-Math.round(P.hpMax*.08)); P.stunT=1.0; P.act=null; G.cam.shake=.6;
  for(let i=0;i<14;i++) spark(P.x,1.2,P.z,toElf?C_ELF:C_CY,6);
}

/* ---- 피해 계산 ---- */
function mult(kind){
  const s=stateOf(); let m=1;
  if(kind==='phys') m*=1+.12*P.up.arm;
  if(kind==='elf'){ m*=1+.15*P.up.rune; if(s==='astral')m*=1.4; }
  if(kind==='cyber'){ m*=1+.15*P.up.nano; if(s==='neo')m*=1.4; }
  return m;
}
function damageEnemy(e,base,o,nx,nz){
  nx=nx||0; nz=nz||0; o=o||{};
  if(e.dead||e.spawnT>0||e.invuln>0) return;
  const s=stateOf(); const tru=o.kind==='true'||s==='harm';
  let d=base*mult(o.kind)*(o.mult||1);
  if(!tru){ if(s!=='neo') d*=1-e.def.armor; if(o.kind==='elf') d*=e.resistDown>0?1.3:1-e.def.mres; }
  if(e.broken>0) d*=1.3; if(e.guardBreak>0) d*=1.2;
  const crit=Math.random()<.12; if(crit) d*=1.6;
  d=Math.max(1,Math.round(d*rand(.92,1.08)));
  e.hp-=d; e.flash=.1;
  if(G.settings.nums) G.nums.push({x:e.x+rand(-.3,.3),y:e.y+e.def.h+.2,z:e.z,t:0,txt:d,crit,c:tru?'#f4e9ff':o.kind==='elf'?'#7dffcf':o.kind==='cyber'?'#86c8ff':'#ffffff'});
  P.ult=Math.min(100,P.ult+(o.ult===undefined?1.4:o.ult));
  P.hits++; P.hitT=2.2; G.stats.maxCombo=Math.max(G.stats.maxCombo,P.hits);
  // 반응
  const heavyBody=e.type==='boss'||e.type==='elite';
  e.poise-= o.poise!==undefined?o.poise:d*.4;
  if(e.guardBreak>0) e.poise-=d*.3;
  if(!heavyBody){
    if(o.launch){ e.vy=o.launch; e.air=true; e.st='air'; }
    else if(e.air){ e.vy=Math.max(e.vy,2.6); }
    e.hitT=o.stagger||.28; if(e.st==='wind'||e.st==='strike'){ e.st='chase'; e.t=0; G.tele=G.tele.filter(t=>t.owner!==e); }
    const k=o.knock||1.5; e.vx+=nx*k; e.vz+=nz*k;
  } else if(e.poise<=0 && e.broken<=0){
    e.broken=e.type==='boss'?5:1.6; e.poise=e.poiseMax; e.st='broken'; e.t=0; e.pat=null;
    G.msg(e.type==='boss'?'브레이크! — 베스페라 무력화':'처형자 경직','#ffd36b'); A.play('heavy');
    G.tele=G.tele.filter(t=>t.owner!==e);
  }
  if(o.stun && !heavyBody){ e.stunT=Math.max(e.stunT,o.stun); }
  if(o.freeze) e.frozen=Math.max(e.frozen,o.freeze);
  if(o.resist) e.resistDown=Math.max(e.resistDown,o.resist);
  if(o.guard) e.guardBreak=Math.max(e.guardBreak,o.guard);
  G.hitstop=Math.min(.12,G.hitstop+(o.hs!==undefined?o.hs:.035));
  if(G.settings.shake) G.cam.shake=Math.max(G.cam.shake,o.shake||.12);
  A.play('hit',rand(.8,1.25));
  spark(e.x,e.y+e.def.h*.55,e.z,o.kind==='elf'?C_ELF:o.kind==='cyber'?C_CY:tru?C_HARM:[1,.9,.8],4);
  if(e.hp<=0) killEnemy(e);
}
function inY(e,o){ const py=o.py!==undefined?o.py:P.y; return e.y<py+(o.yUp||2.4)&&e.y+e.def.h>py-(o.yDown||.6); }
function hitArc(cx,cz,yaw,r,half,dmg,o){
  let n=0;
  for(const e of G.enemies){ if(e.dead||e.spawnT>0)continue; if(o.set&&o.set.has(e))continue; if(!o.anyY&&!inY(e,o))continue;
    const dx=e.x-cx,dz=e.z-cz,d=Math.hypot(dx,dz); if(d>r+e.def.r)continue;
    if(half<Math.PI-.01&&d>e.def.r+.4){ const a=Math.atan2(dx,dz); if(Math.abs(angDiff(yaw,a))>half)continue; }
    o.set&&o.set.add(e); damageEnemy(e,dmg,o,d?dx/d:0,d?dz/d:0); n++; }
  return n;
}
function hitLine(x,z,yaw,len,w,dmg,o){
  const fx=Math.sin(yaw),fz=Math.cos(yaw); let n=0;
  for(const e of G.enemies){ if(e.dead||e.spawnT>0)continue; if(o.set&&o.set.has(e))continue; if(!o.anyY&&!inY(e,o))continue;
    const dx=e.x-x,dz=e.z-z; const along=dx*fx+dz*fz; if(along<-e.def.r||along>len+e.def.r)continue;
    const side=Math.abs(dx*fz-dz*fx); if(side>w/2+e.def.r)continue;
    o.set&&o.set.add(e); damageEnemy(e,dmg,o,fx,fz); n++; }
  return n;
}
G.hitArc=hitArc;

function nearestEnemy(x,z,maxD,dirYaw,cone){
  let best=null,bd=maxD;
  for(const e of G.enemies){ if(e.dead||e.spawnT>0)continue; const dx=e.x-x,dz=e.z-z,d=Math.hypot(dx,dz);
    if(d>bd)continue; if(cone!==undefined&&Math.abs(angDiff(dirYaw,Math.atan2(dx,dz)))>cone)continue; best=e;bd=d; }
  return best;
}
function faceTarget(maxD){
  const iy=G.inputYaw!==null?G.inputYaw:G.cam.yaw;
  const e=nearestEnemy(P.x,P.z,maxD||7,iy,1.6);
  if(e) P.yaw=Math.atan2(e.x-P.x,e.z-P.z); else if(G.inputYaw!==null) P.yaw=G.inputYaw;
  return e;
}

/* ---- 플레이어 피격 ---- */
function hurtPlayer(dmg,sx,sz,o){
  o=o||{};
  if(P.dead||G.mode!=='play')return false;
  if(P.iframe>0){
    if(P.act&&P.act.type==='dodge'&&!P.perfect){ P.perfect=true; G.slow=.9; G.msg('완벽 회피','#ffffff');
      P.sync=P.harmT>0?50:lerp(P.sync,50,.35); P.ult=Math.min(100,P.ult+8); ring(P.x,.3,P.z,[1,1,1],4,.5); A.play('harm'); }
    return false;
  }
  dmg=Math.round(dmg*rand(.9,1.1));
  P.hp-=dmg; A.play('hurt'); G.ui&&G.ui.hurt();
  G.nums.push({x:P.x,y:P.y+2,z:P.z,t:0,txt:dmg,c:'#ff6b7d',crit:false});
  if(o.poison) P.poison=Math.max(P.poison,o.poison);
  const armored=stateOf()==='neo'||(P.act&&ACT[P.act.type].armor);
  if(!armored){ P.act=null; P.hurtT=.32; const dx=P.x-sx,dz=P.z-sz,d=Math.hypot(dx,dz)||1; P.vx=dx/d*(o.knock||5); P.vz=dz/d*(o.knock||5); }
  if(G.settings.shake) G.cam.shake=Math.max(G.cam.shake,.25);
  if(P.hp<=0){ P.hp=0; playerDie(); }
  return true;
}
G.hurtPlayer=hurtPlayer;
function playerDie(){
  P.dead=true; P.act=null; G.msg('시스템 정지','#ff5470',true);
  setTimeout(()=>{ G.ui.showDeath(); },1400);
}
G.respawn=function(){
  P.dead=false; P.hp=P.hpMax=hpMax(); P.poison=0; P.stunT=0; P.act=null; P.x=P.checkpoint[0]; P.z=P.checkpoint[1]; P.y=0; P.vx=P.vz=P.vy=0;
  G.proj=G.proj.filter(p=>p.owner==='player'); G.tele.length=0;
  // 보스전이었다면 보스 초기화
  const b=G.enemies.find(e=>e.type==='boss'&&!e.dead);
  if(b){ G.enemies=G.enemies.filter(e=>e===b||e.type!=='husk'||!e.summoned); b.hp=b.def.hp; b.x=0;b.z=-166;b.st='idle';b.pat=null;b.y=0;b.phaseFlags={}; G.flags.bossStarted=false; G.ui.bossBar(null); A.bossMode(false); }
  G.mode='play'; G.ui.hideDeath();
};

/* ================= 플레이어 행동 ================= */
const pose=(a,b,t0,t1,t)=>M.mix(M.poses[a],M.poses[b],clamp((t-t0)/(t1-t0),0,1));
function moveFwd(sp,dt){ const [fx,fz]=fwd(); P.vx=fx*sp; P.vz=fz*sp; }
function comboHit(dmg,r,half,o){ o=Object.assign({kind:'phys',set:new Set()},o); const [fx,fz]=fwd();
  const n=hitArc(P.x+fx*.4,P.z+fz*.4,P.yaw,r,half,dmg,o); return n; }
function slashFx(yaw,y,tilt,r,col,mesh,dur){
  G.fx.push({mesh:mesh||'arc',x:P.x+Math.sin(P.yaw)*.4,y:P.y+(y||1),z:P.z+Math.cos(P.yaw)*.4,rx:tilt||0,ry:-yaw+Math.PI/2,rz:0,s:r,s1:r*1.12,c:col,a:.6,life:dur||.22,add:1});
}
const charCol=()=>P.char==='synthe'?C_ELF:C_CY;
const stCol=()=>{const s=stateOf();return s==='astral'?C_ELF:s==='neo'?C_CY:C_HARM;};

const ACT = {
  c1:{dur:.42,cancel:.24,pose:t=>pose('slashDiagA','slashDiagB',.1,.17,t),
      tick:(a,dt)=>{ if(a.t<.14) moveFwd(a.target?Math.min(10,a.tdist*7):7,dt); else moveFwd(0); },
      ev:[[.13,a=>{A.play('swing');slashFx(P.yaw,1.15,.6,2.4,charCol());comboHit(XF.MOVES.combo[0].dmg,2.4,1.05,{});}]]},
  c2:{dur:.45,cancel:.27,pose:t=>pose('slashHorA','slashHorB',.08,.18,t),
      tick:(a,dt)=>moveFwd(a.t<.12?4:0,dt),
      ev:[[.15,a=>{A.play('swing',1.1);slashFx(P.yaw,1,0,2.7,charCol(),'arcW');comboHit(XF.MOVES.combo[1].dmg,2.7,1.7,{});}]]},
  c3:{dur:.62,cancel:.46,pose:t=>pose('stabDownA','stabDownB',.1,.18,t),
      tick:(a,dt)=>moveFwd(0,dt),
      ev:[.2,.29,.38].map((tt,i)=>[tt,a=>{ const [fx,fz]=fwd(); const d=1.4+i*1.4; const x=P.x+fx*d,z=P.z+fz*d;
        A.play('heavy',1.5);spike(x,z,charCol(),1+i*.25);
        hitArc(x,z,P.yaw,1.2,Math.PI,XF.MOVES.combo[2].dmg,{kind:'phys',set:a.sets[i]||(a.sets[i]=new Set()),launch:i===2?5:0,knock:.5});
        }])},
  c4:{dur:.78,cancel:.6,pose:t=>pose('blastA','blastB',.28,.36,t),
      tick:(a,dt)=>moveFwd(0,dt),
      ev:[[.12,a=>{ const [fx,fz]=fwd(); G.fx.push({mesh:'sphere',x:P.x+fx*1.6,y:P.y+1.1,z:P.z+fz*1.6,s:2.4,s1:.3,c:charCol(),a:.6,life:.25,add:1}); }],
          [.36,a=>{ const [fx,fz]=fwd(); A.play('boom'); ring(P.x+fx*1.6,P.y+.3,P.z+fz*1.6,charCol(),4.2,.35); burst(P.x+fx*1.6,P.y+1.1,P.z+fz*1.6,charCol(),2.2,.3);
          G.cam.shake=.35; const n=hitArc(P.x+fx*1.6,P.z+fz*1.6,P.yaw,3.6,Math.PI,XF.MOVES.combo[3].dmg,{kind:'phys',set:new Set(),knock:12,hs:.07,shake:.35});
          }]]},
  heavy:{dur:.72,cancel:.55,pose:t=>pose('heavyA','heavyB',.22,.32,t),
      tick:(a,dt)=>moveFwd(a.t>.2&&a.t<.32?6:0,dt),
      ev:[[.05,a=>{ ring(P.x,.15,P.z,charCol(),1.4,.25); }],
          [.3,a=>{ A.play('heavy'); slashFx(P.yaw,1.3,1.35,3,charCol(),'arcW',.3); G.cam.shake=.3;
          comboHit(XF.MOVES.heavy.dmg,2.9,1.2,{launch:8,poise:60,hs:.08,stagger:.5,ult:3}); }]]},
  air:{dur:.48,cancel:.4,air:1,pose:t=>t<.25?pose('airSlashA','airSlashB',.05,.12,t):pose('airSlashB','airSlashA',.25,.32,t),
      tick:(a,dt)=>{ P.vy=Math.max(P.vy,.8); P.vx*=.9;P.vz*=.9; },
      ev:[[.1,a=>{ A.play('swing',1.3); crossWave(0); }],[.27,a=>{ A.play('swing',1.5); crossWave(1); }]]},
  plunge:{dur:3,cancel:9,air:1,armor:1,pose:t=>M.poses.plunge,until:a=>a.landed,
      tick:(a,dt)=>{ if(a.t<.12){P.vy=5;} else P.vy=-34; P.vx=P.vz=0; },
      ev:[[0,a=>{A.play('dash');}]],
      land:a=>{ a.landed=true; A.play('boom'); G.cam.shake=.5; ring(P.x,.2,P.z,charCol(),5,.4); burst(P.x,.6,P.z,charCol(),2.6,.3);
        for(let i=0;i<8;i++){ const an=i/8*Math.PI*2; spike(P.x+Math.cos(an)*2.4,P.z+Math.sin(an)*2.4,charCol(),.9); }
        const n=hitArc(P.x,P.z,0,4.6,Math.PI,XF.MOVES.jheavy.dmg,{kind:'phys',set:new Set(),launch:6,knock:6,hs:.09,anyY:false,yUp:3.5,ult:3,poise:50});
        P.recover=.3; }},
  dash:{dur:.34,cancel:.3,iframe:1,pose:t=>M.poses.dash,
      tick:(a,dt)=>{ moveFwd(a.t<.26?24:4,dt); hitLine(a.sx,a.sz,P.yaw,Math.hypot(P.x-a.sx,P.z-a.sz)+.6,1.8,XF.MOVES.dash.dmg,{kind:'phys',set:a.set,stun:1.3,knock:3,ult:2,poise:30});
        if(Math.random()<.7) G.ghosts.push({x:P.x,y:P.y,z:P.z,yaw:P.yaw,t:.25,c:stCol()}); },
      ev:[[0,a=>{ a.sx=P.x;a.sz=P.z;a.set=new Set(); A.play('dash'); faceTarget(9); }],[.26,a=>{ slashFx(P.yaw,1,0,2.2,stCol(),'arcW'); }]]},
  dodge:{dur:.4,cancel:.32,iframe:1,pose:t=>M.poses.dodge,
      tick:(a,dt)=>{ const s=a.t<.28?15:3; P.vx=Math.sin(a.dir)*s;P.vz=Math.cos(a.dir)*s; if(Math.random()<.5) G.ghosts.push({x:P.x,y:P.y,z:P.z,yaw:P.yaw,t:.2,c:[.8,.85,1]}); },
      ev:[[0,a=>{ A.play('dodge'); P.perfect=false; a.dir=G.inputYaw!==null?G.inputYaw:P.yaw+Math.PI; if(G.inputYaw!==null)P.yaw=a.dir; }]]},
  // ----- Q/E 기본 스킬 -----
  lance:{dur:.6,cancel:.45,pose:t=>M.poses.cast,tick:(a,dt)=>moveFwd(0,dt),
      ev:[[0,a=>{ A.play('elf'); faceTarget(18); shiftSync(-SY.SKILL_SHIFT,true); circleRune(P.x,P.z,1.6,C_ELF,.6); }],
          ...[.15,.26,.37].map((tt,i)=>[tt,a=>spear(i)])]},
  gale:{dur:.7,cancel:.55,pose:t=>M.poses.aim,tick:(a,dt)=>moveFwd(a.t>.3&&a.t<.4?-6:0,dt),
      ev:[[0,a=>{ A.play('cyber'); faceTarget(24); shiftSync(SY.SKILL_SHIFT,true); }],
          [.3,a=>{ A.play('laser'); const [fx,fz]=fwd(); G.cam.shake=.3;
            beam(P.x+fx*.6,P.y+1.25,P.z+fz*.6,P.yaw,24,.5,C_CY,.35);
            hitLine(P.x,P.z,P.yaw,24,1.4,XF.SKILLS.gale.dmg,{kind:'cyber',set:new Set(),knock:6,ult:4,hs:.06,yUp:3}); }]]},
  barrier:{dur:.5,cancel:.32,pose:t=>M.poses.castUp,tick:(a,dt)=>moveFwd(0,dt),
      ev:[[0,a=>{ A.play('elf'); shiftSync(-SY.SKILL_SHIFT,true); P.barrier={x:P.x,z:P.z,t:5,tk:0}; circleRune(P.x,P.z,4.2,C_ELF,.9); ring(P.x,.2,P.z,C_ELF,4.2,.5); }]]},
  pile:{dur:.9,cancel:.68,armor:1,pose:t=>pose('dash','stabDownB',.3,.4,t),tick:(a,dt)=>moveFwd(a.t<.3?16:0,dt),
      ev:[[0,a=>{ A.play('cyber'); faceTarget(10); shiftSync(SY.SKILL_SHIFT,true); }],
          [.42,a=>{ const [fx,fz]=fwd(); const x=P.x+fx*1.5,z=P.z+fz*1.5; A.play('boom'); G.cam.shake=.45; ring(x,.2,z,C_CY,3.2,.35); burst(x,.6,z,C_RED,2,.25); spike(x,z,C_CY,1.4);
            hitArc(x,z,P.yaw,3,Math.PI,XF.SKILLS.pile.dmg,{kind:'cyber',set:new Set(),knock:9,launch:5,guard:3,hs:.09,poise:90,ult:4}); }]]},
  // ----- 상태 전용 스킬 (Q/E 0.5초 홀딩) -----
  orbit:{dur:.45,cancel:.3,pose:t=>M.poses.castUp,tick:(a,dt)=>moveFwd(0,dt),
      ev:[[0,a=>{ A.play('elf'); P.orbitT=8; P.orbitA=0; circleRune(P.x,P.z,2.4,C_ELF,.8); }]]},
  orbitShot:{dur:.5,cancel:.3,pose:t=>M.poses.cast,tick:(a,dt)=>moveFwd(0,dt),
      ev:[0,.08,.16,.24].map((tt,i)=>[tt,a=>{ if(i===0){faceTarget(20);A.play('elf');} runeShot(i); }])},
  rush:{dur:1.05,cancel:.95,armor:1,pose:t=>t<.32?M.poses.dash:M.poses.aim,
      tick:(a,dt)=>{ moveFwd(a.t<.3?17:0,dt);
        if(a.t<.3){ hitLine(a.sx,a.sz,P.yaw,Math.hypot(P.x-a.sx,P.z-a.sz)+.8,2.2,XF.SKILLS.rush.dmg*.4,{kind:'cyber',set:a.set,knock:7,guard:3,ult:2}); G.ghosts.push({x:P.x,y:P.y,z:P.z,yaw:P.yaw,t:.2,c:C_CY}); }
        if(a.t>.45&&a.t<.9){ a.tk-=dt; if(a.tk<=0){ a.tk=.09; const [fx,fz]=fwd();
          hitLine(P.x,P.z,P.yaw,16,1.4,XF.SKILLS.rush.dmg*.18,{kind:'cyber',guard:3,ult:1,hs:.01,knock:.6}); } } },
      ev:[[0,a=>{ a.sx=P.x;a.sz=P.z;a.set=new Set();a.tk=0; A.play('dash'); faceTarget(12); }],
          [.45,a=>{ A.play('laser'); const [fx,fz]=fwd(); beam(P.x+fx*.6,P.y+1.25,P.z+fz*.6,P.yaw,16,.9,C_RED,.45); }]]},
  harmo:{dur:.55,cancel:.36,pose:t=>pose('slashDiagA','slashHorB',.05,.2,t),tick:(a,dt)=>moveFwd(a.t<.1?8:0,dt),
      ev:[[0,a=>{ A.play('harm'); const e=faceTarget(9); a.e=e; }],
          [.14,a=>{ slashFx(P.yaw,1.2,1.4,3.4,C_ELF,'arcW',.3); slashFx(P.yaw,1.2,0,3.4,C_RED,'arcW',.3);
            const e=a.e&&!a.e.dead?a.e:null; const ox=e?e.x:P.x+Math.sin(P.yaw)*2.5, oz=e?e.z:P.z+Math.cos(P.yaw)*2.5;
            const py=P.yaw+Math.PI; G.phantom={x:ox+Math.sin(P.yaw)*1.8,z:oz+Math.cos(P.yaw)*1.8,yaw:py,t:.5,char:P.char==='synthe'?'zero':'synthe'};
            const n=comboHit(XF.SKILLS.harmo.dmg,3.5,1.4,{kind:'true',drift:false,ult:3,hs:.06});
            hitArc(ox,oz,py,2.6,1.6,XF.SKILLS.harmo.dmg*.6,{kind:'true',set:new Set(),ult:2});
            if(n){ for(const k of ['q','e','st','dash']) P.cd[k]=Math.max(0,P.cd[k]-2); } }]]},
  // ----- 궁극기 -----
  nova:{dur:3.3,cancel:9,ult:1,iframe:1,pose:t=>t<.5?M.poses.castUp:t<2.6?M.poses.ult:M.poses.plunge,
      tick:(a,dt)=>{ P.vx=P.vz=0; if(a.t<.5){P.vy=6;} else if(a.t<2.5){P.vy=0;P.y=lerp(P.y,4,dt*3);} else P.vy=-14;
        for(const e of (a.held||[])) if(!e.dead){ e.y=lerp(e.y,2.6,dt*4); e.vy=0; e.air=true; e.frozen=Math.max(e.frozen,.2); } },
      ev:[[0,a=>{ A.play('ult'); G.cam.cine=3.3; a.held=[]; const [fx,fz]=fwd(); a.cx=P.x+fx*5;a.cz=P.z+fz*5; G.msg(XF.SKILLS.nova.name,'#3dffb0',true); }],
          [.5,a=>{ circleRune(a.cx,a.cz,11,C_ELF,2.8); }],
          [.75,a=>{ for(const e of G.enemies){ if(e.dead||Math.hypot(e.x-a.cx,e.z-a.cz)>11.5)continue; if(e.type!=='boss')a.held.push(e);
             G.fx.push({mesh:'cyl',x:e.x,y:4,z:e.z,s:1.1,sy:9,s1:1.4,c:C_ELF,a:.5,life:1.6,add:1}); damageEnemy(e,30,{kind:'elf',ult:0}); } A.play('elf'); }],
          [1.6,a=>{ G.fx.push({mesh:'sphere',x:a.cx+8,y:30,z:a.cz-6,tx:a.cx,ty:0,tz:a.cz,s:4,s1:4,c:[.7,1,.9],a:1,life:.8,add:1,move:1}); }],
          [2.4,a=>{ A.play('boom'); G.cam.shake=1; burst(a.cx,1,a.cz,C_ELF,13,.7); ring(a.cx,.3,a.cz,[1,1,1],14,.6); burst(a.cx,1,a.cz,[1,1,1],6,.4);
             for(let i=0;i<30;i++) spark(a.cx+rand(-6,6),rand(.5,4),a.cz+rand(-6,6),C_ELF,8);
             for(const e of G.enemies){ if(e.dead)continue; if(Math.hypot(e.x-a.cx,e.z-a.cz)<12) damageEnemy(e,XF.SKILLS.nova.dmg,{kind:'elf',ult:0,hs:.12,shake:1,knock:4,poise:200}); } }]]},
  annih:{dur:3.7,cancel:9,ult:1,armor:1,iframe:1,pose:t=>M.poses.aim,
      tick:(a,dt)=>{ P.vx=P.vz=0;
        if(a.t>.5&&a.t<3.3){ const dy=angDiff(P.yaw,G.cam.yaw); P.yaw+=clamp(dy,-dt*.9,dt*.9);
          a.tk-=dt; if(a.tk<=0){ a.tk=.1; hitLine(P.x,P.z,P.yaw,28,2,XF.SKILLS.annih.dmg/26,{kind:'cyber',ult:0,hs:.005,shake:.15,knock:1.2,poise:12,anyY:true}); A.play('laser'); }
          const [fx,fz]=fwd(); G.proj=G.proj.filter(p=>{ if(p.owner!=='enemy')return true; const dx=p.x-P.x,dz=p.z-P.z; const al=dx*fx+dz*fz,sd=Math.abs(dx*fz-dz*fx); if(al>0&&al<28&&sd<1.6){ spark(p.x,p.y,p.z,C_RED,4); return false;} return true; });
          beam(P.x+fx*.8,P.y+1.25,P.z+fz*.8,P.yaw,28,1.5+Math.sin(G.time*40)*.15,C_RED,.06); G.cam.shake=Math.max(G.cam.shake,.12); } },
      ev:[[0,a=>{ A.play('ult'); a.tk=0; G.cam.cine=3.7; G.msg(XF.SKILLS.annih.name,'#3fa9ff',true); faceTarget(20); ring(P.x,.2,P.z,C_CY,3,.5); }],
          [.45,a=>{ A.play('boom'); burst(P.x,.5,P.z,C_RED,2.5,.3); }]]},
  origin:{dur:4.1,cancel:9,ult:1,iframe:1,pose:t=>t<3.2?(Math.floor(t*8)%2?M.poses.slashHorB:M.poses.slashDiagA):M.poses.heavyB,
      tick:(a,dt)=>{ P.vx=P.vz=0;
        if(a.t>.8&&a.t<3.1){ a.tk-=dt; if(a.tk<=0&&a.list.length){ a.tk=.14; const e=a.list[a.i++%a.list.length]; if(!e.dead){
          const ang=rand(0,Math.PI*2); G.fx.push({mesh:'arcW',x:e.x,y:e.y+1.1,z:e.z,rx:rand(-1.4,1.4),ry:ang,rz:0,s:2.6,s1:3,c:a.i%2?C_ELF:C_RED,a:.9,life:.2,add:1});
          damageEnemy(e,45,{kind:'true',ult:0,hs:.01,freeze:1.5}); A.play('swing',rand(1,1.6)); } } } },
      ev:[[0,a=>{ A.play('ult'); G.cam.cine=4.1; a.list=[]; a.i=0; a.tk=0; G.msg(XF.SKILLS.origin.name,'#f4e9ff',true);
             G.phantom={x:P.x-Math.sin(P.yaw)*1.2+Math.cos(P.yaw)*1.2,z:P.z-Math.cos(P.yaw)*1.2-Math.sin(P.yaw)*1.2,yaw:P.yaw,t:4,char:P.char==='synthe'?'zero':'synthe'}; }],
          [.5,a=>{ A.play('harm'); ring(P.x,.3,P.z,C_HARM,16,.8); for(const e of G.enemies){ if(e.dead||Math.hypot(e.x-P.x,e.z-P.z)>16)continue; e.frozen=3.4; a.list.push(e);} G.timeStop=2.8; }],
          [3.4,a=>{ A.play('boom'); G.cam.shake=1; G.fx.push({mesh:'box',x:P.x+Math.sin(P.yaw)*6,y:.1,z:P.z+Math.cos(P.yaw)*6,ry:P.yaw,s:1,sx:.6,sy:.2,sz:26,c:[1,1,1],a:1,life:.6,add:1});
             burst(P.x+Math.sin(P.yaw)*6,1,P.z+Math.cos(P.yaw)*6,C_HARM,8,.5);
             for(const e of a.list) if(!e.dead) damageEnemy(e,XF.SKILLS.origin.dmg,{kind:'true',ult:0,hs:.15,shake:1,knock:5,poise:250}); }]]},
  swapIn:{dur:.4,cancel:.25,pose:t=>pose('heavyA','slashHorB',0,.2,t),tick:(a,dt)=>moveFwd(0,dt),
      ev:[[.12,a=>{ ring(P.x,.2,P.z,charCol(),4.5,.35); A.play('swing'); hitArc(P.x,P.z,0,4.5,Math.PI,32,{kind:'phys',set:new Set(),knock:4,ult:2}); }]]}
};
G.ACT=ACT;

function startAct(type,extra){
  const d=ACT[type]; P.act=Object.assign({type,t:0,first:true,sets:[]},extra||{});
  if(d.iframe) P.iframe=type==='dodge'?.3:d.dur;
  if(type==='c1'){ const e=faceTarget(7); if(e){P.act.target=e;P.act.tdist=Math.max(0,Math.hypot(e.x-P.x,e.z-P.z)-1.4);} }
  else if(['c2','c3','c4','heavy','air','plunge'].includes(type)) faceTarget(type==='plunge'?5:6);
  runAct(0);
}
function runAct(dt){
  const a=P.act; if(!a)return; const d=ACT[a.type]; const t0=a.t; a.t+=dt;
  if(d.ev) for(const [te,fn] of d.ev){ if((a.first?t0<=te:t0<te)&&a.t>=te){ fn(a); if(P.act!==a)return; } }
  if(d.tick) d.tick(a,dt);
  a.first=false;
  if(a.t>=d.dur||(d.until&&d.until(a))){ P.act=null; if(['c1','c2','c3'].includes(a.type))P.comboT=.75; if(a.type==='c4')P.combo=0; }
}
function canCancel(){ return !P.act||P.act.t>=ACT[P.act.type].cancel; }
function request(type){
  if(P.dead)return;
  if(P.hurtT>0&&(type==='r'||type==='dodge')&&!P.stunT){ P.hurtT=0; }
  if(P.stunT>0||P.hurtT>0){ P.buf={type,t:.45}; return; }
  if(!canCancel()){ P.buf={type,t:.45}; return; }
  doRequest(type);
}
function doRequest(type){
  const s=stateOf(); const air=!P.grounded;
  switch(type){
    case 'light':
      if(air){ if(!P.airUsed){P.airUsed=true;startAct('air');} return; }
      if(P.comboT<=0&&!(P.act&&/^c\d/.test(P.act.type))) P.combo=0;
      P.combo=P.combo%4+1; startAct('c'+P.combo); return;
    case 'heavy': if(air) startAct('plunge'); else { P.combo=0; startAct('heavy'); } return;
    case 'jump': if(P.grounded&&(!P.act||canCancel())){ P.act=null; P.vy=9; P.grounded=false; P.airUsed=false; A.play('jump'); } return;
    case 'dodge': if(P.cd.dodge<=0){ P.cd.dodge=.55; startAct('dodge'); } return;
    case 'dash': if(P.cd.dash<=0){ P.cd.dash=XF.MOVES.dash.cd; startAct('dash'); } else G.ui.denied('dash'); return;
    case 'q': skill('q'); return;
    case 'e': skill('e'); return;
    case 'qs': stateSkill('q'); return;
    case 'es': stateSkill('e'); return;
    case 'r':
      if(P.ult<100){ G.ui.denied('r'); return; }
      P.ult=0; startAct(s==='harm'?'origin':P.load.r); return;
    case 'swap': swapChar(); return;
  }
}
function skill(k){
  const s=stateOf(); const id=P.load[k]; const sk=XF.SKILLS[id];
  if(P.cd[k]>0){ G.ui.denied(k); return; }
  let cd=sk.cd; if(sk.side==='cyber') cd*=1-.06*P.up.nano; if(s==='harm') cd*=.5;
  P.cd[k]=cd; P.lastSide=sk.side==='elf'?-1:1; startAct(id);
}
G.stateSkillId=function(k){
  const s=stateOf(), side=XF.SKILLS[P.load[k]].side;
  if(s==='harm') return 'harmo';
  if(s==='astral'&&side==='elf') return P.orbitT>0?'orbitShot':'orbit';
  if(s==='neo'&&side==='cyber') return 'rush';
  return null;
};
function stateSkill(k){
  const id=G.stateSkillId(k);
  if(!id){ skill(k); return; }
  if(id==='orbitShot'){ P.orbitT=0; startAct('orbitShot'); return; }
  if(P.cd.st>0){ G.ui.denied(k); return; }
  P.cd.st=XF.SKILLS[id].cd; startAct(id);
}
function swapChar(){
  if(P.cd.swap>0||P.act&&ACT[P.act.type].ult){ G.ui.denied('swap'); return; }
  P.cd.swap=1.5; P.char=P.char==='synthe'?'zero':'synthe'; A.play('swap');
  burst(P.x,1,P.z,charCol(),2,.3); G.msg(XF.CHARS[P.char].name+' — '+XF.CHARS[P.char].en,'#'+XF.CHARS[P.char].color.toString(16).padStart(6,'0'));
  G.rigs[P.char].cur={};
  if(nearestEnemy(P.x,P.z,5)) startAct('swapIn'); else P.act=null;
}

/* ================= 투사체 · 이펙트 ================= */
function crossWave(i){ const [fx,fz]=fwd(); const e=nearestEnemy(P.x,P.z,12,P.yaw,.6);
  let vy=-1.5; if(e) vy=((e.y+e.def.h*.5)-(P.y+1))/Math.max(.3,Math.hypot(e.x-P.x,e.z-P.z)/20);
  G.proj.push({owner:'player',x:P.x+fx*.6,y:P.y+1,z:P.z+fz*.6,vx:fx*20,vy:clamp(vy,-14,6),vz:fz*20,r:.9,dmg:XF.MOVES.jump.dmg,kind:'phys',life:.55,mesh:'arcW',rot:i?Math.PI/2:0,c:charCol(),set:new Set(),pierce:true,drift:true,launchKeep:true}); }
function spear(i){ const [fx,fz]=fwd(); const e=nearestEnemy(P.x,P.z,20,P.yaw,.8);
  const off=(i-1)*.7; const sx=P.x+Math.cos(P.yaw)*off, sz=P.z-Math.sin(P.yaw)*off;
  let dx=fx,dz=fz,dy=0; if(e){ dx=e.x-sx;dz=e.z-sz; const d=Math.hypot(dx,dz); dy=(e.y+e.def.h*.6-(P.y+2.2))/d; dx/=d;dz/=d; }
  G.proj.push({owner:'player',x:sx,y:P.y+2.2,z:sz,vx:dx*32,vy:dy*32,vz:dz*32,r:.6,dmg:XF.SKILLS.lance.dmg,kind:'elf',life:.8,mesh:'cone',spear:1,c:C_ELF,explode:1.4,ult:3});
  A.play('laser',1.4); }
function runeShot(i){ const e=nearestEnemy(P.x,P.z,20,P.yaw,1.2); const [fx,fz]=fwd(); const a=P.orbitA+i/4*Math.PI*2;
  const sx=P.x+Math.cos(a)*2.2,sz=P.z+Math.sin(a)*2.2; let tx=e?e.x:P.x+fx*10,tz=e?e.z:P.z+fz*10; const d=Math.hypot(tx-sx,tz-sz)||1;
  G.proj.push({owner:'player',x:sx,y:P.y+1.4,z:sz,vx:(tx-sx)/d*22,vy:e?((e.y+1)-(P.y+1.4))/d*22:0,vz:(tz-sz)/d*22,r:.7,dmg:48,kind:'elf',life:1.2,mesh:'diamond',c:C_ELF,explode:2.2,ult:3,home:e,resist:3}); }
function beam(x,y,z,yaw,len,w,c,life){ G.fx.push({mesh:'box',x:x+Math.sin(yaw)*len/2,y,z:z+Math.cos(yaw)*len/2,ry:yaw,sx:w*.35,sy:w*.35,sz:len,s:1,c:[1,1,1],a:.9,life,add:1});
  G.fx.push({mesh:'box',x:x+Math.sin(yaw)*len/2,y,z:z+Math.cos(yaw)*len/2,ry:yaw,sx:w,sy:w,sz:len,s:1,c,a:.55,life,add:1}); }
function ring(x,y,z,c,r,life){ G.fx.push({mesh:'ring',x,y,z,s:r*.2,s1:r,c,a:.9,life,add:1}); }
function burst(x,y,z,c,r,life){ G.fx.push({mesh:'sphere',x,y,z,s:r*.3,s1:r,c,a:.7,life,add:1}); }
function spike(x,z,c,s){ G.fx.push({mesh:'cone',x,y:.5*s,z,s:.1,s1:.7*s,sy:1.6*s,c,a:.85,life:.35,add:1}); G.fx.push({mesh:'ring',x,y:.08,z,s:.3,s1:1.3*s,c,a:.7,life:.3,add:1}); }
function spark(x,y,z,c,sp){ G.fx.push({mesh:'box',x,y,z,s:.12,s1:.02,c,a:1,life:rand(.2,.45),add:1,vx:rand(-sp,sp),vy:rand(-1,sp),vz:rand(-sp,sp),g:9,rx:rand(0,3),ry:rand(0,3)}); }
function circleRune(x,z,r,c,life){ G.fx.push({mesh:'ring',x,y:.12,z,s:r,s1:r,c,a:.85,life,add:1,spin:1.5});
  G.fx.push({mesh:'ringThin',x,y:.13,z,s:r*.72,s1:r*.72,c,a:.8,life,add:1,spin:-2});
  for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; G.fx.push({mesh:'diamond',x:x+Math.cos(a)*r*.86,y:.14,z:z+Math.sin(a)*r*.86,ry:-a,s:r*.08,s1:r*.08,c,a:.9,life,add:1}); } }
G.fxApi={ring,burst,spark,spike,beam,circleRune};

function updateProj(dt){
  for(const p of G.proj){
    p.life-=dt;
    if(p.home&&!p.home.dead){ const dx=p.home.x-p.x,dz=p.home.z-p.z,dy=p.home.y+1-p.y,d=Math.hypot(dx,dy,dz)||1; const sp=Math.hypot(p.vx,p.vy,p.vz);
      p.vx=lerp(p.vx,dx/d*sp,dt*6);p.vy=lerp(p.vy,dy/d*sp,dt*6);p.vz=lerp(p.vz,dz/d*sp,dt*6); }
    if(p.returnTo){ p.rt-=dt; if(p.rt<=0){ const o=p.returnTo; const dx=o.x-p.x,dz=o.z-p.z,d=Math.hypot(dx,dz)||1; p.vx=lerp(p.vx,dx/d*16,dt*4);p.vz=lerp(p.vz,dz/d*16,dt*4); if(d<1.2)p.life=0; } }
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
    if(!p.noWall&&!G.inside(p.x,p.z,.1)) p.life=Math.min(p.life,0);
    if(p.y<0&&p.owner==='player'&&!p.ground) p.life=0;
    if(p.owner==='player'){
      for(const e of G.enemies){ if(e.dead||e.spawnT>0)continue; if(p.set&&p.set.has(e))continue;
        if(Math.hypot(e.x-p.x,e.z-p.z)<p.r+e.def.r&&p.y>e.y-.4&&p.y<e.y+e.def.h+.4){
          if(p.explode){ p.life=0; break; }
          p.set&&p.set.add(e); { const sp=Math.hypot(p.vx,p.vz)||1; damageEnemy(e,p.dmg,{kind:p.kind,ult:p.ult,resist:p.resist,knock:2},p.vx/sp,p.vz/sp); }
          if(!p.pierce){p.life=0;break;} } }
      if(p.life<=0&&p.explode){ burst(p.x,p.y,p.z,p.c,p.explode,.25); A.play('heavy',1.6);
        hitArc(p.x,p.z,0,p.explode,Math.PI,p.dmg,{kind:p.kind,set:new Set(),ult:p.ult,resist:p.resist,knock:3,anyY:true}); p.explode=0; }
    } else {
      if(!P.dead&&Math.hypot(P.x-p.x,P.z-p.z)<p.r+.45&&p.y>P.y-.3&&p.y<P.y+2.2&&!(p.set&&p.set.has(P))){
        if(hurtPlayer(p.dmg,p.x-p.vx,p.z-p.vz,{poison:p.poison,knock:4})){ if(p.pierce){p.set=p.set||new Set();p.set.add(P);} else p.life=0; } }
    }
    if(p.trail!==false&&Math.random()<.5) G.fx.push({mesh:'sphere',x:p.x,y:p.y,z:p.z,s:p.r*.6,s1:.05,c:p.c,a:.5,life:.2,add:1});
  }
  G.proj=G.proj.filter(p=>p.life>0);
}
function updateFx(dt){
  for(const f of G.fx){ f.t=(f.t||0)+dt;
    if(f.vx!==undefined){ f.x+=f.vx*dt;f.y+=f.vy*dt;f.z+=f.vz*dt; if(f.g)f.vy-=f.g*dt; }
    if(f.move){ const k=f.t/f.life; f.cx=lerp(f.x,f.tx,k); f.cy=lerp(f.y,f.ty,k); f.cz=lerp(f.z,f.tz,k); } }
  G.fx=G.fx.filter(f=>f.t<f.life);
  for(const n of G.nums) n.t+=dt; G.nums=G.nums.filter(n=>n.t<.9);
  for(const g of G.ghosts) g.t-=dt; G.ghosts=G.ghosts.filter(g=>g.t>0);
  for(const t of G.tele) t.t+=dt; G.tele=G.tele.filter(t=>t.t<t.dur&&!(t.owner&&(t.owner.dead||t.owner.hitCancel===t)));
  if(G.phantom){ G.phantom.t-=dt; if(G.phantom.t<=0)G.phantom=null; }
}

/* ================= 레비너스 (적) ================= */
function spawnEnemy(type,x,z,o){
  const def=XF.ENEMIES[type];
  const e=Object.assign({type,def,x,y:-2.2,z,vx:0,vy:0,vz:0,yaw:0,hp:def.hp,st:'spawn',t:0,spawnT:.9,atkCd:rand(.6,1.6),
    hitT:0,stunT:0,frozen:0,flash:0,resistDown:0,guardBreak:0,broken:0,poise:type==='boss'?420:type==='elite'?140:30,
    air:false,dead:false,deathT:0,rig:M[type](),phase:rand(0,6),invuln:0,phaseFlags:{}},o||{});
  e.poiseMax=e.poise; e.rig.cur={};
  G.enemies.push(e); ring(x,.1,z,C_DEL,1.8,.9); G.fx.push({mesh:'disc',x,y:.06,z,s:1.6,s1:.2,c:[.05,.03,.12],a:.8,life:1});
  return e;
}
G.spawnEnemy=spawnEnemy;
function killEnemy(e){
  e.dead=true; e.deathT=0; G.stats.kills++; A.play(e.type==='boss'?'roar':'heavy',.7);
  burst(e.x,1,e.z,C_DEL,2,.4); for(let i=0;i<8;i++) spark(e.x,1,e.z,C_DEL,4);
  const [a,b]=e.def.ore; const n=Math.round(rand(a,b+.49));
  for(let i=0;i<n;i++) G.picks.push({type:'ore',x:e.x+rand(-1,1),y:1,z:e.z+rand(-1,1),vy:rand(3,6),vx:rand(-2,2),vz:rand(-2,2),t:0});
  if(Math.random()<.22||e.type==='elite') G.picks.push({type:'hp',x:e.x,y:1,z:e.z,vy:5,vx:0,vz:0,t:0});
  if(e.def.shard) G.picks.push({type:'shard',x:e.x,y:1.2,z:e.z,vy:6,vx:0,vz:0,t:0});
  G.tele=G.tele.filter(t=>t.owner!==e);
  if(e.type==='boss') G.victory();
}
function tele(owner,type,x,z,yaw,r,len,dur,c){ const t={owner,type,x,z,yaw,r,len,t:0,dur,c:c||C_WARN}; G.tele.push(t); return t; }

// 플레이어에 대한 공격 판정
function eArc(e,r,half,dmg,o){ const dx=P.x-e.x,dz=P.z-e.z,d=Math.hypot(dx,dz); if(d>r+.45)return false;
  if(half<Math.PI&&Math.abs(angDiff(e.yaw,Math.atan2(dx,dz)))>half&&d>1)return false; if(P.y>(o&&o.yMax||2.2))return false; return hurtPlayer(dmg,e.x,e.z,o); }
function eLine(e,yaw,len,w,dmg,o){ const fx=Math.sin(yaw),fz=Math.cos(yaw),dx=P.x-e.x,dz=P.z-e.z; const al=dx*fx+dz*fz,sd=Math.abs(dx*fz-dz*fx);
  if(al<0||al>len||sd>w/2+.4||P.y>2.2)return false; return hurtPlayer(dmg,e.x,e.z,o); }
const ATK=(e)=>e.def.atk*2.2;

function updateEnemies(dt){
  const others=G.enemies;
  for(const e of G.enemies){
    if(e.dead){ e.deathT+=dt; e.y-=dt*.8; continue; }
    e.flash=Math.max(0,e.flash-dt); e.resistDown=Math.max(0,e.resistDown-dt); e.guardBreak=Math.max(0,e.guardBreak-dt); e.invuln=Math.max(0,e.invuln-dt);
    if(e.spawnT>0){ e.spawnT-=dt; e.y=lerp(e.y,0,dt*5); if(e.spawnT<=0){e.y=0;e.st='chase';} e.yaw=Math.atan2(P.x-e.x,P.z-e.z); continue; }
    if(e.frozen>0){ e.frozen-=dt; continue; }
    if(e.poise<e.poiseMax&&e.broken<=0) e.poise=Math.min(e.poiseMax,e.poise+dt*(e.type==='boss'?10:20));
    const dx=P.x-e.x,dz=P.z-e.z,dist=Math.hypot(dx,dz); const toP=Math.atan2(dx,dz);
    e.t+=dt; e.atkCd-=dt;
    // 공중(띄워짐)
    if((e.air||e.y>0)&&!(e.pat&&e.pat.n==='descent')){ e.vy-=(e.hitT>0?13:22)*dt; e.y+=e.vy*dt; if(e.y<=0){ e.y=0; e.vy=0; if(e.air){e.air=false; e.hitT=Math.max(e.hitT,.45); e.st='chase';} } }
    if(e.broken>0){ e.broken-=dt; if(e.broken<=0){e.st='chase';e.t=0;} }
    else if(e.stunT>0){ e.stunT-=dt; }
    else if(e.hitT>0){ e.hitT-=dt; }
    else if(!e.air && !P.dead) ai[e.type](e,dt,dist,toP);
    // 이동/마찰
    e.x+=e.vx*dt; e.z+=e.vz*dt; const fr=Math.pow(.004,dt); e.vx*=fr; e.vz*=fr;
    // 분리
    for(const o of others){ if(o===e||o.dead)continue; const ox=e.x-o.x,oz=e.z-o.z,od=Math.hypot(ox,oz),m=e.def.r+o.def.r; if(od<m&&od>.001){ const p=(m-od)*.5; e.x+=ox/od*p; e.z+=oz/od*p; } }
    if(dist<e.def.r+.45&&dist>.001&&Math.abs(P.y-e.y)<1.5){ const p=(e.def.r+.45-dist); e.x-=dx/dist*p*.5; e.z-=dz/dist*p*.5; }
    W.collide(e,e.def.r,e.type==='boss');
    if(e.type==='boss') { e.x=clamp(e.x,-19,19); e.z=clamp(e.z,-179,-141); }
  }
  G.enemies=G.enemies.filter(e=>!e.dead||e.deathT<1.6);
}
function chaseMove(e,dt,toP,sp){ e.yaw=lerpAng(e.yaw,toP,dt*8); e.vx=Math.sin(e.yaw)*sp; e.vz=Math.cos(e.yaw)*sp; e.moving=sp; }
function lerpAng(a,b,t){ return a+angDiff(a,b)*Math.min(1,t); }

const ai={
  husk(e,dt,dist,toP){
    e.moving=0;
    if(e.st==='chase'){ if(dist>1.9) chaseMove(e,dt,toP,e.def.speed); else { e.yaw=lerpAng(e.yaw,toP,dt*8); e.vx*=.5;e.vz*=.5; }
      if(dist<2.3&&e.atkCd<=0&&e.guardBreak<=0){ e.st='wind';e.t=0; e.tl=tele(e,'sector',e.x,e.z,e.yaw,2.5,0,.55); } }
    else if(e.st==='wind'){ e.vx=e.vz=0; if(e.t>=.55){ e.st='strike';e.t=0; A.play('swing',.7);
        G.fx.push({mesh:'arc',x:e.x,y:1,z:e.z,rx:.5,ry:-e.yaw+Math.PI/2,s:2.3,s1:2.6,c:C_DEL,a:.9,life:.2,add:1}); eArc(e,2.5,1,ATK(e),{poison:2}); } }
    else if(e.st==='strike'){ if(e.t>=.6){ e.st='chase'; e.atkCd=rand(1.1,2); } }
    else e.st='chase';
  },
  chainer(e,dt,dist,toP){
    e.moving=0;
    if(e.st==='chase'){
      e.yaw=lerpAng(e.yaw,toP,dt*6); const sd=Math.sin(G.time*.7+e.phase)>0?1:-1;
      let fx=0,fz=0; if(dist>10){fx=Math.sin(toP);fz=Math.cos(toP);} else if(dist<5.5){fx=-Math.sin(toP);fz=-Math.cos(toP);}
      fx+=Math.cos(toP)*sd*.6; fz+=-Math.sin(toP)*sd*.6; e.vx=fx*e.def.speed; e.vz=fz*e.def.speed; e.moving=1;
      if(e.atkCd<=0&&dist<16&&e.guardBreak<=0){ e.st='wind';e.t=0; }
    } else if(e.st==='wind'){ e.vx=e.vz=0; e.yaw=lerpAng(e.yaw,toP,dt*8);
      if(e.t>=.7){ e.st='strike';e.t=0; A.play('chain'); const sx=e.x+Math.sin(e.yaw)*.6,sz=e.z+Math.cos(e.yaw)*.6;
        G.proj.push({owner:'enemy',x:sx,y:1.4,z:sz,vx:Math.sin(e.yaw)*10,vy:0,vz:Math.cos(e.yaw)*10,r:.45,dmg:ATK(e),life:2.6,mesh:'sphere',c:C_DEL,poison:4,home:null,seek:P});
      } }
    else if(e.st==='strike'){ if(e.t>.5){ e.st='chase'; e.atkCd=rand(2.2,3.2); } }
    else e.st='chase';
  },
  elite(e,dt,dist,toP){
    e.moving=0;
    if(e.st==='chase'){ if(dist>2.4) chaseMove(e,dt,toP,e.def.speed); else e.yaw=lerpAng(e.yaw,toP,dt*6);
      if(e.atkCd<=0&&dist<11&&e.guardBreak<=0){ const r=Math.random(); e.h1=e.h2=e.h3=0; e.tk=0;
        if(dist<3.2&&r<.5){ e.st='double';e.t=0; tele(e,'sector',e.x,e.z,e.yaw,3.2,0,.6); }
        else if(dist<4&&r<.8){ e.st='spin';e.t=0; tele(e,'circle',e.x,e.z,0,4,0,.9); }
        else { e.st='pull';e.t=0; e.yaw=toP; tele(e,'line',e.x,e.z,e.yaw,1.4,11,.75); } } }
    else if(e.st==='double'){ e.vx=e.vz=0;
      if(e.t>=.6&&!e.h1){ e.h1=1; A.play('swing',.6); G.fx.push({mesh:'arcW',x:e.x,y:1.3,z:e.z,rx:.5,ry:-e.yaw+Math.PI/2,s:3,s1:3.4,c:C_DEL,a:.9,life:.25,add:1}); eArc(e,3.2,1.1,ATK(e),{poison:2,knock:6}); tele(e,'sector',e.x,e.z,e.yaw,3.2,0,.35); }
      if(e.t>=.95&&!e.h2){ e.h2=1; A.play('swing',.5); G.fx.push({mesh:'arcW',x:e.x,y:1.3,z:e.z,rx:-.5,ry:-e.yaw+Math.PI/2,s:3,s1:3.4,c:C_DEL,a:.9,life:.25,add:1}); eArc(e,3.2,1.1,ATK(e)*1.2,{poison:2,knock:8}); }
      if(e.t>=1.6){ e.h1=e.h2=0; e.st='chase'; e.atkCd=rand(1.4,2.4); } }
    else if(e.st==='spin'){ e.vx=e.vz=0; e.yaw+=e.t>.9?dt*18:0;
      if(e.t>=.9){ e.tk=(e.tk||0)-dt; if(e.tk<=0){ e.tk=.3; A.play('chain'); ring(e.x,.5,e.z,C_DEL,4,.25); eArc(e,4,Math.PI,ATK(e)*.6,{poison:2,knock:5}); } }
      if(e.t>=1.9){ e.st='chase'; e.tk=0; e.atkCd=rand(1.6,2.6); } }
    else if(e.st==='pull'){ e.vx=e.vz=0;
      if(e.t>=.75&&!e.h1){ e.h1=1; A.play('chain'); beam(e.x,1.2,e.z,e.yaw,11,.25,C_DEL,.3);
        if(eLine(e,e.yaw,11,1.4,ATK(e)*.5,{knock:0})) P.pull={tx:e.x+Math.sin(e.yaw)*1.6,tz:e.z+Math.cos(e.yaw)*1.6,t:.35}; }
      if(e.t>=1.2&&!e.h2){ e.h2=1; tele(e,'circle',e.x,e.z,0,2.6,0,.35); }
      if(e.t>=1.55&&!e.h3){ e.h3=1; A.play('heavy',.7); ring(e.x,.2,e.z,C_DEL,2.8,.3); eArc(e,2.8,Math.PI,ATK(e),{knock:7}); }
      if(e.t>=2.1){ e.h1=e.h2=e.h3=0; e.st='chase'; e.atkCd=rand(1.5,2.5); } }
    else e.st='chase';
  },
  boss(e,dt,dist,toP){ bossAI(e,dt,dist,toP); }
};

/* ---- 보스: 베스페라 ---- */
function bossAI(e,dt,dist,toP){
  const hpR=e.hp/e.def.hp; e.moving=0;
  // 체력 단계 이벤트
  if(hpR<.8&&!e.phaseFlags.s1){ e.phaseFlags.s1=1; summon(e,2); }
  if(hpR<.6&&!e.phaseFlags.d1&&!e.pat){ e.phaseFlags.d1=1; G.msg('「델리리움 강림」','#b070ff',true); startPat(e,'descent'); }
  if(hpR<.4&&!e.phaseFlags.s2){ e.phaseFlags.s2=1; summon(e,3); }
  if(hpR<.25&&!e.phaseFlags.d2&&!e.pat){ e.phaseFlags.d2=1; G.msg('「영혼 처형: 델리리움 강림」','#b070ff',true); startPat(e,'descent'); }
  if(!e.pat){
    if(dist>3.2) chaseMove(e,dt,toP,e.def.speed*(hpR<.6?1.25:1)); else e.yaw=lerpAng(e.yaw,toP,dt*6);
    if(e.atkCd<=0&&e.guardBreak<=0){
      const p2=hpR<.6; const opts=[['combo',dist<6?4:1],['chainPull',dist>4?3:1],['throw',dist>6?3:1]]; if(p2) opts.push(['spin',dist<5?3:1]);
      let tot=opts.reduce((s,o)=>s+o[1],0),r=Math.random()*tot; for(const [n,w] of opts){ r-=w; if(r<=0){startPat(e,n);break;} } }
    return;
  }
  const p=e.pat; p.t+=dt; e.vx=e.vz=0;
  const once=(k,tt)=>{ if(p.t>=tt&&!p[k]){p[k]=1;return true;} return false; };
  switch(p.n){
    case 'combo':
      for(let i=0;i<3;i++){ const b=i*.72;
        if(once('w'+i,b)){ e.yaw=Math.atan2(P.x-e.x,P.z-e.z); tele(e,'sector',e.x+Math.sin(e.yaw)*1.2,e.z+Math.cos(e.yaw)*1.2,e.yaw,3.4,0,.45); }
        if(p.t>b+.3&&p.t<b+.45){ e.vx=Math.sin(e.yaw)*9;e.vz=Math.cos(e.yaw)*9; }
        if(once('s'+i,b+.45)){ A.play('swing',.5); G.fx.push({mesh:'arcW',x:e.x,y:1.4,z:e.z,rx:i===1?-.6:.6,ry:-e.yaw+Math.PI/2,s:3.3,s1:3.8,c:C_DEL,a:.95,life:.25,add:1}); eArc(e,3.6,1.15,ATK(e),{poison:3,knock:6}); } }
      if(p.t>=2.6) endPat(e,1.2); break;
    case 'chainPull':
      if(once('a',0)){ e.yaw=toP; p.yaw=toP; tele(e,'line',e.x,e.z,p.yaw,1.6,15,.8); A.play('warn'); }
      if(once('b',.8)){ A.play('chain'); beam(e.x,1.3,e.z,p.yaw,15,.3,C_DEL,.35);
        if(eLine(e,p.yaw,15,1.6,ATK(e)*.4,{knock:0})){ P.pull={tx:e.x+Math.sin(p.yaw)*1.8,tz:e.z+Math.cos(p.yaw)*1.8,t:.4}; p.caught=1; } }
      if(once('c',1.05)) tele(e,'circle',e.x,e.z,0,3,0,.45);
      if(once('d',1.5)){ A.play('boom'); ring(e.x,.2,e.z,C_DEL,3.2,.35); burst(e.x,.8,e.z,C_DEL,2.5,.3); eArc(e,3.1,Math.PI,ATK(e)*(p.caught?1.4:1),{poison:4,knock:9}); }
      if(p.t>=2.2) endPat(e,1); break;
    case 'throw':
      if(once('a',0)){ e.yaw=toP; tele(e,'line',e.x,e.z,toP,1.4,16,.6); }
      if(once('b',.6)){ A.play('chain'); const y=e.yaw; G.proj.push({owner:'enemy',x:e.x+Math.sin(y),y:1.3,z:e.z+Math.cos(y),vx:Math.sin(y)*20,vy:0,vz:Math.cos(y)*20,r:1.1,dmg:ATK(e)*.9,life:3,mesh:'arcW',c:C_DEL,spin:1,returnTo:e,rt:.7,pierce:true,noWall:true,poison:3}); }
      if(p.t>=1.9) endPat(e,.9); break;
    case 'spin':
      if(once('a',0)){ tele(e,'circle',e.x,e.z,0,4.8,0,.9); A.play('warn'); }
      if(p.t>=.9&&p.t<2.2){ e.yaw+=dt*20; p.tk=(p.tk||0)-dt; if(p.tk<=0){ p.tk=.3; A.play('chain',1.2); ring(e.x,.5,e.z,C_DEL,4.8,.25);
        if(eArc(e,4.8,Math.PI,ATK(e)*.55,{poison:2,knock:6})) e.hp=Math.min(e.def.hp,e.hp+e.def.hp*.015); } }
      if(p.t>=2.4) endPat(e,1.1); break;
    case 'descent':
      e.invuln=.2; e.y=lerp(e.y,4.5,dt*3); e.yaw+=dt*2;
      for(let i=0;i<6;i++){ const b=.7+i*.55;
        if(once('g'+i,b)){ p['gx'+i]=P.x+P.vx*.3; p['gz'+i]=P.z+P.vz*.3; tele(e,'circle',p['gx'+i],p['gz'+i],0,2.6,0,.8,[.75,.3,1]); }
        if(once('h'+i,b+.8)){ const gx=p['gx'+i],gz=p['gz'+i]; A.play('heavy',.6); G.cam.shake=.3;
          G.fx.push({mesh:'blade',x:gx,y:7,z:gz,ry:rand(0,3),s:1,sx:4,sy:-7,sz:4,c:[.7,.4,1],a:.9,life:.35,add:1}); ring(gx,.2,gz,C_DEL,2.8,.3);
          if(Math.hypot(P.x-gx,P.z-gz)<2.7) hurtPlayer(ATK(e)*.85,gx,gz,{poison:3,knock:6}); } }
      if(once('z',4.4)){ tele(e,'circle',e.x,e.z,0,5.5,0,.7,[.75,.3,1]); }
      if(p.t>4.9) e.y=lerp(e.y,0,dt*12);
      if(once('y',5.1)){ e.y=0; A.play('boom'); G.cam.shake=.7; ring(e.x,.2,e.z,C_DEL,6,.5); burst(e.x,.8,e.z,C_DEL,5,.4); eArc(e,5.5,Math.PI,ATK(e)*1.2,{poison:4,knock:12}); }
      if(p.t>=5.8) endPat(e,1.4); break;
  }
}
function startPat(e,n){ e.pat={n,t:0}; e.st=n; }
function endPat(e,cd){ e.pat=null; e.st='chase'; e.atkCd=cd*rand(.8,1.2); e.y=0; }
function summon(e,n){ A.play('roar'); G.msg('베스페라가 잔해병을 불러낸다','#b070ff');
  for(let i=0;i<n;i++){ const a=rand(0,Math.PI*2); spawnEnemy('husk',clamp(e.x+Math.cos(a)*6,-17,17),clamp(e.z+Math.sin(a)*6,-176,-144),{summoned:true}); } }

/* ================= 스테이지 진행 ================= */
const WAVES={
  A:[[['husk',-5,-34],['husk',5,-34],['husk',0,-44],['chainer',0,-49]],
     [['husk',-9,-42],['husk',9,-42],['chainer',-12,-48],['chainer',12,-48],['elite',0,-46]]],
  B:[[['husk',-6,-100],['husk',6,-100],['husk',-3,-108],['husk',3,-108],['chainer',-14,-112],['chainer',14,-112]],
     [['elite',-6,-114],['husk',-10,-104],['husk',8,-108],['chainer',0,-124]],
     [['elite',6,-118],['chainer',-15,-100],['chainer',15,-100],['chainer',0,-125],['husk',0,-110]]]
};
function setupStage(){
  G.enemies.length=0;G.proj.length=0;G.fx.length=0;G.tele.length=0;G.picks.length=0;G.pillars.length=0;G.nums.length=0;
  G.flags={visitedR2:false,waveA:-1,waveB:-1,bossStarted:false,cleared:false,gateHint:false};
  W.gateOpen=false; W.gateT=0;
  for(const [x,z] of [[-8,-30],[8,-48],[-13,-98],[13,-112],[0,-104]]) G.pillars.push({x,z,t:rand(0,3),st:'idle',purified:false});
}
function progress(dt){
  const room=W.roomAt(P.x,P.z); P.room=room;
  const alive=G.enemies.filter(e=>!e.dead&&!e.summoned&&e.type!=='boss').length;
  const nextWave=(key,list)=>{ const k='wave'+key; if(G.flags[k]<list.length-1&&alive===0){ G.flags[k]++; for(const [t,x,z] of list[G.flags[k]]) spawnEnemy(t,x,z);
      G.msg(G.flags[k]===0?'레비너스 출현':'증원 — 레비너스 '+(list[G.flags[k]].some(s=>s[0]==='elite')?'처형자':'무리'),'#b39dff'); A.play('warn'); } };
  if(room&&room.id==='R1'&&P.z<-27) nextWave('A',WAVES.A);
  if(room&&room.id==='R3'&&P.z<-94) nextWave('B',WAVES.B);
  if(room&&room.id==='R2'&&!G.flags.visitedR2){ G.flags.visitedR2=true; P.checkpoint=[0,-66]; G.msg('정비실 — 조력자 신호 감지','#86c8ff'); }
  // 게이트
  if(!W.gateOpen&&Math.abs(P.z-W.gateZ)<5&&P.shards<3&&!G.flags.gateHint){ G.flags.gateHint=true; G.msg('기억 조각이 부족하다 ('+P.shards+'/3)','#cbb8ff'); }
  if(W.gateOpen) W.gateT=Math.min(1,W.gateT+dt*.6);
  // 보스
  if(!G.flags.bossStarted&&W.gateOpen&&P.z<-146){ G.flags.bossStarted=true; P.checkpoint=[0,-144];
    const b=spawnEnemy('boss',0,-166); b.spawnT=1.6; A.play('roar'); A.bossMode(true); G.ui.bossBar(b); G.msg('베스페라 — 레비너스의 조력자','#b070ff',true); }
  // 기둥
  for(const p of G.pillars){ if(p.purified)continue; const d=Math.hypot(P.x-p.x,P.z-p.z);
    if(d<6&&P.harmT<=0){ P.sync+=Math.sign(P.sync-50||lean())*1.6*dt; } // 마력 흡수 → 균형 붕괴
    p.t-=dt;
    if(p.st==='idle'&&d<8&&p.t<=0){ p.st='charge'; p.t=1.3; tele(p,'circle',p.x,p.z,0,3.6,0,1.3,[.45,.5,1]); }
    else if(p.st==='charge'&&p.t<=0){ p.st='idle'; p.t=rand(4,6); A.play('boom',.8); burst(p.x,1.5,p.z,[.35,.45,1],3.4,.35); ring(p.x,.2,p.z,[.4,.5,1],3.8,.3);
      if(d<3.8) hurtPlayer(40,p.x,p.z,{poison:4,knock:8});
      for(const e of G.enemies) if(!e.dead&&Math.hypot(e.x-p.x,e.z-p.z)<3.8) damageEnemy(e,40,{kind:'true',ult:0,knock:6}); } }
}
function purifyPillar(p){
  const s=stateOf(); p.purified=true; G.tele=G.tele.filter(t=>t.owner!==p);
  const name=s==='astral'?'룬 정화':s==='neo'?'나노 해킹':'룬 정화 + 나노 해킹';
  G.msg('델리리움 기둥 — '+name,s==='astral'?'#3dffb0':s==='neo'?'#3fa9ff':'#f4e9ff');
  if(s!=='neo'){ circleRune(p.x,p.z,2.2,C_ELF,1.2); A.play('elf'); } if(s!=='astral'){ for(let i=0;i<10;i++) spark(p.x,rand(.5,3),p.z,C_CY,4); A.play('cyber'); }
  for(let i=0;i<5;i++) G.picks.push({type:'ore',x:p.x,y:2,z:p.z,vy:rand(4,7),vx:rand(-3,3),vz:rand(-3,3),t:0});
  if(P.up.astral>0){ P.hp=Math.min(P.hpMax,P.hp+P.hpMax*.06*P.up.astral); }
}
G.interactTarget=function(){
  if(P.dead)return null;
  if(Math.hypot(P.x,P.z+70)<3.6) return {type:'station',label:'조력자 정비 (셀레네 · 리나)'};
  for(const p of G.pillars) if(!p.purified&&Math.hypot(P.x-p.x,P.z-p.z)<3) { const s=stateOf(); return {type:'pillar',p,label:s==='astral'?'룬 정화':s==='neo'?'나노 해킹':'하모닉 정화'}; }
  if(!W.gateOpen&&Math.abs(P.z-W.gateZ)<4.5&&Math.abs(P.x)<4) return {type:'gate',label:P.shards>=3?'기억 복원 — 게이트 개방':'기억 조각 '+P.shards+'/3'};
  if(Math.hypot(P.x,P.z-3)<3.2) return {type:'capsule',label:'각성 캡슐 기록 열람'};
  return null;
};
function interact(){
  const t=G.interactTarget(); if(!t)return;
  if(t.type==='station'){ P.hp=P.hpMax=hpMax(); P.poison=0; P.checkpoint=[0,-66]; G.ui.openStation(); }
  else if(t.type==='pillar') purifyPillar(t.p);
  else if(t.type==='gate'){ if(P.shards>=3){ W.gateOpen=true; A.play('shard'); G.msg('기억 복원 — 싱크로 프로젝트 기록 #1','#f4e9ff',true); G.ui.story('memory'); } else { A.play('warn'); G.msg('기억 조각이 부족하다 ('+P.shards+'/3)','#cbb8ff'); } }
  else if(t.type==='capsule'){ G.ui.story('capsule'); }
}
G.interact=interact;
function updatePicks(dt){
  for(const k of G.picks){ k.t+=dt; k.vy-=18*dt; k.x+=k.vx*dt; k.y+=k.vy*dt; k.z+=k.vz*dt; if(k.y<.5){k.y=.5;k.vy=0;k.vx*=.8;k.vz*=.8;}
    const d=Math.hypot(P.x-k.x,P.z-k.z);
    if(k.t>.5&&d<(k.type==='shard'?2.5:4.5)){ k.x=lerp(k.x,P.x,dt*9); k.z=lerp(k.z,P.z,dt*9); k.y=lerp(k.y,P.y+1,dt*9); }
    if(k.t>.5&&d<.8){ k.got=1;
      if(k.type==='ore'){ P.ore++; A.play('pickup'); }
      if(k.type==='hp'){ P.hp=Math.min(P.hpMax,P.hp+P.hpMax*.1); A.play('pickup',.8); G.nums.push({x:P.x,y:P.y+2,z:P.z,t:0,txt:'+HP',c:'#7dffcf'}); }
      if(k.type==='shard'){ P.shards++; A.play('shard'); G.msg('기억 조각 획득 ('+P.shards+'/3)','#f4e9ff',true); if(P.shards>=3) G.msg('게이트에서 기억을 복원할 수 있다','#cbb8ff'); } } }
  G.picks=G.picks.filter(k=>!k.got);
}

/* ================= 메인 업데이트 ================= */
G.inputYaw=null;
function updatePlayer(dt){
  const I=XF.Input;
  for(const k in P.cd) P.cd[k]=Math.max(0,P.cd[k]-dt);
  P.iframe=Math.max(0,P.iframe-dt); P.hurtT=Math.max(0,P.hurtT-dt); P.comboT-=dt; P.hitT-=dt; if(P.hitT<=0)P.hits=0;
  P.hpMax=hpMax();
  if(P.stunT>0)P.stunT-=dt;
  if(P.poison>0){ P.poison-=dt; P.hp=Math.max(1,P.hp-6*dt); }
  // 룬 궤도
  if(P.orbitT>0){ P.orbitT-=dt; P.orbitA+=dt*3.2; P.orbitTick-=dt;
    if(P.orbitTick<=0){ P.orbitTick=.3; for(let i=0;i<4;i++){ const a=P.orbitA+i/4*Math.PI*2; hitArc(P.x+Math.cos(a)*2.2,P.z+Math.sin(a)*2.2,0,1,Math.PI,XF.SKILLS.orbit.dmg,{kind:'elf',set:new Set(),resist:3,ult:.5,hs:0,knock:.5}); } }
  }
  // 룬 결계
  if(P.barrier){ const b=P.barrier; b.t-=dt; b.tk-=dt;
    if(b.tk<=0){ b.tk=.4; hitArc(b.x,b.z,0,4.2,Math.PI,XF.SKILLS.barrier.dmg,{kind:'elf',set:new Set(),knock:9,ult:.6,hs:0,stagger:.35,anyY:true}); }
    for(const p of G.proj){ if(p.owner==='enemy'&&Math.hypot(p.x-b.x,p.z-b.z)<4.2){ p.owner='player'; p.vx*=-1.3; p.vz*=-1.3; p.kind='elf'; p.dmg*=1.6; p.c=C_ELF; p.set=new Set(); p.returnTo=null; spark(p.x,p.y,p.z,C_ELF,4); } }
    if(b.t<=0) P.barrier=null; }
  // 입력 방향
  const mv=I.move(); const cy=G.cam.yaw; const fx=Math.sin(cy),fz=Math.cos(cy),rx=-Math.cos(cy),rz=Math.sin(cy);
  let dx=fx*mv[1]+rx*mv[0], dz=fz*mv[1]+rz*mv[0]; const mag=Math.min(1,Math.hypot(dx,dz));
  G.inputYaw=mag>.15?Math.atan2(dx,dz):null;
  if(!P.load) P.load=Object.assign({},G.loadout);
  const ctrl=!P.dead&&P.stunT<=0&&G.mode==='play'&&!G.uiBlock;
  // 공격 입력 (0.5초 홀딩 = 강공격, Ctrl/점프 중 홀딩 = 점프 강공격)
  if(ctrl){
    if(I.pressed('atk')){ P.atkHeld=true; P.atkT0=performance.now(); P.atkHeavy=false; if(!P.grounded&&I.down('ctrl')){ P.atkHeavy=true; request('heavy'); } }
    if(P.atkHeld){ if(I.down('atk')){ if(performance.now()-P.atkT0>=500&&!P.atkHeavy){ P.atkHeavy=true; request('heavy'); } }
      else { P.atkHeld=false; if(!P.atkHeavy) request('light'); } }
    if(I.pressed('jump')) request('jump');
    if(I.pressed('dodge')) request('dodge');
    if(I.pressed('dash')) request('dash');
    for(const k of ['q','e']){
      if(I.pressed(k)) P.qHold[k]=performance.now();
      if(P.qHold[k]>=0){ if(I.down(k)){ if(performance.now()-P.qHold[k]>=500){ P.qHold[k]=-1; request(k+'s'); } } else { P.qHold[k]=-1; request(k); } } }
    if(I.pressed('r')) request('r');
    if(I.pressed('swap')) request('swap');
    if(I.pressed('interact')) interact();
  }
  if(P.buf){ P.buf.t-=dt; if(P.buf.t<=0)P.buf=null; else if(ctrl&&canCancel()&&P.hurtT<=0){ const b=P.buf; P.buf=null; doRequest(b.type); } }
  // 이동
  if(P.pull){ P.pull.t-=dt; P.x=lerp(P.x,P.pull.tx,dt*10); P.z=lerp(P.z,P.pull.tz,dt*10); P.act=null; if(P.pull.t<=0)P.pull=null; }
  else if(P.act){ runAct(dt); }
  else if(P.dead||P.stunT>0||P.hurtT>0){ P.vx*=Math.pow(.01,dt); P.vz*=Math.pow(.01,dt); }
  else {
    const sp=6.4*(P.grounded?1:.85);
    P.vx=lerp(P.vx,dx/Math.max(1,mag)*sp*Math.min(1,mag*1.4),dt*(P.grounded?14:4)); P.vz=lerp(P.vz,dz/Math.max(1,mag)*sp*Math.min(1,mag*1.4),dt*(P.grounded?14:4));
    if(G.inputYaw!==null) P.yaw=lerpAng(P.yaw,G.inputYaw,dt*14);
  }
  if(P.recover>0)P.recover-=dt;
  // 중력
  const noG=P.act&&(P.act.type==='nova'||P.act.type==='plunge');
  if(!noG) P.vy-=24*dt;
  P.y+=P.vy*dt;
  if(P.y<=0){ P.y=0; if(!P.grounded){ P.grounded=true; P.airUsed=false; if(P.act&&ACT[P.act.type].land) ACT[P.act.type].land(P.act); else if(P.act&&ACT[P.act.type].air) P.act=null; } P.vy=Math.max(0,P.vy); }
  else if(P.y>.05) P.grounded=false;
  P.x+=P.vx*dt; P.z+=P.vz*dt;
  W.collide(P,.42);
  // 델리리움 안개: 시스템 오류
  const fog=W.fogAt(P.x,P.z); P.fog=fog;
  if(fog>.85&&P.harmT<=0&&Math.random()<dt*1.2){ P.sync=clamp(P.sync+rand(-3,3),0,100); G.ui.glitch(.4); }
  updateSync(dt);
  // 애니메이션
  const rig=G.rigs[P.char]; const spd=Math.hypot(P.vx,P.vz);
  P.phase+=dt*spd*1.55;
  let ps, run=0;
  if(P.dead) ps=M.poses.down;
  else if(P.act) ps=ACT[P.act.type].pose(P.act.t);
  else if(P.stunT>0) ps=M.poses.stun;
  else if(P.hurtT>0) ps=M.poses.hurt;
  else if(!P.grounded) ps=M.poses.air;
  else { ps=M.poses.idle; run=Math.min(1,spd/6); }
  M.apply(rig,ps,run,P.phase,dt,P.act?22:14);
}

function updateCamera(dt,rdt){
  const c=G.cam, I=XF.Input;
  const [mx,my]=I.look(); c.yaw-=mx*.0032*G.settings.sens; c.pitch+=my*.0032*G.settings.sens*(G.settings.invertY?-1:1);
  c.pitch=clamp(c.pitch,-.35,1.1);
  c.tx=lerp(c.tx,P.x,rdt*12); c.tz=lerp(c.tz,P.z,rdt*12); c.ty=lerp(c.ty,P.y*.7+1.55,rdt*8);
  c.cine=Math.max(0,c.cine-dt);
  const boss=G.flags.bossStarted&&G.enemies.some(e=>e.type==='boss'&&!e.dead);
  const want=c.cine>0?8.5:boss?6.4:5.3; c.dist=lerp(c.dist,want,rdt*3);
  const cp=Math.cos(c.pitch),sp=Math.sin(c.pitch);
  const sh=.45; const rx=-Math.cos(c.yaw),rz=Math.sin(c.yaw);
  let d=c.dist;
  // 카메라 벽 충돌
  for(let k=0;k<12;k++){ const t=d*(k+1)/12; const x=c.tx-Math.sin(c.yaw)*cp*t+rx*sh*t/d, z=c.tz-Math.cos(c.yaw)*cp*t+rz*sh*t/d;
    const yy=c.ty+sp*t; let blocked=!G.inside(x,z,.25);
    if(!blocked) for(const o of W.obstacles){ if(yy<o.h+.3&&x>o.x0-.3&&x<o.x1+.3&&z>o.z0-.3&&z<o.z1+.3){blocked=true;break;} }
    if(blocked){ d=Math.max(1.6,t-.4); break; } }
  let ex=c.tx-Math.sin(c.yaw)*cp*d+rx*sh, ey=Math.max(.4,c.ty+sp*d), ez=c.tz-Math.cos(c.yaw)*cp*d+rz*sh;
  if(c.shake>0){ const s=c.shake*.25; ex+=rand(-s,s); ey+=rand(-s,s); ez+=rand(-s,s); c.shake=Math.max(0,c.shake-rdt*2.2); }
  c.pos=[ex,ey,ez];
  R.setCamera(c.pos,[c.tx+rx*sh,c.ty+.15,c.tz+rz*sh],(XF.Input.touch?68:60)*Math.PI/180);
}

G.inside=function(x,z,m){ for(const q of W.rects) if(x>=q.x0+m&&x<=q.x1-m&&z>=q.z0+m&&z<=q.z1-m) return true; return false; };

/* ================= 렌더 ================= */
function shadow(x,z,r,a){ R.drawTRS('disc',x,.04,z,0,0,0,r,1,r,[0,0,0],{a:a||.45}); }
function render(dt){
  const t=G.time; R.time=t;
  // 안개
  const fog=P.fog||0; const boss=G.flags.bossStarted;
  R.fogColor=[lerp(.085,.12,fog),lerp(.1,.15,fog),lerp(.14,.26,fog)]; R.fogDen=lerp(.026,.07,fog)*(boss?.8:1);
  W.draw(R,t,P);
  // 플레이어
  if(G.mode==='title'){
    for(const [id,x] of [['synthe',-1.1],['zero',1.1]]){ const rg=G.rigs[id]; M.apply(rg,M.poses.idle,0,0,dt,8); rg.root.p=[x,0,.8]; rg.root.r=[0,Math.PI+(x<0?-.3:.3),0]; rg.root.render(R); shadow(x,.8,.6,.5); }
    R.light(-1.2,2,-.5,[.2,1,.6],5); R.light(1.2,2,-.5,[.2,.5,1],5);
  }
  if(G.mode!=='title'){
    const rig=G.rigs[P.char];
    for(const g of G.ghosts){ R.ovr={c:g.c,o:{add:1,a:g.t*1.6}}; rig.root.p=[g.x,g.y,g.z]; rig.root.r=[0,g.yaw,0]; rig.root.render(R); }
    R.ovr=P.iframe>0&&P.act&&P.act.type==='dodge'?{c:null,o:{e:[.15,.15,.2]}}:(P.hurtT>.2?{c:[1,.4,.45],o:{e:[.4,0,0]}}:null);
    rig.root.p=[P.x,P.y,P.z]; rig.root.r=[0,P.yaw,0]; rig.root.render(R); R.ovr=null;
    shadow(P.x,P.z,.6,.5*Math.max(.2,1-P.y/6));
    R.light(P.x,1.5,P.z,P.char==='synthe'?[.2,.8,.5]:[.2,.5,1],4);
    if(G.phantom){ const ph=G.phantom, r2=G.rigs[ph.char]; R.ovr={c:ph.char==='synthe'?C_ELF:C_RED,o:{add:1,a:.55}};
      M.apply(r2,M.poses.slashHorB,0,0,dt,10); r2.root.p=[ph.x,0,ph.z]; r2.root.r=[0,ph.yaw,0]; r2.root.render(R); R.ovr=null; }
    // 룬 궤도
    if(P.orbitT>0) for(let i=0;i<4;i++){ const a=P.orbitA+i/4*Math.PI*2; R.drawTRS('diamond',P.x+Math.cos(a)*2.2,P.y+1.4,P.z+Math.sin(a)*2.2,Math.PI/2,-a+t*3,0,.35,1,.35,C_ELF,{add:1,a:.95});
      R.drawTRS('ringThin',P.x+Math.cos(a)*2.2,P.y+1.4,P.z+Math.sin(a)*2.2,Math.PI/2,-a,0,.45,1,.45,C_ELF,{add:1,a:.7}); }
    if(P.barrier){ const b=P.barrier, al=Math.min(1,b.t)*.8; R.drawTRS('ring',b.x,.1,b.z,0,t*.8,0,4.2,1,4.2,C_ELF,{add:1,a:al}); R.drawTRS('ringThin',b.x,.12,b.z,0,-t*1.5,0,3.2,1,3.2,C_ELF,{add:1,a:al});
      R.drawTRS('tube',b.x,1.2,b.z,0,0,0,8.4,2.4,8.4,C_ELF,{add:1,a:.06*al/.8}); for(let i=0;i<6;i++){ const a=t*.8+i/6*Math.PI*2; R.drawTRS('diamond',b.x+Math.cos(a)*4.2,1+Math.sin(t*3+i)*.3,b.z+Math.sin(a)*4.2,Math.PI/2,-a,0,.25,1,.25,C_ELF,{add:1,a:al}); }
      R.light(b.x,1.5,b.z,[.2,1,.6],7); }
    if(P.harmT>0){ R.drawTRS('ringThin',P.x,.08,P.z,0,t*2,0,1.4,1,1.4,C_HARM,{add:1,a:.6}); R.light(P.x,2,P.z,[.9,.8,1],6); }
    else if(P.state==='neo'){ R.drawTRS('hex',P.x,1.1,P.z,0,t,0,1.5,2.2,1.5,C_CY,{add:1,a:.025}); }
  }
  // 적
  for(const e of G.enemies){
    const k=e.dead?Math.max(0,1-e.deathT/1.4):1;
    let ps;
    if(e.dead) ps=M.poses.down;
    else if(e.spawnT>0) ps=M.poses.hurt;
    else if(e.broken>0||e.stunT>0) ps=M.poses.stun;
    else if(e.air) ps=M.poses.hurt;
    else if(e.hitT>0) ps=M.poses.hurt;
    else if(e.st==='wind'||e.st==='double'&&e.t<.6||e.st==='pull'&&e.t<.75) ps=M.poses.scyA;
    else if(e.st==='strike'||e.st==='double') ps=M.poses.scyB;
    else if(e.st==='spin') ps=M.poses.spin;
    else if(e.pat){ const n=e.pat.n; ps=n==='combo'?(e.pat.t%.72<.45?M.poses.scyA:M.poses.scyB):n==='descent'?M.poses.castUp:n==='spin'?M.poses.spin:n==='throw'?M.poses.aim:M.poses.cast; }
    else ps=e.type==='chainer'?M.poses.cast:M.poses.idle;
    if(e.frozen<=0) { e.phase+=dt*(e.moving?Math.hypot(e.vx,e.vz)*1.4:0); M.apply(e.rig,ps,e.moving&&!e.air?Math.min(1,Math.hypot(e.vx,e.vz)/3):0,e.phase,dt,12); }
    if(e.type==='chainer'&&!e.dead) e.rig.hips.p[1]+=.3+Math.sin(t*2+e.phase)*.1;
    R.ovr=e.flash>0?{c:[1,1,1],o:{e:[.8,.8,.9]}}:e.frozen>0?{c:[.75,.75,.95],o:{e:[.2,.2,.35]}}:e.dead?{c:null,o:{a:k,e:[.2,.1,.4]}}:null;
    e.rig.root.p=[e.x,e.y,e.z]; e.rig.root.r=[0,e.yaw,0];
    if(e.type==='boss'&&!e.dead) { const sc=1.25; e.rig.root.s=[sc,sc,sc]; }
    e.rig.root.render(R); R.ovr=null;
    if(!e.dead){ shadow(e.x,e.z,e.def.r*1.3,.45); if(e.guardBreak>0) R.drawTRS('ringThin',e.x,e.y+e.def.h+.3,e.z,0,t*4,0,.5,1,.5,C_CY,{add:1,a:.8});
      if(e.resistDown>0) R.drawTRS('diamond',e.x,e.y+e.def.h+.5,e.z,Math.PI/2,t*3,0,.18,1,.18,C_ELF,{add:1,a:.9});
      if(e.broken>0) R.drawTRS('ring',e.x,e.y+e.def.h+.6,e.z,0,t*5,0,.7,1,.7,[1,.85,.3],{add:1,a:.8});
      if(e.type==='boss'||e.type==='elite') R.light(e.x,2,e.z,[.5,.25,1],6); }
  }
  // 기둥
  for(const p of G.pillars){
    const ch=p.st==='charge'?1-p.t/1.3:0;
    R.drawTRS('hex',p.x,2,p.z,0,0,0,1.3,4,1.3,p.purified?[.4,.42,.45]:[.16,.15,.22]);
    R.drawTRS('hex',p.x,4.2,p.z,0,t*.5,0,1.6,.4,1.6,[.22,.22,.26]);
    if(!p.purified){ R.drawTRS('cyl',p.x,2,p.z,0,0,0,.7+ch*.4,4.1,.7+ch*.4,[.35,.45,1],{add:1,a:.35+ch*.5+Math.sin(t*6)*.08});
      R.light(p.x,2.5,p.z,[.3+ch,.35,1],7+ch*4);
      if(Math.random()<.1) G.fx.push({mesh:'sphere',x:p.x+rand(-1,1),y:rand(.3,4),z:p.z+rand(-1,1),s:.15,s1:.02,c:[.4,.5,1],a:.8,life:.6,add:1,vx:0,vy:1.2,vz:0}); }
    else { R.drawTRS('cyl',p.x,2,p.z,0,0,0,.6,4.1,.6,[.3,1,.75],{add:1,a:.15}); }
    shadow(p.x,p.z,1.4,.5);
  }
  // 획득물
  for(const k of G.picks){
    if(k.type==='ore'){ R.drawTRS('hex',k.x,k.y+Math.sin(t*4+k.x)*.08,k.z,.5,t*3,.3,.22,.38,.22,[.6,.8,1],{e:[.2,.4,.8]}); }
    else if(k.type==='hp'){ R.drawTRS('sphere',k.x,k.y+.1,k.z,0,0,0,.35,.35,.35,[.3,1,.7],{add:1,a:.8}); }
    else { R.drawTRS('diamond',k.x,k.y+.6+Math.sin(t*2)*.15,k.z,Math.PI/2,t*2,0,.4,1,.4,[1,.95,1],{add:1,a:1}); R.drawTRS('diamond',k.x,k.y+.6,k.z,0,t*2,Math.PI/2,.4,1,.4,[.8,.7,1],{add:1,a:.8}); R.light(k.x,1.5,k.z,[.9,.8,1],5); }
  }
  // 예고 표시
  for(const tl of G.tele){
    const k=tl.t/tl.dur, c=tl.c, a=.35+.25*Math.sin(tl.t*20);
    if(tl.type==='circle'){ R.drawTRS('ring',tl.x,.07,tl.z,0,0,0,tl.r,1,tl.r,c,{add:1,a:.8}); R.drawTRS('disc',tl.x,.06,tl.z,0,0,0,tl.r*k,1,tl.r*k,c,{add:1,a}); }
    else if(tl.type==='sector'){ const ry=-tl.yaw+Math.PI/2; R.drawTRS('sector',tl.x,.07,tl.z,0,ry,0,tl.r,1,tl.r,c,{add:1,a:.25}); R.drawTRS('sector',tl.x,.075,tl.z,0,ry,0,tl.r*k,1,tl.r*k,c,{add:1,a}); }
    else if(tl.type==='line'){ const L=tl.len; R.drawTRS('quad',tl.x+Math.sin(tl.yaw)*L/2,.07,tl.z+Math.cos(tl.yaw)*L/2,0,tl.yaw,0,tl.r,1,L,c,{add:1,a:.22});
      R.drawTRS('quad',tl.x+Math.sin(tl.yaw)*L*k/2,.075,tl.z+Math.cos(tl.yaw)*L*k/2,0,tl.yaw,0,tl.r,1,L*k,c,{add:1,a}); }
  }
  // 투사체
  for(const p of G.proj){
    const yaw=Math.atan2(p.vx,p.vz);
    if(p.spear) R.drawTRS('cone',p.x,p.y,p.z,Math.PI/2,yaw,0,.22,1.6,.22,p.c,{add:1,a:1});
    else if(p.mesh==='arcW') R.drawTRS('arcW',p.x,p.y,p.z,p.rot||0,-yaw+Math.PI/2+(p.spin?G.time*14:0),0,1.4,1,1.4,p.c,{add:1,a:.9});
    else if(p.mesh==='diamond') R.drawTRS('diamond',p.x,p.y,p.z,Math.PI/2,G.time*8,0,.4,1,.4,p.c,{add:1,a:1});
    else R.drawTRS('sphere',p.x,p.y,p.z,0,0,0,p.r*1.6,p.r*1.6,p.r*1.6,p.c,{add:1,a:.9});
    R.light(p.x,p.y,p.z,p.c,4);
  }
  // 이펙트
  for(const f of G.fx){
    const k=f.t/f.life; const s=lerp(f.s,f.s1!==undefined?f.s1:f.s,1-(1-k)*(1-k));
    const sx=(f.sx||1)*s, sy=f.sy!==undefined?f.sy:s, sz=(f.sz||1)*s;
    const x=f.move?f.cx:f.x,y=f.move?f.cy:f.y,z=f.move?f.cz:f.z;
    R.drawTRS(f.mesh,x,y,z,f.rx||0,(f.ry||0)+(f.spin?f.t*f.spin:0),f.rz||0,sx,sy,sz,f.c,{add:f.add,a:f.a*(1-k)});
  }
  R.flush();
}

/* ================= 루프 ================= */
let last=0;
function loop(now){
  const rdt=Math.min(.05,(now-last)/1000||0); last=now;
  let dt=rdt;
  if(G.mode==='play'){
    if(G.hitstop>0){ G.hitstop-=rdt; dt=rdt*.08; }
    else if(G.slow>0){ G.slow-=rdt; dt=rdt*.35; }
    if(G.timeStop>0) G.timeStop-=rdt;
    G.time+=dt;
    if(!G.uiBlock){
      updatePlayer(dt); updateEnemies(dt); updateProj(dt); updatePicks(dt); progress(dt);
    }
    updateFx(dt);
  } else { G.time+=rdt*.3; }
  autoRes(rdt);
  R.resize();
  if(G.mode==='title'){ titleCam(rdt); } else updateCamera(dt,rdt);
  render(dt);
  XF.UI.frame(rdt);
  XF.Input.endFrame();
  requestAnimationFrame(loop);
}
let frAvg=16,frT=0;
function autoRes(rdt){
  if(!G.settings.autoRes||G.mode!=='play'){ return; }
  frAvg=frAvg*.95+rdt*1000*.05; frT+=rdt; if(frT<1.2)return; frT=0;
  if(frAvg>24&&R.scale>.5){ R.scale=Math.max(.5,R.scale-.1); }
  else if(frAvg<15&&R.scale<G.settings.resMax){ R.scale=Math.min(G.settings.resMax,R.scale+.05); }
}
function titleCam(dt){ const a=G.time*.6; R.setCamera([Math.sin(a)*1.4+.8,1.7,-4.3],[.8,1.25,.8],52*Math.PI/180);
  P.fog=0; }

G.boot=function(canvas){
  R=G.R=new XF.Renderer(canvas); W.build();
  if(XF.Input.touch){ R.maxDpr=1.5; R.scale=.8; XF.Input._tuned=true; }
  G.rigs.synthe=M.synthe(); G.rigs.zero=M.zero(); resetPlayer('synthe'); P.x=0;P.z=-2;
  setupStage();
  requestAnimationFrame(t=>{last=t;loop(t);});
};
G.start=function(cid){
  resetPlayer(cid); P.sync=startSyncOf(G.loadout); P.state=P.prevState=stateOf(); setupStage(); G.cam.yaw=Math.PI; G.cam.pitch=.3; G.cam.tx=P.x;G.cam.tz=P.z;
  G.mode='play'; G.time=0; G.stats={kills:0,maxCombo:0,start:performance.now()};
  G.msg('제1지역 — 잊혀진 실험동','#cfd8e3',true);
  setTimeout(()=>G.msg('WASD 이동 · 좌클릭 공격 · Q/E 스킬로 싱크로 게이지를 조율하라','#9fb3c8'),2200);
};
G.victory=function(){
  G.slow=2; A.bossMode(false); G.flags.cleared=true; G.ui.bossBar(null);
  G.msg('베스페라 격파 — 제1지역 클리어','#f4e9ff',true);
  setTimeout(()=>G.ui.showClear(),3200);
};
G.upgrade=function(id){
  const h=Object.values(XF.HELPERS).flatMap(h=>h.ups).find(u=>u.id===id); const lv=P.up[id]; if(lv>=h.max)return false;
  const cost=h.base*(lv+1); if(P.ore<cost)return false; P.ore-=cost; P.up[id]++; P.hpMax=hpMax(); if(id==='astral')P.hp=P.hpMax; A.play('shard'); return true;
};
G.msg=function(t,c,big){ XF.UI&&XF.UI.msg(t,c,big); };
// 테스트용
G.debug={tp:(x,z)=>{P.x=x;P.z=z;},give:(o,s)=>{P.ore+=o||0;P.shards+=s||0;},ult:()=>{P.ult=100;},sync:v=>{P.sync=v;},godmode:()=>{P.hpMax=P.hp=99999;}};
})();
