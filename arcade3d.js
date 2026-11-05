/* Marble Summit Phase 3: dependency-free WebGL arcade presentation.
   Gameplay still belongs exclusively to the approved Phase 2.1 engine.
   The renderer never changes a move, die roll, board position or saved match. */
(() => {
'use strict';
const bridge = window.MarbleSummitView, board = window.MARBLE_BOARD;
const canvas = document.getElementById('arcadeCanvas'), softCanvas = document.getElementById('softwareCanvas'), overlay = document.getElementById('arcadeLabels');
const $ = id => document.getElementById(id);
if (!bridge || !board || !canvas || !softCanvas || !overlay) return;
let gl=null, startupError='';
// Retry standard and compatibility WebGL contexts before selecting the CPU renderer.
for(const kind of ['webgl','experimental-webgl','webgl2']){
 try {gl=canvas.getContext(kind,{alpha:false,antialias:true,depth:true,powerPreference:'default'});if(gl)break;}
 catch(err){startupError=String(err?.message||err);}
}
const ctx = overlay.getContext('2d');
const softCtx = softCanvas.getContext('2d', {alpha:false});
const CAM = {yaw:0, elevation:Math.PI*0.32, zoom:1.03, cx:0, cz:0, mode:'angled'};
const model = {vertices:[], version:0};
const rgb = hex => [parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255];
const mix=(a,b,t)=>a.map((v,i)=>v*(1-t)+b[i]*t);
const V=(x,y,z)=>[x,y,z];
const add=(a,b)=>a.map((x,i)=>x+b[i]), sub=(a,b)=>a.map((x,i)=>x-b[i]);
const mul=(a,k)=>a.map(x=>x*k), dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>V(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]);
const norm=a=>mul(a,1/(Math.hypot(...a)||1));
const clamp=(a,l,h)=>Math.min(h,Math.max(l,a));
const position = id => {const n=board.nodes[id];return [ (n.x-590)/100, (n.y-628)/100 ];};
const wpos = (id,y=.64) => {const p=position(id);return [p[0],y,p[1]];};
const ccol=(name)=>rgb(bridge.colors()[name]||'#ffffff');
// GLSL ES 1.00 requires a uniform (and each varying) to use compatible float precision
// in both shader stages. Fragment defaults to mediump; match it explicitly here.
const GL_VERTEX = `precision mediump float;
attribute vec3 aP; attribute vec3 aN; attribute vec3 aC; attribute float aE;
uniform vec3 uRight,uUp,uEye,uFocus,uTranslate,uTint;uniform vec2 uHalf;
varying vec3 vN,vC,vP;varying float vE;
void main(){vec3 p=aP+uTranslate;vec3 d=p-uFocus;
 gl_Position=vec4(dot(d,uRight)/uHalf.x,dot(d,uUp)/uHalf.y,-dot(d,uEye)/18.0,1.0);
 vN=aN;vC=aC*uTint;vP=p;vE=aE;}`;
const GL_FRAGMENT = `precision mediump float;varying vec3 vN,vC,vP;varying float vE;
uniform vec3 uEye;
void main(){vec3 n=normalize(vN);vec3 l=normalize(vec3(-0.52,1.0,0.68));
 float diff=max(0.0,dot(n,l));vec3 v=normalize(uEye*18.0-vP);
 float spec=pow(max(dot(reflect(-l,n),v),0.0),36.0);
 vec3 color=vC*(0.52+0.53*diff)+vec3(1.0,0.93,0.85)*spec*0.47+vC*vE;
 gl_FragColor=vec4(min(color,vec3(1.0)),1.0);}`;
function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
let program,attrib,uniform,staticBuffer,sphereBuffer,staticCount=0,sphereCount=0;
if(gl){try{
 program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,GL_VERTEX));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,GL_FRAGMENT));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 attrib={p:gl.getAttribLocation(program,'aP'),n:gl.getAttribLocation(program,'aN'),c:gl.getAttribLocation(program,'aC'),e:gl.getAttribLocation(program,'aE')};
 uniform=Object.fromEntries(['uRight','uUp','uEye','uFocus','uTranslate','uTint','uHalf'].map(n=>[n,gl.getUniformLocation(program,n)]));
 staticBuffer=gl.createBuffer();sphereBuffer=gl.createBuffer();
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
}catch(e){console.warn('Marble Summit WebGL init:',e);startupError=String(e?.message||e);program=null;}}
const useSoftware=!(gl&&program&&ctx)&&!!(softCtx&&ctx);
const inputCanvas=useSoftware?softCanvas:canvas;
class Mesh {
 constructor(){this.v=[];}
 tri(a,b,c,color,em=0){let n=norm(cross(sub(b,a),sub(c,a)));if(Math.abs(a[1]-b[1])<.000001&&Math.abs(a[1]-c[1])<.000001&&n[1]<0)n=mul(n,-1);for(const p of [a,b,c])this.v.push(...p,...n,...color,em);}
 quad(a,b,c,d,color,em=0){this.tri(a,b,c,color,em);this.tri(a,c,d,color,em);}
 disk(x,z,y,r,color,em=0,segments=20){const center=V(x,y,z);for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments;const p=V(x+Math.cos(a)*r,y,z+Math.sin(a)*r),q=V(x+Math.cos(b)*r,y,z+Math.sin(b)*r);this.tri(center,p,q,color,em);}}
 ring(x,z,y,r,thick,color,em=0,segments=24){const top=y+thick*.2;for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments;const radial=t=>V(x+Math.cos(t)*r,top,z+Math.sin(t)*r);const inner=t=>V(x+Math.cos(t)*(r-thick),top,z+Math.sin(t)*(r-thick));this.quad(radial(a),radial(b),inner(b),inner(a),color,em);}}
 polygonPrism(poly,top,bottom,face,side){const center=V(poly.reduce((s,p)=>s+p[0],0)/poly.length,top,poly.reduce((s,p)=>s+p[1],0)/poly.length);
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];this.tri(center,V(a[0],top,a[1]),V(b[0],top,b[1]),face);this.quad(V(a[0],top,a[1]),V(b[0],top,b[1]),V(b[0],bottom,b[1]),V(a[0],bottom,a[1]),side);}}
 path(a,b,y,width,color,em=0){const d=sub(b,a);const len=Math.hypot(d[0],d[2]);if(len<.005)return;const v=width/2,dx=-d[2]/len*v,dz=d[0]/len*v;
 this.quad(V(a[0]+dx,y,a[2]+dz),V(b[0]+dx,y,b[2]+dz),V(b[0]-dx,y,b[2]-dz),V(a[0]-dx,y,a[2]-dz),color,em);}
 sphere(radius,lat=13,lon=20){for(let j=0;j<lat;j++){const t=j/lat*Math.PI,tn=(j+1)/lat*Math.PI;for(let i=0;i<lon;i++){const p=i/lon*2*Math.PI,pn=(i+1)/lon*2*Math.PI;
 const v=(a,b)=>V(Math.sin(a)*Math.cos(b)*radius,Math.cos(a)*radius,Math.sin(a)*Math.sin(b)*radius);
 this.tri(v(t,p),v(tn,pn),v(tn,p),[1,1,1]);this.tri(v(t,p),v(t,pn),v(tn,pn),[1,1,1]);}}}
}
function createStatic(){if(!gl||!program)return;
 const m=new Mesh(), black=rgb('#071320'), base=rgb('#0a1524');
 const hex=[[590,101],[1046.4,364.5],[1046.4,891.5],[590,1155],[133.6,891.5],[133.6,364.5]].map(([x,y])=>[(x-590)/100,(y-628)/100]);
 m.polygonPrism(hex,.27,-.30,rgb('#121f31'),rgb('#152c47'));
 // Tall bevel edge and six color-tinted sectors, but keep the playable surface dark.
 for(let i=0;i<6;i++){const a=hex[i],b=hex[(i+1)%6],tint=ccol(board.players[i].name);let face=mix(base,tint,.105);
 const prev=hex[(i+5)%6],left=[(prev[0]+a[0])/2,(prev[1]+a[1])/2],right=[(a[0]+b[0])/2,(a[1]+b[1])/2];
 m.tri(V(0,.294,0),V(left[0],.294,left[1]),V(a[0],.294,a[1]),face);
 m.tri(V(0,.294,0),V(a[0],.294,a[1]),V(right[0],.294,right[1]),face);
 m.path(V(a[0],.35,a[1]),V(b[0],.35,b[1]),.35,.055,mix(tint,[.65,.85,1],.30),.35);
 m.path(V(a[0],-.11,a[1]),V(b[0],-.11,b[1]),-.11,.035,tint,.15);
 }
 // Six exterior BASE platforms; the coordinates remain exactly those in Phase 2.1.
 for(const p of board.players){const pts=p.base.map(position),avg=[pts.reduce((s,v)=>s+v[0],0)/4,pts.reduce((s,v)=>s+v[1],0)/4];
 let rad=Math.max(...pts.map(v=>Math.hypot(v[0]-avg[0],v[1]-avg[1])))+.27;
 m.disk(avg[0],avg[1],.265,rad,mix(rgb('#132639'),ccol(p.name),.17));
 m.ring(avg[0],avg[1],.295,rad,.075,ccol(p.name),.20);
 }
 // Inlaid route channels: dark rails plus narrow luminous core, over the board face.
 function rail(a,b,color,thickness=.046){let from=wpos(a,.372),to=wpos(b,.372);m.path(from,to,.372,thickness*3,mix(black,color,.33),.10);m.path(from,to,.384,thickness,color,.46);}
 for(const p of board.players){const ids=p.outer_path_sector;const color=ccol(p.name);for(let i=0;i<ids.length;i++)rail(ids[i],i+1<ids.length?ids[i+1]:board.nodes[ids[i]].main_next,color,.052);
 rail(p.home_entry,p.home[0],color,.053);for(let j=0;j<3;j++)rail(p.home[j],p.home[j+1],color,.053);
 // Dotted launch path does not count as track movement.
 const start=position(p.start),pts=p.base.map(position),avg=[pts.reduce((s,v)=>s+v[0],0)/4,pts.reduce((s,v)=>s+v[1],0)/4];
 for(let k=1;k<=6;k+=2){const t=k/8, t1=(k+1)/8;const x=avg[0]*(1-t)+start[0]*t,z=avg[1]*(1-t)+start[1]*t,x1=avg[0]*(1-t1)+start[0]*t1,z1=avg[1]*(1-t1)+start[1]*t1;m.path([x,.366,z],[x1,.366,z1],.366,.030,color,.22);}
 }
 let ring=board.geometry.star_ring_clockwise;
 for(let i=0;i<ring.length;i++)rail(ring[i],ring[(i+1)%ring.length],rgb('#53eaff'),.064);
 for(const star of ring){const a=wpos(star,.372),b=wpos('CENTER',.372);m.path(a,b,.372,.027,rgb('#a78fff'),.26);}
 // Recessed socket interiors, metallic lips and glowing player-specific borders.
 for(const [id,n] of Object.entries(board.nodes)){
 const [x,z]=position(id);const star=n.type==='star',center=n.type==='center';const sp=!!n.special;const r=center?.258:star?.198:sp?.182:.160;
 const own=n.owner?ccol(n.owner):rgb('#5989aa');let rim=star?rgb('#5cf1ff'):center?rgb('#d0a8ff'):own;
 if(n.type==='track'&&!n.special)rim=rgb('#44637d');
 if(n.special==='start')rim=rgb('#79ffc1');
 if(n.special==='home_entry')rim=rgb('#ffce80');
 m.disk(x,z,.398,r+.042,rgb('#030915'));
 m.disk(x,z,.407,r-.012,center?rgb('#2b2250'):star?rgb('#17324b'):rgb('#06101e'));
 m.ring(x,z,.431,r+.042,.047,rim,star||sp||center?.62:.17);
 m.ring(x,z,.426,r-.015,.020,mix(rim,black,.42),.12);
 if(center||star)m.disk(x,z,.413,star?.048:.068,rim,.36);
 }
 // Arcade pedestal accents under the board.
 for(const [i,p] of board.players.entries()){
 const v=hex[i],b=hex[(i+1)%6],c=ccol(p.name);m.path(V(v[0],-.31,v[1]),V(b[0],-.31,b[1]),-.31,.071,c,.30);
 }
 const data=new Float32Array(m.v);gl.bindBuffer(gl.ARRAY_BUFFER,staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);staticCount=data.length/10;
 model.version++;
}
function makeSphere(){const m=new Mesh();m.sphere(.183,15,22);const data=new Float32Array(m.v);gl.bindBuffer(gl.ARRAY_BUFFER,sphereBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);sphereCount=data.length/10;}
function bindBuffer(buffer){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);const stride=40;
 for(const [loc,n,offset] of [[attrib.p,3,0],[attrib.n,3,12],[attrib.c,3,24],[attrib.e,1,36]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,n,gl.FLOAT,false,stride,offset);}}
