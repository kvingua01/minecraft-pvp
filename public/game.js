import * as THREE from '/vendor/three.module.js';
import {createCombatView} from '/combat-view.js';
import {createObjectiveView} from '/objective-view.js';
import {createHeroView} from '/hero-view.js';
const $=s=>document.querySelector(s), World=window.VoxelWorld;
const menu=$('#menu'), pause=$('#pause'), canvas=$('#world'), loading=$('#loading');
let renderer;
try {renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});} catch(error) {loading.textContent='WebGL is unavailable. Enable hardware acceleration and reload.';throw error;}
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,1));
const scene=new THREE.Scene();scene.background=new THREE.Color(0xaacbd1);scene.fog=new THREE.Fog(0xaacbd1,32,95);
scene.add(new THREE.HemisphereLight(0xe6f4ff,0x667347,2.3));
const sun=new THREE.DirectionalLight(0xffecd1,2.4);sun.position.set(-20,40,10);scene.add(sun);
const camera=new THREE.PerspectiveCamera(78,innerWidth/innerHeight,.05,120);camera.rotation.order='YXZ';scene.add(camera);
// Render held items after world depth so nearby walls never swallow the weapon.
const viewScene=new THREE.Scene(),viewCamera=new THREE.PerspectiveCamera(78,innerWidth/innerHeight,.05,10);
viewScene.add(viewCamera,new THREE.HemisphereLight(0xe6f4ff,0x667347,2.3));
const viewSun=new THREE.DirectionalLight(0xffecd1,2.4);viewSun.position.set(-2,4,1);viewScene.add(viewSun);
renderer.autoClear=false;renderer.info.autoReset=false;
const geometry=new THREE.BoxGeometry(1,1,1), materials=new Map();
function material(color) {if(!materials.has(color))materials.set(color,new THREE.MeshLambertMaterial({color}));return materials.get(color);}
// One draw call per color for static blocks; no textures or external assets.
for(const color of new Set(World.boxes.map(b=>b.color))) {
 const blocks=World.boxes.filter(b=>b.color===color),mesh=new THREE.InstancedMesh(geometry,material(color),blocks.length),dummy=new THREE.Object3D();
 blocks.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.w,b.h,b.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});scene.add(mesh);
}
function cube(parent,w,h,d,color,x,y,z) {const m=new THREE.Mesh(geometry,material(color));m.scale.set(w,h,d);m.position.set(x,y,z);parent.add(m);return m;}
const socket=io({autoConnect:false}), remotes=new Map(),keys=new Set();
let self=null, ownId=null,roomCode='',yaw=0,pitch=0,locked=false,tab=false,accumulator=0,last=performance.now(),sendTime=0;
let correction=new THREE.Vector3(),walkTime=0;
const combat=createCombatView({camera:viewCamera,scene,cube,socket,getSelf:()=>self,getInput:controls,isLocked:()=>locked&&!objective.finished});
const hand=combat.hand;
const heroView=createHeroView({scene,camera:viewCamera,cube,socket,getSelf:()=>self,getInput:controls,isLocked:()=>locked&&!objective.finished,serverNow:combat.serverNow});
const objective=createObjectiveView({scene,socket,getSelf:()=>self,clearKeys:()=>keys.clear()});
function controls(){return {forward:locked&&self?.hp>0&&keys.has('KeyW'),back:locked&&self?.hp>0&&keys.has('KeyS'),left:locked&&self?.hp>0&&keys.has('KeyA'),right:locked&&self?.hp>0&&keys.has('KeyD'),jump:locked&&keys.has('Space'),sprint:locked&&(keys.has('ShiftLeft')||keys.has('ShiftRight')),yaw,pitch,block:locked&&self?.hp>0&&combat.isBlocking()};}
function setButtons(disabled){document.querySelectorAll('#join-form button').forEach(b=>b.disabled=disabled);}
function join(create) {
 if(!create&&!$('#code').value.trim()) {$('#error').textContent='Enter your friend’s room code.';return;}
 $('#error').textContent='Connecting…';setButtons(true);socket.connect();
 socket.timeout(6000).emit('join',{create,code:$('#code').value,name:$('#name').value,team:$('#team').value,hero:$('#hero').value},(err,result)=>{
  setButtons(false);
  if(err||result?.error){$('#error').textContent=result?.error||'Could not connect. Please retry.';return;}
  ownId=result.id;roomCode=result.code;self={...result.player};yaw=self.yaw;pitch=0;correction.set(0,0,0);
  menu.hidden=true;$('#hud').hidden=false;$('#room-label').textContent=`ROOM ${roomCode}`;loading.hidden=true;
  pause.hidden=false;objective.update(result.match,[result.player]);if(!objective.finished)requestLock();
 });
}
$('#create').onclick=()=>join(true);$('#join-form').onsubmit=e=>{e.preventDefault();join(false);};
function requestLock(){ $('#pause-error').textContent='';try{const promise=canvas.requestPointerLock();promise?.catch(()=>{$('#pause-error').textContent='Click resume to allow mouse capture.';});}catch{$('#pause-error').textContent='Mouse capture unavailable. Use a desktop browser.';}}
$('#resume').onclick=requestLock;canvas.onclick=()=>{if(self&&!locked)requestLock();};
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas;keys.clear();pause.hidden=!self||locked||objective.finished;if(self)socket.emit('input',controls());});
document.addEventListener('pointerlockerror',()=>{$('#pause-error').textContent='Mouse capture was denied. Click resume and allow it in your browser.';});
document.addEventListener('mousemove',e=>{if(locked){const sensitivity=Number($('#sensitivity').value)*.0005;yaw-=e.movementX*sensitivity;pitch=THREE.MathUtils.clamp(pitch-e.movementY*sensitivity,-1.5,1.5);}});
window.addEventListener('keydown',e=>{if(!self)return;if(e.code==='Escape'){document.exitPointerLock();return;}if(['Tab','Space','KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();if(e.code==='Tab'){tab=true;updateRoster();}if(locked)keys.add(e.code);});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Tab'){tab=false;updateRoster();}});
window.addEventListener('blur',()=>{keys.clear();tab=false;updateRoster();if(self)socket.emit('input',controls());});
canvas.oncontextmenu=e=>e.preventDefault();
function removeRemote(remote){scene.remove(remote.group);remote.group.traverse(m=>{if(m.userData.avatarMaterial)m.material.dispose();});}
function clearPlayers(){heroView.clear();objective.clear();combat.clear();for(const remote of remotes.values())removeRemote(remote);remotes.clear();}
$('#leave').onclick=()=>{socket.emit('leave');self=null;ownId=null;keys.clear();clearPlayers();document.exitPointerLock();pause.hidden=true;$('#hud').hidden=true;menu.hidden=false;$('#error').textContent='';};
socket.on('disconnect',()=>{if(!self)return;self=null;clearPlayers();document.exitPointerLock();pause.hidden=true;$('#hud').hidden=true;menu.hidden=false;$('#error').textContent='Connection lost. Create an arena or rejoin with your room code.';setButtons(false);});
socket.on('connect_error',()=>{$('#error').textContent='Server unavailable. Check your connection and retry.';setButtons(false);});
function makeAvatar(p) {
 const group=new THREE.Group(),color=p.team==='red'?0xdd8d73:0x70a9bd;
 cube(group,.62,.65,.34,color,0,1.04,0);const head=cube(group,.48,.48,.48,0xd4a181,0,1.61,0);
 cube(head,.12,.1,.025,0x253c3d,-.22,.05,-.51);cube(head,.12,.1,.025,0x253c3d,.22,.05,-.51);
 const legs=[cube(group,.23,.7,.26,0x344d52,-.17,.35,0),cube(group,.23,.7,.26,0x344d52,.17,.35,0)];
 cube(group,.17,.65,.2,color,-.44,1,0);cube(group,.17,.65,.2,color,.44,1,0);
 const weapon=new THREE.Group();weapon.position.set(.48,.9,-.3);group.add(weapon);combat.buildWeapon(weapon,p.weapon,true);
 const shield=new THREE.Group();shield.position.set(-.5,1,-.15);group.add(shield);cube(shield,.4,.6,.12,0x849ba5,0,0,0);
 // Four original armor pieces: helmet, chestplate, leggings, and boots.
 cube(group,.53,.18,.53,0x8da4ad,0,1.83,0);cube(group,.65,.4,.38,0x8da4ad,0,1.15,0);cube(group,.49,.18,.3,0x687e8b,0,.67,0);for(const x of [-.17,.17])cube(group,.26,.16,.32,0x687e8b,x,.08,0);
 group.position.set(p.x,p.y,p.z);group.rotation.y=p.yaw;scene.add(group);return {group,head,legs,weapon,shield,weaponKey:p.weapon,target:p,stamp:performance.now(),previous:p};
}
function updateRoster(){
 const roster=$('#roster');roster.hidden=!tab;
 const players=self?[self,...[...remotes.values()].map(r=>r.target)]:[];
 roster.textContent=['red','blue'].map(team=>`${team.toUpperCase()} TEAM\n`+players.filter(p=>p.team===team).map(p=>`${p.name} [${window.HeroRules.heroes[p.hero]?.name||'Hero'}]${p.id===ownId?' (you)':''} · ${p.kills} K / ${p.deaths} D`).join('\n')).join('\n\n');
 $('#connection').textContent=`${players.length}/10 players connected`;
}
socket.on('state',state=>{
 if(!self)return;combat.snapshot(state);const ids=new Set();
 for(const p of state.players){
  if(p.id===ownId){
   const error=Math.hypot(p.x-self.x,p.y-self.y,p.z-self.z);
   // Soft reconciliation of local prediction to authoritative positions.
   if(error>3||p.life!==self.life||p.motionSerial!==self.motionSerial){Object.assign(self,p);correction.set(0,0,0);}else {
    correction.set(p.x-self.x,p.y-self.y,p.z-self.z);
    const {x,y,z,yaw:remoteYaw,pitch:remotePitch,vy,grounded,...stats}=p;Object.assign(self,stats);
    if(Math.hypot(p.kx,p.kz)>.5)self.vy=Math.max(self.vy,vy);
   }
   continue;
  }
  ids.add(p.id);let remote=remotes.get(p.id);
  if(!remote){remote=makeAvatar(p);remotes.set(p.id,remote);}else {remote.previous={x:remote.group.position.x,y:remote.group.position.y,z:remote.group.position.z,yaw:remote.group.rotation.y};remote.target=p;remote.stamp=performance.now();}
 }
 for(const [id,r]of remotes)if(!ids.has(id)){removeRemote(r);remotes.delete(id);}heroView.snapshot(state);updateRoster();objective.update(state.match,state.players);
});
$('#quality').onchange=()=>renderer.setPixelRatio(Math.min(devicePixelRatio,Number($('#quality').value)));
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();viewCamera.aspect=camera.aspect;viewCamera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function frame(now){
 requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.1);last=now;
 if(self){
  accumulator+=dt;const input=controls();while(accumulator>=1/60){if(self.hp>0&&!objective.finished)World.step(self,self.blocking?{...input,sprint:false}:input,1/60);accumulator-=1/60;}
  const factor=1-Math.exp(-8*dt);
  // Network smoothing must obey the same collisions as normal movement.
  const adjustment={x:correction.x*factor,y:correction.y*factor,z:correction.z*factor};
  const moved=World.move(self,adjustment);
  correction.multiplyScalar(1-factor);
  for(const axis of ['x','y','z'])if(Math.abs(moved[axis]-adjustment[axis])>1e-7)correction[axis]=0;
  if(now-sendTime>1000/30){socket.emit('input',input);sendTime=now;}
  camera.position.set(self.x,self.y+1.62,self.z);camera.rotation.set(pitch,yaw,0,'YXZ');
  const moving=input.forward||input.back||input.left||input.right;walkTime+=dt*(input.sprint?13:9);hand.position.y=-.36+(moving&&self.grounded?Math.sin(walkTime)*.025:0);
 }else {camera.position.set(13,8,24);camera.lookAt(0,1,0);}
 for(const r of remotes.values()) {
  r.group.visible=r.target.hp>0;if(!r.group.visible)continue;
  if(r.weaponKey!==r.target.weapon){r.weaponKey=r.target.weapon;combat.buildWeapon(r.weapon,r.weaponKey,true);}
  r.weapon.position.y=.9;
  const cooldown=window.CombatRules.weapons[r.weaponKey].cooldown,duration=r.weaponKey==='crossbow'?cooldown:Math.min(cooldown,800);
  const phase=Math.min(1,Math.max(0,(combat.serverNow()-(r.target.attackAt||0))/duration));combat.animateWeapon(r.weapon,r.weaponKey,phase);
  if(r.weaponKey==='bow'){
   const charge=r.target.drawAt?Math.min(1,(combat.serverNow()-r.target.drawAt)/1000):0;
   r.weapon.userData.string.position.z=charge*.2;r.weapon.userData.arrow.position.z=charge*.2;r.weapon.rotation.y=-charge*.2;
  }
  r.shield.visible=r.target.canShield!==false&&['sword','axe','mace'].includes(r.weaponKey);r.shield.position.y=r.target.blocking?1.35:.95;
  const hidden=r.target.status?.vanish>combat.serverNow();r.group.traverse(m=>{if(m.isMesh){if(!m.userData.avatarMaterial){m.material=m.material.clone();m.userData.avatarMaterial=true;}m.material.transparent=hidden;m.material.opacity=hidden?.15:1;const s=r.target.status||{},time=combat.serverNow();if(m.material.emissive)m.material.emissive.setHex(s.rampage>time||s.rage>time?0x662211:s.holy>time||s.divine>time?0x665622:s.slow>time?0x224466:0x000000);}});
  const t=Math.min(1,(now-r.stamp)/50);r.group.position.set(THREE.MathUtils.lerp(r.previous.x,r.target.x,t),THREE.MathUtils.lerp(r.previous.y,r.target.y,t),THREE.MathUtils.lerp(r.previous.z,r.target.z,t));
  const turn=Math.atan2(Math.sin(r.target.yaw-r.previous.yaw),Math.cos(r.target.yaw-r.previous.yaw));r.group.rotation.y=r.previous.yaw+turn*t;r.head.rotation.x=r.target.pitch;
  const moving=Math.hypot(r.target.x-r.previous.x,r.target.z-r.previous.z)>.02;r.legs[0].rotation.x=moving?Math.sin(now*.012)*.4:0;r.legs[1].rotation.x=-r.legs[0].rotation.x;
 }
 combat.frame(now);heroView.frame(now);if(objective.finished)$('#death').hidden=true;renderer.info.reset();renderer.clear();renderer.render(scene,camera);renderer.clearDepth();renderer.render(viewScene,viewCamera);
}
loading.hidden=true;requestAnimationFrame(frame);
// Read-only diagnostics for smoke tests; no client state can override the server.
window.arenaDiagnostics=()=>({joined:!!self,id:ownId,room:roomCode,position:self?{x:self.x,y:self.y,z:self.z}:null,remotes:[...remotes.keys()],remotePlayers:[...remotes.values()].map(r=>({id:r.target.id,hero:r.target.hero,opacity:r.group.children[0]?.material.opacity})),locked,yaw,pitch,hp:self?.hp,weapon:self?.weapon,blocking:self?.blocking,kills:self?.kills,deaths:self?.deaths,team:self?.team,hero:self?.hero,pendingHero:self?.pendingHero,ult:self?.ult,abilityReady:self?.abilityReady,match:objective.match,drawCalls:renderer.info.render.calls});
