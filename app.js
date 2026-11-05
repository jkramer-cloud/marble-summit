/* Marble Summit Phase 3 — view-independent game interface. Board positions and legal moves come exclusively from the Phase 1 engine. */
(() => {
'use strict';
const BOARD = window.MARBLE_BOARD;
const Game = window.MarbleSummitGame;
const {validateBoard} = window.MarbleSummitEngine;
validateBoard(BOARD);
const STORAGE = 'marble-summit-precision-phase2-v2';
const NS = 'http://www.w3.org/2000/svg';
const PLAYERS = BOARD.players;
const NAMES = Object.fromEntries(PLAYERS.map(p=>[p.name,p.name[0]+p.name.slice(1).toLowerCase()]));
const PALETTE = Object.fromEntries(PLAYERS.map(p=>[p.name,p.color]));
const COLORS = Object.fromEntries(PLAYERS.map(p=>[p.name,p.color]));
const colorSlots = Object.fromEntries(PLAYERS.map(p=>[p.name,p.name]));
const fit = BOARD.render_coords.viewBox;
const freshCamera = () => ({x:fit[0],y:fit[1],w:fit[2],h:fit[3]});
function restoreColors(slots){
 if(!slots || Object.keys(slots).length!==PLAYERS.length || new Set(Object.values(slots)).size!==PLAYERS.length || !Object.values(slots).every(v=>PALETTE[v])) return;
 for(const p of PLAYERS){colorSlots[p.name]=slots[p.name];COLORS[p.name]=PALETTE[colorSlots[p.name]];}
}
const $ = id => document.getElementById(id);
const state = {game:null,selected:null,preview:null,busy:false,motion:null,burst:null,lastDie:0,setupCount:3,controllers:{},gameControllers:{},saved:null,botTimer:null,botToken:0,toastTimer:null,message:'Roll the die to begin.',messageStyle:'',camera:freshCamera(),down:null,suppressClickUntil:0};
for(const p of PLAYERS) state.controllers[p.name]='human';
const node = id => BOARD.nodes[id];
const name = id => NAMES[colorSlots[id] || id] || id;
const formatHole = id => {
 if(id==='CENTER') return 'CENTER';
 if(!id) return '—';
 const n = node(id);
 if(n?.type==='base') return 'BASE '+id.slice(-1);
 if(n?.type==='home') return 'HOME '+id.slice(-1);
 if(n?.type==='star') return 'STAR '+id.slice(1);
 if(n?.special==='start') return 'START';
 if(n?.special==='home_entry') return 'HOME ENTRY';
 return id;
};
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function svgEl(tag,attrs={},text=null){const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs)){if(v!=null)el.setAttribute(k,String(v));}if(text!=null)el.textContent=text;return el;}
function append(parent,tag,attrs={},text=null){const el=svgEl(tag,attrs,text);parent.appendChild(el);return el;}
function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
function getSnapshot(){return state.game?.snapshot();}
function getMoves(){const s=getSnapshot();return s?.phase==='await-move'?state.game.legalMoves():[];}
function getMarbleColor(m){return COLORS[m.owner]||'#ffffff';}
function randomDie(){return Math.floor(Math.random()*6)+1;}
function showToast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2800);}
function setMessage(msg,style=''){state.message=msg;state.messageStyle=style;}
function save(){if(!state.game)return;try{localStorage.setItem(STORAGE,JSON.stringify({state:state.game.snapshot(),controllers:state.gameControllers,colorSlots:{...colorSlots},version:21}));$('saveStatus').textContent='Saved on this device ✓';}catch(e){$('saveStatus').textContent='Browser storage unavailable; game continues without autosave';}}
function loadSaved(){try{const data=JSON.parse(localStorage.getItem(STORAGE)||'null');if(!data?.state||!data.controllers)return null;new Game(BOARD,{state:data.state});return data;}catch(e){return null;}}
function fullRender(){renderBoard();renderSidebar();window.Marble3D?.sync();}
function rollDie(){if(!state.game||state.busy)return;const before=getSnapshot();if(before.phase!=='await-roll'||state.gameControllers[before.currentPlayer]==='bot')return;commitRoll(randomDie());}
function commitRoll(die){const before=getSnapshot();if(!before||before.phase!=='await-roll')return;state.selected=null;state.preview=null;state.lastDie=die;state.game.roll(die);const after=getSnapshot();$('diceShell').classList.remove('rolling');void $('diceShell').offsetWidth;$('diceShell').classList.add('rolling');window.Marble3D?.rollDie(die);if(after.phase==='await-move'){
 const moves=state.game.legalMoves();const n=[...new Set(moves.map(x=>x.marbleId))].length;
 setMessage(`${name(before.currentPlayer)} rolled ${die}. Choose one of ${n} movable marble${n===1?'':'s'} and a complete route.`,die===6?'success':'');
 if(n===1) state.selected=moves[0].marbleId;
}else{
 setMessage(`${name(before.currentPlayer)} rolled ${die}, but has no legal move. ${die===6?'The 6 does NOT earn another roll. ':''}${name(after.currentPlayer)} plays next.`,'alert');
}
 save();fullRender();botAdvance();}
