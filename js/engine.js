/* XF 신스에테르0 — engine.js : 의존성 없는 경량 WebGL 렌더러 */
(function(){
'use strict';
const XF = window.XF = window.XF || {};

/* ---------- 수학 ---------- */
const m4 = {
  create(){ const m=new Float32Array(16); m[0]=m[5]=m[10]=m[15]=1; return m; },
  mul(o,a,b){
    const r=o===a||o===b?new Float32Array(16):o;
    for(let c=0;c<4;c++)for(let row=0;row<4;row++){
      r[c*4+row]=a[row]*b[c*4]+a[4+row]*b[c*4+1]+a[8+row]*b[c*4+2]+a[12+row]*b[c*4+3];
    }
    if(r!==o)o.set(r); return o;
  },
  persp(o,fov,asp,n,f){
    const t=1/Math.tan(fov/2); o.fill(0);
    o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f); return o;
  },
  lookAt(o,e,c,u){
    let zx=e[0]-c[0],zy=e[1]-c[1],zz=e[2]-c[2];let l=Math.hypot(zx,zy,zz)||1;zx/=l;zy/=l;zz/=l;
    let xx=u[1]*zz-u[2]*zy,xy=u[2]*zx-u[0]*zz,xz=u[0]*zy-u[1]*zx;l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;
    const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;
    o[0]=xx;o[1]=yx;o[2]=zx;o[3]=0;o[4]=xy;o[5]=yy;o[6]=zy;o[7]=0;o[8]=xz;o[9]=yz;o[10]=zz;o[11]=0;
    o[12]=-(xx*e[0]+xy*e[1]+xz*e[2]);o[13]=-(yx*e[0]+yy*e[1]+yz*e[2]);o[14]=-(zx*e[0]+zy*e[1]+zz*e[2]);o[15]=1;return o;
  },
  /* T * Ry * Rx * Rz * S */
  trs(o,x,y,z,rx,ry,rz,sx,sy,sz){
    const cx=Math.cos(rx),sxr=Math.sin(rx),cy=Math.cos(ry),syr=Math.sin(ry),cz=Math.cos(rz),szr=Math.sin(rz);
    const a00=cy*cz+syr*sxr*szr, a01=-cy*szr+syr*sxr*cz, a02=syr*cx;
    const a10=cx*szr,            a11=cx*cz,              a12=-sxr;
    const a20=-syr*cz+cy*sxr*szr,a21=syr*szr+cy*sxr*cz,  a22=cy*cx;
    o[0]=a00*sx;o[1]=a10*sx;o[2]=a20*sx;o[3]=0;
    o[4]=a01*sy;o[5]=a11*sy;o[6]=a21*sy;o[7]=0;
    o[8]=a02*sz;o[9]=a12*sz;o[10]=a22*sz;o[11]=0;
    o[12]=x;o[13]=y;o[14]=z;o[15]=1;return o;
  }
};
XF.m4=m4;
XF.clamp=(v,a,b)=>v<a?a:v>b?b:v;
XF.lerp=(a,b,t)=>a+(b-a)*t;
XF.rand=(a,b)=>a+Math.random()*(b-a);
XF.angDiff=(a,b)=>{let d=b-a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return d;};
XF.hex=(h)=>[((h>>16)&255)/255,((h>>8)&255)/255,(h&255)/255];

/* ---------- 셰이더 ---------- */
const VS=`attribute vec3 aP;attribute vec3 aN;uniform mat4 uVP;uniform mat4 uM;varying vec3 vN;varying vec3 vW;
void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=normalize(mat3(uM)*aN);gl_Position=uVP*w;}`;
const FS=`precision mediump float;varying vec3 vN;varying vec3 vW;
uniform vec3 uC;uniform vec3 uE;uniform float uA;uniform float uUnlit;uniform float uFloor;uniform float uSpec;
uniform vec3 uFogC;uniform float uFogD;uniform vec3 uL;uniform vec3 uCam;uniform float uTime;
uniform vec3 uPLp[8];uniform vec3 uPLc[8];uniform float uPLr[8];
void main(){
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;
 vec3 col;
 if(uUnlit>.5){col=uC+uE;}
 else{
  vec3 base=uC;
  if(uFloor>.5){vec2 g=abs(fract(vW.xz/2.)-.5);float line=step(.47,max(g.x,g.y));base*=1.-line*.35;
    float h=fract(sin(dot(floor(vW.xz/2.),vec2(12.9898,78.233)))*43758.5);base*=.88+h*.18;}
  vec3 L=normalize(uL);float ndl=max(dot(n,L),0.);vec3 vv=normalize(uCam-vW);
  vec3 hemi=mix(vec3(.16,.17,.2),vec3(.42,.45,.52),n.y*.5+.5);
  col=base*(hemi+ndl*vec3(.62,.64,.7));
  for(int i=0;i<8;i++){vec3 d=uPLp[i]-vW;float l=length(d);float r=uPLr[i];if(r>0.){float at=max(1.-l/r,0.);at*=at;col+=base*uPLc[i]*at*max(dot(n,d/l),0.)*1.6+uPLc[i]*at*.05;}}
  float rim=pow(1.-max(dot(n,vv),0.),3.);col+=rim*.2*vec3(.5,.65,.9);
  vec3 hv=normalize(L+vv);col+=pow(max(dot(n,hv),0.),36.)*uSpec*vec3(.95,.97,1.)*(.4+ndl);
  col+=uE;
 }
 float dist=length(uCam-vW);float f=1.-exp(-pow(dist*uFogD,2.));
 if(uUnlit>.5)f*=.55;
 col=mix(col,uFogC,clamp(f,0.,1.));
 gl_FragColor=vec4(col,uA);
}`;

class Renderer{
  constructor(canvas){
    this.canvas=canvas;
    const opt={antialias:true,alpha:false,premultipliedAlpha:false,preserveDrawingBuffer:false};
    const gl=this.gl=canvas.getContext('webgl',opt)||canvas.getContext('experimental-webgl',opt);
    if(!gl)throw new Error('WebGL을 사용할 수 없습니다');
    const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o;};
    const p=this.prog=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
    gl.useProgram(p);
    this.aP=gl.getAttribLocation(p,'aP');this.aN=gl.getAttribLocation(p,'aN');
    gl.enableVertexAttribArray(this.aP);gl.enableVertexAttribArray(this.aN);
    this.u={};['uVP','uM','uC','uE','uA','uUnlit','uFloor','uSpec','uFogC','uFogD','uL','uCam','uTime'].forEach(n=>this.u[n]=gl.getUniformLocation(p,n));
    this.u.uPLp=gl.getUniformLocation(p,'uPLp');this.u.uPLc=gl.getUniformLocation(p,'uPLc');this.u.uPLr=gl.getUniformLocation(p,'uPLr');
    gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
    this.meshes={};this.queue=[];this.pool=[];this.poolI=0;
    this.vp=m4.create();this.view=m4.create();this.proj=m4.create();
    this.fogColor=[.1,.13,.18];this.fogDen=.035;this.lightDir=[.4,.9,.3];
    this.lights=[];this.camPos=[0,5,10];this.time=0;this.scale=1;
    this.plp=new Float32Array(24);this.plc=new Float32Array(24);this.plr=new Float32Array(8);
    buildPrimitives(this);
  }
  resize(){
    const dpr=Math.min(window.devicePixelRatio||1,this.maxDpr||2)*this.scale;
    const w=Math.floor(this.canvas.clientWidth*dpr),h=Math.floor(this.canvas.clientHeight*dpr);
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
    this.gl.viewport(0,0,w,h);
  }
  addMesh(name,pos,nor,idx){
    const gl=this.gl,m={};
    m.vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,m.vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(pos),gl.STATIC_DRAW);
    m.nb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,m.nb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(nor),gl.STATIC_DRAW);
    m.ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idx),gl.STATIC_DRAW);
    m.n=idx.length;this.meshes[name]=m;
  }
  mat(){ if(this.poolI>=this.pool.length)this.pool.push(new Float32Array(16)); return this.pool[this.poolI++]; }
  setCamera(eye,target,fov){
    const asp=this.canvas.width/Math.max(1,this.canvas.height);
    m4.persp(this.proj,fov,asp,.1,220);m4.lookAt(this.view,eye,target,[0,1,0]);m4.mul(this.vp,this.proj,this.view);
    this.camPos=eye;
  }
  project(x,y,z){ // 월드 → 화면 픽셀 (CSS px)
    const m=this.vp;const cx=m[0]*x+m[4]*y+m[8]*z+m[12],cy=m[1]*x+m[5]*y+m[9]*z+m[13],cw=m[3]*x+m[7]*y+m[11]*z+m[15];
    if(cw<=.01)return null;
    return [(cx/cw*.5+.5)*this.canvas.clientWidth,(1-(cy/cw*.5+.5))*this.canvas.clientHeight,cw];
  }
  /* o: {e:[r,g,b] 발광, a:알파, add:가산, unlit, floor} */
  draw(mesh,M,c,o){ if(this.ovr){ if(this.ovr.skipGlow&&o&&o.e){} c=this.ovr.c||c; o=this.ovr.o; } this.queue.push({mesh,M,c,o:o||NOOPT}); }
  drawTRS(mesh,x,y,z,rx,ry,rz,sx,sy,sz,c,o){ const M=m4.trs(this.mat(),x,y,z,rx,ry,rz,sx,sy,sz); this.draw(mesh,M,c,o); }
  light(x,y,z,c,r){ this.lights.push([x,y,z,c[0],c[1],c[2],r]); }
  flush(){
    const gl=this.gl,u=this.u;
    gl.clearColor(this.fogColor[0],this.fogColor[1],this.fogColor[2],1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(u.uVP,false,this.vp);gl.uniform3fv(u.uFogC,this.fogColor);gl.uniform1f(u.uFogD,this.fogDen);
    gl.uniform3fv(u.uL,this.lightDir);gl.uniform3fv(u.uCam,this.camPos);gl.uniform1f(u.uTime,this.time);
    // 가장 가까운 점광원 8개
    const cp=this.camPos;this.lights.sort((a,b)=>((a[0]-cp[0])**2+(a[2]-cp[2])**2)-((b[0]-cp[0])**2+(b[2]-cp[2])**2));
    this.plr.fill(0);
    for(let i=0;i<8&&i<this.lights.length;i++){const L=this.lights[i];this.plp[i*3]=L[0];this.plp[i*3+1]=L[1];this.plp[i*3+2]=L[2];this.plc[i*3]=L[3];this.plc[i*3+1]=L[4];this.plc[i*3+2]=L[5];this.plr[i]=L[6];}
    gl.uniform3fv(u.uPLp,this.plp);gl.uniform3fv(u.uPLc,this.plc);gl.uniform1fv(u.uPLr,this.plr);
    const op=[],tr=[],ad=[];
    for(const q of this.queue){ if(q.o.add)ad.push(q); else if(q.o.a!==undefined&&q.o.a<1)tr.push(q); else op.push(q);}
    gl.disable(gl.BLEND);gl.depthMask(true);
    for(const q of op)this._dc(q);
    gl.enable(gl.BLEND);gl.depthMask(false);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    for(const q of tr)this._dc(q);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
    for(const q of ad)this._dc(q);
    gl.depthMask(true);
    this.queue.length=0;this.poolI=0;this.lights.length=0;
  }
  _dc(q){
    const gl=this.gl,u=this.u,m=this.meshes[q.mesh];if(!m)return;const o=q.o;
    gl.bindBuffer(gl.ARRAY_BUFFER,m.vb);gl.vertexAttribPointer(this.aP,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,m.nb);gl.vertexAttribPointer(this.aN,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.ib);
    gl.uniformMatrix4fv(u.uM,false,q.M);gl.uniform3fv(u.uC,q.c);gl.uniform3fv(u.uE,o.e||ZERO);
    gl.uniform1f(u.uA,o.a===undefined?1:o.a);gl.uniform1f(u.uUnlit,o.unlit||o.add?1:0);gl.uniform1f(u.uFloor,o.floor?1:0);gl.uniform1f(u.uSpec,o.spec!==undefined?o.spec:.12);
    gl.drawElements(gl.TRIANGLES,m.n,gl.UNSIGNED_SHORT,0);
  }
}
const ZERO=new Float32Array([0,0,0]);const NOOPT={};

