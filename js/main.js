/* XF 신스에테르0 — main.js : 부팅 */
(function(){
'use strict';
const XF=window.XF;
function fail(e){ const el=document.getElementById('err'); el.classList.remove('hidden'); el.textContent='오류: '+(e&&e.message||e); console.error(e); }
window.addEventListener('error',e=>fail(e.error||e.message));
try{
  const canvas=document.getElementById('game');
  XF.UI.init();
  XF.Input.bind(canvas);
  XF.Game.boot(canvas);
  console.log('XF 신스에테르0',XF.VERSION,'booted');
}catch(e){ fail(e); }
})();
