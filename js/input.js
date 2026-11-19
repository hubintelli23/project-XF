/* XF 신스에테르0 — input.js : 통일 조작 체계 (키보드·마우스 / 터치) */
(function(){
'use strict';
const XF = window.XF = window.XF || {};
const I = XF.Input = { touch:false, locked:false };
const held=new Set(), edge=new Set();
let lookX=0, lookY=0; const joy={x:0,y:0,id:null,ox:0,oy:0};

const KEYMAP={KeyW:'fwd',ArrowUp:'fwd',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',
  Space:'jump',ShiftLeft:'dodge',ShiftRight:'dodge',KeyQ:'q',KeyE:'e',KeyR:'r',Tab:'swap',KeyF:'interact',KeyM:'map',Escape:'pause',
  KeyC:'burst',KeyV:'bskill',ControlLeft:'ctrl',ControlRight:'ctrl',KeyJ:'atk',KeyK:'dash'};
function press(n){ if(!held.has(n)) edge.add(n); held.add(n); }
function release(n){ held.delete(n); }
I.down=n=>held.has(n); I.pressed=n=>edge.has(n);
I.endFrame=()=>{ edge.clear(); };
I.move=()=>{ if(joy.id!==null) return [joy.x,joy.y];
  return [(held.has('right')?1:0)-(held.has('left')?1:0),(held.has('fwd')?1:0)-(held.has('back')?1:0)]; };
I.look=()=>{ const r=[lookX,lookY]; lookX=lookY=0; return r; };
I.clear=()=>{ held.clear(); edge.clear(); joy.id=null; joy.x=joy.y=0; };

I.bind=function(canvas){
  addEventListener('keydown',e=>{
    const n=KEYMAP[e.code]; if(!n)return;
    if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)||e.ctrlKey&&n!=='ctrl') e.preventDefault();
    if(n==='ctrl') e.preventDefault();
    if(e.repeat)return; press(n);
  });
  addEventListener('keyup',e=>{ const n=KEYMAP[e.code]; if(n)release(n); });
  addEventListener('blur',()=>I.clear());
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('mousedown',e=>{
    if(I.touch)return;
    if(XF.Game.mode==='play'&&!I.locked&&!XF.Game.uiBlock){ canvas.requestPointerLock&&canvas.requestPointerLock(); }
    if(e.button===0)press('atk'); if(e.button===2)press('dash');
  });
  addEventListener('mouseup',e=>{ if(e.button===0)release('atk'); if(e.button===2)release('dash'); });
  addEventListener('mousemove',e=>{ if(I.locked){ lookX+=e.movementX; lookY+=e.movementY; } });
  document.addEventListener('pointerlockchange',()=>{
    const was=I.locked; I.locked=document.pointerLockElement===canvas;
    if(was&&!I.locked&&XF.Game.mode==='play'&&!XF.Game.uiBlock) XF.UI.pause(true);
  });
  // ---- 터치 ----
  const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
  if(isTouch) I.enableTouch(true);
  addEventListener('touchstart',()=>{ if(!I.touch) I.enableTouch(true); },{passive:true,once:true});
  const lookTouch={id:null,x:0,y:0};
  const zone=document.getElementById('touch-zone');
  const stick=document.getElementById('joy'), knob=document.getElementById('joy-knob');
  zone.addEventListener('touchstart',e=>{
    for(const t of e.changedTouches){
      if(t.clientX<innerWidth*.42&&joy.id===null){ joy.id=t.identifier; joy.ox=t.clientX; joy.oy=t.clientY; joy.x=joy.y=0;
        stick.style.left=(t.clientX-60)+'px'; stick.style.top=(t.clientY-60)+'px'; stick.classList.add('on'); knob.style.transform='translate(0,0)'; }
      else if(lookTouch.id===null){ lookTouch.id=t.identifier; lookTouch.x=t.clientX; lookTouch.y=t.clientY; }
    } e.preventDefault(); },{passive:false});
  zone.addEventListener('touchmove',e=>{
    for(const t of e.changedTouches){
      if(t.identifier===joy.id){ let dx=t.clientX-joy.ox,dy=t.clientY-joy.oy; const d=Math.hypot(dx,dy),m=55; if(d>m){dx*=m/d;dy*=m/d;}
        joy.x=dx/m; joy.y=-dy/m; knob.style.transform=`translate(${dx}px,${dy}px)`; }
      if(t.identifier===lookTouch.id){ const ts=I.touchSens||1.4; lookX+=(t.clientX-lookTouch.x)*ts; lookY+=(t.clientY-lookTouch.y)*ts; lookTouch.x=t.clientX; lookTouch.y=t.clientY; }
    } e.preventDefault(); },{passive:false});
  const end=e=>{ for(const t of e.changedTouches){ if(t.identifier===joy.id){ joy.id=null; joy.x=joy.y=0; stick.classList.remove('on'); } if(t.identifier===lookTouch.id) lookTouch.id=null; } };
  zone.addEventListener('touchend',end); zone.addEventListener('touchcancel',end);
  // 버튼
  document.querySelectorAll('[data-act]').forEach(b=>{
    const n=b.dataset.act;
    b.addEventListener('touchstart',e=>{ e.preventDefault(); e.stopPropagation(); press(n); b.classList.add('down');
      if(n==='atk'&&XF.Game.player&&!XF.Game.player.grounded) {} },{passive:false});
    const up=e=>{ e.preventDefault(); release(n); b.classList.remove('down'); };
    b.addEventListener('touchend',up,{passive:false}); b.addEventListener('touchcancel',up,{passive:false});
    b.addEventListener('mousedown',e=>{ if(I.touch){e.preventDefault();} });
  });
};
I.enableTouch=function(on){ I.touch=on; document.body.classList.toggle('touch',on);
  if(on&&XF.Game.R&&!I._tuned){ I._tuned=true; XF.Game.R.maxDpr=1.5; XF.Game.R.scale=.8; } };
})();