function camBasis(){const [yaw,elev]=[CAM.yaw,CAM.elevation];const eye=norm(V(Math.sin(yaw)*Math.cos(elev),Math.sin(elev),Math.cos(yaw)*Math.cos(elev)));
 const right=norm(cross(V(0,1,0),eye)),up=norm(cross(eye,right));const aspect=Math.max(1,viewW)/Math.max(1,viewH);
 const halfH=Math.max(6.90,7.8/aspect)/CAM.zoom;return {eye,right,up,halfH,halfW:halfH*aspect,focus:V(CAM.cx,0,CAM.cz)};}
let basis=null,viewW=0,viewH=0;
function project(p){if(!basis)return {x:-999,y:-999};const d=sub(p,basis.focus);return{x:(.5+dot(d,basis.right)/(2*basis.halfW))*viewW,y:(.5-dot(d,basis.up)/(2*basis.halfH))*viewH};}
function resize(){const r=inputCanvas.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));viewW=w;viewH=h;
 if(useSoftware){if(softCanvas.width!==w||softCanvas.height!==h){softCanvas.width=w;softCanvas.height=h;}}
 else {const ratio=Math.min(window.devicePixelRatio||1,1.5),dw=Math.floor(w*ratio),dh=Math.floor(h*ratio);
 if(canvas.width!==dw||canvas.height!==dh){canvas.width=dw;canvas.height=dh;gl.viewport(0,0,dw,dh);}}
 if(overlay.width!==w||overlay.height!==h){overlay.width=w;overlay.height=h;}}
