/* XF 신스에테르0 — audio.js : WebAudio 절차적 효과음 (외부 음원 없음) */
(function(){
'use strict';
const XF = window.XF = window.XF || {};
let ctx=null, master=null, sfxBus=null, amb=null, noiseBuf=null;
const A = XF.Audio = { vol:.7, muted:false };

A.init=function(){
  if(ctx) { if(ctx.state==='suspended')ctx.resume(); return; }
  const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
  ctx=new AC(); master=ctx.createGain(); master.gain.value=A.vol; master.connect(ctx.destination);
  sfxBus=ctx.createGain(); sfxBus.connect(master);
  noiseBuf=ctx.createBuffer(1,ctx.sampleRate*1.5,ctx.sampleRate);
  const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  startAmbience();
};
A.setVol=function(v){A.vol=v; if(master)master.gain.value=A.muted?0:v;};

function env(g,t,a,peak,dec){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec);}
function noise(t,dur,freq,q,peak,type){
  const s=ctx.createBufferSource();s.buffer=noiseBuf;const f=ctx.createBiquadFilter();f.type=type||'bandpass';f.frequency.value=freq;f.Q.value=q;
  const g=ctx.createGain();env(g,t,.005,peak,dur);s.connect(f);f.connect(g);g.connect(sfxBus);s.start(t);s.stop(t+dur+.05);return f;
}
function tone(t,type,f0,f1,dur,peak,att){
  const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  const g=ctx.createGain();env(g,t,att||.005,peak,dur);o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+dur+.05);
}
A.play=function(name,p){
  if(!ctx||A.muted)return; const t=ctx.currentTime; p=p||1;
  switch(name){
    case 'swing': { const f=noise(t,.16,1800*p,1.2,.35,'bandpass'); f.frequency.exponentialRampToValueAtTime(600,t+.15); break; }
    case 'hit':   noise(t,.09,900,1,.5,'lowpass'); tone(t,'square',220*p,90,.08,.12); break;
    case 'heavy': noise(t,.3,400,.8,.7,'lowpass'); tone(t,'sawtooth',120,40,.3,.25); break;
    case 'boom':  noise(t,.7,300,.6,.9,'lowpass'); tone(t,'sine',90,30,.6,.6); break;
    case 'dash':  { const f=noise(t,.25,3000,2,.3,'highpass'); tone(t,'sawtooth',300,1400,.18,.08); break; }
    case 'dodge': noise(t,.15,2500,1.5,.2,'bandpass'); break;
    case 'jump':  tone(t,'sine',260,520,.12,.1); break;
    case 'elf':   [523,659,784,1046].forEach((f,i)=>tone(t+i*.04,'sine',f,0,.9,.08,.04)); noise(t,.5,5000,3,.06,'bandpass'); break;
    case 'cyber': tone(t,'sawtooth',180,1600,.25,.12); tone(t+.05,'square',90,60,.3,.08); noise(t,.2,6000,1,.15,'highpass'); break;
    case 'laser': tone(t,'sawtooth',900,700,.12,.06); noise(t,.1,7000,1,.06,'highpass'); break;
    case 'harm':  [392,587,784].forEach((f,i)=>tone(t+i*.03,'triangle',f,f*1.5,.6,.1,.02)); tone(t,'sawtooth',110,880,.3,.08); break;
    case 'ult':   [262,330,392,523,659].forEach((f,i)=>tone(t+i*.08,'sine',f,0,1.6,.1,.08)); noise(t,1.4,200,.5,.4,'lowpass'); break;
    case 'pickup':tone(t,'triangle',880,1320,.12,.12); break;
    case 'shard': [660,880,1100,1320].forEach((f,i)=>tone(t+i*.07,'sine',f,0,.5,.1)); break;
    case 'hurt':  tone(t,'square',160,70,.18,.15); noise(t,.12,600,1,.3,'lowpass'); break;
    case 'warn':  tone(t,'square',440,440,.1,.06); tone(t+.14,'square',440,440,.1,.06); break;
    case 'overload': tone(t,'sawtooth',60,1200,.5,.2); noise(t,.5,1200,4,.3,'bandpass'); break;
    case 'ui':    tone(t,'sine',1200,1500,.05,.05); break;
    case 'swap':  tone(t,'triangle',400,1200,.2,.1); noise(t,.2,4000,2,.1,'bandpass'); break;
    case 'chain': noise(t,.25,2500,6,.25,'bandpass'); tone(t,'square',700,300,.2,.05); break;
    case 'roar':  tone(t,'sawtooth',90,50,1.0,.25,.1); noise(t,1,300,.7,.3,'lowpass'); break;
  }
};

function startAmbience(){
  // 고요한 아포칼립스 환경음: 저음 드론 + 바람
  amb=ctx.createGain();amb.gain.value=.12;amb.connect(master);
  [55,82.4,110.3].forEach((f,i)=>{const o=ctx.createOscillator();o.type=i===2?'triangle':'sine';o.frequency.value=f;
    const g=ctx.createGain();g.gain.value=i===2?.08:.25;const lfo=ctx.createOscillator();lfo.frequency.value=.05+i*.03;const lg=ctx.createGain();lg.gain.value=.12;
    lfo.connect(lg);lg.connect(g.gain);o.connect(g);g.connect(amb);o.start();lfo.start();});
  const s=ctx.createBufferSource();s.buffer=noiseBuf;s.loop=true;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=500;f.Q.value=.7;
  const g=ctx.createGain();g.gain.value=.25;const lfo=ctx.createOscillator();lfo.frequency.value=.08;const lg=ctx.createGain();lg.gain.value=300;lfo.connect(lg);lg.connect(f.frequency);
  s.connect(f);f.connect(g);g.connect(amb);s.start();lfo.start();
}
A.bossMode=function(on){ if(amb) amb.gain.setTargetAtTime(on?.22:.12,ctx.currentTime,.5); };
})();