function selectMarble(id){if(state.busy||!state.game)return;const moves=getMoves();if(!moves.some(m=>m.marbleId===id))return;state.selected=id;state.preview=null;renderBoard();renderSidebar();}
function routeLabel(move){
 switch(move.kind){case 'release':return 'Release marble from BASE';case 'star-ring':return 'Take the STAR shortcut';case 'star-to-outer':return 'Exit STAR ring toward outer track';case 'center-entry':return 'Enter CENTER portal';case 'center-exit':return `Exit CENTER to ${formatHole(move.to)}`;case 'home':return 'Move into / through HOME';default:return 'Continue around the outer track';}
}
function routeSummary(move){if(move.capture)return `Capture ${move.capture.split('-')[0]}! · ${move.path.length} space${move.path.length===1?'':'s'}`;if(move.kind==='release')return 'Complete roll used to leave BASE';if(move.kind==='center-exit')return 'Select any of six STAR exits';if(move.kind==='center-entry')return 'CENTER only with an exact roll of 1';return `${move.path.length} ${move.path.length===1?'space':'spaces'} · ${move.path.map(formatHole).join(' → ')}`;}
function selectRoute(id){if(!state.game||state.busy||getSnapshot()?.phase!=='await-move')return;
 const chosen=state.game.legalMoves().find(m=>m.id===id);if(!chosen)return;
 const previous=getSnapshot();state.game.move(chosen.id);const after=getSnapshot();const move=after.history.filter(x=>x.type==='move').at(-1);
 state.selected=null;state.preview=null;
 const capture=move.capture;
 if(after.phase==='finished')setMessage(`${name(after.winner)} WINS THE SUMMIT! All four marbles are HOME.`,'success');
 else if(capture)setMessage(`KNOCKOUT! ${name(move.player)} sent ${name(capture.player)}'s marble back to BASE.${move.bonusRoll?' Roll again!':''}`,'success');
 else if(move.bonusRoll)setMessage(`${name(move.player)} used all six spaces. BONUS ROLL!`,'success');
 else setMessage(`${name(move.player)} reached ${formatHole(move.to)}. ${name(after.currentPlayer)}'s turn.`);
 save();
 animateMove(previous,chosen,move);
}
function animateMove(previous,chosen,event){
 if(window.Marble3D?.active){
   state.busy=true;fullRender();
   window.Marble3D.animateMove(previous,chosen,event,()=>{
     state.busy=false;state.motion=null;fullRender();
     if(event.capture)captureBurst(chosen.to,event.capture);
     else if(getSnapshot().phase==='finished')showToast(`CHAMPION: ${name(getSnapshot().winner)}!`);
     botAdvance();
   });
   return;
 }
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){state.busy=false;state.motion=null;if(event.capture)captureBurst(chosen.to,event.capture);else if(getSnapshot().phase==='finished')showToast(`${name(getSnapshot().winner)} wins!`);fullRender();botAdvance();return;}
 state.busy=true;state.motion={marbleId:chosen.marbleId,from:chosen.from,path:chosen.path,start:performance.now(),stepMs:100,position:node(chosen.from),color:COLORS[event.player]};
 fullRender();
 const total=Math.max(250,chosen.path.length*100);
 const frame=time=>{
  if(!state.motion)return;
  const t=clamp((time-state.motion.start)/total,0,1);const seg=t*(state.motion.path.length);const i=Math.min(state.motion.path.length-1,Math.floor(seg));const frac=clamp(seg-i,0,1);
  const a=node(i===0?state.motion.from:state.motion.path[i-1]);const b=node(state.motion.path[i]);
  const x=a.x+(b.x-a.x)*frac,y=a.y+(b.y-a.y)*frac;
  const overlay=$('movingOverlay');if(overlay){overlay.setAttribute('transform',`translate(${x} ${y})`);}
  if(t<1){requestAnimationFrame(frame);}else{
   state.motion=null;state.busy=false;renderBoard();renderSidebar();
   if(event.capture)captureBurst(chosen.to,event.capture);
   else if(getSnapshot().phase==='finished')showToast(`CHAMPION: ${name(getSnapshot().winner)}!`);
   botAdvance();
  }
 };
 requestAnimationFrame(frame);
}
function captureBurst(pos,capture){state.burst={x:node(pos).x,y:node(pos).y,until:Date.now()+1000};renderBoard();showToast(`KNOCKOUT! ${name(capture.player)} returned to BASE`);setTimeout(()=>{state.burst=null;renderBoard();},1000);}
function createNewGame(){state.saved=null;state.botToken++;clearTimeout(state.botTimer);state.busy=false;state.motion=null;state.burst=null;state.selected=null;state.preview=null;state.gameControllers={};const names=PLAYERS.slice(0,state.setupCount).map(p=>p.name);for(const k of names)state.gameControllers[k]=state.controllers[k];state.game=new Game(BOARD,{activePlayers:names});state.lastDie=0;setMessage(`${name(names[0])} goes first. Roll a 1 or 6 to release a marble.`);$('setupModal').hidden=true;save();fullRender();botAdvance();}
function resumeGame(){try{state.game=new Game(BOARD,{state:state.saved.state});state.gameControllers=state.saved.controllers;state.lastDie=state.saved.state.die||0;$('setupModal').hidden=true;state.saved=null;setMessage('Saved match resumed. Continue from your last turn.');fullRender();botAdvance();}catch(e){showToast('Saved match was not valid. Start a new one.');}}
function showSetup(){state.botToken++;clearTimeout(state.botTimer);$('setupModal').hidden=false;renderSetup();}
function chooseColor(owner,paletteName){
 if(!PALETTE[paletteName]||colorSlots[owner]===paletteName)return;
 const other=PLAYERS.find(p=>colorSlots[p.name]===paletteName)?.name;
 if(other)colorSlots[other]=colorSlots[owner];
 colorSlots[owner]=paletteName;
 for(const p of PLAYERS)COLORS[p.name]=PALETTE[colorSlots[p.name]];
 renderSetup();if(state.game){save();fullRender();}
}
function renderSetup(){const count=$('countChoices');count.innerHTML='';[2,3,4,5,6].forEach(n=>{const b=document.createElement('button');b.type='button';b.textContent=String(n);b.className=n===state.setupCount?'active':'';b.setAttribute('aria-pressed',String(n===state.setupCount));b.onclick=()=>{state.setupCount=n;renderSetup();};count.appendChild(b);});const players=$('setupPlayers');players.innerHTML='';PLAYERS.slice(0,state.setupCount).forEach(p=>{const row=document.createElement('div');row.className='setup-player';const sw=document.createElement('span');sw.className='swatch';sw.style.background=COLORS[p.name];const title=document.createElement('label');title.textContent='Player '+String(PLAYERS.indexOf(p)+1);title.htmlFor='controller-'+p.name;const select=document.createElement('select');select.id='controller-'+p.name;for(const [k,v] of [['human','Human'],['bot','Computer']]){const opt=document.createElement('option');opt.value=k;opt.textContent=v;select.appendChild(opt);}select.value=state.controllers[p.name];select.onchange=()=>{state.controllers[p.name]=select.value;};
 const picker=document.createElement('select');picker.className='color-picker';picker.id='color-'+p.name;picker.setAttribute('aria-label','Player '+String(PLAYERS.indexOf(p)+1)+' marble and board color');
 for(const q of PLAYERS){const opt=document.createElement('option');opt.value=q.name;opt.textContent=name(q.name);picker.appendChild(opt);}
 picker.value=colorSlots[p.name];picker.onchange=()=>chooseColor(p.name,picker.value);
 row.append(sw,title,picker,select);players.appendChild(row);});$('resumeButton').hidden=!state.saved;}
