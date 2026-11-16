/* XF 신스에테르0 — ui.js : HUD · 메뉴 · 지도 · 조력자 정비 */
(function(){
'use strict';
const XF = window.XF;
const G = XF.Game, A = XF.Audio, W = XF.World;
const U = XF.UI = {};
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
let ctx2, mini, big, bossE=null, glitchT=0, hurtT=0;

function show(id,on){ $(id).classList.toggle('show',on); }
U.init=function(){
  G.ui=U;
  ctx2=$('#fx2d').getContext('2d'); mini=$('#mini').getContext('2d'); big=$('#bigmap').getContext('2d');
  $$('.v').forEach(e=>e.textContent=XF.VERSION); $('#ver').textContent=XF.VERSION;
  $$('#select .card').forEach(c=>{ c.querySelector('p').textContent=XF.CHARS[c.dataset.char].desc; c.onclick=()=>{ A.init(); A.play('ui'); show('#select',false); $('#hud').classList.remove('hidden'); G.start(c.dataset.char); }; });
  $('#btn-start').onclick=()=>{ A.init(); A.play('ui'); goFull(); show('#title',false); show('#select',true); document.body.classList.add('ingame'); };
  $('#btn-fs').onclick=()=>goFull();
  $('#map').addEventListener('click',()=>{ if(mapOpen) toggleMap(); });
  addEventListener('orientationchange',()=>setTimeout(()=>XF.Input.clear(),200));
  $('#select .back').onclick=()=>{ show('#select',false); show('#title',true); };
  $('#btn-controls').onclick=()=>{ A.init(); openPause('ctl',true); };
  $('#btn-lore').onclick=()=>{ A.init(); openPause('lore',true); };
  $('#btn-resume').onclick=()=>U.pause(false);
  $('#btn-restart').onclick=()=>{ show('#pause',false); G.uiBlock=false; G.start(G.player.char); };
  $('#btn-title').onclick=toTitle; $$('.to-title').forEach(b=>b.onclick=toTitle);
  $('#btn-respawn').onclick=()=>G.respawn();
  $('#btn-st-close').onclick=()=>{ show('#station',false); G.uiBlock=false; };
  $('#btn-story').onclick=()=>{ show('#story',false); G.uiBlock=false; };
  $('#btn-free').onclick=()=>{ show('#clear',false); G.uiBlock=false; G.mode='play'; };
  $$('.tabs button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
  // 설정
  const bindR=(id,fn)=>{ const el=$(id),out=el.nextElementSibling; const f=()=>{ out.textContent=(+el.value).toFixed(2).replace(/\.?0+$/,''); fn(+el.value); }; el.oninput=f; f(); };
  bindR('#o-sens',v=>G.settings.sens=v); bindR('#o-vol',v=>A.setVol(v)); bindR('#o-res',v=>{ G.settings.resMax=v; if(G.R)G.R.scale=Math.min(G.R.scale,v); if(G.R&&!G.settings.autoRes)G.R.scale=v; });
  bindR('#o-tsens',v=>XF.Input.touchSens=v); $('#o-auto').onchange=e=>G.settings.autoRes=e.target.checked;
  $('#o-inv').onchange=e=>G.settings.invertY=e.target.checked; $('#o-num').onchange=e=>G.settings.nums=e.target.checked; $('#o-shake').onchange=e=>G.settings.shake=e.target.checked;
  buildTabs();
};
function toTitle(){ document.body.classList.remove('ingame'); $$('.screen').forEach(s=>s.classList.remove('show')); show('#title',true); $('#hud').classList.add('hidden'); G.mode='title'; G.uiBlock=false; U.bossBar(null); A.bossMode(false); if(document.exitPointerLock)document.exitPointerLock(); }
function goFull(){
  if(!XF.Input.touch)return;
  const el=document.documentElement, rq=el.requestFullscreen||el.webkitRequestFullscreen;
  try{ const p=rq&&rq.call(el,{navigationUI:'hide'}); const lock=()=>{ try{ screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{}); }catch(e){} };
    if(p&&p.then) p.then(lock).catch(()=>{}); else lock(); }catch(e){}
}
function tab(t){ $$('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t)); $$('.tab').forEach(e=>e.classList.toggle('on',e.id==='tab-'+t)); }
function openPause(t,fromTitle){ tab(t||'set'); show('#pause',true); $('#btn-resume').textContent=fromTitle?'닫기':'계속하기';
  $('#btn-restart').style.display=fromTitle?'none':''; $('#btn-title').style.display=fromTitle?'none':''; U.pauseFromTitle=fromTitle; }
U.pause=function(on){
  if(on){ if(G.mode!=='play'||G.uiBlock)return; G.uiBlock=true; G.mode='pause'; openPause('set',false); if(document.exitPointerLock)document.exitPointerLock(); }
  else { show('#pause',false); if(U.pauseFromTitle){ U.pauseFromTitle=false; return; } G.mode='play'; G.uiBlock=false; XF.Input.clear(); }
};
function buildTabs(){
  const mv=XF.MOVES,S=XF.SKILLS;
  $('#tab-ctl').innerHTML=`<table>
  <tr><td>WASD</td><td>이동</td></tr><tr><td>마우스</td><td>시점 회전 (화면 클릭 시 포인터 고정)</td></tr>
  <tr><td>좌클릭</td><td>기본 공격 4타 — ${mv.combo.map(c=>c.name).join(' → ')}</td></tr>
  <tr><td>좌클릭 0.5초 홀딩</td><td>강공격 — ${mv.heavy.name} (가드 붕괴 · 띄우기)</td></tr>
  <tr><td>Space</td><td>점프 · <b>Space + 좌클릭</b> ${mv.jump.name}</td></tr>
  <tr><td>Space + 좌클릭 + Ctrl</td><td>점프 강공격 — ${mv.jheavy.name} (공중에서 0.5초 홀딩도 가능)</td></tr>
  <tr><td>Shift</td><td>회피 (무적 · 타이밍이 맞으면 <b>완벽 회피</b> → 감속 + 게이지 균형 보정)</td></tr>
  <tr><td>우클릭</td><td>대쉬 — ${mv.dash.name} (무적 관통 · 스턴)</td></tr>
  <tr><td>Q · E</td><td>스킬 (싱크로 상태에 따라 변화)</td></tr><tr><td>R</td><td>궁극기 (상태별 3종)</td></tr>
  <tr><td>Tab</td><td>신스 ↔ 제로 전환 (근처 적에게 교대 일격)</td></tr>
  <tr><td>F</td><td>상호작용 — 기둥 정화/해킹, 조력자 정비, 기억 복원</td></tr>
  <tr><td>M · Esc</td><td>지도 · 설정</td></tr></table>
  <p class="dim">휴대폰: 왼쪽 드래그 이동 · 오른쪽 드래그 시점 · 공격 버튼 홀딩 = 강공격(공중이면 점프 강공격)</p>`;
  $('#tab-sys').innerHTML=`<p>싱크로 게이지는 기계 에너지와 마력의 조화도입니다. 왼쪽 끝은 엘프(아르카나), 오른쪽 끝은 사이보그(오버로드). <b>끝에 닿으면 과부하</b> — 피해와 1초 경직.</p>
  <table>
  <tr><td class="s-elf">아스트랄 버스트</td><td>${XF.STATES.astral.desc}<br>Q → <b>${S.orbit.name}</b> (${S.orbit.desc}) · E → ${S.gale.name}<br>R → <b>${S.nova.name}</b></td></tr>
  <tr><td class="s-cy">네오 오버라이드</td><td>${XF.STATES.neo.desc}<br>Q → ${S.lance.name} · E → <b>${S.rush.name}</b> (${S.rush.desc})<br>R → <b>${S.annih.name}</b></td></tr>
  <tr><td class="s-harm">하모닉 싱크로</td><td>게이지가 47~53 구간에 들어오면 ${XF.SYNC.HARM_TIME}초간 발동. ${XF.STATES.harm.desc}<br>Q/E → <b>${S.harmo.name}</b> (${S.harmo.desc})<br>R → <b>${S.origin.name}</b><br>종료 후 10초간 재발동 불가.</td></tr>
  </table>
  <p class="dim">기본 Q(${S.lance.name})는 게이지를 엘프 쪽으로, 기본 E(${S.gale.name})는 사이보그 쪽으로 ${XF.SYNC.SKILL_SHIFT}씩 이동시킵니다. 기본 공격은 현재 캐릭터의 성향 쪽으로 조금씩 끌어당깁니다. 델리리움 기둥 근처와 짙은 안개 속에서는 균형이 흔들립니다.</p>`;
  $('#tab-lore').innerHTML=`<h4>연대기 — Chronology of Astra-XF</h4><table>${XF.LORE.map(l=>`<tr><td>${l[0]}</td><td>${l[1]}</td></tr>`).join('')}</table>
  <h4>세력 구도</h4><table>${XF.FACTIONS.map(f=>`<tr><td>${f[0]}</td><td>수장 ${f[1]} · ${f[2]}<br>${f[3]}</td></tr>`).join('')}</table>`;
}
function buildStation(){
  const P=G.player; $('#st-ore').textContent=P.ore;
  $('#helpers').innerHTML=Object.entries(XF.HELPERS).map(([k,h])=>`<div class="helper" style="border-color:${h.color}55"><h3 style="color:${h.color}">${h.name}<small>${h.title}</small></h3><q>${h.quote}</q>
    ${h.ups.map(u=>{ const lv=P.up[u.id],cost=u.base*(lv+1),max=lv>=u.max; return `<div class="up"><div><b>${u.name}</b><small>${u.desc}</small><span class="lv">${'■'.repeat(lv)}${'□'.repeat(u.max-lv)}</span></div>
      <button data-up="${u.id}" ${max||P.ore<cost?'disabled':''}>${max?'MAX':'◈ '+cost+' 강화'}</button></div>`; }).join('')}</div>`).join('');
  $$('#helpers [data-up]').forEach(b=>b.onclick=()=>{ if(G.upgrade(b.dataset.up)) buildStation(); });
}
U.openStation=function(){ G.uiBlock=true; buildStation(); show('#station',true); A.play('ui'); if(document.exitPointerLock)document.exitPointerLock(); };
U.story=function(type){
  G.uiBlock=true; if(document.exitPointerLock)document.exitPointerLock();
  const P=G.player;
  $('#story-body').innerHTML= type==='capsule'
    ? `<div class="code">SYNCHRO PROJECT · LOG SE 188</div><h3>각성 캡슐 기록</h3><p>「에테르 코어 폭주. 델리리움 역류 확인. 피험체 아스트라 오리진의 코어를 강제 분원(分源) — 개체명 <b style="color:#3dffb0">신스</b>, <b style="color:#3fa9ff">제로</b>. 봉인 처리.」</p><p>기록은 거기서 끊겨 있다. 지금은 SE 210년. 22년 동안 아무도 이 실험동에 돌아오지 않았다.</p>`
    : `<div class="code">MEMORY RESTORED · 01</div><h3>기억 복원 — 싱크로 프로젝트</h3><p>세 개의 기억 조각이 공명한다. 엘프의 마법 문명과 사이보그의 나노 기술을 하나로 묶으려 했던 금기의 연구. 그 중심에 있던 단 하나의 존재 — <b>아스트라 오리진</b>.</p><p>「신스와 제로가 완벽한 균형(50:50)을 이룰 때, 근원의 힘은 되돌아온다.」</p><p class="dim">게이트가 열렸다. 기억의 심층부에서 델리리움의 사도가 기다린다.</p>`;
  show('#story',true);
};
U.showDeath=function(){ show('#death',true); G.uiBlock=true; if(document.exitPointerLock)document.exitPointerLock(); };
U.hideDeath=function(){ show('#death',false); G.uiBlock=false; };
U.showClear=function(){ const s=G.stats,P=G.player; const sec=Math.round((performance.now()-s.start)/1000);
  $('#clear-stats').innerHTML=`<div><b>${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}</b>플레이 시간</div><div><b>${s.kills}</b>처치</div><div><b>${s.maxCombo}</b>최대 콤보</div><div><b>${P.ore}</b>보유 광석</div>`;
  show('#clear',true); G.uiBlock=true; if(document.exitPointerLock)document.exitPointerLock(); };
U.bossBar=function(e){ bossE=e; $('#boss').classList.toggle('hidden',!e); if(e){ $('#boss-name').textContent=e.def.name; $('#boss-sub').textContent=e.def.title; } };
U.msg=function(t,c,bigm){ const d=document.createElement('div'); d.className='msg'+(bigm?' big':''); d.textContent=t; d.style.color=c||'#fff'; const m=$('#msgs'); m.appendChild(d); while(m.children.length>3)m.firstChild.remove(); setTimeout(()=>d.remove(),2700); };
U.glitch=function(t){ glitchT=Math.max(glitchT,t); };
U.hurt=function(){ hurtT=.15; };
U.denied=function(k){ const el=$('#sk-'+(k==='swap'?'dash':k)); if(!el)return; el.classList.remove('deny'); void el.offsetWidth; el.classList.add('deny'); };

/* ---------- 매 프레임 ---------- */
let mapOpen=false;
U.frame=function(dt){
  const I=XF.Input;
  if(I.pressed('pause')){ if(mapOpen){toggleMap();} else if($('#pause').classList.contains('show')) U.pause(false); else if(!G.uiBlock) U.pause(true); }
  if(I.pressed('map')&&(G.mode==='play'&&!G.uiBlock||mapOpen)) toggleMap();
  const c=ctx2.canvas; const w=c.clientWidth,h=c.clientHeight,dpr=Math.min(2,devicePixelRatio||1);
  if(c.width!==Math.floor(w*dpr)){ c.width=Math.floor(w*dpr); c.height=Math.floor(h*dpr); }
  ctx2.setTransform(dpr,0,0,dpr,0,0); ctx2.clearRect(0,0,w,h);
  if(G.mode==='title')return;
  if(XF.Input.touch&&innerHeight>innerWidth&&G.mode==='play'&&!G.uiBlock){ U.pause(true); }
  const P=G.player, st=G.stateOf();
  document.body.classList.toggle('cine',G.cam.cine>0);
  glitchT-=dt; $('#glitch').classList.toggle('on',glitchT>0||P.fog>.9&&Math.random()<.04);
  hurtT-=dt; const v=$('#vignette'); v.classList.toggle('hit',hurtT>0); v.classList.toggle('poison',P.poison>0&&hurtT<=0);
  // 좌상단
  const ch=XF.CHARS[P.char]; $('#who-name').textContent=ch.name; $('#who-en').textContent=ch.en; $('#who-name').style.color='#'+ch.color.toString(16).padStart(6,'0');
  $('#hp i').style.transform=`scaleX(${P.hp/P.hpMax})`; $('#hp b').style.transform=`scaleX(${P.hp/P.hpMax})`; $('#hp-t').textContent=`${Math.ceil(P.hp)} / ${P.hpMax}`;
  let stt=''; if(P.poison>0) stt+=`<span style="color:#9a8cff">델리리움 중독 ${P.poison.toFixed(0)}s</span>`; if(P.fog>.85) stt+=`<span style="color:#7fa0ff">시스템 오류</span>`;
  if(P.orbitT>0) stt+=`<span style="color:var(--elf)">룬 궤도 ${P.orbitT.toFixed(0)}s</span>`; if(P.stunT>0) stt+=`<span style="color:#ff6b7d">과부하 경직</span>`;
  if(st==='neo') stt+=`<span style="color:var(--cy)">슈퍼아머</span>`;
  const sEl=$('#status'); if(sEl._h!==stt){ sEl.innerHTML=stt; sEl._h=stt; }
  // 목표
  let obj=''; const f=G.flags;
  if(f.cleared) obj='제1지역 클리어 — 자유 탐색';
  else if(f.bossStarted) obj='<b>베스페라</b>를 쓰러뜨려라';
  else if(W.gateOpen) obj='기억의 심층부로 진입하라';
  else if(P.shards>=3) obj='게이트에서 <b>기억을 복원</b>하라 [F]';
  else obj=`레비너스 처형자를 처치해 <b>기억 조각</b>을 모아라 (${P.shards}/3) · 광석은 정비실에서 강화`;
  const oEl=$('#objective'); if(oEl._h!==obj){ oEl.innerHTML=obj; oEl._h=obj; }
  // 인벤토리
  $('#ore').textContent='◈ '+P.ore; $('#shards').textContent='◆'.repeat(P.shards)+'◇'.repeat(Math.max(0,3-P.shards));
  // 콤보
  $('#combo').classList.toggle('on',P.hits>2); $('#combo b').textContent=P.hits;
  // 싱크로 게이지
  const sv=P.sync; $('#sync-mark').style.left=sv+'%';
  $('#sync-fill-l').style.width=Math.max(0,50-sv)+'%'; $('#sync-fill-r').style.width=Math.max(0,sv-50)+'%';
  $('#sync-val').textContent=P.harmT>0?`HARMONIC ${P.harmT.toFixed(1)}s`:`${Math.round(100-sv)} : ${Math.round(sv)}`;
  const sy=$('#sync'); sy.classList.toggle('harm',P.harmT>0); sy.classList.toggle('cool',P.harmCool>0&&P.harmT<=0);
  const S=XF.STATES[st]; $('#state-name b').textContent=S.name; $('#state-name b').style.color=S.color; $('#state-name span').textContent=P.harmCool>0&&P.harmT<=0?`하모닉 재충전 ${P.harmCool.toFixed(0)}s`:S.sub;
  const gh=$('#sync-ghost'); let gv=null; if(st==='astral'&&P.cd.e<=0) gv=sv+XF.SYNC.SKILL_SHIFT; if(st==='neo'&&P.cd.q<=0) gv=sv-XF.SYNC.SKILL_SHIFT;
  gh.style.display=gv===null?'none':'block'; if(gv!==null) gh.style.left=Math.max(0,Math.min(100,gv))+'%';
  // 스킬 슬롯
  const SK=XF.SKILLS;
  const qId=st==='harm'?'harmo':st==='astral'?(P.orbitT>0?'orbitShot':'orbit'):'lance';
  const eId=st==='harm'?'harmo':st==='neo'?'rush':'gale';
  slot('q',qId==='orbitShot'?'룬 연쇄 발사':SK[qId].name,qId==='orbitShot'?'elf':SK[qId].side,P.orbitT>0&&st==='astral'?0:P.cd.q,qId==='orbit'||qId==='orbitShot'?SK.orbit.cd:SK[qId].cd);
  slot('e',SK[eId].name,SK[eId].side,P.cd.e,SK[eId].cd);
  slot('dash',null,null,P.cd.dash,XF.MOVES.dash.cd); slot('dodge',null,null,P.cd.dodge,.55);
  const rId=st==='astral'?'nova':st==='neo'?'annih':'origin';
  $('#sk-r span').textContent=SK[rId].name; $('#ult-ring').style.strokeDashoffset=176*(1-P.ult/100);
  $('#ult-ring').style.stroke=st==='astral'?'#3dffb0':st==='neo'?'#3fa9ff':'#f4e9ff'; $('#sk-r').classList.toggle('ready',P.ult>=100); if(XF.Input.touch){ const tr=$('.t-r'); tr.style.setProperty('--ult',P.ult); tr.classList.toggle('ready',P.ult>=100); }
  // 상호작용
  const it=G.interactTarget(); document.body.classList.toggle('can-f',!!it&&!G.uiBlock); const pr=$('#prompt'); pr.classList.toggle('hidden',!it||G.uiBlock); if(it) pr.querySelector('span').textContent=it.label;
  // 보스
  if(bossE){ $('#boss .bar i').style.transform=`scaleX(${Math.max(0,bossE.hp/bossE.def.hp)})`; $('#boss .bar b').style.transform=`scaleX(${Math.max(0,bossE.hp/bossE.def.hp)})`;
    $('#boss-poise i').style.transform=`scaleX(${bossE.broken>0?0:bossE.poise/bossE.poiseMax})`; }
  draw2D(w,h); drawMini();
  if(mapOpen) drawBig();
};
function slot(k,name,side,cd,max){
  const el=$('#sk-'+k); if(name!==null&&el._n!==name){ el.querySelector('span').textContent=name; el._n=name; }
  if(side!==null){ el.classList.toggle('elf',side==='elf'); el.classList.toggle('cyber',side==='cyber'); el.classList.toggle('harm',side==='harm');
    el.querySelector('.ic').textContent=side==='elf'?'✦':side==='cyber'?'⌁':'✕'; }
  const pct=(cd>0?Math.min(1,cd/max)*100:0); el.querySelector('.cd').style.height=pct+'%';
  if(XF.Input.touch){ const tb=document.querySelector('.t-'+k); if(tb) tb.style.setProperty('--cd',pct); }
}
function draw2D(w,h){
  const R=G.R, c=ctx2;
  // 적 체력바
  for(const e of G.enemies){ if(e.dead||e.type==='boss'||e.spawnT>0)continue; if(e.hp>=e.def.hp&&Math.hypot(e.x-G.player.x,e.z-G.player.z)>14)continue;
    const p=R.project(e.x,e.y+e.def.h+.45,e.z); if(!p||p[2]>40)continue; const bw=e.type==='elite'?80:46;
    c.fillStyle='rgba(0,0,0,.6)'; c.fillRect(p[0]-bw/2,p[1],bw,5); c.fillStyle=e.type==='elite'?'#b88cff':'#ff5a6e'; c.fillRect(p[0]-bw/2,p[1],bw*Math.max(0,e.hp/e.def.hp),5);
    if(e.type==='elite'){ c.font='11px sans-serif'; c.textAlign='center'; c.fillStyle='#d8c8ff'; c.fillText(e.def.name,p[0],p[1]-4); } }
  // 피해 숫자
  c.textAlign='center';
  for(const n of G.nums){ const p=R.project(n.x,n.y+n.t*1.2,n.z); if(!p)continue; const a=1-n.t/.9; const sz=n.crit?24:17;
    c.font=`italic 700 ${sz*(n.t<.08?1.4:1)}px "JetBrains Mono",Consolas,monospace`; c.globalAlpha=a; c.lineWidth=3; c.strokeStyle='rgba(0,0,0,.7)'; c.strokeText(n.txt,p[0],p[1]); c.fillStyle=n.crit?'#ffd36b':n.c; c.fillText(n.txt,p[0],p[1]); }
  c.globalAlpha=1;
  // 기억 조각 / 기둥 표식
  for(const k of G.picks){ if(k.type!=='shard')continue; const p=R.project(k.x,k.y+1.6,k.z); if(p){ c.fillStyle='#fff'; c.font='14px sans-serif'; c.fillText('◇',p[0],p[1]); } }
}
function mapXform(cw,ch,cx,cz,scale){ return (x,z)=>[cw/2+(x-cx)*scale, ch/2+(z-cz)*scale]; }
function drawMapContent(c,T,scale,full){
  const P=G.player;
  c.fillStyle='rgba(120,140,170,.18)'; c.strokeStyle='rgba(160,190,220,.35)'; c.lineWidth=1;
  for(const r of W.rects){ const [a,b]=T(r.x0,r.z0),[d,e]=T(r.x1,r.z1); c.fillRect(Math.min(a,d),Math.min(b,e),Math.abs(d-a),Math.abs(e-b)); }
  if(full){ c.font='12px sans-serif'; c.textAlign='center'; c.fillStyle='#9fb3c8'; for(const r of W.rects) if(r.name){ const [x,y]=T((r.x0+r.x1)/2,r.z1-2.5); c.fillText(r.name,x,y); } }
  // 게이트
  const [g1,g2]=T(-3,W.gateZ),[g3]=T(3,W.gateZ); c.strokeStyle=W.gateOpen?'#3dffb0':'#a064ff'; c.lineWidth=3; c.beginPath(); c.moveTo(g1,g2); c.lineTo(g3,g2); c.stroke();
  const [sx,sz]=T(0,-70); c.strokeStyle='#3dffb0'; c.lineWidth=1.5; c.beginPath(); c.arc(sx,sz,full?8:5,0,7); c.stroke();
  for(const p of G.pillars){ const [x,y]=T(p.x,p.z); c.fillStyle=p.purified?'#3dffb0':'#7f8cff'; c.save(); c.translate(x,y); c.rotate(.785); c.fillRect(-3,-3,6,6); c.restore(); }
  for(const e of G.enemies){ if(e.dead)continue; const [x,y]=T(e.x,e.z); c.fillStyle=e.type==='boss'?'#c08aff':'#ff5a6e'; c.beginPath(); c.arc(x,y,e.type==='boss'?6:e.type==='elite'?4:2.6,0,7); c.fill(); }
  for(const k of G.picks) if(k.type==='shard'){ const [x,y]=T(k.x,k.z); c.fillStyle='#fff'; c.fillText('◇',x,y+4); }
  // 플레이어 (카메라 방향)
  const [px,py]=T(P.x,P.z); c.save(); c.translate(px,py); c.rotate(-G.cam.yaw+Math.PI); c.fillStyle='#fff';
  c.beginPath(); c.moveTo(0,-7); c.lineTo(5,5); c.lineTo(0,2); c.lineTo(-5,5); c.closePath(); c.fill(); c.restore();
}
function drawMini(){
  const c=mini, w=c.canvas.width, h=c.canvas.height; c.clearRect(0,0,w,h);
  const P=G.player; const sc=2.2; drawMapContent(c,(x,z)=>[w/2+(x-P.x)*sc,h/2+(z-P.z)*sc],sc,false);
}
function drawBig(){
  const cv=big.canvas, dpr=Math.min(2,devicePixelRatio||1); const w=cv.clientWidth,h=cv.clientHeight;
  if(cv.width!==Math.floor(w*dpr)){cv.width=Math.floor(w*dpr);cv.height=Math.floor(h*dpr);}
  big.setTransform(dpr,0,0,dpr,0,0); big.clearRect(0,0,w,h);
  const sc=Math.min(w/50,h/195); drawMapContent(big,(x,z)=>[w/2+x*sc,h*.03+(z+181)*sc],sc,true);
}
function toggleMap(){ mapOpen=!mapOpen; show('#map',mapOpen); G.uiBlock=mapOpen; if(mapOpen&&document.exitPointerLock)document.exitPointerLock(); }
})();
