import * as THREE from '/vendor/three.module.js';
import {createCombatView} from '/combat-view.js';
import {createObjectiveView} from '/objective-view.js';
import {createHeroView} from '/hero-view.js';
import {createPotionView} from '/potion-view.js';
import {createAudio} from '/audio.js';
import {createRuntime} from '/runtime.js';
import {createVoxelLook} from '/voxel-look.js';
import {skinMaterial,heroColors} from '/skins.js';
import {createParticles} from '/particles.js';
import {createUnitsView} from '/units-view.js';
import {createLobby} from '/lobby.js';
import {createInventoryView} from '/inventory-view.js';
const $=s=>document.querySelector(s), World=window.VoxelWorld;
const menu=$('#menu'), pause=$('#pause'), canvas=$('#world'), loading=$('#loading');
let renderer;
try {renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});} catch(error) {loading.textContent='WebGL is unavailable. Enable hardware acceleration and reload.';throw error;}
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,1));
const scene=new THREE.Scene();scene.background=new THREE.Color(0x91bfff);scene.fog=new THREE.Fog(0x91bfff,48,115);
scene.add(new THREE.HemisphereLight(0xffffff,0x817454,2));
const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(-20,40,10);scene.add(sun);
const camera=new THREE.PerspectiveCamera(78,innerWidth/innerHeight,.05,120);camera.rotation.order='YXZ';scene.add(camera);
// Render held items after world depth so nearby walls never swallow the weapon.
const viewScene=new THREE.Scene(),viewCamera=new THREE.PerspectiveCamera(78,innerWidth/innerHeight,.05,10);
viewScene.add(viewCamera,new THREE.HemisphereLight(0xffffff,0x817454,2));
const viewSun=new THREE.DirectionalLight(0xffffff,2);viewSun.position.set(-2,4,1);viewScene.add(viewSun);
renderer.autoClear=false;renderer.info.autoReset=false;
const geometry=new THREE.BoxGeometry(1,1,1),voxelLook=createVoxelLook();
const material=color=>voxelLook.material(color);
let worldGroup=voxelLook.addWorld(scene,World.getMap('castle').boxes),activeMap='castle';voxelLook.sky(scene);
function setMap(id){if(!window.ArenaMaps.has(id)||id===activeMap)return;scene.remove(worldGroup);worldGroup.traverse(o=>o.geometry?.dispose());worldGroup=voxelLook.addWorld(scene,World.getMap(id).boxes);activeMap=id;scene.background.setHex(window.ArenaMaps.definitions[id].sky);scene.fog.color.copy(scene.background);}
function cube(parent,w,h,d,color,x,y,z) {const m=new THREE.Mesh(geometry,material(color));m.scale.set(w,h,d);m.position.set(x,y,z);parent.add(m);return m;}
const socket=io({autoConnect:false}), remotes=new Map(),keys=new Set();
const unitsView=createUnitsView({scene,cube});
const particles=createParticles({scene,socket,getPlayers:()=>self?[self,...[...remotes.values()].map(r=>r.target)]:[]});
const movementKeys=new Set(['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight']);
let self=null, ownId=null,roomCode='',yaw=0,pitch=0,locked=false,tab=false,accumulator=0,last=performance.now(),sendTime=0,lastRender=0;
let correction=new THREE.Vector3(),walkTime=0,reconnecting=false,resumeToken='',serverUpdating=false;
const combat=createCombatView({camera:viewCamera,scene,cube,socket,getSelf:()=>self,getInput:controls,isLocked:()=>locked&&!inventoryView.open&&!reconnecting&&socket.connected&&!objective.finished});
const hand=combat.hand;
const potionView=createPotionView({scene,camera:viewCamera,cube,socket,getSelf:()=>self,getInput:controls,isLocked:()=>locked&&!inventoryView.open&&!reconnecting&&socket.connected&&!objective.finished,serverNow:combat.serverNow,hand});
const audio=createAudio({socket,getSelf:()=>self,getPlayers:()=>self?[self,...[...remotes.values()].map(r=>r.target)]:[],isActive:()=>locked&&!reconnecting&&!objective.finished});
const heroView=createHeroView({scene,camera:viewCamera,cube,socket,getSelf:()=>self,getInput:controls,isLocked:()=>locked&&!inventoryView.open&&!reconnecting&&socket.connected&&!objective.finished,serverNow:combat.serverNow});
const runtime=createRuntime({renderer,socket,getSelf:()=>self,isActive:()=>locked&&!reconnecting&&!objective.finished,syncClock:combat.syncClock});
const objective=createObjectiveView({scene,socket,getSelf:()=>self,clearKeys:()=>keys.clear()});
const lobby=createLobby({socket,getSelf:()=>self,onStarted:()=>{pause.hidden=false;$('#pause-error').textContent='Match started. Click resume to play.';}});
const inventoryView=createInventoryView({socket,getSelf:()=>self,isAvailable:()=>!!self&&self.hp>0&&!reconnecting&&!objective.finished,onOpen:()=>{keys.clear();combat.cancelInput();pause.hidden=true;document.exitPointerLock();if(socket.connected)socket.emit('input',controls());},onClose:resume=>{if(!self||objective.match?.phase==='lobby'||objective.finished)return;if(resume&&!reconnecting)requestLock();else pause.hidden=false;},onSelect:()=>combat.cancelInput()});
function controls(){const active=!inventoryView.open&&objective.match?.phase!=='lobby'&&locked&&!document.hidden&&!reconnecting&&socket.connected&&self?.hp>0;return {forward:active&&keys.has('KeyW'),back:active&&keys.has('KeyS'),left:active&&keys.has('KeyA'),right:active&&keys.has('KeyD'),jump:active&&keys.has('Space'),sprint:active&&(keys.has('ShiftLeft')||keys.has('ShiftRight')),yaw,pitch,block:active&&combat.isBlocking()};}
function acceptSession(result,recovered=false){
 setMap(result.match?.map);
 ownId=result.id;roomCode=result.code;resumeToken=result.resumeToken;self={...result.player};yaw=self.yaw;pitch=self.pitch||0;keys.clear();correction.set(0,0,0);reconnecting=false;
 for(const selector of ['#resume','#next-hero','#restart'])$(selector).disabled=false;
 $('#resume').textContent='Click to resume';$('#network-banner').hidden=true;menu.hidden=true;$('#hud').hidden=false;$('#room-label').textContent=`ROOM ${roomCode}`;loading.hidden=true;
 pause.hidden=false;objective.update(result.match,[result.player]);
 if(recovered){pause.hidden=objective.finished;$('#pause-error').textContent='Reconnected. Click resume to continue.';}
 else if(!objective.finished&&result.match.phase!=='lobby')requestLock();
 lobby.update(result.match,[result.player]);
}
function endSession(message=''){
 lobby.clear();self=null;ownId=null;resumeToken='';reconnecting=false;keys.clear();clearPlayers();document.exitPointerLock();pause.hidden=true;$('#hud').hidden=true;menu.hidden=false;$('#network-banner').hidden=true;$('#error').textContent=message;setButtons(false);
 for(const selector of ['#resume','#next-hero','#restart'])$(selector).disabled=false;$('#resume').textContent='Click to resume';
}
function resumeSession(attempt=0){
 if(!self||!resumeToken||!socket.connected)return;
 const token=resumeToken;
 socket.timeout(5000).emit('resume',{code:roomCode,token},(error,result)=>{
  if(!self||token!==resumeToken)return;
  if(error){if(attempt<3&&socket.connected)setTimeout(()=>{if(token===resumeToken&&reconnecting)resumeSession(attempt+1);},1000);else if(socket.connected)endSession('Could not restore the connection. Please join your room again.');return;}
  if(result?.error){endSession(result.error);return;}acceptSession(result,true);
 });
}
function setButtons(disabled){document.querySelectorAll('#join-form button').forEach(b=>b.disabled=disabled);}
for(const [id,map]of Object.entries(window.ArenaMaps.definitions)){const option=document.createElement('option');option.value=id;option.textContent=map.name;$('#map').append(option);}
$('#map').onchange=()=>{if(!self)setMap($('#map').value);};
function join(create) {
 if(!create&&!$('#code').value.trim()) {$('#error').textContent='Enter your friend’s room code.';return;}
 serverUpdating=false;$('#error').textContent='Connecting…';setButtons(true);socket.connect();
 socket.timeout(6000).emit('join',{create,map:$('#map').value,code:$('#code').value,name:$('#name').value,team:$('#team').value,hero:$('#hero').value},(err,result)=>{
  setButtons(false);
  if(err||result?.error){$('#error').textContent=result?.error||'Could not connect. Please retry.';return;}
  acceptSession(result);
 });
}
$('#create').onclick=()=>join(true);$('#join-form').onsubmit=e=>{e.preventDefault();join(false);};
function requestLock(){ if(!socket.connected||reconnecting)return;$('#pause-error').textContent='';try{const promise=canvas.requestPointerLock();promise?.catch(()=>{$('#pause-error').textContent='Click resume to allow mouse capture.';});}catch{$('#pause-error').textContent='Mouse capture unavailable. Use a desktop browser.';}}
$('#resume').onclick=requestLock;canvas.onclick=()=>{if(self&&!locked)requestLock();};
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas;keys.clear();pause.hidden=!self||locked||inventoryView.open||objective.finished||objective.match?.phase==='lobby';if(self)socket.volatile.emit('input',controls());});
document.addEventListener('pointerlockerror',()=>{$('#pause-error').textContent='Mouse capture was denied. Click resume and allow it in your browser.';});
document.addEventListener('mousemove',e=>{if(locked&&!inventoryView.open){const sensitivity=Number($('#sensitivity').value)*.0005;yaw-=e.movementX*sensitivity;pitch=THREE.MathUtils.clamp(pitch-e.movementY*sensitivity,-1.5,1.5);}});
window.addEventListener('keydown',e=>{if(!self)return;if(e.code==='Escape'){document.exitPointerLock();return;}if(['Tab','Space','KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();if(e.code==='Tab'){tab=true;updateRoster();}if(locked){keys.add(e.code);if(e.code==='Space'&&!e.repeat&&self.hp>0)self.jumpQueued=true;if(movementKeys.has(e.code)&&!e.repeat&&socket.connected&&!reconnecting)socket.emit('input',controls());}});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(self&&locked&&movementKeys.has(e.code)&&socket.connected&&!reconnecting)socket.emit('input',controls());if(e.code==='Tab'){tab=false;updateRoster();}});
window.addEventListener('blur',()=>{keys.clear();tab=false;updateRoster();if(self)socket.volatile.emit('input',controls());});
canvas.oncontextmenu=e=>e.preventDefault();
function removeRemote(remote){scene.remove(remote.group);remote.group.traverse(m=>{if(m.userData.avatarMaterial)m.material.dispose();});}
function clearPlayers(){inventoryView.clear();unitsView.clear();particles.clear();audio.clear();potionView.clear();heroView.clear();objective.clear();combat.clear();for(const remote of remotes.values())removeRemote(remote);remotes.clear();}
$('#leave').onclick=()=>{if(socket.connected)socket.emit('leave');endSession();};
socket.on('server-restarting',()=>{serverUpdating=true;endSession('The game server is restarting for an update. Create or join a new arena shortly.');});
socket.on('connect',()=>{if(self&&resumeToken)resumeSession();});
socket.on('disconnect',reason=>{
 inventoryView.clear();
 if(!self)return;
 if(reason==='io server disconnect'){endSession('The server closed your session. Please rejoin your arena.');return;}
 reconnecting=true;keys.clear();correction.set(0,0,0);document.exitPointerLock();pause.hidden=objective.finished;
 $('#network-banner').hidden=false;$('#network-banner').textContent='Connection interrupted. Reconnecting to your match…';
 $('#pause-error').textContent='Your player is reserved for 30 seconds.';$('#resume').textContent='Reconnecting…';
 for(const selector of ['#resume','#next-hero','#restart'])$(selector).disabled=true;
 console.warn('Arena connection interrupted:',reason);
});
socket.on('connect_error',()=>{
 if(self){$('#network-banner').hidden=false;$('#network-banner').textContent='Connection interrupted. Still trying to reconnect…';}
 else{$('#error').textContent=serverUpdating?'The game server is updating. Try again after the restart.':'Server unavailable. Check your connection and retry.';setButtons(false);}
});
function makeAvatar(p,time) {
 const group=new THREE.Group(),color=heroColors(p.hero)[0];
 const torso=cube(group,.62,.65,.34,color,0,1.04,0);torso.material=skinMaterial(p.hero,p.team,'torso');const head=cube(group,.48,.48,.48,0xd4a181,0,1.61,0);
 head.material=skinMaterial(p.hero,p.team,'head');
 const legs=[cube(group,.23,.7,.26,0x344d52,-.17,.35,0),cube(group,.23,.7,.26,0x344d52,.17,.35,0)];
 for(const side of [-1,1])cube(group,.23,.65,.25,color,side*.44,1,0).material=skinMaterial(p.hero,p.team,'torso');for(const leg of legs)leg.material=skinMaterial(p.hero,p.team,'legs');
 const weapon=new THREE.Group();weapon.position.set(.48,.9,-.3);group.add(weapon);combat.buildWeapon(weapon,p.weapon,true);
 const wind=new THREE.Group();wind.position.set(-.5,1,-.15);group.add(wind);cube(wind,.2,.2,.2,0xe6fbff,0,0,0);cube(wind,.27,.06,.27,0x94d7ed,0,0,0);

 // Four original armor pieces: helmet, chestplate, leggings, and boots.
 cube(group,.53,.18,.53,color,0,1.83,0);cube(group,.65,.4,.38,color,0,1.15,0);cube(group,.49,.18,.3,0x687e8b,0,.67,0);for(const x of [-.17,.17])cube(group,.26,.16,.32,0x687e8b,x,.08,0);
 group.position.set(p.x,p.y,p.z);group.rotation.y=p.yaw;scene.add(group);const history=[];window.ArenaNetwork.remember(history,p,time);return {group,head,legs,weapon,wind,weaponKey:p.weapon,target:p,history,lastTime:time,speed:0};
}
function updateRoster(){
 const roster=$('#roster');roster.hidden=!tab;
 const players=self?[self,...[...remotes.values()].map(r=>r.target)]:[];
 if(tab)roster.textContent=['red','blue'].map(team=>`${team.toUpperCase()} TEAM\n`+players.filter(p=>p.team===team).map(p=>`${p.isBot?'[BOT] ':''}${p.name} [${window.HeroRules.heroes[p.hero]?.name||'Hero'}]${p.id===ownId?' (you)':p.connected===false?' (reconnecting)':''} · ${p.kills} K / ${p.deaths} D`).join('\n')).join('\n\n');
 const humans=players.filter(p=>!p.isBot&&p.connected!==false).length,bots=players.filter(p=>p.isBot).length;$('#connection').textContent=`${humans}/10 players connected${bots?' · '+bots+' bots':''}`;
}
socket.on('state',state=>{
 setMap(state.match?.map);
 if(!self||reconnecting)return;combat.snapshot(state);const ids=new Set();
 for(const p of state.players){
  if(p.id===ownId){
   const error=Math.hypot(p.x-self.x,p.y-self.y,p.z-self.z);
   // Soft reconciliation of local prediction to authoritative positions.
   if(error>3||p.life!==self.life||p.motionSerial!==self.motionSerial){Object.assign(self,p);self.jumpQueued=false;correction.set(0,0,0);}else {
    correction.set(p.x-self.x,p.y-self.y,p.z-self.z);
    const {x,y,z,yaw:remoteYaw,pitch:remotePitch,vy,grounded,...stats}=p;Object.assign(self,stats);
    if(Math.hypot(p.kx,p.kz)>.5)self.vy=Math.max(self.vy,vy);
   }
   continue;
  }
  ids.add(p.id);let remote=remotes.get(p.id);
  if(!remote){remote=makeAvatar(p,state.serverTime);remotes.set(p.id,remote);}else {const reset=p.life!==remote.target.life||Math.hypot(p.x-remote.target.x,p.y-remote.target.y,p.z-remote.target.z)>12;remote.speed=reset?0:Math.hypot(p.x-remote.target.x,p.z-remote.target.z)/Math.max(.001,(state.serverTime-remote.lastTime)/1000);window.ArenaNetwork.remember(remote.history,p,state.serverTime,reset);remote.target=p;remote.lastTime=state.serverTime;}
 }
 for(const [id,r]of remotes)if(!ids.has(id)){removeRemote(r);remotes.delete(id);}heroView.snapshot(state);unitsView.snapshot(state);audio.snapshot(state);updateRoster();objective.update(state.match,state.players);lobby.update(state.match,state.players);
});
document.addEventListener('visibilitychange',()=>{keys.clear();if(self)self.jumpQueued=false;if(document.hidden){document.exitPointerLock();if(self&&socket.connected&&!reconnecting)socket.emit('input',controls());}last=performance.now();accumulator=0;});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();viewCamera.aspect=camera.aspect;viewCamera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function frame(now){
 requestAnimationFrame(frame);const rawMs=now-last,dt=Math.min(rawMs/1000,.1);last=now;if(document.hidden)return;
 if(self){
  accumulator+=dt;const input=controls();while(accumulator>=1/60){if(self.hp>0&&!objective.finished&&!reconnecting)World.step(self,self.blocking?{...input,sprint:false}:input,1/60);accumulator-=1/60;}
  const factor=1-Math.exp(-8*dt);
  // Network smoothing must obey the same collisions as normal movement.
  const adjustment={x:correction.x*factor,y:correction.y*factor,z:correction.z*factor};
  const moved=World.move(self,adjustment);
  correction.multiplyScalar(1-factor);
  for(const axis of ['x','y','z'])if(Math.abs(moved[axis]-adjustment[axis])>1e-7)correction[axis]=0;
  if(now-sendTime>1000/30){socket.volatile.emit('input',input);sendTime=now;}
  camera.position.set(self.x,self.y+1.62,self.z);camera.rotation.set(pitch,yaw,0,'YXZ');
  const moving=input.forward||input.back||input.left||input.right;walkTime+=dt*(input.sprint?13:9);hand.position.y=-.36+(moving&&self.grounded?Math.sin(walkTime)*.025:0);
 }else {camera.position.set(13,8,24);camera.lookAt(0,1,0);}
 const active=!!self&&self.hp>0&&locked&&!reconnecting&&!objective.finished;if(!active&&now-lastRender<1000/30)return;lastRender=now;runtime.frame(now,rawMs);
 for(const r of remotes.values()) {
  r.group.visible=r.target.hp>0;if(!r.group.visible)continue;
  const potionAge=combat.serverNow()-r.target.potionAt,potionActive=r.target.potionAt&&potionAge>=0&&potionAge<(window.PotionRules.items[r.target.potionKind]?.splash?400:650);
  const visualKey=potionActive?'flask:'+r.target.potionKind:r.target.heldItem?.kind==='potion'?'flask:'+r.target.heldItem.id:r.target.weapon;r.weapon.visible=potionActive||!r.target.hasItemSlots||!!r.target.heldItem;
  if(r.weaponKey!==visualKey){r.weaponKey=visualKey;combat.buildWeapon(r.weapon,r.weaponKey,true);r.styleKey=null;}
  r.weapon.position.y=.9;
  const cooldown=window.CombatRules.weapons[r.target.weapon].cooldown,duration=['crossbow','toxicbow'].includes(r.weaponKey)?cooldown:Math.min(cooldown,800);
  const phase=Math.min(1,Math.max(0,(combat.serverNow()-(r.target.attackAt||0))/duration));combat.animateWeapon(r.weapon,r.weaponKey,phase);
  if(potionActive){const t=potionAge/(window.PotionRules.items[r.target.potionKind].splash?400:650);r.weapon.position.y=.9+Math.sin(t*Math.PI)*.5;r.weapon.rotation.x=-Math.sin(t*Math.PI)*.9;}
  if(r.weaponKey==='bow'){
   const charge=r.target.drawAt?Math.min(1,(combat.serverNow()-r.target.drawAt)/1000):0;
   r.weapon.userData.string.position.z=charge*.2;r.weapon.userData.arrow.position.z=charge*.2;r.weapon.rotation.y=-charge*.2;
  }
  r.wind.visible=!potionActive;r.wind.rotation.y=now*.002;

  const time=combat.serverNow(),s=r.target.status||{},hidden=s.vanish>time;
  const emissive=s.rampage>time||s.rage>time?0x662211:s.holy>time||s.divine>time?0x665622:s.slow>time||s.slowPotion>time?0x224466:s.burning>time?0x663311:0;
  const styleKey=`${hidden}:${emissive}`;
  if(r.styleKey!==styleKey){r.styleKey=styleKey;r.group.traverse(m=>{if(m.isMesh){if(!m.userData.avatarMaterial){m.material=m.material.clone();m.userData.avatarMaterial=true;}if(m.material.transparent!==hidden){m.material.transparent=hidden;m.material.needsUpdate=true;}m.material.opacity=hidden?.15:1;if(m.material.emissive)m.material.emissive.setHex(emissive);}});}

  const pose=window.ArenaNetwork.sample(r.history,combat.serverNow()-runtime.interpolationDelay());
  r.group.position.set(pose.x,pose.y,pose.z);r.group.rotation.y=pose.yaw;r.head.rotation.x=pose.pitch;
  r.legs[0].rotation.x=r.speed>.1?Math.sin(now*.012)*.4:0;r.legs[1].rotation.x=-r.legs[0].rotation.x;
 }
 inventoryView.frame();unitsView.frame(now);particles.frame(now,dt);combat.frame(now);heroView.frame(now);potionView.frame(now);audio.frame(now);if(objective.finished)$('#death').hidden=true;renderer.info.reset();renderer.clear();renderer.render(scene,camera);renderer.clearDepth();renderer.render(viewScene,viewCamera);
}
loading.hidden=true;requestAnimationFrame(frame);
// Read-only diagnostics for smoke tests; no client state can override the server.
window.arenaDiagnostics=()=>({joined:!!self,reconnecting,id:ownId,room:roomCode,position:self?{x:self.x,y:self.y,z:self.z}:null,remotes:[...remotes.keys()],remotePlayers:[...remotes.values()].map(r=>({id:r.target.id,isBot:r.target.isBot,hero:r.target.hero,position:{x:r.group.position.x,y:r.group.position.y,z:r.group.position.z},windVisible:r.wind.visible,opacity:r.group.children[0]?.material.opacity})),locked,yaw,pitch,hp:self?.hp,weapon:self?.weapon,blocking:self?.blocking,kills:self?.kills,deaths:self?.deaths,team:self?.team,status:self?.status,speedScale:self?.speedScale,inventory:self?.inventory,itemSlots:self?.itemSlots,activeSlot:self?.activeSlot,heldItem:self?.heldItem,cursorItem:self?.cursorItem,inventoryOpen:inventoryView.open,inventoryRevision:self?.inventoryRevision,selectedPotion:self?.selectedPotion,potionReady:self?.potionReady,drinking:!!self?.drinking,audio:audio.diagnostics(),hero:self?.hero,pendingHero:self?.pendingHero,ult:self?.ult,abilityReady:self?.abilityReady,match:objective.match,windReady:self?.windReady,offhand:combat.offhand(),runtime:runtime.diagnostics(),map:activeMap,unitCount:unitsView.count(),visuals:voxelLook.diagnostics(),drawCalls:renderer.info.render.calls});