function showHelp(){state.botToken++;clearTimeout(state.botTimer);$('helpModal').hidden=false;}
function closeHelp(){if($('helpModal').hidden)return;$('helpModal').hidden=true;botAdvance();}
// Browser 2D renderer. All positions come from board-geometry.json.
function buildBoardScenery(svg){const defs=append(svg,'defs');
 let gr=append(defs,'radialGradient',{id:'sceneBG'});append(gr,'stop',{offset:'0%', 'stop-color':'#233f61'});append(gr,'stop',{offset:'100%', 'stop-color':'#080f1e'});
 gr=append(defs,'linearGradient',{id:'boardSurface',x1:0,y1:0,x2:1,y2:1});append(gr,'stop',{offset:0,'stop-color':'#26374e'});append(gr,'stop',{offset:'.5','stop-color':'#111f32'});append(gr,'stop',{offset:1,'stop-color':'#0a1728'});
 gr=append(defs,'radialGradient',{id:'glassBall',cx:'.27',cy:'.21',r:'.82'});append(gr,'stop',{offset:0,'stop-color':'#ffffff','stop-opacity':'.82'});append(gr,'stop',{offset:'.18','stop-color':'#ffffff','stop-opacity':'.24'});append(gr,'stop',{offset:'.53','stop-color':'#ffffff','stop-opacity':'.04'});append(gr,'stop',{offset:1,'stop-color':'#071225','stop-opacity':'.45'});
 const shadow=append(defs,'filter',{id:'orbGlow',x:'-80%',y:'-80%',width:'260%',height:'260%'});append(shadow,'feGaussianBlur',{stdDeviation:6});
 const g=append(svg,'g',{id:'backdrop'});append(g,'rect',{x:-300,y:-200,width:1900,height:1800,fill:'url(#sceneBG)'});
 const hex='590,101 1046.4,364.5 1046.4,891.5 590,1155 133.6,891.5 133.6,364.5';
 append(g,'polygon',{points:hex,fill:'url(#boardSurface)',stroke:'#37718e','stroke-width':11,'stroke-linejoin':'round'});
 // Under-board neon sector lighting matches the marble color selected in setup.
 for(let k=0;k<6;k++){
  const a=(k*60-90)*Math.PI/180;
  const radial=r=>({x:590+r*Math.cos(a),y:628+r*Math.sin(a)});
  const left={x:590+527*Math.cos(a-Math.PI/6),y:628+527*Math.sin(a-Math.PI/6)};
  const tip=radial(527),right={x:590+527*Math.cos(a+Math.PI/6),y:628+527*Math.sin(a+Math.PI/6)};
  const tint=COLORS[PLAYERS[k].name];
  append(g,'polygon',{points:`590,628 ${left.x},${left.y} ${tip.x},${tip.y} ${right.x},${right.y}`,fill:tint,'fill-opacity':'.105',stroke:tint,'stroke-opacity':'.15','stroke-width':2});
 }
 append(g,'polygon',{points:hex,fill:'none',stroke:'#85dafe','stroke-width':2,opacity:'.45'});
 // The four BASE holes are off the hexagon: two on each flank of each corner.
 PLAYERS.forEach((p,k)=>{
  const pts=p.base.map(id=>node(id));const avg={x:pts.reduce((a,n)=>a+n.x,0)/4,y:pts.reduce((a,n)=>a+n.y,0)/4};
  const angle=k*60;
  append(g,'ellipse',{cx:avg.x,cy:avg.y,rx:83,ry:44,transform:`rotate(${angle} ${avg.x} ${avg.y})`,fill:COLORS[p.name],'fill-opacity':'.16',stroke:COLORS[p.name],'stroke-opacity':'.7','stroke-width':3});
 });
 for(let k=0;k<6;k++){let a=(k*60-90)*Math.PI/180;const end={x:590+520*Math.cos(a),y:628+520*Math.sin(a)};append(g,'line',{x1:590,y1:628,x2:end.x,y2:end.y,stroke:'#8ab8de','stroke-width':1.2,opacity:'.12'});}
 for(const r of [185,300,455])append(g,'circle',{cx:590,cy:628,r,fill:'none',stroke:'#84dfff','stroke-width':1,opacity:'.047'});
 const paths=append(svg,'g',{id:'trackConnections'});
 PLAYERS.forEach(p=>{
  const coords=p.outer_path_sector.map(id=>`${node(id).x},${node(id).y}`);
  const tail=node(node(p.outer_path_sector.at(-1)).main_next);coords.push(`${tail.x},${tail.y}`);
  append(paths,'polyline',{points:coords.join(' '),fill:'none',stroke:COLORS[p.name],'stroke-width':16,opacity:'.25'});
  append(paths,'polyline',{points:coords.join(' '),fill:'none',stroke:COLORS[p.name],'stroke-width':5,opacity:'.82','stroke-linejoin':'round','stroke-linecap':'round'});
  const line=[p.home_entry,...p.home].map(id=>`${node(id).x},${node(id).y}`).join(' ');
  append(paths,'polyline',{points:line,fill:'none',stroke:COLORS[p.name],opacity:'.36','stroke-width':14});
  append(paths,'polyline',{points:line,fill:'none',stroke:COLORS[p.name],opacity:'.84','stroke-width':4});
  // Release connection visually links the BASE cluster with START but is NOT a counted track space.
  const bs=p.base.map(id=>node(id));const avg={x:bs.reduce((a,n)=>a+n.x,0)/4,y:bs.reduce((a,n)=>a+n.y,0)/4};const start=node(p.start);
  append(paths,'line',{x1:avg.x,y1:avg.y,x2:start.x,y2:start.y,stroke:COLORS[p.name],'stroke-width':3,'stroke-dasharray':'7 8',opacity:'.42'});
 });
 const stars=BOARD.geometry.star_ring_clockwise;
 append(paths,'polygon',{points:stars.map(id=>`${node(id).x},${node(id).y}`).join(' '),fill:'#40d8ff','fill-opacity':'.038',stroke:'#45dcf6','stroke-width':14,'stroke-opacity':'.18'});
 append(paths,'polygon',{points:stars.map(id=>`${node(id).x},${node(id).y}`).join(' '),fill:'none',stroke:'#69eaff','stroke-width':4,'stroke-opacity':'.8'});
 stars.forEach(id=>{const n=node(id);append(paths,'line',{x1:590,y1:628,x2:n.x,y2:n.y,stroke:'#a992ff','stroke-width':3,'stroke-dasharray':'5 10','stroke-opacity':'.4'});});
 const labelLayer=append(svg,'g',{id:'sectorLabels'});
 PLAYERS.forEach(p=>{const pts=p.base.map(id=>node(id));const avg={x:pts.reduce((a,n)=>a+n.x,0)/4,y:pts.reduce((a,n)=>a+n.y,0)/4};const v={x:avg.x-590,y:avg.y-628}, l=Math.hypot(v.x,v.y);const labelOffset=-94;const q={x:avg.x+v.x/l*labelOffset,y:avg.y+v.y/l*labelOffset};append(labelLayer,'text',{x:q.x,y:q.y,'text-anchor':'middle','dominant-baseline':'middle','font-size':14,'font-weight':900,'letter-spacing':2,fill:COLORS[p.name],opacity:'.88'},name(p.name)+' BASE');});
 append(labelLayer,'text',{x:590,y:680,'text-anchor':'middle','font-size':12,'font-weight':900,'letter-spacing':2,fill:'#bca9ff'},'CENTER');
}
function drawSockets(svg){const group=append(svg,'g',{id:'socketLayer'});
 for(const [id,n] of Object.entries(BOARD.nodes)){
  const r=n.type==='center'?25:n.type==='star'?19:n.special?17:14;
  let stroke='#43647b',fill='#071422';
  if(n.type==='star'){stroke='#6feaff';fill='#12374e';}
  if(n.type==='home'){stroke=COLORS[n.owner];fill='#0b2233';}
  if(n.type==='base'){stroke=COLORS[n.owner];fill='#101c2f';}
  if(n.special==='start'){stroke=COLORS[n.owner];fill='#13423f';}
  if(n.special==='home_entry'){stroke=COLORS[n.owner];fill='#4d3324';}
  if(n.type==='center'){stroke='#ca9aff';fill='#241d47';}
  const s=append(group,'g',{'data-node':id,class:'board-socket'});
  append(s,'circle',{cx:n.x,cy:n.y,r:r+3,fill:'#030b18',stroke:stroke,'stroke-width':1.4,opacity:'.75'});
  append(s,'circle',{cx:n.x,cy:n.y,r:r,fill,stroke,'stroke-width':n.special||n.type==='star'?3:1.5});
  append(s,'circle',{cx:n.x,cy:n.y-3,r:r*.55,fill:'#cceaff',opacity:'.045'});
  if(n.type==='star')append(s,'text',{x:n.x,y:n.y+7,'font-size':21,'font-weight':900,'text-anchor':'middle',fill:'#94f5ff'},'✦');
  if(n.type==='center')append(s,'text',{x:n.x,y:n.y+10,'font-size':28,'text-anchor':'middle',fill:'#d3b5ff'},'✦');
  if(n.special==='start'||n.special==='home_entry')append(s,'text',{x:n.x,y:n.y+4,'font-size':9,'text-anchor':'middle',fill:n.special==='start'?'#a1ffd5':'#ffe0b6','font-weight':900},n.special==='start'?'S':'H');
 }
}
function drawHighlights(svg,moves,shot){const layer=append(svg,'g',{id:'highlightLayer'});
 if(shot.phase==='await-move'&&!state.busy){const ids=new Set(moves.map(m=>m.marbleId));for(const m of shot.marbles){if(!ids.has(m.id))continue;const pt=node(m.location);append(layer,'circle',{cx:pt.x,cy:pt.y,r:27,fill:'none',stroke:COLORS[m.owner],'stroke-width':3,'stroke-dasharray':'5 5',opacity:'.95'});}}
 const p=state.preview&&moves.find(m=>m.id===state.preview);
 if(p&&!state.busy){const pts=[p.from,...p.path].map(id=>node(id));append(layer,'polyline',{points:pts.map(n=>`${n.x},${n.y}`).join(' '),fill:'none',stroke:'#66f8ff','stroke-width':17,opacity:'.22','stroke-linejoin':'round','stroke-linecap':'round'});append(layer,'polyline',{points:pts.map(n=>`${n.x},${n.y}`).join(' '),fill:'none',stroke:'#d4fdff','stroke-width':4,'stroke-linejoin':'round','stroke-linecap':'round','stroke-dasharray':'6 8'});const end=node(p.to);append(layer,'circle',{cx:end.x,cy:end.y,r:29,fill:'none',stroke:p.capture?'#ffad83':'#afffff','stroke-width':4});const click=append(layer,'circle',{cx:end.x,cy:end.y,r:31,fill:'transparent',class:'route-target','data-route-id':p.id});click.setAttribute('aria-label','Use previewed route');}
 if(state.burst&&Date.now()<state.burst.until){const b=state.burst;append(layer,'circle',{cx:b.x,cy:b.y,r:50,fill:'#ffa572',opacity:'.18'});append(layer,'circle',{cx:b.x,cy:b.y,r:44,fill:'none',stroke:'#ffe0a1','stroke-width':7});append(layer,'text',{x:b.x,y:b.y-49,'font-size':25,'font-weight':950,'text-anchor':'middle',fill:'#fff1d1'},'KNOCKOUT!');}
}
function drawMoveTargets(svg,moves,shot){
 if(shot.phase!=='await-move'||state.busy||!state.selected)return;
 const options=moves.filter(m=>m.marbleId===state.selected);
 if(!options.length)return;
 const grouped=new Map();
 options.forEach(m=>{if(!grouped.has(m.to))grouped.set(m.to,[]);grouped.get(m.to).push(m);});
 const layer=append(svg,'g',{id:'onBoardRoutes'});
 options.forEach((m,i)=>{
   const end=node(m.to);const pair=grouped.get(m.to);const offsetIndex=pair.indexOf(m);const offsetAngle=(offsetIndex-(pair.length-1)/2)*.85;
   // Multiple legal routes to one hole receive separate numbered markers.
   const ox=pair.length>1?Math.sin(offsetAngle)*21:0;
   const oy=pair.length>1?(Math.cos(offsetAngle)-1)*20:0;
   const r=pair.length>1?15:20;
   const g=append(layer,'g',{'data-route-id':m.id,role:'button',tabindex:'0',class:'board-move-target','aria-label':`Route ${i+1}: ${routeLabel(m)}, ${formatHole(m.to)}${m.capture?', capture opponent':''}`});
   append(g,'circle',{cx:end.x+ox,cy:end.y+oy,r:r+6,fill:'none',stroke:m.capture?'#ffd18a':'#afffff','stroke-width':2.5,opacity:'.85'});
   append(g,'circle',{cx:end.x+ox,cy:end.y+oy,r,fill:m.capture?'#b85d30':'#155f83',stroke:'#f7ffff','stroke-width':2.2});
   append(g,'text',{x:end.x+ox,y:end.y+oy+5,'text-anchor':'middle','font-size':14,'font-weight':950,fill:'#ffffff','pointer-events':'none'},String(i+1));
   append(g,'title',{},`Route ${i+1}: ${routeLabel(m)}. ${routeSummary(m)}`);
 });
}
function drawMarbles(svg,shot,moves){const group=append(svg,'g',{id:'marbleLayer'});const selectable=new Set(moves.map(m=>m.marbleId));for(const m of shot.marbles){if(state.motion?.marbleId===m.id)continue;const n=node(m.location);const isSelected=state.selected===m.id;const can=selectable.has(m.id)&&!state.busy;const g=append(group,'g',{class:`board-marble${can?' selectable':''}${isSelected?' selected':''}`,'data-marble':m.id,role:'button','aria-label':`${name(m.owner)} marble ${m.id.split('-')[1]} at ${formatHole(m.location)}${can?', click for routes':''}`,tabindex:can?'0':'-1'});
 if(isSelected)append(g,'circle',{cx:n.x,cy:n.y,r:28,fill:'none',stroke:'#ffffff','stroke-width':3,opacity:'.96'});
 append(g,'ellipse',{cx:n.x+2,cy:n.y+7,rx:15,ry:8,fill:'#000000',opacity:'.45'});
 append(g,'circle',{cx:n.x,cy:n.y,r:16,fill:getMarbleColor(m),stroke:'#e6f8ff','stroke-opacity':'.62','stroke-width':2});
 append(g,'circle',{cx:n.x,cy:n.y,r:16,fill:'url(#glassBall)'});
 append(g,'ellipse',{cx:n.x-5,cy:n.y-6,rx:5.2,ry:3.1,fill:'#ffffff',opacity:'.66',transform:`rotate(-30 ${n.x-5} ${n.y-6})`});
 if(can)append(g,'circle',{cx:n.x,cy:n.y,r:24,fill:'transparent',class:'hit-disc'});
 }
 if(state.motion){const m=state.motion;const overlay=append(svg,'g',{id:'movingOverlay',transform:`translate(${m.position.x} ${m.position.y})`});append(overlay,'circle',{r:20,fill:m.color,opacity:'.25'});append(overlay,'circle',{r:16,fill:m.color,stroke:'#ffffff','stroke-width':2});append(overlay,'circle',{r:16,fill:'url(#glassBall)'});}
}
function renderBoard(){const svg=$('boardSvg');if(!svg||!state.game)return;svg.replaceChildren();svg.setAttribute('viewBox',`${state.camera.x} ${state.camera.y} ${state.camera.w} ${state.camera.h}`);buildBoardScenery(svg);drawSockets(svg);const shot=getSnapshot();const moves=getMoves();drawHighlights(svg,moves,shot);drawMarbles(svg,shot,moves);drawMoveTargets(svg,moves,shot);
 const hint=shot.phase==='finished'?`${name(shot.winner)} is the champion!`:state.busy?'Marble moving along its exact legal route…':shot.phase==='await-move'?(state.selected?'Click a numbered landing pad on the board to move, or use the route list.':'Click a glowing marble, then its numbered destination on the board.'):`${name(shot.currentPlayer)}: roll the die to play.`;
 $('stageHint').textContent=hint;
}
function renderSidebar(){if(!state.game)return;const shot=getSnapshot();const player=PLAYERS.find(p=>p.name===shot.currentPlayer);const busy=state.busy;const isBot=state.gameControllers[shot.currentPlayer]==='bot';$('turnNumber').textContent=String(shot.turn).padStart(2,'0');const top=$('activePlayer');top.querySelector('i').style.background=COLORS[player.name];top.querySelector('i').style.boxShadow=`0 0 26px ${COLORS[player.name]}77`;
 top.querySelector('strong').textContent=shot.phase==='finished'?`${name(shot.winner)} wins!`:name(shot.currentPlayer);top.querySelector('small').textContent=shot.phase==='finished'?'SUMMIT CHAMPION':isBot?'Computer player':shot.phase==='await-roll'?'Ready to roll':'Choose a marble';
 const dice=shot.phase==='await-move'?shot.die:state.lastDie;drawDie(dice||1);$('diceShell').setAttribute('aria-label',dice?`Die shows ${dice}`:'Die ready to roll');$('rollButton').disabled=busy||isBot||shot.phase!=='await-roll';$('rollButton').innerHTML=shot.phase==='finished'?'GAME FINISHED':isBot?'COMPUTER TURN':shot.phase==='await-move'?'CHOOSE A ROUTE':'ROLL DIE <span class="dice-key">SPACE</span>';
 $('diceCaption').textContent=shot.phase==='finished'?'Start another match to play again':shot.phase==='await-move'?`Die shows ${shot.die} — complete move required`:isBot?'Computer is choosing its move':'Roll 1 or 6 to leave BASE';const msg=$('turnMessage');msg.className='turn-message'+(state.messageStyle?' '+state.messageStyle:'');msg.textContent=state.message;
 const moves=getMoves();$('moveCount').textContent=`${moves.length} route${moves.length===1?'':'s'}`;$('boardQuickStatus').textContent=`${name(shot.currentPlayer)} ${shot.phase==='await-move'?'· Pick a numbered landing spot':shot.phase==='await-roll'?'· Roll to play':'· Winner!'}`;$('boardQuickRoll').disabled=busy||isBot||shot.phase!=='await-roll';$('moveInstructions').textContent=shot.phase==='await-move'?(isBot?'Computer is deciding…':`Die: ${shot.die}. ${moves.length} legal route${moves.length===1?'':'s'}. Click a glowing marble, then its numbered destination directly on the board.`):shot.phase==='finished'?'All four marbles are HOME. Start a new game for another match.':'Roll first to see the legal moves. Your own pieces block the route; opponents do not.';
 const pieces=$('pieceSelector');pieces.replaceChildren();if(shot.phase==='await-move'){
  const ids=[...new Set(moves.map(m=>m.marbleId))];ids.forEach(id=>{const marble=shot.marbles.find(x=>x.id===id);const btn=document.createElement('button');btn.className='piece-button'+(state.selected===id?' active':'');btn.type='button';btn.textContent=`● ${id.split('-').at(-1)} · ${formatHole(marble.location)}`;btn.style.borderColor=state.selected===id?COLORS[marble.owner]:'';btn.disabled=busy||isBot;btn.onclick=()=>selectMarble(id);pieces.appendChild(btn);});}
 const routes=$('routeList');routes.replaceChildren();if(shot.phase==='await-move'&&state.selected){const options=moves.filter(m=>m.marbleId===state.selected);options.forEach((move,idx)=>{const btn=document.createElement('button');btn.className='route-button'+(move.capture?' capture':'');btn.type='button';btn.disabled=busy||isBot;btn.innerHTML=`<strong>${idx+1}. ${escape(routeLabel(move))}</strong><span class="route-end">${escape(formatHole(move.to))} →</span><small>${escape(routeSummary(move))}</small>`;btn.onmouseenter=()=>{state.preview=move.id;renderBoard();};btn.onmouseleave=()=>{if(state.preview===move.id){state.preview=null;renderBoard();}};btn.onfocus=()=>{state.preview=move.id;renderBoard();};btn.onclick=()=>selectRoute(move.id);routes.appendChild(btn);});}else if(shot.phase==='await-move'&&!isBot){const empty=document.createElement('div');empty.className='route-empty';empty.textContent='Tap a glowing marble on the board, then tap a numbered landing pad; the list below is optional.';routes.appendChild(empty);}
 $('playerCount').textContent=`${shot.activePlayers.length} players`;const scores=$('scoreList');scores.replaceChildren();for(const score of state.game.status()){const row=document.createElement('div');row.className='score-row'+(score.player===shot.currentPlayer?' turn':'');const sw=document.createElement('i');sw.className='score-swatch';sw.style.color=COLORS[score.player];sw.style.background=COLORS[score.player];const middle=document.createElement('div');const label=document.createElement('div');label.className='score-name';label.textContent=name(score.player);if(state.gameControllers[score.player]==='bot'){const bot=document.createElement('span');bot.className='bot-pill';bot.textContent='CPU';label.appendChild(bot);}const sub=document.createElement('div');sub.className='score-sub';sub.textContent=`${score.base} base · ${score.course} track · ${score.home} home`;
 const progress=document.createElement('div');progress.className='score-mini';for(let j=0;j<4;j++){const dot=document.createElement('i');if(j<score.home)dot.className='on';progress.appendChild(dot);}middle.append(label,sub,progress);const val=document.createElement('span');val.className='score-value';val.textContent=`${score.home}/4`;row.append(sw,middle,val);scores.appendChild(row);}
 const log=$('eventLog');log.replaceChildren();let events=shot.history.filter(x=>x.type==='move'||x.type==='no-legal-move'||x.type==='win').slice(-7).reverse();if(!events.length){const empty=document.createElement('div');empty.className='route-empty';empty.textContent='Roll the die to start the game journal.';log.appendChild(empty);}events.forEach(e=>{const div=document.createElement('div');div.className='event-item'+(e.capture?' capture':e.bonusRoll?' bonus':'');if(e.type==='move'){div.textContent=`${name(e.player)}: ${formatHole(e.from)} → ${formatHole(e.to)} (${e.die})${e.capture?` · captured ${name(e.capture.player)}!`:''}${e.bonusRoll?' · extra roll':''}`;}else if(e.type==='win'){div.textContent=`${name(e.player)} has won the Summit!`;}else{div.textContent=`${name(e.player)} rolled ${e.die}; no legal move${e.die===6?' (no extra roll)':''}.`;}log.appendChild(div);});
}
function drawDie(n){const slots=n===1?[4]:n===2?[0,8]:n===3?[0,4,8]:n===4?[0,2,6,8]:n===5?[0,2,4,6,8]:[0,2,3,5,6,8];const el=$('dicePips');el.replaceChildren();for(let i=0;i<9;i++){const cell=document.createElement('span');if(slots.includes(i))cell.className='pip';el.appendChild(cell);}}
function botAdvance(){clearTimeout(state.botTimer);if(!state.game||state.busy||!$('helpModal').hidden||!$('setupModal').hidden)return;const shot=getSnapshot();if(shot.phase==='finished'){if(shot.winner)showToast(`${name(shot.winner)} has conquered Marble Summit!`);return;}if(state.gameControllers[shot.currentPlayer]!=='bot')return;const token=state.botToken;state.botTimer=setTimeout(()=>{
 if(token!==state.botToken||state.busy||!$('helpModal').hidden||!$('setupModal').hidden)return;const latest=getSnapshot();if(latest.phase==='await-roll'){commitRoll(randomDie());}else if(latest.phase==='await-move'){
 const choices=getMoves();if(!choices.length)return;const ranked=choices.map(m=>({m,weight:(m.capture?120:0)+(m.kind==='home'?65:m.kind==='release'?40:m.kind==='center-exit'?25:m.kind==='star-ring'?12:0)+(m.homeEligibleAfter&&!latest.marbles.find(q=>q.id===m.marbleId)?.homeEligible?22:0)+Math.random()*30})).sort((a,b)=>b.weight-a.weight);state.selected=ranked[0].m.marbleId;selectRoute(ranked[0].m.id);
 }
 },latestWait(shot));}