function drawMesh(buffer,count,translate=[0,0,0],tint=[1,1,1]){bindBuffer(buffer);gl.uniform3fv(uniform.uTranslate,translate);gl.uniform3fv(uniform.uTint,tint);gl.drawArrays(gl.TRIANGLES,0,count);}
function marblePosition(m,t){const n=board.nodes[m.location];if(!n)return V(0,.64,0);
 if(anim && anim.marbleId===m.id){const dt=(t-anim.start)/anim.duration;if(dt<1){const steps=[anim.from,...anim.path];const q=clamp(dt,0,1)*(steps.length-1),i=Math.min(steps.length-2,Math.floor(q)),f=q-i;
 const a=wpos(steps[i]),b=wpos(steps[i+1]);return V(a[0]+(b[0]-a[0])*f,.64+Math.sin(f*Math.PI)*.10,b[2]*f+a[2]*(1-f));}}
 if(anim?.captureMarble===m.id){const dt=(t-anim.start-anim.duration*.72)/Math.max(1,anim.duration*.45);if(dt>=0&&dt<=1){const a=wpos(anim.captureFrom),b=wpos(m.location);const f=clamp(dt,0,1);return V(a[0]+(b[0]-a[0])*f,.64+Math.sin(f*Math.PI)*1.2,a[2]+(b[2]-a[2])*f);}}
 return wpos(m.location);
}
let anim=null,lastShot=null,lastPalette='',hover=null,drag=null,lastRoll=0,lastClock=0,ctx2dReady=false;
function setup2D(){if(!ctx)return;ctx.textAlign='center';ctx.textBaseline='middle';}
function pill(x,y,text,bg='#10253f',fg='#f4f9ff',r=13){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=bg;ctx.shadowColor=bg;ctx.shadowBlur=7;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#f5fcff';ctx.lineWidth=1.6;ctx.stroke();ctx.font='900 13px ui-sans-serif,system-ui,sans-serif';ctx.fillStyle=fg;ctx.fillText(text,x,y+1);}
function drawLabels(t){if(!ctx)return;ctx.clearRect(0,0,viewW,viewH);const shot=bridge.snapshot();const moves=bridge.moves();const selected=bridge.selected();const colors=bridge.colors();
 // Special identification never relies on color alone.
 for(const p of board.players){const tag=position(p.start),entry=position(p.home_entry);const s=project([tag[0],.59,tag[1]]),h=project([entry[0],.59,entry[1]]);if(s.x>0&&s.x<viewW&&s.y>0&&s.y<viewH)pill(s.x,s.y,'S','#096345','#fff',9);
 if(h.x>0&&h.x<viewW&&h.y>0&&h.y<viewH)pill(h.x,h.y,'H','#895229','#fff',9);
 const pts=p.base.map(position),avg=[pts.reduce((v,q)=>v+q[0],0)/4,pts.reduce((v,q)=>v+q[1],0)/4];const b=project([avg[0],.16,avg[1]]);ctx.font='800 10px ui-sans-serif,system-ui';ctx.fillStyle=colors[p.name];ctx.fillText(p.name,b.x,b.y+37);
 }
 const hovered=hover?.type==='route'&&moves.find(m=>m.id===hover.id);
 const inSidebar=bridge.preview?.()&&moves.find(m=>m.id===bridge.preview());
 const preview=hovered||inSidebar;
 if(preview && !bridge.busy()){
  ctx.strokeStyle='#dbffff';ctx.lineWidth=3.5;ctx.shadowColor='#5bedff';ctx.shadowBlur=9;
  ctx.setLineDash([7,5]);ctx.beginPath();
  [preview.from,...preview.path].forEach((id,i)=>{let p=project(wpos(id,.79));if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});ctx.stroke();ctx.setLineDash([]);ctx.shadowBlur=0;
 }
 for(const star of board.geometry.star_ring_clockwise){const p=project(wpos(star,.58));if(p.x<0||p.x>viewW||p.y<0||p.y>viewH)continue;ctx.font='900 14px sans-serif';ctx.shadowColor='#6befff';ctx.shadowBlur=8;ctx.fillStyle='#ecffff';ctx.fillText('✦',p.x,p.y);ctx.shadowBlur=0;}
 {const p=project(wpos('CENTER',.60));ctx.font='900 20px sans-serif';ctx.shadowBlur=8;ctx.shadowColor='#a58bff';ctx.fillStyle='#e4d5ff';ctx.fillText('✦',p.x,p.y);ctx.shadowBlur=0;}
 if(shot?.phase==='await-move'&&!bridge.busy()){
 const movable=new Set(moves.map(m=>m.marbleId));for(const m of shot.marbles){if(!movable.has(m.id))continue;const p=project(wpos(m.location,.68));ctx.beginPath();ctx.arc(p.x,p.y,15,0,Math.PI*2);ctx.strokeStyle=m.id===selected?'#ffffff':colors[m.owner];ctx.lineWidth=m.id===selected?4:2;ctx.shadowColor=colors[m.owner];ctx.shadowBlur=12;ctx.stroke();ctx.shadowBlur=0;}
 if(selected){const relevant=moves.filter(m=>m.marbleId===selected),grouped={};for(const r of relevant)(grouped[r.to]||=[]).push(r);
 relevant.forEach((move,i)=>{let pos=project(wpos(move.to,.76));const index=grouped[move.to].indexOf(move);const size=grouped[move.to].length;if(size>1){pos.x+=(index-(size-1)/2)*31;}
 const onHover=hover?.type==='route'&&hover.id===move.id;pill(pos.x,pos.y,String(i+1),move.capture?'#a44c24':'#056e91','#ffffff',onHover?18:15);
 });}
 }
 if(shot?.phase==='finished'){
  const winner=shot.winner;const tint=colors[winner]||'#90efff';const pulse=1+.07*Math.sin(t/240);
  ctx.save();ctx.fillStyle='#061a32de';ctx.strokeStyle=tint;ctx.lineWidth=2;ctx.fillRect(viewW*.20,viewH*.07,viewW*.6,72*pulse);ctx.strokeRect(viewW*.20,viewH*.07,viewW*.6,72*pulse);
  ctx.font=`900 ${Math.round(21*pulse)}px system-ui`;ctx.fillStyle='#fff';ctx.shadowColor=tint;ctx.shadowBlur=12;ctx.fillText('★ '+winner+' WINS THE SUMMIT! ★',viewW/2,viewH*.07+35*pulse);ctx.restore();
 }
 if(anim?.captureMarble){const frac=(t-anim.start)/anim.duration;if(frac>.65&&frac<1.6){const p=project(wpos(anim.captureFrom,.9));ctx.font='950 21px system-ui';ctx.fillStyle='#ffdb94';ctx.strokeStyle='#311621';ctx.lineWidth=4;ctx.strokeText('KNOCKOUT!',p.x,p.y-32);ctx.fillText('KNOCKOUT!',p.x,p.y-32);}}
}

// CPU-based perspective renderer for managed school browsers without WebGL.
// This uses the SAME board positions and camera projection, never separate game logic.
const SW_HEX=[[590,101],[1046.4,364.5],[1046.4,891.5],[590,1155],[133.6,891.5],[133.6,364.5]].map(([x,z])=>[(x-590)/100,(z-628)/100]);
function swPath(points){softCtx.beginPath();points.forEach((v,i)=>{const p=project(v);i?softCtx.lineTo(p.x,p.y):softCtx.moveTo(p.x,p.y);});softCtx.closePath();}
function swDisc(x,z,y,r){const pp=[];for(let i=0;i<24;i++){let a=i/24*Math.PI*2;pp.push(V(x+Math.cos(a)*r,y,z+Math.sin(a)*r));}swPath(pp);}
function swColor(owner){return bridge.colors()[owner]||'#8ce7ff';}
function swRail(id1,id2,color,width=2.0){const a=project(wpos(id1,.37)),b=project(wpos(id2,.37));softCtx.beginPath();softCtx.moveTo(a.x,a.y);softCtx.lineTo(b.x,b.y);softCtx.strokeStyle=color;softCtx.lineWidth=width;softCtx.globalAlpha=.90;softCtx.shadowColor=color;softCtx.shadowBlur=7;softCtx.stroke();softCtx.shadowBlur=0;softCtx.globalAlpha=1;}
function drawSoftware(t){const s=softCtx,w=viewW,h=viewH;
 const bg=s.createRadialGradient(w*.50,h*.40,10,w*.5,h*.5,Math.max(w,h)*.68);
 bg.addColorStop(0,'#25405c');bg.addColorStop(.60,'#101c2e');bg.addColorStop(1,'#030815');s.fillStyle=bg;s.fillRect(0,0,w,h);
 const eye=basis.eye;
 // Render thickness around the board in depth order before the playing surface.
 const faces=SW_HEX.map((a,i)=>{const b=SW_HEX[(i+1)%6];return {a,b,depth:dot(V((a[0]+b[0])/2,0,(a[1]+b[1])/2),eye),i};}).sort((a,b)=>a.depth-b.depth);
 for(const f of faces){swPath([V(f.a[0],-.3,f.a[1]),V(f.b[0],-.3,f.b[1]),V(f.b[0],.29,f.b[1]),V(f.a[0],.29,f.a[1])]);s.fillStyle='#152c44';s.fill();s.strokeStyle=swColor(board.players[f.i].name);s.globalAlpha=.7;s.lineWidth=1.3;s.stroke();s.globalAlpha=1;}
 swPath(SW_HEX.map(v=>V(v[0],.29,v[1])));s.fillStyle='#0d1d30';s.fill();s.strokeStyle='#78b4d3';s.lineWidth=2.5;s.shadowColor='#2d87ae';s.shadowBlur=8;s.stroke();s.shadowBlur=0;
 for(let i=0;i<6;i++){const a=SW_HEX[i],prev=SW_HEX[(i+5)%6],b=SW_HEX[(i+1)%6],left=[(a[0]+prev[0])/2,(a[1]+prev[1])/2],right=[(a[0]+b[0])/2,(a[1]+b[1])/2];
 swPath([V(0,.297,0),V(left[0],.297,left[1]),V(a[0],.297,a[1]),V(right[0],.297,right[1])]);s.globalAlpha=.10;s.fillStyle=swColor(board.players[i].name);s.fill();s.globalAlpha=1;}
 // Bases outside the hexagon, two marbles to either side of each corner.
 for(const player of board.players){let pts=player.base.map(position);let cx=pts.reduce((a,p)=>a+p[0],0)/4,cz=pts.reduce((a,p)=>a+p[1],0)/4;
 const rad=Math.max(...pts.map(p=>Math.hypot(p[0]-cx,p[1]-cz)))+.28;
 swDisc(cx,cz,.30,rad);s.fillStyle='#15283c';s.fill();s.strokeStyle=swColor(player.name);s.lineWidth=2.8;s.shadowColor=swColor(player.name);s.shadowBlur=8;s.stroke();s.shadowBlur=0;}
 for(const player of board.players){const col=swColor(player.name),path=player.outer_path_sector;
 for(let i=0;i<path.length;i++)swRail(path[i],i+1<path.length?path[i+1]:board.nodes[path[i]].main_next,col,2.3);
 swRail(player.home_entry,player.home[0],col,2.7);for(let j=0;j<3;j++)swRail(player.home[j],player.home[j+1],col,2.7);}
 const stars=board.geometry.star_ring_clockwise;
 for(let i=0;i<stars.length;i++)swRail(stars[i],stars[(i+1)%stars.length],'#67efff',3.0);
 for(const star of stars)swRail(star,'CENTER','#8a77de',1.0);
 // Recessed holes and glowing rims share the exact positions with gameplay.
 const sockets=Object.entries(board.nodes).map(([id,n])=>({id,n,dist:dot(wpos(id,.4),eye)})).sort((a,b)=>a.dist-b.dist);
 for(const {id,n} of sockets){const [x,z]=position(id),star=n.type==='star',center=n.type==='center',special=n.special;
 const r=center?.255:star?.19:special?.18:.16;
 let rim=star?'#70f4ff':center?'#d4adff':special==='start'?'#75ffc4':special==='home_entry'?'#ffce7f':n.owner?swColor(n.owner):'#69849c';
 if(n.type==='track'&&!special)rim='#587b98';
 swDisc(x,z,.435,r+.038);s.fillStyle='#020914';s.fill();s.strokeStyle=rim;s.lineWidth=2.0;s.globalAlpha=star||center||special?1:.76;s.shadowColor=rim;s.shadowBlur=star||center||special?8:3;s.stroke();s.shadowBlur=0;s.globalAlpha=1;
 swDisc(x,z,.44,r-.018);s.fillStyle=center?'#32224c':star?'#16384b':'#06111f';s.fill();}
 const shot=bridge.snapshot();if(shot){const ordered=[...shot.marbles].sort((a,b)=>dot(marblePosition(a,t),eye)-dot(marblePosition(b,t),eye));
 for(const marble of ordered){const pos=marblePosition(marble,t),screen=project(pos);
 const a=project(add(pos,V(.18,0,0))),b=project(add(pos,V(0,.18,0))),rad=Math.max(4,Math.hypot(a.x-screen.x,a.y-screen.y),Math.hypot(b.x-screen.x,b.y-screen.y));
 const shadow=project(V(pos[0],.44,pos[2]));s.beginPath();s.ellipse(shadow.x+2,shadow.y+2,rad*1.05,rad*.52,0,0,Math.PI*2);s.fillStyle='#020814b8';s.fill();
 const c=swColor(marble.owner);const g=s.createRadialGradient(screen.x-rad*.3,screen.y-rad*.4,1,screen.x,screen.y,rad*1.2);
 g.addColorStop(0,'#ffffff');g.addColorStop(.16,c);g.addColorStop(.62,c);g.addColorStop(1,'#101725');s.beginPath();s.arc(screen.x,screen.y,rad,0,Math.PI*2);s.fillStyle=g;s.shadowColor=c;s.shadowBlur=4;s.fill();s.shadowBlur=0;s.strokeStyle='#e7f4ff';s.lineWidth=.8;s.stroke();}
 }
}

function render(t){if(anim&&t>=anim.start+anim.duration*1.3){const done=anim.done;anim=null;done?.();}
 if(anim && !document.hidden && window.Marble3D?.active && anim.path.length && t<anim.start+anim.duration){
  const progress=clamp((t-anim.start)/anim.duration,0,.999999);
  const hop=Math.floor(progress*anim.path.length);
  if(hop!==anim.lastClopStep){anim.lastClopStep=hop;coconutClop(hop);}
 }
 if(!window.Marble3D?.active||document.hidden){requestAnimationFrame(render);return;}
 if(useSoftware&&t-lastClock<32){requestAnimationFrame(render);return;}lastClock=t;
 const palette=Object.values(bridge.colors()).join(';');
 if(!useSoftware && palette!==lastPalette){lastPalette=palette;createStatic();}
 resize();basis=camBasis();lastShot=bridge.snapshot();
 if(useSoftware){drawSoftware(t);}else{
 gl.clearColor(.025,.057,.106,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
 gl.uniform3fv(uniform.uRight,basis.right);gl.uniform3fv(uniform.uUp,basis.up);gl.uniform3fv(uniform.uEye,basis.eye);gl.uniform3fv(uniform.uFocus,basis.focus);gl.uniform2fv(uniform.uHalf,[basis.halfW,basis.halfH]);
 drawMesh(staticBuffer,staticCount);
 if(lastShot){for(const m of lastShot.marbles){let p=marblePosition(m,t),color=ccol(m.owner);
 drawMesh(sphereBuffer,sphereCount,p,color);}}
 }
 drawLabels(t);
 requestAnimationFrame(render);
}
function pick(x,y){const shot=bridge.snapshot();if(!shot||bridge.busy()||shot.phase!=='await-move')return null;
 const moves=bridge.moves(),selected=bridge.selected(),minSize=28;
 if(selected){const relevant=moves.filter(m=>m.marbleId===selected),groups={};for(const r of relevant)(groups[r.to]||=[]).push(r);
 let best=null;for(const move of relevant){let p=project(wpos(move.to,.76));const arr=groups[move.to],idx=arr.indexOf(move);if(arr.length>1)p.x+=(idx-(arr.length-1)/2)*31;
 const dist=Math.hypot(x-p.x,y-p.y);if(dist<minSize&&(!best||dist<best.d))best={type:'route',id:move.id,d:dist};}if(best)return best;}
 const movable=new Set(moves.map(m=>m.marbleId));let result=null;for(const m of shot.marbles){if(!movable.has(m.id))continue;const p=project(wpos(m.location,.67)),d=Math.hypot(x-p.x,y-p.y);if(d<Math.max(22,viewW/60)&&(!result||d<result.d))result={type:'marble',id:m.id,d};}return result;
}
function relativeXY(e){const r=inputCanvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
const pointer = {primary:null, secondary:null};
function wireCanvas(){inputCanvas.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;inputCanvas.setPointerCapture(e.pointerId);const p=relativeXY(e);pointer.primary={id:e.pointerId,x:p.x,y:p.y,startX:p.x,startY:p.y,dragged:false,shift:e.shiftKey};inputCanvas.style.cursor='grabbing';});
 inputCanvas.addEventListener('pointermove',e=>{const p=relativeXY(e);if(pointer.primary?.id===e.pointerId){let a=pointer.primary,dx=p.x-a.x,dy=p.y-a.y;if(Math.hypot(p.x-a.startX,p.y-a.startY)>5)a.dragged=true;
 if(a.dragged){if(a.shift){CAM.cx-=dx/viewW*2*basis.halfW;CAM.cz+=dy/viewH*2*basis.halfH;}else{CAM.yaw=clamp(CAM.yaw+dx*.006,-Math.PI,Math.PI);CAM.elevation=clamp(CAM.elevation+dy*.006,.48,Math.PI/2-.005);}}
 a.x=p.x;a.y=p.y;
 }else{hover=pick(p.x,p.y);inputCanvas.style.cursor=hover?'pointer':'grab';}});
 inputCanvas.addEventListener('pointerup',e=>{const p=relativeXY(e),a=pointer.primary;if(a?.id===e.pointerId){if(!a.dragged){const chosen=pick(p.x,p.y);if(chosen?.type==='marble')bridge.selectMarble(chosen.id);if(chosen?.type==='route')bridge.selectRoute(chosen.id);}pointer.primary=null;}inputCanvas.style.cursor='grab';});
 inputCanvas.addEventListener('pointercancel',()=>{pointer.primary=null;inputCanvas.style.cursor='grab';});
 inputCanvas.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?.90:1.10);},{passive:false});
 // Touch pinch uses native pointer events; primary pointer drag remains orbital.
 let contacts=new Map(),lastDistance=0;
 inputCanvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;contacts.set(e.pointerId,relativeXY(e));if(contacts.size===2){pointer.primary=null;lastDistance=0;}});
 inputCanvas.addEventListener('pointermove',e=>{if(!contacts.has(e.pointerId))return;contacts.set(e.pointerId,relativeXY(e));if(contacts.size===2){const pts=[...contacts.values()],d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(lastDistance)zoom(d/lastDistance);lastDistance=d;}});
 const end=e=>{contacts.delete(e.pointerId);if(contacts.size<2)lastDistance=0;};inputCanvas.addEventListener('pointerup',end);inputCanvas.addEventListener('pointercancel',end);
}
function zoom(mult){CAM.zoom=clamp(CAM.zoom*mult,.67,2.8);}
function home(){CAM.yaw=0;CAM.elevation=Math.PI*.32;CAM.zoom=1.03;CAM.cx=CAM.cz=0;CAM.mode='angled';updateControls();}
function overhead(){CAM.elevation=Math.PI/2-.005;CAM.yaw=0;CAM.cx=CAM.cz=0;CAM.mode='overhead';updateControls();}
function updateControls(){const b=$('cameraTop');if(b)b.setAttribute('aria-pressed',String(CAM.mode==='overhead'));const a=$('cameraAngle');if(a)a.setAttribute('aria-pressed',String(CAM.mode==='angled'));}
function animateMove(previous,chosen,event,done){if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){done();return;}
 const captured=event.capture?.marbleId||event.capture?.id;
 anim={from:chosen.from,path:chosen.path,marbleId:chosen.marbleId,captureMarble:captured||null,captureFrom:chosen.to,start:performance.now(),duration:Math.max(650,Math.min(1800,chosen.path.length*150)),lastClopStep:-1,done};
 // Movement clops are triggered by actual travel between holes in render(), not a loose sound timer.
 if(event.capture)setTimeout(()=>sound('capture'),Math.max(220,anim.duration*.72));if(event.bonusRoll)sound('bonus');if(bridge.snapshot()?.phase==='finished')setTimeout(()=>sound('win'),anim.duration);
}
let audioOn=false,audio=null,coconutNoise=null,diceRollSerial=0,dieAngles={x:-15,y:-15};
// Original little coconut-shell percussion, synthesized locally: two dry wooden clicks per hop.
// Not sampled from a movie, recording or soundtrack.
function coconutClop(hop=0){
 if(!audioOn)return;
 try{
  audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();
  if(!coconutNoise){
   const length=Math.max(1,Math.floor(audio.sampleRate*.07));coconutNoise=audio.createBuffer(1,length,audio.sampleRate);
   const values=coconutNoise.getChannelData(0);
   for(let i=0;i<length;i++)values[i]=(Math.random()*2-1)*Math.exp(-i/length*8);
  }
  const now=audio.currentTime;
  for(let k=0;k<2;k++){
   const t=now+k*.038;
   const click=audio.createBufferSource();click.buffer=coconutNoise;
   const wood=audio.createBiquadFilter();wood.type='bandpass';wood.frequency.value=(k?620:435)+(hop%3)*25;wood.Q.value=.85;
   const vol=audio.createGain();vol.gain.setValueAtTime(.0001,t);vol.gain.linearRampToValueAtTime(k?.065:.08,t+.002);
   vol.gain.exponentialRampToValueAtTime(.0001,t+.060);
   click.connect(wood).connect(vol).connect(audio.destination);click.start(t);click.stop(t+.065);
   const tone=audio.createOscillator(),toneVol=audio.createGain();tone.type='triangle';
   tone.frequency.setValueAtTime(k?245:185,t);tone.frequency.exponentialRampToValueAtTime(k?155:110,t+.055);
   toneVol.gain.setValueAtTime(.0001,t);toneVol.gain.linearRampToValueAtTime(.025,t+.003);
   toneVol.gain.exponentialRampToValueAtTime(.0001,t+.055);
   tone.connect(toneVol).connect(audio.destination);tone.start(t);tone.stop(t+.059);
  }
 }catch(err){console.warn('Coconut clop audio unavailable:',err);}
}
function playDiceRattle(){
 // Short local Web Audio rattle made from filtered noise; no download and no music.
 if(!audioOn)return;
 try{
  audio ||=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const now=audio.currentTime;
  const length=Math.max(1,Math.floor(audio.sampleRate*.055));const buffer=audio.createBuffer(1,length,audio.sampleRate);const data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
  for(let j=0;j<9;j++){
    const source=audio.createBufferSource();source.buffer=buffer;
    const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=750+j*90;
    const gain=audio.createGain();const t=now+j*.082;gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(.11-j*.009,t+.008);gain.gain.exponentialRampToValueAtTime(.0001,t+.055);
    source.connect(filter).connect(gain).connect(audio.destination);source.start(t);source.stop(t+.056);
  }
  const knock=audio.createOscillator(),kg=audio.createGain();knock.type='triangle';knock.frequency.setValueAtTime(195,now+.77);knock.frequency.exponentialRampToValueAtTime(80,now+.9);kg.gain.setValueAtTime(.0001,now+.77);kg.gain.linearRampToValueAtTime(.085,now+.784);kg.gain.exponentialRampToValueAtTime(.0001,now+.92);knock.connect(kg).connect(audio.destination);knock.start(now+.77);knock.stop(now+.93);
 }catch(err){console.warn('Dice audio unavailable:',err);}
}
function sound(kind,hop=0){
 if(!audioOn)return;if(kind==='roll'){playDiceRattle();return;}if(kind==='clop'){coconutClop(hop);return;}
 try{audio ||=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const now=audio.currentTime;
 const sequences=kind==='capture'?[[340,0,.09],[210,.10,.11],[125,.23,.20]]:kind==='bonus'?[[480,0,.09],[640,.09,.12]]:kind==='win'?[[392,0,.14],[494,.17,.14],[587,.34,.14],[784,.51,.26]]:[[260,0,.045]];
 for(const [f,delay,dur] of sequences){const osc=audio.createOscillator(),gain=audio.createGain();osc.type=kind==='capture'?'triangle':'sine';osc.frequency.setValueAtTime(f,now+delay);gain.gain.setValueAtTime(.0001,now+delay);gain.gain.exponentialRampToValueAtTime(.045,now+delay+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+delay+dur);osc.connect(gain).connect(audio.destination);osc.start(now+delay);osc.stop(now+delay+dur+.02);}}
 catch(err){console.warn('Audio unavailable:',err);}
}
function initDice(){
 const shell=$('diceShell');if(!shell)return;const cube=document.createElement('div');cube.className='arcade-die';cube.id='arcadeDie';
 const pips={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
 // Opposite faces sum to seven: front/back 1/6, right/left 2/5, top/bottom 3/4.
 const faces=[['front',1],['right',2],['back',6],['left',5],['top',3],['bottom',4]];
 faces.forEach(([f,value])=>{const face=document.createElement('div');face.className='die-face face-'+f;face.setAttribute('data-value',String(value));for(let n=0;n<9;n++){const cell=document.createElement('i');if(pips[value].includes(n))cell.className='die-pip';face.appendChild(cell);}cube.appendChild(face);});
 shell.appendChild(cube);rollDice(1,false);
}
function rollDice(n,play=true){
 const cube=$('arcadeDie');if(!cube)return;
 // Each target shows the actual rolled face. Increasing full turns guarantees an animation even for repeated numbers.
 const orientations={1:[-15,-15],2:[-15,-105],3:[75,-15],4:[-105,-15],5:[-15,75],6:[-15,165]};
 const [ax,ay]=orientations[n]||orientations[1];
 if(!play){cube.style.transition='none';dieAngles={x:ax,y:ay};cube.style.transform=`rotateX(${ax}deg) rotateY(${ay}deg)`;void cube.offsetWidth;cube.style.transition='';return;}
 diceRollSerial++;
 const turns=2+diceRollSerial*2;
 dieAngles={x:ax+360*turns,y:ay+360*turns};
 cube.style.transform=`rotateX(${dieAngles.x}deg) rotateY(${dieAngles.y}deg)`;
 sound('roll');
}
const view=window.Marble3D={active:!!((gl&&program&&ctx)||useSoftware),supported:!!((gl&&program&&ctx)||useSoftware),renderer:useSoftware?'software':(gl&&program?'webgl':'none'),startupError,
 sync(){ /* the renderer reads engine state on every frame */ }, zoom, reset:home, overhead, angled:home, animateMove,
 rollDie:rollDice,
 setMode(mode){if(mode==='3d'&&!view.supported)return false;view.active=mode==='3d';document.body.classList.toggle('show-3d',view.active);document.body.classList.toggle('software-3d',useSoftware);$('view3d')?.setAttribute('aria-pressed',String(view.active));$('view2d')?.setAttribute('aria-pressed',String(!view.active));return true;},
 sound(kind){sound(kind);}, get camera(){return {...CAM};},
 boardPoint(id, height=.72){return project(wpos(id,height));},
 moveTargets(){const selected=bridge.selected();const relevant=bridge.moves().filter(m=>m.marbleId===selected),grouped={};for(const m of relevant)(grouped[m.to]||=[]).push(m);
 return relevant.map((m,i)=>{const p=project(wpos(m.to,.76)),arr=grouped[m.to];if(arr.length>1)p.x+=(arr.indexOf(m)-(arr.length-1)/2)*31;return {id:m.id,x:p.x,y:p.y,index:i+1};});},
 debugPick(x,y){return pick(x,y);}
};
initDice();wireCanvas();
$('view3d')?.addEventListener('click',()=>view.setMode('3d'));
$('view2d')?.addEventListener('click',()=>view.setMode('2d'));
$('cameraTop')?.addEventListener('click',overhead);
$('cameraAngle')?.addEventListener('click',home);
$('soundButton')?.addEventListener('click',()=>{audioOn=!audioOn;$('soundButton').textContent=audioOn?'♫ Sound on':'♪ Sound off';$('soundButton').setAttribute('aria-pressed',String(audioOn));if(audioOn)sound('bonus');});
if(view.supported){if(!useSoftware){makeSphere();createStatic();}view.setMode('3d');if(useSoftware){const b=$('view3d');if(b)b.title='3D Lite: software perspective renderer (WebGL unavailable)';const note=$('renderModeNote');if(note){note.hidden=false;note.textContent='3D Lite · software graphics';note.title='WebGL was unavailable. 3D perspective remains playable using a CPU renderer.';}const hint=$('stageHint');if(hint)hint.textContent='3D Lite is active: your browser blocked WebGL, so perspective is rendered in software. Drag to orbit, scroll to zoom, or choose 2D for precision.';}requestAnimationFrame(render);}else{view.setMode('2d');
 for(const id of ['view3d','cameraTop','cameraAngle']){const el=$(id);if(el){el.disabled=true;el.title='3D unavailable on this browser or device';}}
 const s=$('boardQuickStatus');if(s)s.textContent='WebGL unavailable — precision 2D board active';
 const hint=$('stageHint');if(hint)hint.textContent='3D graphics unavailable. The complete 2D precision game is ready to play.';
 }
})();