/* ---------- 기본 도형 ---------- */
function buildPrimitives(R){
  // box (중심), boxT (위쪽 피벗: y 0..-1)
  const box=(oy)=>{const P=[],N=[],I=[];
    const f=[[0,0,1],[0,0,-1],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]];
    f.forEach(n=>{const [nx,ny,nz]=n;const ux=[ny,nz,nx],vx=[nz,nx,ny];const b=P.length/3;
      for(const [s,t] of [[-1,-1],[1,-1],[1,1],[-1,1]]){P.push((nx+ux[0]*s+vx[0]*t)*.5,(ny+ux[1]*s+vx[1]*t)*.5+oy,(nz+ux[2]*s+vx[2]*t)*.5);N.push(nx,ny,nz);}
      I.push(b,b+1,b+2,b,b+2,b+3);});return [P,N,I];};
  R.addMesh('box',...box(0));R.addMesh('boxT',...box(-.5));
  // 원기둥/원뿔 r0(아래) r1(위), y -0.5..0.5
  const cyl=(seg,r0,r1,caps,oy)=>{const P=[],N=[],I=[];const sl=(r0-r1);
    for(let i=0;i<=seg;i++){const a=i/seg*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
      P.push(c*r0,-.5+oy,s*r0,c*r1,.5+oy,s*r1);const nl=Math.hypot(1,sl);N.push(c/nl,sl/nl,s/nl,c/nl,sl/nl,s/nl);}
    for(let i=0;i<seg;i++){const b=i*2;I.push(b,b+1,b+3,b,b+3,b+2);}
    if(caps){for(const [y,r,ny] of [[-.5,r0,-1],[.5,r1,1]]){if(r<=0)continue;const c0=P.length/3;P.push(0,y+oy,0);N.push(0,ny,0);
      for(let i=0;i<=seg;i++){const a=i/seg*Math.PI*2;P.push(Math.cos(a)*r,y+oy,Math.sin(a)*r);N.push(0,ny,0);}
      for(let i=0;i<seg;i++)I.push(c0,c0+1+i,c0+2+i);}}
    return [P,N,I];};
  R.addMesh('cyl',...cyl(14,.5,.5,true,0));R.addMesh('cylT',...cyl(10,.5,.5,true,-.5));
  R.addMesh('cone',...cyl(12,.5,0,true,0));R.addMesh('tube',...cyl(20,.5,.5,false,0));
  R.addMesh('limb',...cyl(8,.42,.5,true,-.5));
  R.addMesh('hex',...cyl(6,.5,.5,true,0));
  // sphere
  {const P=[],N=[],I=[];const st=16,sl=24;
   for(let i=0;i<=st;i++){const v=i/st*Math.PI;for(let j=0;j<=sl;j++){const u=j/sl*Math.PI*2;const x=Math.sin(v)*Math.cos(u),y=Math.cos(v),z=Math.sin(v)*Math.sin(u);P.push(x*.5,y*.5,z*.5);N.push(x,y,z);}}
   for(let i=0;i<st;i++)for(let j=0;j<sl;j++){const a=i*(sl+1)+j,b=a+sl+1;I.push(a,b,a+1,b,b+1,a+1);}
   R.addMesh('sphere',P,N,I);}
  // 캡슐: 가로 반지름 .5, y 0 → -1 (위 피벗), 끝 둥근 부분 높이 .16 — 둥근 팔다리
  {const P=[],N=[],I=[];const sl=14,hs=4,r=.5,ch=.16;const ring=[];
   for(let i=0;i<=hs;i++){const a=Math.PI/2*i/hs;ring.push([Math.sin(a)*r,-ch+Math.cos(a)*ch,Math.cos(a)]);}
   for(let i=hs;i>=0;i--){const a=Math.PI/2*i/hs;ring.push([Math.sin(a)*r,-1+ch-Math.cos(a)*ch,-Math.cos(a)]);}
   for(const q of ring){const nr=Math.sqrt(Math.max(0,1-q[2]*q[2]));
     for(let j=0;j<=sl;j++){const u=j/sl*Math.PI*2,c=Math.cos(u),sn=Math.sin(u);P.push(c*q[0],q[1],sn*q[0]);N.push(c*nr,q[2],sn*nr);}}
   for(let k=0;k<ring.length-1;k++)for(let j=0;j<sl;j++){const a=k*(sl+1)+j,b=a+sl+1;I.push(a,b,a+1,b,b+1,a+1);}
   R.addMesh('capsT',P,N,I);}
  // 테이퍼 상자 (아래 폭 = 위 폭 × k), 중심 기준 y -.5..5
  const taper=(k,kz)=>{const P=[],N=[],I=[];const t=.5,bx=.5*k,bz=.5*(kz||k);
    const v=[[-t,.5,-t],[t,.5,-t],[t,.5,t],[-t,.5,t],[-bx,-.5,-bz],[bx,-.5,-bz],[bx,-.5,bz],[-bx,-.5,bz]];
    const faces=[[3,2,6,7],[1,0,4,5],[2,1,5,6],[0,3,7,4],[0,1,2,3],[7,6,5,4]];
    for(const f of faces){const a=v[f[0]],b=v[f[1]],c=v[f[2]];const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],wx=c[0]-a[0],wy=c[1]-a[1],wz=c[2]-a[2];
      let nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;const o=P.length/3;
      for(const i of f){P.push(...v[i]);N.push(nx,ny,nz);} I.push(o,o+1,o+2,o,o+2,o+3);}
    return [P,N,I];};
  R.addMesh('taper',...taper(.72,.85));   // 가슴·골반 (아래가 좁음)
  R.addMesh('taperW',...taper(1.25,1.1)); // 아래가 넓음 (치마·망토)
  R.addMesh('boot',...taper(.9,1.3));
  // 머리카락 가닥: 위 피벗, 끝이 뾰족한 얇은 판
  {const P=[0-.5,0,.0, .5,0,0, .08,-1,.04, -.08,-1,.04, -.5,0,-.08, .5,0,-.08, .08,-1,-.02, -.08,-1,-.02];
   const I=[0,1,2,0,2,3, 5,4,7,5,7,6, 0,3,7,0,7,4, 1,5,6,1,6,2, 0,4,5,0,5,1];
   const N=[0,.1,1, 0,.1,1, 0,.1,1, 0,.1,1, 0,.1,-1, 0,.1,-1, 0,.1,-1, 0,.1,-1];R.addMesh('strand',P,N,I);}
  R.addMesh('limbS',...cyl(12,.4,.5,true,-.5));
  // 평면 도형 (XZ, 법선 +Y)
  const flat=(fn)=>{const P=[],N=[],I=[];fn(P,I);for(let i=0;i<P.length/3;i++)N.push(0,1,0);return [P,N,I];};
  const annulus=(ri,ro,a0,a1,seg)=>flat((P,I)=>{for(let i=0;i<=seg;i++){const a=a0+(a1-a0)*i/seg,c=Math.cos(a),s=Math.sin(a);P.push(c*ri,0,s*ri,c*ro,0,s*ro);}
    for(let i=0;i<seg;i++){const b=i*2;I.push(b,b+1,b+3,b,b+3,b+2);}});
  R.addMesh('ring',...annulus(.86,1,0,Math.PI*2,40));
  R.addMesh('ringThin',...annulus(.95,1,0,Math.PI*2,48));
  R.addMesh('arc',...annulus(.55,1,-1.25,1.25,22));   // 베기 궤적
  R.addMesh('arcW',...annulus(.5,1,-1.7,1.7,26));
  R.addMesh('disc',...flat((P,I)=>{P.push(0,0,0);for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;P.push(Math.cos(a),0,Math.sin(a));}for(let i=0;i<40;i++)I.push(0,i+1,i+2);}));
  R.addMesh('quad',...flat((P,I)=>{P.push(-.5,0,-.5,.5,0,-.5,.5,0,.5,-.5,0,.5);I.push(0,1,2,0,2,3);}));
  R.addMesh('sector',...flat((P,I)=>{P.push(0,0,0);for(let i=0;i<=20;i++){const a=-.6+1.2*i/20;P.push(Math.cos(a),0,Math.sin(a));}for(let i=0;i<20;i++)I.push(0,i+1,i+2);}));
  // 룬 문자(십자+고리) 대용: 마름모 판
  R.addMesh('diamond',...flat((P,I)=>{P.push(0,0,-1,.55,0,0,0,0,1,-.55,0,0);I.push(0,1,2,0,2,3);}));
  // 칼날 (얇은 쐐기)
  {const P=[0,0,.04, 0,1,0, .09,.1,0, 0,0,-.04, -.09,.1,0];const I=[0,1,2,3,1,2,0,1,4,3,1,4,0,2,3,0,4,3];
   const N=[0,0,1,0,0,1,1,0,0,0,0,-1,-1,0,0];R.addMesh('blade',P,N,I);}
}
XF.Renderer=Renderer;