function latestWait(shot){return shot.phase==='await-roll'?620:650;}
function resetCamera(){if(window.Marble3D?.active){window.Marble3D.reset();return;}state.camera=freshCamera();updateCamera();}
function updateCamera(){const c=state.camera;$('boardSvg').setAttribute('viewBox',`${c.x} ${c.y} ${c.w} ${c.h}`);}
function zoom(factor,rx=.5,ry=.5){if(window.Marble3D?.active){window.Marble3D.zoom(1/factor);return;}const c=state.camera;const minW=490,maxW=1330;const newW=clamp(c.w*factor,minW,maxW);const newH=c.h*(newW/c.w);c.x+= (c.w-newW)*rx;c.y+=(c.h-newH)*ry;c.w=newW;c.h=newH;limitCamera();updateCamera();}
function limitCamera(){const c=state.camera;c.x=clamp(c.x,-140,1320-c.w);c.y=clamp(c.y,-140,1400-c.h);}
function onBoardClick(e){if(Date.now()<state.suppressClickUntil||state.busy)return;const route=e.target.closest?.('[data-route-id]');if(route){selectRoute(route.getAttribute('data-route-id'));return;}const marble=e.target.closest?.('[data-marble]');if(marble)selectMarble(marble.getAttribute('data-marble'));}
function handleDown(e){if(e.button!==0||e.target.closest?.('[data-marble],[data-route-id]'))return;state.down={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};}
function handleMove(e){const d=state.down;if(!d||d.pointerId!==e.pointerId)return;const dx=e.clientX-d.lastX,dy=e.clientY-d.lastY;if(Math.hypot(e.clientX-d.startX,e.clientY-d.startY)>5)d.moved=true;if(d.moved){const svg=$('boardSvg');if(!svg.hasPointerCapture?.(e.pointerId))svg.setPointerCapture?.(e.pointerId);const box=svg.getBoundingClientRect(),c=state.camera;const scale=Math.max(c.w/box.width,c.h/box.height);c.x-=dx*scale;c.y-=dy*scale;limitCamera();updateCamera();svg.classList.add('grabbing');}d.lastX=e.clientX;d.lastY=e.clientY;}
function handleUp(e){const d=state.down;if(!d||d.pointerId!==e.pointerId)return;if(d.moved)state.suppressClickUntil=Date.now()+200;state.down=null;$('boardSvg').classList.remove('grabbing');try{$('boardSvg').releasePointerCapture(e.pointerId);}catch(ex){}}
function wire(){
 $('startButton').onclick=()=>createNewGame();$('resumeButton').onclick=resumeGame;$('newGameBtn').onclick=showSetup;$('howButton').onclick=showHelp;$('closeHelp').onclick=closeHelp;$('helpDone').onclick=closeHelp;
 $('rollButton').onclick=rollDie;$('zoomIn').onclick=()=>zoom(.8);$('zoomOut').onclick=()=>zoom(1.25);$('zoomReset').onclick=resetCamera;
 $('focusBoard').onclick=()=>{document.body.classList.toggle('board-focused');$('focusBoard').setAttribute('aria-pressed',String(document.body.classList.contains('board-focused')));$('focusBoard').title=document.body.classList.contains('board-focused')?'Return to board and sidebar':'Expand board for easier clicking';};
 $('boardQuickRoll').onclick=rollDie;$('saveButton').onclick=()=>{save();showToast('Match saved on this device');};
 $('boardSvg').addEventListener('click',onBoardClick);$('boardSvg').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const t=e.target.closest('[data-marble]');if(t){e.preventDefault();selectMarble(t.getAttribute('data-marble'));}else{const r=e.target.closest?.('[data-route-id]');if(r){e.preventDefault();selectRoute(r.getAttribute('data-route-id'));}}}});$('boardSvg').addEventListener('pointerdown',handleDown);$('boardSvg').addEventListener('pointermove',handleMove);$('boardSvg').addEventListener('pointerup',handleUp);$('boardSvg').addEventListener('pointercancel',handleUp);
 $('boardSvg').addEventListener('wheel',e=>{e.preventDefault();const b=$('boardSvg').getBoundingClientRect();zoom(e.deltaY<0?.87:1.15,(e.clientX-b.left)/b.width,(e.clientY-b.top)/b.height);},{passive:false});
 document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&$('setupModal').hidden&&$('helpModal').hidden&&!['BUTTON','INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();rollDie();}if(e.key==='Escape')closeHelp();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)botAdvance();});
}
function boot(){wire();state.saved=loadSaved();if(state.saved){restoreColors(state.saved.colorSlots);state.setupCount=state.saved.state.activePlayers.length;for(const [k,v] of Object.entries(state.saved.controllers))state.controllers[k]=v;}$('setupModal').hidden=false;renderSetup();if(!state.saved){$('resumeButton').hidden=true;}setMessage('Choose your players and begin.');drawDie(1);}
window.MarbleSummitView={
  snapshot:getSnapshot,moves:getMoves,selected:()=>state.selected,preview:()=>state.preview,busy:()=>state.busy,
  colors:()=>COLORS,selectMarble,selectRoute,
  setMessage,focus:()=>document.body.classList.contains('board-focused'),
  getGame:()=>state.game, loadSaved:()=>state.saved
};
boot();
})();