/* ---------- 계층 노드 (캐릭터 리그) ---------- */
class Node{
  constructor(mesh,color,o){this.mesh=mesh;this.c=color;this.o=o||{};this.p=[0,0,0];this.r=[0,0,0];this.s=[1,1,1];this.kids=[];this.vis=true;this.M=m4.create();}
  add(n){this.kids.push(n);return n;}
  at(x,y,z){this.p=[x,y,z];return this;} d(){this.detail=1;return this;} sc(x,y,z){this.s=[x,y,z];return this;} rot(x,y,z){this.r=[x,y,z];return this;}
  render(R,parent){
    if(!this.vis||(this.detail&&R.lowDetail))return;
    const gs=this.mesh?1:0;const L=m4.trs(R.mat(),this.p[0],this.p[1],this.p[2],this.r[0],this.r[1],this.r[2],gs?1:this.s[0],gs?1:this.s[1],gs?1:this.s[2]);
    const W=parent?m4.mul(R.mat(),parent,L):L;
    if(this.mesh){const S=m4.mul(R.mat(),W,m4.trs(R.mat(),0,0,0,0,0,0,this.s[0],this.s[1],this.s[2]));R.draw(this.mesh,S,this.c,this.o);this.M.set(S);}
    else this.M.set(W);
    for(const k of this.kids)k.render(R,W);
  }
}
XF.Node=Node;
})();
